import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateQuotationFinalPrice } from '@/lib/calculations';
import { logAuditAction } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const budgetItemId = searchParams.get('budgetItemId');
    const projectId = searchParams.get('projectId');

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
      budgetItemId,
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

    if (!budgetItemId || !supplierId) {
      return NextResponse.json({ error: 'Item do orçamento e Fornecedor são obrigatórios.' }, { status: 400 });
    }

    const budgetItem = await prisma.budgetItem.findUnique({ where: { id: budgetItemId } });
    if (!budgetItem) return NextResponse.json({ error: 'Item do orçamento não encontrado.' }, { status: 404 });

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
    const { id, isChosen, quantity, unitPrice, freight, discount, taxes, supplierId, paymentTerms, ...data } = body;
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

    const willBeChosen = isChosen !== undefined ? isChosen : currentQuotation.isChosen;

    if (willBeChosen) {
      await prisma.quotation.updateMany({
        where: { budgetItemId: currentQuotation.budgetItemId },
        data: { isChosen: false },
      });

      const unitPriceComputed = qty > 0 ? finalPrice / qty : price;
      await prisma.budgetItem.update({
        where: { id: currentQuotation.budgetItemId },
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
        ...data,
        supplierId: suppId,
        quantity: qty,
        unitPrice: price,
        freight: frt,
        discount: disc,
        taxes: tx,
        finalPrice,
        paymentTerms: paymentTerms !== undefined ? paymentTerms : currentQuotation.paymentTerms,
        isChosen: willBeChosen,
      },
      include: { supplier: true, budgetItem: true },
    });

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'Quotation',
      entityId: id,
      previousValue: currentQuotation,
      newValue: updated,
      details: `Cotação ${id} atualizada.`,
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
