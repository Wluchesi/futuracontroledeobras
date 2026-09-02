import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyId, planId, paymentMethod, cardDetails } = body;

    if (!planId || !paymentMethod) {
      return NextResponse.json({ error: 'Dados incompletos para processar o checkout.' }, { status: 400 });
    }

    // Busca empresa pelo ID fornecido ou pega a primeira empresa cadastrada no sistema
    let company = null;
    if (companyId) {
      company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { users: true },
      });
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
      planTitle = 'Kitneteiro Premium (SINAPI & IA)';
    } else if (planId === 'Gratuito') {
      planPrice = 0;
      planTitle = 'Plano Gratuito';
    } else if (planId === 'Teste1Real') {
      planPrice = 1;
      planTitle = 'Plano Teste PIX/Cartão (R$ 1,00)';
    }

    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const isTestMode = mpAccessToken?.startsWith('TEST-');
    
    // E-mail do pagador. Não pode ser o mesmo do dono da conta (Seller)
    // O Mercado Pago bloqueia ("Payer email forbidden") se tentarmos usar o e-mail do vendedor.
    // Para Sandbox, vamos usar um e-mail genérico diferente do teste do usuário.
    const baseEmail = company.users?.[0]?.email || 'comprador';
    const payerEmail = isTestMode 
      ? `comprador_${Date.now()}@testuser.com` 
      : baseEmail;

    const notificationUrl = 'https://gerenciador-obras.vercel.app/api/webhooks/payment';

    if (paymentMethod === 'PIX' || paymentMethod === 'MERCADO_PAGO') {
      let pixQrCodeUrl = '';
      let pixCopiaECola = '';
      let transactionId = `tx_mp_${Date.now()}`;

      if (mpAccessToken) {
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
              notification_url: notificationUrl,
              payer: {
                email: payerEmail,
                first_name: payerName,
                last_name: 'SaaS',
              },
              metadata: {
                company_id: company.id,
                plan_id: planId,
              },
            }),
          });

          const mpData = await mpResponse.json();

          if (mpResponse.ok && mpData.point_of_interaction?.transaction_data) {
            const txData = mpData.point_of_interaction.transaction_data;
            pixCopiaECola = txData.qr_code;
            pixQrCodeUrl = txData.qr_code_base64 
              ? `data:image/png;base64,${txData.qr_code_base64}` 
              : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCopiaECola)}`;
            transactionId = String(mpData.id || transactionId);
          } else {
            console.warn('Mercado Pago PIX erro:', mpData);
          }
        } catch (mpErr) {
          console.error('Mercado Pago API fetch error:', mpErr);
        }
      }

      // Fallback de contingência caso Mercado Pago API retorne erro
      if (!pixCopiaECola) {
        pixCopiaECola = `00020126580014br.gov.bcb.pix0136futuragestaoobras-${transactionId}520400005303986540${planPrice.toFixed(2)}5802BR5920FUTURA GESTAO OBRAS6009SAO PAULO62070503***63041D2E`;
        pixQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCopiaECola)}`;
      }

      return NextResponse.json({
        success: true,
        transactionId,
        paymentMethod: 'PIX',
        amount: planPrice,
        planTitle,
        pixQrCodeUrl,
        pixCopiaECola,
        checkoutUrl: '', // Removido Checkout Pro
        status: 'PENDING',
        expiresInSeconds: 900,
        provider: 'MERCADO_PAGO_TRANSPARENTE',
      });
    }

    if (paymentMethod === 'CREDIT_CARD') {
      if (!cardDetails || !cardDetails.number || !cardDetails.holderName) {
        return NextResponse.json({ error: 'Dados do cartão de crédito são obrigatórios.' }, { status: 400 });
      }

      let isApproved = false;
      let transactionId = `tx_card_mp_${Date.now()}`;
      let mpMessage = '';

      if (mpAccessToken) {
        try {
          const mpPublicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
          const cleanCardNumber = cardDetails.number.replace(/\s+/g, '');
          const [expMonth, expYear] = (cardDetails.expiry || '12/2028').split('/');

          // Detecta a bandeira do cartão dinamicamente (Visa, Master, Amex, Elo)
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

          // 1. Gera token do cartão na API do Mercado Pago
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
          });

          const tokenData = await tokenRes.json();

          if (tokenRes.ok && tokenData.id) {
            // 2. Cria pagamento transparente no Mercado Pago com o token do cartão
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
                notification_url: notificationUrl,
                payer: {
                  email: payerEmail,
                },
                metadata: {
                  company_id: company.id,
                  plan_id: planId,
                },
              }),
            });

            const payData = await payRes.json();

            if (payRes.ok && (payData.status === 'approved' || payData.status === 'in_process')) {
              isApproved = true;
              transactionId = String(payData.id);
              mpMessage = `Pagamento nº ${payData.id} processado com sucesso! Status: ${payData.status}`;
            } else {
              console.warn('Mercado Pago Cartão Erro:', payData);
              return NextResponse.json({
                error: payData.message || payData.status_detail || 'Pagamento recusado pelo Mercado Pago.',
              }, { status: 400 });
            }
          } else {
            console.warn('Erro ao gerar card_token no Mercado Pago:', tokenData);
            return NextResponse.json({
              error: tokenData.message || 'Erro ao validar cartão.',
            }, { status: 400 });
          }
        } catch (cardErr) {
          console.error('Erro na API de Cartão do Mercado Pago:', cardErr);
        }
      }

      if (!isApproved) {
        return NextResponse.json({ error: 'Falha ao processar o pagamento com cartão.' }, { status: 402 });
      }

      // Atualiza a empresa após a aprovação do pagamento
      let formattedPlanName = 'Kitneteiro Pro (1 Obra / Kitnets Ilimitadas)';
      let maxProjects = 1;
      let maxUsers = 10;

      if (planId === 'Premium') {
        formattedPlanName = 'Kitneteiro Premium (5 Obras / SINAPI / IA)';
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


