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

    const formatted = payables.map((item) => {
      const totalPaid = item.payments ? item.payments.reduce((acc, p) => acc + p.amountPaid, 0) : 0;
      const computed = getAccountPayableStatus(item.dueDate, item.paymentDate, totalPaid, item.amount);
      return {
        ...item,
        totalPaid,
        balanceRemaining: Math.max(0, item.amount - totalPaid),
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, dueDate, amount, description, supplierId, costCenterId, documentNumber, notes } = body;
    if (!id) return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });

    const current = await prisma.accountPayable.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!current) return NextResponse.json({ error: 'Conta a pagar não encontrada.' }, { status: 404 });

    const effDueDate = dueDate ? new Date(dueDate) : current.dueDate;
    const newAmount = amount !== undefined ? Number(amount) : current.amount;
    const totalPaid = current.payments ? current.payments.reduce((acc, p) => acc + p.amountPaid, 0) : 0;

    const computed = getAccountPayableStatus(effDueDate, current.paymentDate, totalPaid, newAmount);

    const updated = await prisma.accountPayable.update({
      where: { id },
      data: {
        dueDate: effDueDate,
        amount: newAmount,
        description: description || current.description,
        supplierId: supplierId || current.supplierId,
        costCenterId: costCenterId || current.costCenterId,
        documentNumber: documentNumber !== undefined ? documentNumber : current.documentNumber,
        notes: notes !== undefined ? notes : current.notes,
        status: computed.status,
      },
      include: { supplier: true, costCenter: true, payments: true },
    });

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'AccountPayable',
      entityId: id,
      previousValue: current,
      newValue: updated,
      details: `Conta a pagar ${id} atualizada. Vencimento: ${effDueDate.toISOString().split('T')[0]}.`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });

    const current = await prisma.accountPayable.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });

    await prisma.accountPayable.delete({ where: { id } });

    await logAuditAction({
      action: 'DELETE',
      entityName: 'AccountPayable',
      entityId: id,
      previousValue: current,
      details: `Conta a pagar ${id} excluída.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
