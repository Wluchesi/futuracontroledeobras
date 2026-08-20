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
    const { budgetItemId, projectId, supplierId, date, validityDate, quantity, unitPrice, freight, discount, taxes, deliveryDays, paymentTerms, notes, attachmentUrl, isChosen } = body;

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

    // Se a nova cotação for selecionada como escolhida, desseleciona outras
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
        paymentTerms,
        notes,
        attachmentUrl,
        isChosen: !!isChosen,
      },
      include: {
        supplier: true,
        budgetItem: true,
      },
    });

    // Se foi escolhida, atualiza o item do orçamento
    if (isChosen) {
      const unitPriceComputed = qty > 0 ? finalPrice / qty : price;
      await prisma.budgetItem.update({
        where: { id: budgetItemId },
        data: {
          chosenSupplierId: supplierId,
          contractedUnitPrice: unitPriceComputed,
          contractedTotal: finalPrice,
          balance: finalPrice - budgetItem.paidTotal,
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
    const { id, isChosen, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID da cotação é obrigatório.' }, { status: 400 });

    const currentQuotation = await prisma.quotation.findUnique({
      where: { id },
      include: { budgetItem: true },
    });

    if (!currentQuotation) return NextResponse.json({ error: 'Cotação não encontrada.' }, { status: 404 });

    if (isChosen) {
      // Marcar apenas esta como escolhida para o item
      await prisma.quotation.updateMany({
        where: { budgetItemId: currentQuotation.budgetItemId },
        data: { isChosen: false },
      });

      const qty = currentQuotation.quantity || 1;
      const unitPriceComputed = qty > 0 ? currentQuotation.finalPrice / qty : currentQuotation.unitPrice;

      await prisma.budgetItem.update({
        where: { id: currentQuotation.budgetItemId },
        data: {
          chosenSupplierId: currentQuotation.supplierId,
          contractedUnitPrice: unitPriceComputed,
          contractedTotal: currentQuotation.finalPrice,
          balance: currentQuotation.finalPrice - currentQuotation.budgetItem.paidTotal,
          status: 'CONTRATADO',
        },
      });
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        ...data,
        isChosen: isChosen !== undefined ? isChosen : currentQuotation.isChosen,
      },
      include: { supplier: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
