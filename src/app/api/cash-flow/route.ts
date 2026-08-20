import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccountPayableStatus } from '@/lib/calculations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where: any = {};
    if (projectId) where.projectId = projectId;

    const accountsPayable = await prisma.accountPayable.findMany({
      where,
      include: { supplier: true, costCenter: true },
      orderBy: { dueDate: 'asc' },
    });

    const bankAccount = await prisma.bankAccount.findFirst();
    const initialBalance = bankAccount ? bankAccount.initialBalance : 100000;

    let accumRealized = initialBalance;
    let accumProjected = initialBalance;

    let totalEntries = initialBalance; // Capital Inicial
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    const timeline = accountsPayable.map((item) => {
      const statusInfo = getAccountPayableStatus(item.dueDate, item.paymentDate);
      const isPaid = statusInfo.status === 'PAGO';
      const isOverdue = statusInfo.status === 'VENCIDO';

      if (isPaid) {
        totalPaid += item.amount;
        accumRealized -= item.amount;
        accumProjected -= item.amount;
      } else if (isOverdue) {
        totalOverdue += item.amount;
        accumProjected -= item.amount;
      } else {
        totalPending += item.amount;
        accumProjected -= item.amount;
      }

      return {
        id: item.id,
        date: item.paymentDate || item.dueDate,
        description: item.description,
        supplier: item.supplier.tradeName || item.supplier.corporateName,
        category: item.costCenter.name,
        amount: item.amount,
        status: statusInfo.status,
        statusLabel: statusInfo.label,
        badgeColor: statusInfo.badgeColor,
        realizedBalance: accumRealized,
        projectedBalance: accumProjected,
      };
    });

    return NextResponse.json({
      summary: {
        initialBalance,
        totalEntries,
        totalPaid,
        totalPending,
        totalOverdue,
        realizedBalance: accumRealized,
        projectedBalance: accumProjected,
      },
      timeline,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
