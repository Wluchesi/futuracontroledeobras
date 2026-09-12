import { prisma } from '@/lib/prisma';

export interface BudgetItemWithRelations {
  id: string;
  quantity: number;
  contractedUnitPrice: number;
  chosenSupplierId?: string | null;
  status?: string;
  purchases?: Array<{
    id: string;
    totalAmount: number;
    accountsPayable?: Array<{
      id: string;
      payments?: Array<{
        amountPaid: number;
      }>;
    }>;
  }>;
}

/**
 * Calcula os totais exatos de um item de orçamento baseado nas compras e pagamentos reais.
 */
export function calculateBudgetItemTotals(item: BudgetItemWithRelations) {
  const contractedTotal = (Number(item.quantity) || 0) * (Number(item.contractedUnitPrice) || 0);

  let purchasedTotal = 0;
  let paidTotal = 0;

  if (item.purchases && Array.isArray(item.purchases)) {
    for (const p of item.purchases) {
      purchasedTotal += Number(p.totalAmount) || 0;
      if (p.accountsPayable && Array.isArray(p.accountsPayable)) {
        for (const ap of p.accountsPayable) {
          if (ap.payments && Array.isArray(ap.payments)) {
            for (const pay of ap.payments) {
              paidTotal += Number(pay.amountPaid) || 0;
            }
          }
        }
      }
    }
  }

  const balance = Math.max(0, contractedTotal - paidTotal);

  let status = item.status || 'PLANEJADO';
  if (item.chosenSupplierId && item.contractedUnitPrice > 0) {
    if (balance === 0 && paidTotal > 0 && contractedTotal > 0) {
      status = 'CONCLUIDO';
    } else if (paidTotal > 0 || purchasedTotal > 0) {
      status = 'EM_ANDAMENTO';
    } else {
      status = 'CONTRATADO';
    }
  } else {
    if (paidTotal > 0 || purchasedTotal > 0) {
      status = 'EM_ANDAMENTO';
    } else {
      status = 'PLANEJADO';
    }
  }

  return {
    contractedTotal,
    purchasedTotal,
    paidTotal,
    balance,
    status,
  };
}

/**
 * Reconcilia e atualiza no banco de dados um item específico do orçamento.
 */
export async function syncBudgetItemTotals(budgetItemId: string) {
  try {
    const item = await prisma.budgetItem.findUnique({
      where: { id: budgetItemId },
      include: {
        purchases: {
          include: {
            accountsPayable: {
              include: {
                payments: true,
              },
            },
          },
        },
      },
    });

    if (!item) return null;

    const totals = calculateBudgetItemTotals(item);

    return await prisma.budgetItem.update({
      where: { id: budgetItemId },
      data: {
        contractedTotal: totals.contractedTotal,
        purchasedTotal: totals.purchasedTotal,
        paidTotal: totals.paidTotal,
        balance: totals.balance,
        status: totals.status,
      },
    });
  } catch (error) {
    console.error(`Erro ao sincronizar totais do item de orçamento ${budgetItemId}:`, error);
    return null;
  }
}

/**
 * Sincroniza todos os itens de um projeto (ou de todos os projetos).
 */
export async function syncAllProjectBudgetItems(projectId?: string) {
  try {
    const where = projectId ? { projectId } : {};
    const items = await prisma.budgetItem.findMany({
      where,
      include: {
        purchases: {
          include: {
            accountsPayable: {
              include: {
                payments: true,
              },
            },
          },
        },
      },
    });

    for (const item of items) {
      const totals = calculateBudgetItemTotals(item);
      const needsUpdate =
        Math.abs(item.paidTotal - totals.paidTotal) > 0.001 ||
        Math.abs(item.purchasedTotal - totals.purchasedTotal) > 0.001 ||
        Math.abs(item.contractedTotal - totals.contractedTotal) > 0.001 ||
        Math.abs(item.balance - totals.balance) > 0.001 ||
        item.status !== totals.status;

      if (needsUpdate) {
        await prisma.budgetItem.update({
          where: { id: item.id },
          data: {
            contractedTotal: totals.contractedTotal,
            purchasedTotal: totals.purchasedTotal,
            paidTotal: totals.paidTotal,
            balance: totals.balance,
            status: totals.status,
          },
        });
      }
    }
  } catch (error) {
    console.error('Erro ao sincronizar itens de orçamento do projeto:', error);
  }
}
