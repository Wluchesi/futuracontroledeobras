import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccountPayableStatus } from '@/lib/calculations';
import { logAuditAction } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const statusFilter = searchParams.get('status');

    const where: any = {};
    if (projectId) where.projectId = projectId;

    const payables = await prisma.accountPayable.findMany({
      where,
      include: {
        project: true,
        costCenter: true,
        supplier: true,
        purchase: true,
        bankAccount: true,
        payments: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();

    const formatted = payables.map((item) => {
      const computed = getAccountPayableStatus(item.dueDate, item.paymentDate);
      return {
        ...item,
        status: computed.status,
        daysOverdue: computed.daysOverdue,
        statusLabel: computed.label,
        badgeColor: computed.badgeColor,
      };
    });

    if (statusFilter) {
      return NextResponse.json(formatted.filter((f) => f.status === statusFilter));
    }

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, costCenterId, supplierId, purchaseId, documentNumber, description, amount, issueDate, dueDate, notes } = body;

    if (!projectId || !costCenterId || !supplierId || !amount) {
      return NextResponse.json({ error: 'Obra, Centro de custo, Fornecedor e Valor são obrigatórios.' }, { status: 400 });
    }

    const effDueDate = new Date(dueDate);
    const computedStatus = getAccountPayableStatus(effDueDate);

    const created = await prisma.accountPayable.create({
      data: {
        projectId,
        costCenterId,
        supplierId,
        purchaseId: purchaseId || null,
        documentNumber,
        description: description || 'Lançamento Financeiro',
        amount: Number(amount) || 0,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: effDueDate,
        status: computedStatus.status,
        notes,
      },
      include: {
        supplier: true,
        costCenter: true,
      },
    });

    await logAuditAction({
      action: 'CREATE',
      entityName: 'AccountPayable',
      entityId: created.id,
      newValue: created,
      details: `Conta a pagar R$ ${amount} (${created.supplier.tradeName || created.supplier.corporateName}) criada.`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
