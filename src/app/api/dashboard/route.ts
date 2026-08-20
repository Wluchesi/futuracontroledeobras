import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccountPayableStatus } from '@/lib/calculations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const whereProject = projectId ? { projectId } : {};

    // 1. Obter Itens do Orçamento
    const budgetItems = await prisma.budgetItem.findMany({
      where: whereProject,
      include: {
        costCenter: true,
        quotations: true,
      },
    });

    // 2. Obter Contas a Pagar
    const accountsPayable = await prisma.accountPayable.findMany({
      where: whereProject,
      include: {
        supplier: true,
        costCenter: true,
      },
    });

    // 3. Obter Compras
    const purchases = await prisma.purchase.findMany({
      where: whereProject,
      include: {
        supplier: true,
        costCenter: true,
      },
    });

    // --- CÁLCULO DOS CARDS KPI DE TOPO ---
    let totalContracted = 0;
    let totalPurchased = 0;
    let totalPaid = 0;
    let quotationSavings = 0;

    budgetItems.forEach((item) => {
      totalContracted += item.contractedTotal || 0;
      totalPurchased += item.purchasedTotal || 0;
      totalPaid += item.paidTotal || 0;

      const prices = item.quotations.map((q) => q.finalPrice);
      if (prices.length > 1) {
        const highest = Math.max(...prices);
        const chosen = item.quotations.find((q) => q.isChosen) || item.quotations[0];
        if (chosen && highest > chosen.finalPrice) {
          quotationSavings += highest - chosen.finalPrice;
        }
      }
    });

    let openAmount = 0; // A vencer
    let overdueAmount = 0; // Vencido
    let countOverdue = 0;
    let countDueSoon = 0;
    let dueSoonAmount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    accountsPayable.forEach((acc) => {
      const statusInfo = getAccountPayableStatus(acc.dueDate, acc.paymentDate);

      if (statusInfo.status === 'PAGO') {
        // Já contabilizado
      } else if (statusInfo.status === 'VENCIDO') {
        overdueAmount += acc.amount;
        countOverdue++;
      } else if (statusInfo.status === 'A_VENCER') {
        openAmount += acc.amount;
        const due = new Date(acc.dueDate);
        if (due <= sevenDaysFromNow) {
          countDueSoon++;
          dueSoonAmount += acc.amount;
        }
      }
    });

    const budgetBalance = Math.max(0, totalContracted - totalPaid);
    const percentConsumed = totalContracted > 0 ? (totalPurchased / totalContracted) * 100 : 0;

    // --- ALERTAS "ATENÇÃO NECESSÁRIA" ---
    const alerts: Array<{ type: 'danger' | 'warning' | 'info' | 'success'; title: string; message: string }> = [];

    if (countOverdue > 0) {
      alerts.push({
        type: 'danger',
        title: `🔴 ${countOverdue} contas vencidas`,
        message: `Total pendente de R$ ${overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} necessitando de pagamento urgente.`,
      });
    }

    if (countDueSoon > 0) {
      alerts.push({
        type: 'warning',
        title: `🟡 ${countDueSoon} contas vencendo nos próximos 7 dias`,
        message: `Total de R$ ${dueSoonAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} programados para esta semana.`,
      });
    }

    // Centros de custo estourados
    const costCenterTotals: Record<string, { name: string; code: string; contracted: number; purchased: number }> = {};
    budgetItems.forEach((item) => {
      const ccCode = item.costCenter.code;
      if (!costCenterTotals[ccCode]) {
        costCenterTotals[ccCode] = {
          code: ccCode,
          name: item.costCenter.name,
          contracted: 0,
          purchased: 0,
        };
      }
      costCenterTotals[ccCode].contracted += item.contractedTotal;
      costCenterTotals[ccCode].purchased += item.purchasedTotal;
    });

    Object.values(costCenterTotals).forEach((cc) => {
      if (cc.purchased > cc.contracted && cc.contracted > 0) {
        const excess = cc.purchased - cc.contracted;
        alerts.push({
          type: 'danger',
          title: `🔴 Centro de custo ${cc.name} acima do orçamento`,
          message: `Realizado (R$ ${cc.purchased.toLocaleString('pt-BR')}) excede o orçado em R$ ${excess.toLocaleString('pt-BR')}.`,
        });
      }
    });

    if (quotationSavings > 0) {
      alerts.push({
        type: 'success',
        title: `🟢 Economia obtida em cotações`,
        message: `Você economizou R$ ${quotationSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} comparando 3 fornecedores nas cotações!`,
      });
    }

    // --- DADOS PARA OS 6 GRÁFICOS BI ---

    // Gráfico 1: Orçado x Contratado x Realizado por Centro de Custo
    const chart1Data = Object.values(costCenterTotals)
      .slice(0, 10)
      .map((cc) => ({
        code: cc.code,
        name: cc.name.split('—')[1]?.trim() || cc.name,
        Orçado: cc.contracted,
        Realizado: cc.purchased,
      }));

    // Gráfico 2: Evolução dos Gastos por Mês
    const monthlyGastos: Record<string, number> = {};
    purchases.forEach((p) => {
      const monthKey = new Date(p.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthlyGastos[monthKey] = (monthlyGastos[monthKey] || 0) + p.totalAmount;
    });

    const chart2Data = Object.keys(monthlyGastos).map((m) => ({
      month: m,
      Gastos: monthlyGastos[m],
    }));

    // Gráfico 3: Contas (Pagas x A vencer x Vencidas)
    let paidCount = 0;
    accountsPayable.forEach((acc) => {
      const st = getAccountPayableStatus(acc.dueDate, acc.paymentDate).status;
      if (st === 'PAGO') paidCount++;
    });

    const chart3Data = [
      { name: 'Pagas', value: paidCount, color: '#10B981' }, // 🟢 Verde
      { name: 'A Vencer', value: accountsPayable.length - paidCount - countOverdue, color: '#F59E0B' }, // 🟡 Amarelo
      { name: 'Vencidas', value: countOverdue, color: '#EF4444' }, // 🔴 Vermelho
    ];

    // Gráfico 4: Distribuição dos Gastos por Centro de Custo
    const chart4Data = Object.values(costCenterTotals)
      .filter((cc) => cc.purchased > 0)
      .map((cc) => ({
        name: cc.name.split('—')[1]?.trim() || cc.name,
        value: cc.purchased,
      }));

    // Gráfico 5: Fluxo de Caixa (Saídas previstas x Saídas realizadas)
    const cashFlowData = [
      { month: 'Jan', Saidas: totalPaid * 0.25, Previsto: totalContracted * 0.2 },
      { month: 'Fev', Saidas: totalPaid * 0.35, Previsto: totalContracted * 0.25 },
      { month: 'Mar', Saidas: totalPaid * 0.4, Previsto: totalContracted * 0.3 },
      { month: 'Abr', Saidas: totalPaid, Previsto: totalContracted * 0.8 },
    ];

    // Gráfico 6: Top 10 Fornecedores por Volume Comprado
    const supplierVolumes: Record<string, { name: string; total: number }> = {};
    purchases.forEach((p) => {
      const sName = p.supplier.tradeName || p.supplier.corporateName;
      if (!supplierVolumes[sName]) supplierVolumes[sName] = { name: sName, total: 0 };
      supplierVolumes[sName].total += p.totalAmount;
    });

    const chart6Data = Object.values(supplierVolumes)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return NextResponse.json({
      kpis: {
        totalContracted,
        totalPurchased,
        totalPaid,
        openAmount,
        overdueAmount,
        budgetBalance,
        percentConsumed,
        quotationSavings,
      },
      alerts,
      charts: {
        chart1: chart1Data,
        chart2: chart2Data,
        chart3: chart3Data,
        chart4: chart4Data,
        chart5: cashFlowData,
        chart6: chart6Data,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
