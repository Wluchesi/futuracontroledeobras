import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where: any = {};
    if (projectId) where.projectId = projectId;

    const budgetItems = await prisma.budgetItem.findMany({
      where,
      include: {
        costCenter: true,
        chosenSupplier: true,
        quotations: {
          include: {
            supplier: true,
          },
          orderBy: { finalPrice: 'asc' },
        },
        purchases: {
          select: {
            id: true,
            totalAmount: true,
            quantity: true,
          },
        },
      },
      orderBy: [{ code: 'asc' }],
    });

    // Enriquecer dados com cálculos automáticos
    const enriched = budgetItems.map((item) => {
      const quotationsPrices = item.quotations.map((q) => q.finalPrice);
      const lowestQuotation = quotationsPrices.length > 0 ? Math.min(...quotationsPrices) : 0;
      const highestQuotation = quotationsPrices.length > 0 ? Math.max(...quotationsPrices) : 0;
      const chosenQuotation = item.quotations.find((q) => q.isChosen || q.supplierId === item.chosenSupplierId);
      const chosenPrice = chosenQuotation ? chosenQuotation.finalPrice : item.contractedTotal;
      const quotationEconomy = highestQuotation > 0 && chosenPrice > 0 ? Math.max(0, highestQuotation - chosenPrice) : 0;

      const contractedTotal = item.quantity * item.contractedUnitPrice;
      const balance = Math.max(0, contractedTotal - item.paidTotal);

      return {
        ...item,
        contractedTotal,
        balance,
        lowestQuotation,
        highestQuotation,
        quotationEconomy,
        quotationCount: item.quotations.length,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, costCenterId, code, stage, itemName, description, unit, quantity, contractedUnitPrice, chosenSupplierId, notes } = body;

    if (!projectId || !costCenterId || !itemName) {
      return NextResponse.json({ error: 'Obra, Centro de custo e Nome do item são obrigatórios.' }, { status: 400 });
    }

    const qty = Number(quantity) || 0;
    const unitPrice = Number(contractedUnitPrice) || 0;
    const contractedTotal = qty * unitPrice;

    // Gerar código sequencial se não informado
    let itemCode = code;
    if (!itemCode) {
      const count = await prisma.budgetItem.count({ where: { projectId } });
      itemCode = `ORC-${String(count + 1).padStart(4, '0')}`;
    }

    const created = await prisma.budgetItem.create({
      data: {
        projectId,
        costCenterId,
        code: itemCode,
        stage: stage || 'Etapa Geral',
        itemName,
        description,
        unit: unit || 'un',
        quantity: qty,
        contractedUnitPrice: unitPrice,
        contractedTotal: contractedTotal,
        purchasedTotal: 0,
        paidTotal: 0,
        balance: contractedTotal,
        chosenSupplierId: chosenSupplierId || null,
        status: 'PLANEJADO',
        notes,
      },
      include: {
        costCenter: true,
        chosenSupplier: true,
      },
    });

    await logAuditAction({
      action: 'CREATE',
      entityName: 'BudgetItem',
      entityId: created.id,
      newValue: created,
      details: `Item de orçamento ${created.code} - ${created.itemName} cadastrado.`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID do item é obrigatório.' }, { status: 400 });

    const prev = await prisma.budgetItem.findUnique({ where: { id } });
    if (!prev) return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 });

    const qty = data.quantity !== undefined ? Number(data.quantity) : prev.quantity;
    const unitPrice = data.contractedUnitPrice !== undefined ? Number(data.contractedUnitPrice) : prev.contractedUnitPrice;
    const contractedTotal = qty * unitPrice;
    const paidTotal = data.paidTotal !== undefined ? Number(data.paidTotal) : prev.paidTotal;
    const balance = contractedTotal - paidTotal;

    const updated = await prisma.budgetItem.update({
      where: { id },
      data: {
        ...data,
        quantity: qty,
        contractedUnitPrice: unitPrice,
        contractedTotal,
        balance,
      },
      include: {
        costCenter: true,
        chosenSupplier: true,
      },
    });

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'BudgetItem',
      entityId: id,
      previousValue: prev,
      newValue: updated,
      details: `Item de orçamento ${updated.code} alterado. Preço anterior: R$ ${prev.contractedUnitPrice} -> Novo: R$ ${unitPrice}`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
