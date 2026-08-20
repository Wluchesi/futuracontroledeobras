import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccountPayableStatus } from '@/lib/calculations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'cost-center';
    const projectId = searchParams.get('projectId');

    const whereProject = projectId ? { projectId } : {};

    if (type === 'cost-center') {
      const budgetItems = await prisma.budgetItem.findMany({
        where: whereProject,
        include: { costCenter: true },
      });

      const costCenterMap: Record<string, any> = {};

      budgetItems.forEach((item) => {
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
        costCenterMap[code].contracted += item.contractedTotal;
        costCenterMap[code].purchased += item.purchasedTotal;
        costCenterMap[code].paid += item.paidTotal;
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
        },
        orderBy: { code: 'asc' },
      });

      const reportData = budgetItems.map((item) => {
        const prices = item.quotations.map((q) => q.finalPrice);
        const lowestQuotation = prices.length > 0 ? Math.min(...prices) : 0;
        const balance = Math.max(0, item.contractedTotal - item.paidTotal);

        return {
          code: item.code,
          stage: item.stage,
          itemName: item.itemName,
          costCenter: item.costCenter.name,
          quantity: item.quantity,
          unit: item.unit,
          contractedUnitPrice: item.contractedUnitPrice,
          contractedTotal: item.contractedTotal,
          lowestQuotation,
          purchasedTotal: item.purchasedTotal,
          paidTotal: item.paidTotal,
          balance,
          supplier: item.chosenSupplier ? item.chosenSupplier.tradeName || item.chosenSupplier.corporateName : '-',
        };
      });

      return NextResponse.json(reportData);
    }

    return NextResponse.json({ error: 'Tipo de relatório inválido' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
