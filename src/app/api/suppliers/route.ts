import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json([]);
    }

    const suppliers = await prisma.supplier.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            quotations: true,
            purchases: true,
            accountsPayable: true,
          },
        },
      },
      orderBy: { corporateName: 'asc' },
    });
    return NextResponse.json(suppliers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyId, corporateName, tradeName, taxId, contactPerson, phone, whatsapp, email, address, city, state, supplierType, notes } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'ID da empresa é obrigatório.' }, { status: 400 });
    }

    if (!corporateName) {
      return NextResponse.json({ error: 'Razão social é obrigatória.' }, { status: 400 });
    }

    const created = await prisma.supplier.create({
      data: {
        companyId,
        corporateName,
        tradeName,
        taxId,
        contactPerson,
        phone,
        whatsapp: whatsapp || phone,
        email,
        address,
        city: city || 'Passos',
        state: state || 'MG',
        supplierType: supplierType || 'MATERIAL',
        notes,
      },
    });

    await logAuditAction({
      action: 'CREATE',
      entityName: 'Supplier',
      entityId: created.id,
      newValue: created,
      details: `Fornecedor ${created.corporateName} cadastrado.`,
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

    const prev = await prisma.supplier.findUnique({ where: { id } });
    const updated = await prisma.supplier.update({
      where: { id },
      data,
    });

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'Supplier',
      entityId: id,
      previousValue: prev,
      newValue: updated,
      details: `Fornecedor ${updated.corporateName} atualizado.`,
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
    if (!id) return NextResponse.json({ error: 'ID do fornecedor é obrigatório.' }, { status: 400 });

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { quotations: true, purchases: true, accountsPayable: true },
        },
      },
    });

    if (!supplier) return NextResponse.json({ error: 'Fornecedor não encontrado.' }, { status: 404 });

    const totalDeps = supplier._count.quotations + supplier._count.purchases + supplier._count.accountsPayable;

    if (totalDeps > 0) {
      return NextResponse.json(
        {
          error: `Não é possível excluir este fornecedor porque ele possui registros vinculados (${supplier._count.purchases} compras, ${supplier._count.quotations} cotações e ${supplier._count.accountsPayable} contas a pagar).`,
        },
        { status: 400 }
      );
    }

    await prisma.supplier.delete({ where: { id } });

    await logAuditAction({
      action: 'DELETE',
      entityName: 'Supplier',
      entityId: id,
      previousValue: supplier,
      details: `Fornecedor ${supplier.corporateName} excluído.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
