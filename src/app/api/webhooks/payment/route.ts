import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  return NextResponse.json({ status: 'active', message: 'Webhook endpoint do Mercado Pago ativo e operacional.' }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { companyId, planId, transactionId, status } = body;

    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    // Trata notificação nativa do Mercado Pago (IPN / Webhook: { action: "payment.updated", data: { id: "12345" } })
    if (body.type === 'payment' || body.action === 'payment.updated' || body.data?.id) {
      const paymentId = body.data?.id || body.id;
      if (paymentId && mpAccessToken) {
        try {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              'Authorization': `Bearer ${mpAccessToken}`,
            },
          });

          if (mpRes.ok) {
            const mpPayment = await mpRes.json();
            if (mpPayment.status === 'approved') {
              status = 'CONFIRMED';
              companyId = mpPayment.metadata?.company_id || companyId;
              planId = mpPayment.metadata?.plan_id || planId || 'Premium';
            }
          }
        } catch (mpErr) {
          console.error('Erro ao consultar pagamento no Mercado Pago:', mpErr);
        }
      }
    }

    if (!companyId) {
      return NextResponse.json({ success: true, message: 'Webhook recebido, aguardando id da empresa.' });
    }

    // Processa confirmação de pagamento vindo do Gateway (Asaas/MercadoPago/Simulador)
    if (status === 'CONFIRMED' || status === 'PAYMENT_RECEIVED' || body.event === 'PAYMENT_RECEIVED' || status === 'approved') {
      let formattedPlanName = 'Kitneteiro Pro (1 Obra / Kitnets Ilimitadas)';
      let maxProjects = 1;
      let maxUsers = 10;

      if (planId === 'Premium') {
        formattedPlanName = 'Kitneteiro Premium (5 Obras / SINAPI / IA)';
        maxProjects = 5;
        maxUsers = 50;
      } else if (planId === 'Gratuito') {
        formattedPlanName = 'Plano Gratuito (1 Obra / 4 Kitnets)';
        maxProjects = 1;
        maxUsers = 2;
      }

      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          planName: formattedPlanName,
          maxProjects,
          maxUsers,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Pagamento confirmado no Mercado Pago e plano ativado com sucesso!',
        company: updatedCompany,
      });
    }

    return NextResponse.json({ success: true, message: 'Evento recebido, aguardando compensação.' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Erro no processamento do webhook.' }, { status: 500 });
  }
}


