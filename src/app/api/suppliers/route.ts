import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
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
    const { corporateName, tradeName, taxId, contactPerson, phone, whatsapp, email, address, city, state, supplierType, notes } = body;

    if (!corporateName) {
      return NextResponse.json({ error: 'Razão social é obrigatória.' }, { status: 400 });
    }

    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({ data: { name: 'Empresa Principal' } });
    }

    const created = await prisma.supplier.create({
      data: {
        companyId: company.id,
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
