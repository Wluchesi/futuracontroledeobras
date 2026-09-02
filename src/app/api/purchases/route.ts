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

    const count = await prisma.purchase.count({ where: { projectId } });
    const purchaseNumber = `COMP-${String(count + 1).padStart(4, '0')}`;
    const effectiveDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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

    await prisma.budgetItem.update({
      where: { id: budgetItemId },
      data: {
        purchasedTotal: projectedPurchased,
        status: 'EM_ANDAMENTO',
      },
    });

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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, quantity, unitPrice, discount, freight, description, invoiceNumber, supplierId, paymentCondition, dueDate, notes } = body;
    if (!id) return NextResponse.json({ error: 'ID da compra é obrigatório.' }, { status: 400 });

    const currentPurchase = await prisma.purchase.findUnique({
      where: { id },
      include: { budgetItem: true, accountsPayable: true },
    });

    if (!currentPurchase) return NextResponse.json({ error: 'Compra não encontrada.' }, { status: 404 });

    const qty = quantity !== undefined ? Number(quantity) : currentPurchase.quantity;
    const price = unitPrice !== undefined ? Number(unitPrice) : currentPurchase.unitPrice;
    const disc = discount !== undefined ? Number(discount) : currentPurchase.discount;
    const frt = freight !== undefined ? Number(freight) : currentPurchase.freight;
    const totalAmount = Math.max(0, qty * price - disc + frt);
    const effectiveDueDate = dueDate ? new Date(dueDate) : currentPurchase.dueDate;
    const suppId = supplierId || currentPurchase.supplierId;

    // Atualizar Compra
    const updatedPurchase = await prisma.purchase.update({
      where: { id },
      data: {
        quantity: qty,
        unitPrice: price,
        discount: disc,
        freight: frt,
        totalAmount,
        description: description || currentPurchase.description,
        invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : currentPurchase.invoiceNumber,
        supplierId: suppId,
        paymentCondition: paymentCondition !== undefined ? paymentCondition : currentPurchase.paymentCondition,
        dueDate: effectiveDueDate,
        notes: notes !== undefined ? notes : currentPurchase.notes,
      },
    });

    // Atualizar item do orçamento afetado (diferença)
    const amountDiff = totalAmount - currentPurchase.totalAmount;
    if (amountDiff !== 0 && currentPurchase.budgetItemId) {
      const budgetItem = await prisma.budgetItem.findUnique({ where: { id: currentPurchase.budgetItemId } });
      if (budgetItem) {
        await prisma.budgetItem.update({
          where: { id: currentPurchase.budgetItemId },
          data: {
            purchasedTotal: Math.max(0, budgetItem.purchasedTotal + amountDiff),
          },
        });
      }
    }

    // Atualizar Contas a Pagar vinculadas
    if (currentPurchase.accountsPayable && currentPurchase.accountsPayable.length > 0) {
      for (const ap of currentPurchase.accountsPayable) {
        if (ap.status !== 'PAGO') {
          const statusInfo = getAccountPayableStatus(effectiveDueDate, ap.paymentDate);
          await prisma.accountPayable.update({
            where: { id: ap.id },
            data: {
              amount: totalAmount,
              supplierId: suppId,
              dueDate: effectiveDueDate,
              documentNumber: invoiceNumber || currentPurchase.purchaseNumber,
              status: statusInfo.status,
            },
          });
        }
      }
    }

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'Purchase',
      entityId: id,
      previousValue: currentPurchase,
      newValue: updatedPurchase,
      details: `Compra ${currentPurchase.purchaseNumber} atualizada. Valor: R$ ${currentPurchase.totalAmount} -> R$ ${totalAmount}.`,
    });

    return NextResponse.json(updatedPurchase);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID da compra é obrigatório.' }, { status: 400 });

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: { budgetItem: true, accountsPayable: true },
    });

    if (!purchase) return NextResponse.json({ error: 'Compra não encontrada.' }, { status: 404 });

    // 1. Remover Contas a Pagar vinculadas não pagas
    if (purchase.accountsPayable && purchase.accountsPayable.length > 0) {
      for (const ap of purchase.accountsPayable) {
        await prisma.accountPayable.delete({ where: { id: ap.id } });
      }
    }

    // 2. Deletar compra
    await prisma.purchase.delete({ where: { id } });

    // 3. Atualizar item de orçamento
    if (purchase.budgetItemId && purchase.budgetItem) {
      await prisma.budgetItem.update({
        where: { id: purchase.budgetItemId },
        data: {
          purchasedTotal: Math.max(0, purchase.budgetItem.purchasedTotal - purchase.totalAmount),
        },
      });
    }

    await logAuditAction({
      action: 'DELETE',
      entityName: 'Purchase',
      entityId: id,
      previousValue: purchase,
      details: `Compra ${purchase.purchaseNumber} excluída no valor de R$ ${purchase.totalAmount}.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
