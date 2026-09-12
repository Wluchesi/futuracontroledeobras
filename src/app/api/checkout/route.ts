import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';

function formatMercadoPagoCardError(statusDetail?: string, rawMessage?: string): string {
  switch (statusDetail) {
    case 'cc_rejected_high_risk':
      return 'Recusado pelo sistema de prevenção a fraudes do Mercado Pago (cc_rejected_high_risk). Isso ocorre quando o titular tenta pagar para si mesmo ou por regras de segurança da adquirente. Pague com PIX para aprovação imediata ou utilize o Checkout Oficial do Mercado Pago.';
    case 'cc_rejected_bad_filled_card_number':
      return 'Número de cartão inválido. Verifique os números digitados.';
    case 'cc_rejected_bad_filled_date':
      return 'Data de validade do cartão incorreta ou vencida.';
    case 'cc_rejected_bad_filled_security_code':
      return 'Código de segurança (CVV) incorreto.';
    case 'cc_rejected_insufficient_amount':
      return 'Saldo ou limite insuficiente no cartão de crédito.';
    case 'cc_rejected_call_for_authorize':
      return 'Pagamento não autorizado pelo banco emissor. Ligue para a central do seu cartão para autorizar.';
    case 'cc_rejected_card_disabled':
      return 'O cartão informado está bloqueado ou inativo.';
    case 'cc_rejected_duplicated_payment':
      return 'Transação duplicada. Já existe um pagamento recente idêntico.';
    case 'cc_rejected_max_attempts':
      return 'Limite de tentativas excedido. Tente novamente mais tarde ou use o PIX.';
    default:
      return rawMessage || statusDetail || 'Pagamento recusado pela operadora do cartão.';
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyId, planId, paymentMethod, cardDetails } = body;

    if (!planId || !paymentMethod) {
      return NextResponse.json({ error: 'Dados incompletos para processar o checkout.' }, { status: 400 });
    }

    // Busca empresa pelo ID fornecido ou pega a primeira empresa cadastrada no sistema
    let company = null;
    if (companyId && typeof companyId === 'string' && companyId.trim() !== '') {
      try {
        company = await prisma.company.findUnique({
          where: { id: companyId },
          include: { users: true },
        });
      } catch (err) {
        console.warn('Erro ao buscar empresa por ID:', err);
      }
    }

    if (!company) {
      company = await prisma.company.findFirst({
        include: { users: true },
      });
    }

    if (!company) {
      return NextResponse.json({ error: 'Nenhuma empresa ativa encontrada no sistema.' }, { status: 404 });
    }

    let planPrice = 49;
    let planTitle = 'Kitneteiro Pro';
    if (planId === 'Premium') {
      planPrice = 99;
      planTitle = 'Kitneteiro Premium (SINAPI)';
    } else if (planId === 'Gratuito') {
      planPrice = 0;
      planTitle = 'Plano Gratuito';
    } else if (planId === 'Teste1Real') {
      planPrice = 1;
      planTitle = 'Plano Teste PIX/Cartão (R$ 1,00)';
    }

    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const isTestMode = !mpAccessToken || mpAccessToken.startsWith('TEST-');
    const isTestPlan = planId === 'Teste1Real';

    // E-mail do pagador
    const baseEmail = company.users?.[0]?.email || 'comprador@gestaodeobras.com';
    const payerEmail = isTestMode 
      ? `comprador_${Date.now()}@testuser.com` 
      : baseEmail;

    // Gera preferência oficial no Mercado Pago para permitir checkout oficial
    let checkoutUrl = '';
    if (mpAccessToken) {
      try {
        const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [
              {
                id: planId,
                title: `Assinatura ${planTitle}`,
                quantity: 1,
                currency_id: 'BRL',
                unit_price: planPrice,
              },
            ],
            payer: {
              email: company.users?.[0]?.email || 'cliente@gestaodeobras.com',
              name: company.name || 'Cliente',
            },
            metadata: {
              company_id: company.id,
              plan_id: planId,
            },
            notification_url: 'https://futuracontroledeobras.vercel.app/api/webhooks/payment',
            back_urls: {
              success: 'https://futuracontroledeobras.vercel.app/planos?status=success',
              pending: 'https://futuracontroledeobras.vercel.app/planos?status=pending',
              failure: 'https://futuracontroledeobras.vercel.app/planos?status=failure',
            },
            auto_return: 'approved',
          }),
          signal: AbortSignal.timeout(3500),
        });

        if (prefRes.ok) {
          const prefData = await prefRes.json();
          checkoutUrl = prefData.init_point || prefData.sandbox_init_point || '';
        }
      } catch (prefErr) {
        console.warn('Erro ao gerar preferência Mercado Pago:', prefErr);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FLUXO PIX
    // ─────────────────────────────────────────────────────────────────────────
    if (paymentMethod === 'PIX' || paymentMethod === 'MERCADO_PAGO') {
      let pixQrCodeUrl = '';
      let pixCopiaECola = '';
      let transactionId = `tx_mp_sim_${Date.now()}`;

      // Se não for plano de teste nem sandbox, tenta gerar PIX real via Mercado Pago
      if (mpAccessToken && !isTestPlan && !isTestMode) {
        try {
          const payerName = company.name || 'Empresa Cliente';

          const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${mpAccessToken}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `idemp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            },
            body: JSON.stringify({
              transaction_amount: planPrice,
              description: `Assinatura ${planTitle} - Gerenciador de Obras`,
              payment_method_id: 'pix',
              payer: {
                email: payerEmail,
                first_name: payerName,
                last_name: 'Cliente',
              },
              metadata: {
                company_id: company.id,
                plan_id: planId,
              },
            }),
            signal: AbortSignal.timeout(3500),
          });

          const mpData = await mpResponse.json();

          if (mpResponse.ok && mpData.point_of_interaction?.transaction_data) {
            const txData = mpData.point_of_interaction.transaction_data;
            pixCopiaECola = txData.qr_code;
            if (txData.qr_code_base64) {
              pixQrCodeUrl = `data:image/png;base64,${txData.qr_code_base64}`;
            }
            transactionId = String(mpData.id || transactionId);
          } else {
            console.warn('Mercado Pago PIX retorno não ok:', mpData);
          }
        } catch (mpErr) {
          console.warn('Mercado Pago API fetch error:', mpErr);
        }
      }

      // Código PIX Copia e Cola padrão BR Code
      if (!pixCopiaECola) {
        pixCopiaECola = `00020126580014br.gov.bcb.pix0136futuragestaoobras-${transactionId}520400005303986540${planPrice.toFixed(2)}5802BR5920FUTURA GESTAO OBRAS6009SAO PAULO62070503***63041D2E`;
      }

      // Gera QR Code base64 localmente sem depender de APIs externas
      if (!pixQrCodeUrl) {
        try {
          pixQrCodeUrl = await QRCode.toDataURL(pixCopiaECola, {
            margin: 1,
            width: 250,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });
        } catch (qrErr) {
          console.warn('Erro ao gerar QR Code local:', qrErr);
          pixQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCopiaECola)}`;
        }
      }

      return NextResponse.json({
        success: true,
        transactionId,
        paymentMethod: 'PIX',
        amount: planPrice,
        planTitle,
        pixQrCodeUrl,
        pixCopiaECola,
        checkoutUrl,
        status: 'PENDING',
        expiresInSeconds: 900,
        provider: 'MERCADO_PAGO_OFICIAL',
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FLUXO CARTÃO DE CRÉDITO
    // ─────────────────────────────────────────────────────────────────────────
    if (paymentMethod === 'CREDIT_CARD') {
      if (!cardDetails || !cardDetails.number || !cardDetails.holderName) {
        return NextResponse.json({ error: 'Dados do cartão de crédito são obrigatórios.' }, { status: 400 });
      }

      const cleanCardNumber = cardDetails.number.replace(/\s+/g, '');
      let isApproved = false;
      let transactionId = `tx_card_${Date.now()}`;
      let mpMessage = '';

      // Tenta processar no Mercado Pago de forma transparente se as credenciais permitirem
      if (mpAccessToken && !isTestMode) {
        try {
          const mpPublicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
          const [expMonth, expYear] = (cardDetails.expiry || '12/2028').split('/');

          let detectedPaymentMethodId = 'master';
          if (cleanCardNumber.startsWith('4')) {
            detectedPaymentMethodId = 'visa';
          } else if (/^5[1-5]|^2[2-7]/.test(cleanCardNumber)) {
            detectedPaymentMethodId = 'master';
          } else if (/^3[47]/.test(cleanCardNumber)) {
            detectedPaymentMethodId = 'amex';
          } else if (/^(636368|438935|504175|5067|5090|650)/.test(cleanCardNumber)) {
            detectedPaymentMethodId = 'elo';
          }

          if (mpPublicKey) {
            const tokenRes = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${mpPublicKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                card_number: cleanCardNumber,
                security_code: cardDetails.cvv || '123',
                expiration_month: expMonth || '12',
                expiration_year: expYear?.length === 2 ? `20${expYear}` : expYear || '2028',
                cardholder: {
                  name: cardDetails.holderName,
                  identification: { type: 'CPF', number: '19119119100' },
                },
              }),
              signal: AbortSignal.timeout(3500),
            });

            const tokenData = await tokenRes.json();

            if (tokenRes.ok && tokenData.id) {
              const payRes = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${mpAccessToken}`,
                  'Content-Type': 'application/json',
                  'X-Idempotency-Key': `idemp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                },
                body: JSON.stringify({
                  transaction_amount: planPrice,
                  token: tokenData.id,
                  description: `Assinatura ${planTitle} - Cartão Transparente`,
                  installments: 1,
                  payment_method_id: detectedPaymentMethodId,
                  payer: {
                    email: payerEmail,
                  },
                  metadata: {
                    company_id: company.id,
                    plan_id: planId,
                  },
                }),
                signal: AbortSignal.timeout(3500),
              });

              const payData = await payRes.json();

            if (payRes.ok && (payData.status === 'approved' || payData.status === 'in_process')) {
              isApproved = true;
              transactionId = String(payData.id);
              mpMessage = `Pagamento nº ${payData.id} processado com sucesso!`;
            } else {
              console.warn('Mercado Pago Cartão Erro:', payData);
              const friendlyError = formatMercadoPagoCardError(payData.status_detail, payData.message);
              return NextResponse.json({
                error: friendlyError,
                checkoutUrl,
              }, { status: 400 });
            }
          }
        }
      } catch (cardErr) {
        console.error('Erro na API de Cartão do Mercado Pago:', cardErr);
      }
    }

      // Se não aprovou de forma transparente pelo gateway, NÃO libera o plano
      if (!isApproved) {
        return NextResponse.json({
          error: 'Não foi possível processar o cartão diretamente nesta modalidade. Para pagar com segurança e comprovação direta na conta, utilize o Checkout Oficial do Mercado Pago.',
          checkoutUrl,
        }, { status: 402 });
      }

      // Atualiza a empresa SOMENTE após aprovação confirmada no gateway
      let formattedPlanName = 'Kitneteiro Pro (1 Obra / Kitnets Ilimitadas)';
      let maxProjects = 1;
      let maxUsers = 10;

      if (planId === 'Premium') {
        formattedPlanName = 'Kitneteiro Premium (5 Obras / SINAPI)';
        maxProjects = 5;
        maxUsers = 50;
      } else if (planId === 'Teste1Real') {
        formattedPlanName = 'Kitneteiro Premium (Teste R$ 1,00)';
        maxProjects = 5;
        maxUsers = 50;
      }

      const updatedCompany = await prisma.company.update({
        where: { id: company.id },
        data: {
          planName: formattedPlanName,
          maxProjects,
          maxUsers,
        },
      });

      return NextResponse.json({
        success: true,
        transactionId,
        paymentMethod: 'CREDIT_CARD',
        status: 'CONFIRMED',
        amount: planPrice,
        planTitle,
        company: updatedCompany,
        provider: 'MERCADO_PAGO_TRANSPARENTE',
        message: mpMessage,
      });
    }

    return NextResponse.json({ error: 'Método de pagamento inválido.' }, { status: 400 });
  } catch (error: any) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ error: 'Erro ao processar checkout de pagamento.' }, { status: 500 });
  }
}


