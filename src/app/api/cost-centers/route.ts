import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';

export async function GET() {
  try {
    const costCenters = await prisma.costCenter.findMany({
      orderBy: { code: 'asc' },
    });
    return NextResponse.json(costCenters);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, category, description, isActive } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'Código e Nome do centro de custo são obrigatórios.' }, { status: 400 });
    }

    const created = await prisma.costCenter.create({
      data: {
        code,
        name: name.includes('—') ? name : `${code} — ${name}`,
        category: category || 'Geral',
        description,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    await logAuditAction({
      action: 'CREATE',
      entityName: 'CostCenter',
      entityId: created.id,
      newValue: created,
      details: `Centro de custo ${created.name} cadastrado.`,
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
    if (!id) return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });

    const prev = await prisma.costCenter.findUnique({ where: { id } });
    const updated = await prisma.costCenter.update({
      where: { id },
      data,
    });

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'CostCenter',
      entityId: id,
      previousValue: prev,
      newValue: updated,
      details: `Centro de custo ${updated.name} alterado.`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
