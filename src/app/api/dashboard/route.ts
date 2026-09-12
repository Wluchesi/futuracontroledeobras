import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccountPayableStatus } from '@/lib/calculations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const companyId = searchParams.get('companyId');

    let whereProject: any = null;

    if (projectId) {
      // Se passou projectId, validar se a obra existe (e se companyId foi passado, se pertence à empresa)
      const project = await prisma.project.findFirst({
        where: { id: projectId, ...(companyId ? { companyId } : {}) },
      });

      if (!project) {
        return NextResponse.json({ error: 'Obra não encontrada para esta empresa.' }, { status: 404 });
      }
      whereProject = { projectId };
    } else if (companyId) {
      // Se não passou projectId mas passou companyId, buscar as obras dessa empresa
      const companyProjects = await prisma.project.findMany({
        where: { companyId },
        select: { id: true },
      });

      if (companyProjects.length === 0) {
        // Empresa sem obras: retornar dashboard limpo com zeros absolutos
        return NextResponse.json({
          kpis: {
            totalContracted: 0,
            totalPurchased: 0,
            totalPaid: 0,
            openAmount: 0,
            overdueAmount: 0,
            budgetBalance: 0,
            percentConsumed: 0,
            quotationSavings: 0,
          },
          alerts: [],
          charts: {
            chart1: [],
            chart2: [],
            chart3: [],
            chart4: [],
            chart5: [],
            chart6: [],
          },
        });
      }

      whereProject = { projectId: { in: companyProjects.map((p) => p.id) } };
    } else {
      // Nenhum identificador passado: não pode vazar dados de outras empresas!
      return NextResponse.json({
        kpis: {
          totalContracted: 0,
          totalPurchased: 0,
          totalPaid: 0,
          openAmount: 0,
          overdueAmount: 0,
          budgetBalance: 0,
          percentConsumed: 0,
          quotationSavings: 0,
        },
        alerts: [],
        charts: {
          chart1: [],
          chart2: [],
          chart3: [],
          chart4: [],
          chart5: [],
          chart6: [],
        },
      });
    }

    // 1. Obter Itens do Orçamento com cotações
    const budgetItems = await prisma.budgetItem.findMany({
      where: whereProject,
      include: {
        costCenter: true,
        quotations: {
          include: { supplier: true },
        },
      },
    });

    // 2. Obter Contas a Pagar
    const accountsPayable = await prisma.accountPayable.findMany({
      where: whereProject,
      include: {
        supplier: true,
        costCenter: true,
        payments: true,
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
    let totalContracted = 0; // Orçado Vencedor / Contratado
    let totalPaid = 0;
    let quotationSavings = 0;

    // Total comprado calculado diretamente das compras reais
    const totalPurchased = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    const costCenterTotals: Record<string, { name: string; code: string; contracted: number; purchased: number }> = {};

    budgetItems.forEach((item) => {
      // Calcular valor do Orçamento Vencedor (Cotação escolhida ou menor cotação ou valor contratado)
      const chosenQuot = item.quotations.find((q) => q.isChosen);
      const quotationsPrices = item.quotations.map((q) => q.finalPrice);
      const lowestQuotPrice = quotationsPrices.length > 0 ? Math.min(...quotationsPrices) : 0;
      const highestQuotPrice = quotationsPrices.length > 0 ? Math.max(...quotationsPrices) : 0;

      // Orçado Vencedor considerado
      const winnerBudget = chosenQuot
        ? chosenQuot.finalPrice
        : lowestQuotPrice > 0
        ? lowestQuotPrice
        : item.contractedTotal || 0;

      totalContracted += winnerBudget;

      // Economia obtida por concorrência ou abaixo do orçamento inicial
      if (highestQuotPrice > 0 && winnerBudget > 0 && highestQuotPrice > winnerBudget) {
        quotationSavings += (highestQuotPrice - winnerBudget);
      } else if (item.contractedTotal > 0 && winnerBudget > 0 && item.contractedTotal > winnerBudget) {
        quotationSavings += (item.contractedTotal - winnerBudget);
      }

      // Agrupamento por Centro de Custo
      const ccCode = item.costCenter.code;
      if (!costCenterTotals[ccCode]) {
        costCenterTotals[ccCode] = {
          code: ccCode,
          name: item.costCenter.name,
          contracted: 0,
          purchased: 0,
        };
      }
      costCenterTotals[ccCode].contracted += winnerBudget;
    });

    // Acumular compras realizadas diretamente no respectivo centro de custo
    purchases.forEach((p) => {
      if (p.costCenter?.code) {
        const ccCode = p.costCenter.code;
        if (!costCenterTotals[ccCode]) {
          costCenterTotals[ccCode] = {
            code: ccCode,
            name: p.costCenter.name,
            contracted: 0,
            purchased: 0,
          };
        }
        costCenterTotals[ccCode].purchased += (p.totalAmount || 0);
      }
    });

    let openAmount = 0; // A vencer
    let overdueAmount = 0; // Vencido
    let partialAmount = 0; // Pago Parcial
    let countOverdue = 0;
    let countDueSoon = 0;
    let dueSoonAmount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    accountsPayable.forEach((acc) => {
      const itemPaid = acc.payments ? acc.payments.reduce((sum, p) => sum + p.amountPaid, 0) : 0;
      totalPaid += itemPaid;

      const statusInfo = getAccountPayableStatus(acc.dueDate, acc.paymentDate, itemPaid, acc.amount);

      if (statusInfo.status === 'PAGO') {
        // Já contabilizado
      } else if (statusInfo.status === 'PAGO_PARCIAL') {
        partialAmount += Math.max(0, acc.amount - itemPaid);
      } else if (statusInfo.status === 'VENCIDO') {
        overdueAmount += acc.amount - itemPaid;
        countOverdue++;
      } else if (statusInfo.status === 'A_VENCER') {
        openAmount += acc.amount - itemPaid;
        const due = new Date(acc.dueDate);
        if (due <= sevenDaysFromNow) {
          countDueSoon++;
          dueSoonAmount += acc.amount - itemPaid;
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
        title: `🟢 Economia obtida com orçamentos vencedores`,
        message: `Você economizou R$ ${quotationSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} escolhendo a cotação vencedora nas concorrências!`,
      });
    }

    // --- DADOS PARA OS 6 GRÁFICOS BI ---

    // Gráfico 1: Orçado (Vencedor) x Realizado por Centro de Custo
    // 1. Centros de custo que têm movimentação (orçado > 0 ou realizado > 0) ordenados numericamente
    const activeCostCenters = Object.values(costCenterTotals)
      .filter((cc) => cc.contracted > 0 || cc.purchased > 0)
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    // 2. Todos ordenados por código para completar se houver poucos
    const allCostCentersSorted = Object.values(costCenterTotals)
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    const selectedCenters = activeCostCenters.length >= 6
      ? activeCostCenters
      : [
          ...activeCostCenters,
          ...allCostCentersSorted.filter((cc) => !activeCostCenters.some((a) => a.code === cc.code)),
        ].slice(0, 10);

    selectedCenters.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    const chart1Data = selectedCenters.map((cc) => ({
      code: cc.code,
      name: cc.name.split('—')[1]?.trim() || cc.name,
      fullName: cc.name,
      'Orçado (Vencedor)': cc.contracted,
      Realizado: cc.purchased,
    }));

    // Gráfico 2: Evolução dos Gastos por Mês (Linha temporal contínua dos últimos 6 meses)
    const now = new Date();
    const monthsList: Array<{ key: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthsList.push({ key });
    }

    const monthlyGastos: Record<string, number> = {};
    monthsList.forEach((m) => {
      monthlyGastos[m.key] = 0;
    });

    purchases.forEach((p) => {
      const pDate = new Date(p.date);
      const monthKey = pDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthlyGastos[monthKey] = (monthlyGastos[monthKey] || 0) + (p.totalAmount || 0);
    });

    const chart2Data = Object.keys(monthlyGastos).map((m) => ({
      month: m,
      Gastos: monthlyGastos[m],
    }));

    // Gráfico 3: Status das Contas (Pagas x Parcial x A vencer x Vencidas)
    let paidCount = 0;
    let partialCount = 0;
    accountsPayable.forEach((acc) => {
      const itemPaid = acc.payments ? acc.payments.reduce((sum, p) => sum + p.amountPaid, 0) : 0;
      const st = getAccountPayableStatus(acc.dueDate, acc.paymentDate, itemPaid, acc.amount).status;
      if (st === 'PAGO') paidCount++;
      if (st === 'PAGO_PARCIAL') partialCount++;
    });

    const chart3Data = [
      { name: 'Pagas Integral', value: paidCount, color: '#10B981' },
      { name: 'Pagas Parcial', value: partialCount, color: '#3B82F6' },
      { name: 'A Vencer', value: Math.max(0, accountsPayable.length - paidCount - partialCount - countOverdue), color: '#F59E0B' },
      { name: 'Vencidas', value: countOverdue, color: '#EF4444' },
    ];

    // Gráfico 4: Distribuição dos Gastos por Centro de Custo
    const chart4Data = Object.values(costCenterTotals)
      .filter((cc) => cc.purchased > 0)
      .map((cc) => ({
        name: cc.name.split('—')[1]?.trim() || cc.name,
        value: cc.purchased,
      }));

    // Gráfico 5: Fluxo de Caixa Real (Saídas Previstas por Vencimento vs Realizadas por Pagamento)
    const cashFlowMonths: Array<{ key: string }> = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      cashFlowMonths.push({ key: d.toLocaleDateString('pt-BR', { month: 'short' }) });
    }
    for (let i = 1; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      cashFlowMonths.push({ key: d.toLocaleDateString('pt-BR', { month: 'short' }) });
    }

    const cashFlowMap: Record<string, { month: string; Previsto: number; Saidas: number }> = {};
    cashFlowMonths.forEach((m) => {
      cashFlowMap[m.key] = { month: m.key, Previsto: 0, Saidas: 0 };
    });

    accountsPayable.forEach((acc) => {
      const dueDate = new Date(acc.dueDate);
      const dueKey = dueDate.toLocaleDateString('pt-BR', { month: 'short' });
      if (cashFlowMap[dueKey]) {
        cashFlowMap[dueKey].Previsto += (acc.amount || 0);
      }
      if (acc.payments && Array.isArray(acc.payments)) {
        acc.payments.forEach((pay) => {
          const payDate = new Date(pay.paymentDate);
          const payKey = payDate.toLocaleDateString('pt-BR', { month: 'short' });
          if (cashFlowMap[payKey]) {
            cashFlowMap[payKey].Saidas += (pay.amountPaid || 0);
          }
        });
      }
    });

    const cashFlowData = Object.values(cashFlowMap);

    // Gráfico 6: Top 10 Fornecedores por Volume Comprado
    const supplierVolumes: Record<string, { name: string; total: number }> = {};
    purchases.forEach((p) => {
      const sName = p.supplier?.tradeName || p.supplier?.corporateName || 'Fornecedor';
      if (!supplierVolumes[sName]) supplierVolumes[sName] = { name: sName, total: 0 };
      supplierVolumes[sName].total += p.totalAmount;
    });

    const chart6Data = Object.values(supplierVolumes)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Métricas Operacionais / Técnicas para Engenharia (sem dados financeiros confidenciais da conta)
    const plannedItemsCount = budgetItems.filter((i) => !i.status || i.status === 'PLANEJADO').length;
    const inProgressItemsCount = budgetItems.filter((i) => i.status === 'EM_ANDAMENTO').length;
    const completedItemsCount = budgetItems.filter((i) => i.status === 'CONCLUIDO').length;

    const engineering = {
      totalItems: budgetItems.length,
      plannedItems: plannedItemsCount,
      inProgressItems: inProgressItemsCount,
      completedItems: completedItemsCount,
      quotationsCount: budgetItems.reduce((sum, i) => sum + (i.quotations?.length || 0), 0),
      purchasesCount: purchases.length,
      activeStagesCount: activeCostCenters.length,
      statusChart: [
        { name: 'Concluídos', value: completedItemsCount, color: '#10B981' },
        { name: 'Em Andamento', value: inProgressItemsCount, color: '#3B82F6' },
        { name: 'Planejados', value: plannedItemsCount, color: '#94A3B8' },
      ],
    };

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
      engineering,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
