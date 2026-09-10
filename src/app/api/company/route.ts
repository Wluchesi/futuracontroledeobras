import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    let company;
    if (companyId) {
      company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          _count: {
            select: { users: true, projects: true },
          },
        },
      });
    } else {
      company = await prisma.company.findFirst({
        include: {
          _count: {
            select: { users: true, projects: true },
          },
        },
      });
    }

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, taxId, planName, maxProjects, maxUsers, isSuperAdmin } = body;

    if (!id) return NextResponse.json({ error: 'ID da empresa é obrigatório.' }, { status: 400 });

    const prev = await prisma.company.findUnique({ where: { id } });
    if (!prev) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });

    const updateData: any = {
      name: name || prev.name,
      taxId: taxId !== undefined ? taxId : prev.taxId,
    };

    // Apenas Super Admin pode alterar limites e plano via PUT manual
    if (isSuperAdmin) {
      if (planName) updateData.planName = planName;
      if (maxProjects !== undefined) updateData.maxProjects = Number(maxProjects);
      if (maxUsers !== undefined) updateData.maxUsers = Number(maxUsers);
    }

    const updated = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'Company',
      entityId: id,
      previousValue: prev,
      newValue: updated,
      details: `Dados da empresa atualizados (Nome: ${updated.name}, CNPJ/CPF: ${updated.taxId}).`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
