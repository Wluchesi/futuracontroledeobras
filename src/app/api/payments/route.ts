import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';
import { getAccountPayableStatus } from '@/lib/calculations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountPayableId = searchParams.get('accountPayableId');

    const where: any = {};
    if (accountPayableId) where.accountPayableId = accountPayableId;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        accountPayable: {
          include: { supplier: true, costCenter: true },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    return NextResponse.json(payments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountPayableId, amountPaid, paymentDate, paymentMethod, bankAccountId, receiptAttachmentUrl, notes } = body;

    if (!accountPayableId || !amountPaid) {
      return NextResponse.json({ error: 'ID da conta a pagar e Valor pago são obrigatórios.' }, { status: 400 });
    }

    const payable = await prisma.accountPayable.findUnique({
      where: { id: accountPayableId },
      include: {
        payments: true,
        purchase: {
          include: { budgetItem: true },
        },
      },
    });

    if (!payable) {
      return NextResponse.json({ error: 'Conta a pagar não encontrada.' }, { status: 404 });
    }

    const payDate = paymentDate ? new Date(paymentDate) : new Date();
    const paidVal = Number(amountPaid);

    // 1. Criar registro de Pagamento
    const payment = await prisma.payment.create({
      data: {
        accountPayableId,
        amountPaid: paidVal,
        paymentDate: payDate,
        paymentMethod: paymentMethod || 'PIX',
        receiptAttachmentUrl,
        notes,
      },
    });

    // Recalcular total pago até agora para esta conta
    const previousPaidTotal = payable.payments.reduce((acc, p) => acc + p.amountPaid, 0);
    const newTotalPaidForAccount = previousPaidTotal + paidVal;
    const isFullyPaid = newTotalPaidForAccount >= payable.amount;

    const newStatus = isFullyPaid
      ? 'PAGO'
      : getAccountPayableStatus(payable.dueDate, null, newTotalPaidForAccount, payable.amount).status;

    // 2. Dar baixa parcial ou total na Conta a Pagar
    const updatedPayable = await prisma.accountPayable.update({
      where: { id: accountPayableId },
      data: {
        paymentDate: isFullyPaid ? payDate : null,
        paymentMethod: paymentMethod || 'PIX',
        bankAccountId: bankAccountId || payable.bankAccountId,
        status: newStatus,
      },
    });

    // 3. Atualizar saldo da Conta Bancária se selecionada
    if (bankAccountId) {
      const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (bank) {
        await prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            currentBalance: bank.currentBalance - paidVal,
          },
        });
      }
    }

    // 4. Atualizar Total Pago e Saldo do Orçamento se houver compra vinculada
    if (payable.purchase && payable.purchase.budgetItem) {
      const budgetItem = payable.purchase.budgetItem;
      const newPaidTotalBudget = budgetItem.paidTotal + paidVal;
      const newBalanceBudget = Math.max(0, budgetItem.contractedTotal - newPaidTotalBudget);

      await prisma.budgetItem.update({
        where: { id: budgetItem.id },
        data: {
          paidTotal: newPaidTotalBudget,
          balance: newBalanceBudget,
          status: newBalanceBudget === 0 ? 'CONCLUIDO' : 'EM_ANDAMENTO',
        },
      });
    }

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'AccountPayable',
      entityId: accountPayableId,
      newValue: payment,
      details: `Pagamento efetuado no valor de R$ ${paidVal}. Novo status: ${newStatus}.`,
    });

    return NextResponse.json({ success: true, payment, updatedPayable }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID do pagamento é obrigatório.' }, { status: 400 });

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        accountPayable: {
          include: {
            payments: true,
            purchase: { include: { budgetItem: true } },
          },
        },
      },
    });

    if (!payment) return NextResponse.json({ error: 'Pagamento não encontrado.' }, { status: 404 });

    const payable = payment.accountPayable;
    const paidVal = payment.amountPaid;

    // 1. Deletar o pagamento
    await prisma.payment.delete({ where: { id } });

    // Recalcular saldo remanescente pago
    const remainingPayments = payable.payments.filter((p) => p.id !== id);
    const remainingPaidTotal = remainingPayments.reduce((acc, p) => acc + p.amountPaid, 0);

    const newStatus = getAccountPayableStatus(
      payable.dueDate,
      remainingPaidTotal >= payable.amount ? new Date() : null,
      remainingPaidTotal,
      payable.amount
    ).status;

    // 2. Atualizar status da conta a pagar
    await prisma.accountPayable.update({
      where: { id: payable.id },
      data: {
        paymentDate: remainingPaidTotal >= payable.amount ? payable.paymentDate : null,
        status: newStatus,
      },
    });

    // 3. Estornar saldo do Orçamento
    if (payable.purchase && payable.purchase.budgetItem) {
      const budgetItem = payable.purchase.budgetItem;
      const newPaidTotalBudget = Math.max(0, budgetItem.paidTotal - paidVal);
      const newBalanceBudget = Math.max(0, budgetItem.contractedTotal - newPaidTotalBudget);

      await prisma.budgetItem.update({
        where: { id: budgetItem.id },
        data: {
          paidTotal: newPaidTotalBudget,
          balance: newBalanceBudget,
          status: newPaidTotalBudget > 0 ? 'EM_ANDAMENTO' : 'PLANEJADO',
        },
      });
    }

    await logAuditAction({
      action: 'DELETE',
      entityName: 'Payment',
      entityId: id,
      previousValue: payment,
      details: `Estorno de baixa efetuado no valor de R$ ${paidVal}.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
