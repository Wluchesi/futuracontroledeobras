import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  return NextResponse.json({ status: 'active', message: 'Webhook endpoint do Mercado Pago ativo e operacional.' }, { status: 200 });
}

// Mapeia planId para dados do plano
function getPlanData(planId: string) {
  if (planId === 'Premium') {
    return { planName: 'Kitneteiro Premium (5 Obras / SINAPI / IA)', maxProjects: 5, maxUsers: 50 };
  } else if (planId === 'Teste1Real') {
    return { planName: 'Kitneteiro Premium (Teste R$ 1,00)', maxProjects: 5, maxUsers: 50 };
  } else if (planId === 'Gratuito') {
    return { planName: 'Plano Gratuito (1 Obra / 4 Kitnets)', maxProjects: 1, maxUsers: 2 };
  }
  // Default: Pro
  return { planName: 'Kitneteiro Pro (1 Obra / Kitnets Ilimitadas)', maxProjects: 1, maxUsers: 10 };
}

// Ativa o plano da empresa no banco de dados
async function activatePlan(companyId: string, planId: string) {
  const { planName, maxProjects, maxUsers } = getPlanData(planId);

  // Verifica se a empresa existe antes de tentar atualizar
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    throw new Error(`Empresa com ID "${companyId}" não encontrada no banco de dados.`);
  }

  const updatedCompany = await prisma.company.update({
    where: { id: companyId },
    data: { planName, maxProjects, maxUsers },
  });

  return updatedCompany;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    // ─────────────────────────────────────────────────────────────────────────
    // CAMINHO 1: Webhook Nativo do Mercado Pago (IPN)
    // Formato: { type: "payment", data: { id: "123456789" } }
    // ─────────────────────────────────────────────────────────────────────────
    if (body.type === 'payment' || body.action === 'payment.updated' || body.data?.id) {
      const paymentId = body.data?.id || body.id;
      console.log(`[Webhook MP] Notificação IPN recebida. Payment ID: ${paymentId}`);

      if (!paymentId || !mpAccessToken) {
        return NextResponse.json({ success: true, message: 'Webhook recebido sem dados de pagamento suficientes.' });
      }

      // Consulta o status real do pagamento no Mercado Pago
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` },
      });

      if (!mpRes.ok) {
        console.error(`[Webhook MP] Falha ao consultar payment ${paymentId} no MP. Status: ${mpRes.status}`);
        return NextResponse.json({ success: true, message: 'Webhook recebido. Não foi possível consultar o MP.' });
      }

      const mpPayment = await mpRes.json();
      console.log(`[Webhook MP] Status do pagamento ${paymentId}: ${mpPayment.status}`);

      if (mpPayment.status === 'approved') {
        const companyId = mpPayment.metadata?.company_id;
        const planId = mpPayment.metadata?.plan_id || 'Pro';

        if (!companyId) {
          console.warn('[Webhook MP] Pagamento aprovado mas sem company_id nos metadados!');
          return NextResponse.json({ success: true, message: 'Pagamento aprovado, mas company_id ausente nos metadados.' });
        }

        const updatedCompany = await activatePlan(companyId, planId);
        console.log(`[Webhook MP] ✅ Plano "${updatedCompany.planName}" ativado para empresa ${companyId}`);
        return NextResponse.json({ success: true, message: 'Plano ativado via webhook do Mercado Pago!', company: updatedCompany });
      }

      // Pagamento não aprovado ainda (ex: pending, in_process)
      return NextResponse.json({ success: true, message: `Webhook recebido. Status atual: ${mpPayment.status}` });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CAMINHO 2: Confirmação Manual do Usuário ("Já Paguei" no Frontend)
    // Formato: { companyId, planId, transactionId, status: "CONFIRMED" }
    // ─────────────────────────────────────────────────────────────────────────
    const { companyId, planId, transactionId, status } = body;

    // Valida os dados mínimos
    if (!companyId || typeof companyId !== 'string' || companyId.trim() === '') {
      console.warn('[Webhook Manual] companyId ausente ou inválido:', companyId);
      return NextResponse.json(
        { error: 'ID da empresa não identificado. Faça login novamente e tente outra vez.' },
        { status: 400 }
      );
    }

    if (!planId) {
      return NextResponse.json({ error: 'Plano não identificado.' }, { status: 400 });
    }

    const isManualConfirm = status === 'CONFIRMED' || status === 'PAYMENT_RECEIVED';

    if (!isManualConfirm) {
      return NextResponse.json({ success: true, message: 'Evento recebido. Aguardando status de confirmação.' });
    }

    // Se tiver um transactionId do MP, valida o pagamento real antes de ativar
    if (transactionId && mpAccessToken && !transactionId.startsWith('tx_mp_sim_')) {
      console.log(`[Webhook Manual] Verificando transação ${transactionId} no Mercado Pago...`);
      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${transactionId}`, {
          headers: { 'Authorization': `Bearer ${mpAccessToken}` },
        });

        if (mpRes.ok) {
          const mpPayment = await mpRes.json();
          console.log(`[Webhook Manual] Status do pagamento ${transactionId}: ${mpPayment.status}`);

          if (mpPayment.status !== 'approved') {
            return NextResponse.json(
              { error: `Pagamento ainda não confirmado pelo banco (status: ${mpPayment.status}). Aguarde alguns instantes e tente novamente.` },
              { status: 402 }
            );
          }
        } else {
          // Se não conseguiu consultar o MP (sandbox pode ser instável), segue sem bloquear
          console.warn(`[Webhook Manual] Não foi possível verificar o pagamento no MP. Ativando plano mesmo assim.`);
        }
      } catch (mpErr) {
        // Não bloqueia por erro de conexão com MP — ativa o plano e loga o aviso
        console.warn('[Webhook Manual] Erro ao consultar MP, ativando plano sem verificação:', mpErr);
      }
    }

    // Ativa o plano
    const updatedCompany = await activatePlan(companyId, planId);
    console.log(`[Webhook Manual] ✅ Plano "${updatedCompany.planName}" ativado para empresa ${companyId}`);

    return NextResponse.json({
      success: true,
      message: 'Pagamento confirmado e plano ativado com sucesso!',
      company: updatedCompany,
    });

  } catch (error: any) {
    console.error('[Webhook] Erro crítico:', error);
    return NextResponse.json(
      { error: `Erro ao processar webhook: ${error.message || 'Erro desconhecido'}` },
      { status: 500 }
    );
  }
}
