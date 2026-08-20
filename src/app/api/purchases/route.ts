import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';
import { getAccountPayableStatus } from '@/lib/calculations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const costCenterId = searchParams.get('costCenterId');
    const supplierId = searchParams.get('supplierId');

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (costCenterId) where.costCenterId = costCenterId;
    if (supplierId) where.supplierId = supplierId;

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        project: true,
        costCenter: true,
        supplier: true,
        budgetItem: true,
        accountsPayable: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(purchases);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      budgetItemId,
      supplierId,
      invoiceNumber,
      description,
      quantity,
      unit,
      unitPrice,
      discount,
      freight,
      paymentCondition,
      dueDate,
      notes,
      attachmentUrl,
      forceConfirm,
    } = body;

    if (!budgetItemId) {
      return NextResponse.json({ error: 'É necessário vincular um item do orçamento.' }, { status: 400 });
    }

    const budgetItem = await prisma.budgetItem.findUnique({
      where: { id: budgetItemId },
      include: { project: true, costCenter: true },
    });

    if (!budgetItem) {
      return NextResponse.json({ error: 'Item do orçamento não encontrado.' }, { status: 404 });
    }

    // Auto-resolução da regra de lançamento único
    const projectId = budgetItem.projectId;
    const costCenterId = budgetItem.costCenterId;
    const selectedSupplierId = supplierId || budgetItem.chosenSupplierId;

    if (!selectedSupplierId) {
      return NextResponse.json({ error: 'Fornecedor é obrigatório.' }, { status: 400 });
    }

    const qty = Number(quantity) || 1;
    const price = Number(unitPrice) || 0;
    const disc = Number(discount) || 0;
    const frt = Number(freight) || 0;
    const totalAmount = Math.max(0, qty * price - disc + frt);

    // 1. Validar Extrapolação do Orçamento
    const currentPurchased = budgetItem.purchasedTotal;
    const contracted = budgetItem.contractedTotal;
    const projectedPurchased = currentPurchased + totalAmount;
    const isExceeded = projectedPurchased > contracted;
    const excessAmount = isExceeded ? projectedPurchased - contracted : 0;

    const exceedRule = budgetItem.project.exceedRule; // 1 = ALERT, 2 = CONFIRM, 3 = BLOCK

    if (isExceeded) {
      if (exceedRule === 3) {
        return NextResponse.json(
          {
            error: 'BLOQUEIO DE COMPRA: Esta compra ultrapassa o orçamento contratado para este item.',
            budget: contracted,
            purchased: currentPurchased,
            currentPurchase: totalAmount,
            projectedPurchased,
            excessAmount,
          },
          { status: 422 }
        );
      }

      if (exceedRule === 2 && !forceConfirm) {
        return NextResponse.json(
          {
            requiresConfirmation: true,
            warning: 'CONFIRMAÇÃO NECESSÁRIA: Esta compra ultrapassa o orçamento contratado para este item.',
            budget: contracted,
            purchased: currentPurchased,
            currentPurchase: totalAmount,
            projectedPurchased,
            excessAmount,
          },
          { status: 409 }
        );
      }
    }

    // Gerar Número da Compra Sequencial
    const count = await prisma.purchase.count({ where: { projectId } });
    const purchaseNumber = `COMP-${String(count + 1).padStart(4, '0')}`;

    const effectiveDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 2. Criar Compra
    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber,
        projectId,
        costCenterId,
        budgetItemId,
        supplierId: selectedSupplierId,
        date: new Date(),
        invoiceNumber,
        description: description || budgetItem.itemName,
        quantity: qty,
        unit: unit || budgetItem.unit,
        unitPrice: price,
        discount: disc,
        freight: frt,
        totalAmount,
        paymentCondition,
        dueDate: effectiveDueDate,
        notes,
        attachmentUrl,
      },
    });

    // 3. Atualizar valor realizado (comprado) no Orçamento
    await prisma.budgetItem.update({
      where: { id: budgetItemId },
      data: {
        purchasedTotal: projectedPurchased,
        status: 'EM_ANDAMENTO',
      },
    });

    // 4. Gerar Título em Contas a Pagar
    const payableStatus = getAccountPayableStatus(effectiveDueDate);

    const accountPayable = await prisma.accountPayable.create({
      data: {
        projectId,
        costCenterId,
        purchaseId: purchase.id,
        supplierId: selectedSupplierId,
        documentNumber: invoiceNumber || purchaseNumber,
        description: `Compra ${purchaseNumber} - ${description || budgetItem.itemName}`,
        amount: totalAmount,
        issueDate: new Date(),
        dueDate: effectiveDueDate,
        status: payableStatus.status,
      },
    });

    await logAuditAction({
      action: 'CREATE',
      entityName: 'Purchase',
      entityId: purchase.id,
      newValue: purchase,
      details: `Compra ${purchaseNumber} criada no valor de R$ ${totalAmount}. Gerado a pagar ID ${accountPayable.id}.`,
    });

    return NextResponse.json(
      {
        purchase,
        accountPayable,
        exceededWarning: isExceeded ? `Atenção: Compra excedeu o orçamento em R$ ${excessAmount.toFixed(2)}` : null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
