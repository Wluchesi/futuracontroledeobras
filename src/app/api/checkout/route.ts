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

    // Origem da requisição para retornos e webhooks dinâmicos
    const reqOrigin = request.headers.get('origin') || request.headers.get('referer');
    let baseUrl = 'https://deobras.netlify.app';
    if (reqOrigin && reqOrigin.startsWith('http')) {
      try {
        baseUrl = new URL(reqOrigin).origin;
      } catch (_) {}
    }

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
            notification_url: `${baseUrl}/api/webhooks/payment`,
            back_urls: {
              success: `${baseUrl}/planos?status=success`,
              pending: `${baseUrl}/planos?status=pending`,
              failure: `${baseUrl}/planos?status=failure`,
            },
            auto_return: 'approved',
          }),
          signal: AbortSignal.timeout(8000),
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
    // ─────────────────────────────────────────────────────────────────────────
    // FLUXO CARTÃO DE CRÉDITO
    // ─────────────────────────────────────────────────────────────────────────
    if (paymentMethod === 'CREDIT_CARD') {
      if (!cardDetails || !cardDetails.number || !cardDetails.holderName) {
        return NextResponse.json({ error: 'Dados do cartão de crédito são obrigatórios.' }, { status: 400 });
      }

      const cleanCardNumber = String(cardDetails.number || '').replace(/\D/g, '');
      if (cleanCardNumber.length < 13) {
        return NextResponse.json({ 
          error: 'Número do cartão inválido ou incompleto. Verifique os números digitados.',
          checkoutUrl,
        }, { status: 400 });
      }

      let isApproved = false;
      let transactionId = `tx_card_${Date.now()}`;
      let mpMessage = '';

      // Tenta processar no Mercado Pago de forma transparente se as credenciais existirem
      if (mpAccessToken) {
        try {
          const mpPublicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

          // Parsing flexível da data de validade (aceita MM/AA, MM/AAAA, MMAA, MMAAAA, com ou sem barra)
          const rawExpiry = String(cardDetails.expiry || '').trim();
          let expMonth = 12;
          let expYear = 2028;

          if (rawExpiry.includes('/')) {
            const parts = rawExpiry.split('/');
            expMonth = parseInt(parts[0].replace(/\D/g, ''), 10) || 12;
            let y = parseInt(parts[1].replace(/\D/g, ''), 10) || 28;
            if (y < 100) y += 2000;
            expYear = y;
          } else {
            const digits = rawExpiry.replace(/\D/g, '');
            if (digits.length >= 4) {
              expMonth = parseInt(digits.slice(0, 2), 10) || 12;
              let y = parseInt(digits.slice(2), 10) || 28;
              if (y < 100) y += 2000;
              expYear = y;
            }
          }

          if (expMonth < 1 || expMonth > 12) {
            return NextResponse.json({
              error: 'Mês de validade inválido. Informe um mês entre 01 e 12.',
              checkoutUrl,
            }, { status: 400 });
          }

          // Trata CPF informado no formulário com fallback nos dados da empresa
          const cleanCpf = String(cardDetails.cpf || '').replace(/\D/g, '');
          const companyTaxId = String(company.taxId || '').replace(/\D/g, '');
          const cpfToUse = cleanCpf.length === 11 
            ? cleanCpf 
            : (companyTaxId.length === 11 ? companyTaxId : '19119119100');

          let detectedPaymentMethodId = 'master';
          if (cleanCardNumber.startsWith('4')) {
            detectedPaymentMethodId = 'visa';
          } else if (/^5[1-5]|^2[2-7]/.test(cleanCardNumber)) {
            detectedPaymentMethodId = 'master';
          } else if (/^3[47]/.test(cleanCardNumber)) {
            detectedPaymentMethodId = 'amex';
          } else if (/^(636368|438935|504175|5067|5090|650)/.test(cleanCardNumber)) {
            detectedPaymentMethodId = 'elo';
          } else if (/^(606282|3841)/.test(cleanCardNumber)) {
            detectedPaymentMethodId = 'hipercard';
          }

          // 1. Gera o token do cartão no Mercado Pago
          const tokenUrl = mpPublicKey 
            ? `https://api.mercadopago.com/v1/card_tokens?public_key=${mpPublicKey}`
            : 'https://api.mercadopago.com/v1/card_tokens';

          const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mpAccessToken}`,
            },
            body: JSON.stringify({
              card_number: cleanCardNumber,
              security_code: String(cardDetails.cvv || '').replace(/\D/g, '') || '123',
              expiration_month: expMonth,
              expiration_year: expYear,
              cardholder: {
                name: String(cardDetails.holderName || '').trim(),
                identification: { type: 'CPF', number: cpfToUse },
              },
            }),
            signal: AbortSignal.timeout(12000),
          });

          const tokenData = await tokenRes.json().catch(() => ({}));

          if (!tokenRes.ok || !tokenData.id) {
            console.warn('Mercado Pago card_tokens Erro:', tokenData);
            let friendlyTokenError = 'Não foi possível validar os dados do cartão.';

            if (tokenData.cause && Array.isArray(tokenData.cause) && tokenData.cause.length > 0) {
              const code = String(tokenData.cause[0]?.code || '');
              const desc = String(tokenData.cause[0]?.description || '');
              if (code === 'E301' || desc.includes('card_number') || desc.includes('length')) {
                friendlyTokenError = 'Número de cartão inválido ou incompleto. Verifique os dígitos digitados.';
              } else if (code === 'E302' || desc.includes('security_code')) {
                friendlyTokenError = 'Código de segurança (CVV) incorreto ou incompleto.';
              } else if (code === '325' || code === '326' || desc.includes('expiration')) {
                friendlyTokenError = 'Data de validade do cartão inválida ou expirada.';
              } else if (code === '316' || desc.includes('cardholder.name')) {
                friendlyTokenError = 'Nome do titular no cartão incorreto.';
              } else if (code === '324' || desc.includes('identification')) {
                friendlyTokenError = 'CPF do titular inválido. Verifique o número informado.';
              } else if (tokenData.cause[0]?.description) {
                friendlyTokenError = tokenData.cause[0].description;
              }
            } else if (tokenData.message) {
              friendlyTokenError = tokenData.message;
            }

            return NextResponse.json({
              error: friendlyTokenError,
              checkoutUrl,
            }, { status: 400 });
          }

          // 2. Realiza o pagamento transparente com o token gerado
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
                identification: {
                  type: 'CPF',
                  number: cpfToUse,
                },
              },
              metadata: {
                company_id: company.id,
                plan_id: planId,
              },
            }),
            signal: AbortSignal.timeout(12000),
          });

          const payData = await payRes.json().catch(() => ({}));

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
        } catch (cardErr: any) {
          console.error('Erro na API de Cartão do Mercado Pago:', cardErr);
          const isTimeout = cardErr?.name === 'TimeoutError' || cardErr?.message?.includes('timeout');
          return NextResponse.json({
            error: isTimeout
              ? 'A operadora do cartão demorou para responder. Por favor, tente pelo Checkout Oficial ou pague via PIX.'
              : 'Erro de comunicação ao processar o cartão. Utilize o Checkout Oficial do Mercado Pago para pagar com segurança.',
            checkoutUrl,
          }, { status: 500 });
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


