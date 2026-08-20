import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';

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

    // 2. Dar baixa na Conta a Pagar (Status = 🟢 PAGO)
    const updatedPayable = await prisma.accountPayable.update({
      where: { id: accountPayableId },
      data: {
        paymentDate: payDate,
        paymentMethod: paymentMethod || 'PIX',
        bankAccountId: bankAccountId || null,
        status: 'PAGO',
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
      const newPaidTotal = budgetItem.paidTotal + paidVal;
      const newBalance = Math.max(0, budgetItem.contractedTotal - newPaidTotal);

      await prisma.budgetItem.update({
        where: { id: budgetItem.id },
        data: {
          paidTotal: newPaidTotal,
          balance: newBalance,
          status: newBalance === 0 ? 'CONCLUIDO' : 'EM_ANDAMENTO',
        },
      });
    }

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'AccountPayable',
      entityId: accountPayableId,
      newValue: payment,
      details: `Pagamento efetuado no valor de R$ ${paidVal}. Status alterado para 🟢 PAGO.`,
    });

    return NextResponse.json({ success: true, payment, updatedPayable }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
