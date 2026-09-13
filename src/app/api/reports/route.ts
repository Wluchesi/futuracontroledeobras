import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccountPayableStatus } from '@/lib/calculations';
import { calculateBudgetItemTotals } from '@/lib/budget-sync';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'cost-center';
    const projectId = searchParams.get('projectId');

    const whereProject = projectId ? { projectId } : {};

    if (type === 'cost-center') {
      const budgetItems = await prisma.budgetItem.findMany({
        where: whereProject,
        include: {
          costCenter: true,
          purchases: {
            select: {
              id: true,
              totalAmount: true,
              accountsPayable: {
                select: {
                  id: true,
                  payments: {
                    select: {
                      id: true,
                      amountPaid: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const costCenterMap: Record<string, any> = {};

      budgetItems.forEach((item) => {
        const totals = calculateBudgetItemTotals(item);
        const code = item.costCenter.code;
        if (!costCenterMap[code]) {
          costCenterMap[code] = {
            code,
            name: item.costCenter.name,
            contracted: 0,
            purchased: 0,
            paid: 0,
            balance: 0,
            percentConsumed: 0,
            itemCount: 0,
          };
        }
        costCenterMap[code].contracted += totals.contractedTotal;
        costCenterMap[code].purchased += totals.purchasedTotal;
        costCenterMap[code].paid += totals.paidTotal;
        costCenterMap[code].itemCount++;
      });

      const reportData = Object.values(costCenterMap).map((cc) => {
        const balance = Math.max(0, cc.contracted - cc.paid);
        const percentConsumed = cc.contracted > 0 ? (cc.purchased / cc.contracted) * 100 : 0;
        return {
          ...cc,
          balance,
          percentConsumed,
        };
      });

      return NextResponse.json(reportData);
    }

    if (type === 'suppliers') {
      const suppliers = await prisma.supplier.findMany({
        include: {
          purchases: {
            where: whereProject,
          },
          accountsPayable: {
            where: whereProject,
          },
        },
      });

      const reportData = suppliers.map((sup) => {
        const totalPurchased = sup.purchases.reduce((acc, p) => acc + p.totalAmount, 0);
        const purchaseCount = sup.purchases.length;
        const averageTicket = purchaseCount > 0 ? totalPurchased / purchaseCount : 0;

        let paidAmount = 0;
        let openAmount = 0;

        sup.accountsPayable.forEach((acc) => {
          const statusInfo = getAccountPayableStatus(acc.dueDate, acc.paymentDate);
          if (statusInfo.status === 'PAGO') {
            paidAmount += acc.amount;
          } else {
            openAmount += acc.amount;
          }
        });

        return {
          id: sup.id,
          name: sup.tradeName || sup.corporateName,
          taxId: sup.taxId || '-',
          supplierType: sup.supplierType,
          totalPurchased,
          purchaseCount,
          averageTicket,
          paidAmount,
          openAmount,
        };
      });

      return NextResponse.json(reportData.sort((a, b) => b.totalPurchased - a.totalPurchased));
    }

    if (type === 'budget') {
      const budgetItems = await prisma.budgetItem.findMany({
        where: whereProject,
        include: {
          costCenter: true,
          chosenSupplier: true,
          quotations: true,
          purchases: {
            select: {
              id: true,
              totalAmount: true,
              accountsPayable: {
                select: {
                  id: true,
                  payments: {
                    select: {
                      id: true,
                      amountPaid: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { code: 'asc' },
      });

      const reportData = budgetItems.map((item) => {
        const totals = calculateBudgetItemTotals(item);
        const prices = item.quotations.map((q) => q.finalPrice);
        const lowestQuotation = prices.length > 0 ? Math.min(...prices) : 0;

        return {
          code: item.code,
          stage: item.stage,
          itemName: item.itemName,
          costCenter: item.costCenter.name,
          quantity: item.quantity,
          unit: item.unit,
          contractedUnitPrice: item.contractedUnitPrice,
          contractedTotal: totals.contractedTotal,
          lowestQuotation,
          purchasedTotal: totals.purchasedTotal,
          paidTotal: totals.paidTotal,
          balance: totals.balance,
          supplier: item.chosenSupplier ? item.chosenSupplier.tradeName || item.chosenSupplier.corporateName : '-',
        };
      });

      return NextResponse.json(reportData);
    }

    if (type === 'cash-flow') {
      const accountsPayable = await prisma.accountPayable.findMany({
        where: whereProject,
        include: {
          supplier: true,
          costCenter: true,
          project: true,
        },
        orderBy: { dueDate: 'asc' },
      });

      let initialBalance = 0;
      if (projectId) {
        const proj = await prisma.project.findUnique({ where: { id: projectId } });
        if (proj) {
          const bankAccount = await prisma.bankAccount.findFirst({ where: { companyId: proj.companyId } });
          initialBalance = bankAccount ? bankAccount.initialBalance : 0;
        }
      }

      let runningRealized = initialBalance;
      let runningProjected = initialBalance;

      const reportData = accountsPayable.map((item) => {
        const statusInfo = getAccountPayableStatus(item.dueDate, item.paymentDate);
        const isPaid = statusInfo.status === 'PAGO';

        if (isPaid) {
          runningRealized -= item.amount;
          runningProjected -= item.amount;
        } else {
          runningProjected -= item.amount;
        }

        return {
          id: item.id,
          dueDate: new Date(item.dueDate).toLocaleDateString('pt-BR'),
          paymentDate: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('pt-BR') : '-',
          description: item.description,
          supplier: item.supplier ? (item.supplier.tradeName || item.supplier.corporateName) : '-',
          costCenter: item.costCenter?.name || '-',
          paymentMethod: item.paymentMethod || 'PIX',
          amount: item.amount,
          status: statusInfo.status,
          statusLabel: statusInfo.label,
          badgeColor: statusInfo.badgeColor,
          realizedBalance: runningRealized,
          projectedBalance: runningProjected,
        };
      });

      return NextResponse.json(reportData);
    }

    return NextResponse.json({ error: 'Tipo de relatório inválido' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
