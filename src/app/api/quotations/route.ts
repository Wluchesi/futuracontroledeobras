import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateQuotationFinalPrice } from '@/lib/calculations';
import { logAuditAction } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const budgetItemId = searchParams.get('budgetItemId');
    const projectId = searchParams.get('projectId');

    if (!budgetItemId && !projectId) {
      return NextResponse.json([]);
    }

    const where: any = {};
    if (budgetItemId) where.budgetItemId = budgetItemId;
    if (projectId) where.projectId = projectId;

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        supplier: true,
        budgetItem: {
          include: { costCenter: true },
        },
      },
      orderBy: { finalPrice: 'asc' },
    });

    return NextResponse.json(quotations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      budgetItemId: providedBudgetItemId,
      newItem,
      projectId,
      supplierId,
      date,
      validityDate,
      quantity,
      unitPrice,
      freight,
      discount,
      taxes,
      deliveryDays,
      paymentTerms,
      notes,
      attachmentUrl,
      isChosen,
    } = body;

    if (!supplierId) {
      return NextResponse.json({ error: 'Fornecedor é obrigatório.' }, { status: 400 });
    }

    let resolvedBudgetItemId = providedBudgetItemId;
    let budgetItem: any = null;

    // Se não passou budgetItemId, mas passou dados para criar um novo item na hora
    if (!resolvedBudgetItemId) {
      const itemData = newItem || body;
      const itemName = itemData.itemName;
      let costCenterId = itemData.costCenterId;
      const targetProjectId = projectId || itemData.projectId;

      if (!targetProjectId || !itemName) {
        return NextResponse.json(
          { error: 'Obra e Nome do item são obrigatórios para criar um novo item no orçamento.' },
          { status: 400 }
        );
      }

      if (!costCenterId) {
        const firstCc = await prisma.costCenter.findFirst({ where: { isActive: true }, orderBy: { code: 'asc' } });
        costCenterId = firstCc?.id;
      }

      if (!costCenterId) {
        return NextResponse.json({ error: 'Centro de custo é obrigatório.' }, { status: 400 });
      }

      const cc = await prisma.costCenter.findUnique({ where: { id: costCenterId } });
      const stageName = itemData.stage || (cc ? `${cc.code}. ${cc.name}` : 'Etapa Geral');
      const itemQty = Number(quantity || itemData.quantity) || 1;
      const itemPrice = Number(unitPrice || itemData.unitPrice) || 0;

      const count = await prisma.budgetItem.count({ where: { projectId: targetProjectId } });
      const code = `ORC-${String(count + 1).padStart(4, '0')}`;

      budgetItem = await prisma.budgetItem.create({
        data: {
          projectId: targetProjectId,
          costCenterId,
          code,
          stage: stageName,
          itemName,
          description: itemData.description || null,
          unit: itemData.unit || 'un',
          quantity: itemQty,
          contractedUnitPrice: isChosen ? itemPrice : 0,
          contractedTotal: isChosen ? itemQty * itemPrice : 0,
          purchasedTotal: 0,
          paidTotal: 0,
          balance: isChosen ? itemQty * itemPrice : 0,
          chosenSupplierId: isChosen ? supplierId : null,
          status: isChosen ? 'CONTRATADO' : 'PLANEJADO',
          notes: notes || null,
        },
      });

      resolvedBudgetItemId = budgetItem.id;
    } else {
      budgetItem = await prisma.budgetItem.findUnique({ where: { id: resolvedBudgetItemId } });
      if (!budgetItem) return NextResponse.json({ error: 'Item do orçamento não encontrado.' }, { status: 404 });
    }

    const budgetItemId = resolvedBudgetItemId;

    const qty = Number(quantity) || budgetItem.quantity || 1;
    const price = Number(unitPrice) || 0;
    const frt = Number(freight) || 0;
    const disc = Number(discount) || 0;
    const tx = Number(taxes) || 0;

    const finalPrice = calculateQuotationFinalPrice(qty, price, frt, disc, tx);

    if (isChosen) {
      await prisma.quotation.updateMany({
        where: { budgetItemId },
        data: { isChosen: false },
      });
    }

    const quotation = await prisma.quotation.create({
      data: {
        budgetItemId,
        projectId: projectId || budgetItem.projectId,
        supplierId,
        date: date ? new Date(date) : new Date(),
        validityDate: validityDate ? new Date(validityDate) : null,
        quantity: qty,
        unitPrice: price,
        freight: frt,
        discount: disc,
        taxes: tx,
        finalPrice,
        deliveryDays: Number(deliveryDays) || 0,
        paymentTerms: paymentTerms || 'À vista',
        notes,
        attachmentUrl,
        isChosen: !!isChosen,
      },
      include: {
        supplier: true,
        budgetItem: true,
      },
    });

    if (isChosen) {
      const unitPriceComputed = qty > 0 ? finalPrice / qty : price;
      await prisma.budgetItem.update({
        where: { id: budgetItemId },
        data: {
          chosenSupplierId: supplierId,
          contractedUnitPrice: unitPriceComputed,
          contractedTotal: finalPrice,
          balance: Math.max(0, finalPrice - budgetItem.paidTotal),
          status: 'CONTRATADO',
        },
      });
    }

    await logAuditAction({
      action: 'CREATE',
      entityName: 'Quotation',
      entityId: quotation.id,
      newValue: quotation,
      details: `Cotação cadastrada para o item ${budgetItem.code} - ${quotation.supplier.tradeName || quotation.supplier.corporateName}.`,
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      budgetItemId,
      supplierId,
      quantity,
      unitPrice,
      freight,
      discount,
      taxes,
      deliveryDays,
      paymentTerms,
      notes,
      isChosen,
      validityDate,
    } = body;

    if (!id) return NextResponse.json({ error: 'ID da cotação é obrigatório.' }, { status: 400 });

    const currentQuotation = await prisma.quotation.findUnique({
      where: { id },
      include: { budgetItem: true },
    });

    if (!currentQuotation) return NextResponse.json({ error: 'Cotação não encontrada.' }, { status: 404 });

    const qty = quantity !== undefined ? Number(quantity) : currentQuotation.quantity;
    const price = unitPrice !== undefined ? Number(unitPrice) : currentQuotation.unitPrice;
    const frt = freight !== undefined ? Number(freight) : currentQuotation.freight;
    const disc = discount !== undefined ? Number(discount) : currentQuotation.discount;
    const tx = taxes !== undefined ? Number(taxes) : currentQuotation.taxes;
    const finalPrice = calculateQuotationFinalPrice(qty, price, frt, disc, tx);
    const suppId = supplierId || currentQuotation.supplierId;
    const targetBudgetItemId = budgetItemId || currentQuotation.budgetItemId;

    const willBeChosen = isChosen !== undefined ? isChosen : currentQuotation.isChosen;

    if (willBeChosen) {
      await prisma.quotation.updateMany({
        where: { budgetItemId: targetBudgetItemId },
        data: { isChosen: false },
      });

      const unitPriceComputed = qty > 0 ? finalPrice / qty : price;
      await prisma.budgetItem.update({
        where: { id: targetBudgetItemId },
        data: {
          chosenSupplierId: suppId,
          contractedUnitPrice: unitPriceComputed,
          contractedTotal: finalPrice,
          balance: Math.max(0, finalPrice - currentQuotation.budgetItem.paidTotal),
          status: 'CONTRATADO',
        },
      });
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        budgetItemId: targetBudgetItemId,
        supplierId: suppId,
        quantity: qty,
        unitPrice: price,
        freight: frt,
        discount: disc,
        taxes: tx,
        finalPrice,
        deliveryDays: deliveryDays !== undefined ? Number(deliveryDays) : currentQuotation.deliveryDays,
        paymentTerms: paymentTerms !== undefined ? paymentTerms : currentQuotation.paymentTerms,
        notes: notes !== undefined ? notes : currentQuotation.notes,
        isChosen: willBeChosen,
        validityDate: validityDate ? new Date(validityDate) : currentQuotation.validityDate,
      },
      include: { supplier: true, budgetItem: true },
    });

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'Quotation',
      entityId: id,
      previousValue: currentQuotation,
      newValue: updated,
      details: `Cotação ${id} atualizada com sucesso.`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating quotation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID da cotação é obrigatório.' }, { status: 400 });

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { budgetItem: true },
    });

    if (!quotation) return NextResponse.json({ error: 'Cotação não encontrada.' }, { status: 404 });

    await prisma.quotation.delete({ where: { id } });

    // Se era a cotação escolhida, recalcular item de orçamento
    if (quotation.isChosen) {
      const remainingChosen = await prisma.quotation.findFirst({
        where: { budgetItemId: quotation.budgetItemId, isChosen: true },
      });

      if (!remainingChosen) {
        await prisma.budgetItem.update({
          where: { id: quotation.budgetItemId },
          data: {
            chosenSupplierId: null,
            status: 'PLANEJADO',
          },
        });
      }
    }

    await logAuditAction({
      action: 'DELETE',
      entityName: 'Quotation',
      entityId: id,
      previousValue: quotation,
      details: `Cotação ${id} excluída.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
