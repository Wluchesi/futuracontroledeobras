import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';

export async function GET() {
  try {
    let company = await prisma.company.findFirst({
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
    });

    if (!company) {
      company = await prisma.company.create({
        data: { name: 'Construtora Kitnet Passos Ltda', taxId: '12.345.678/0001-99' },
        include: {
          _count: {
            select: { users: true, projects: true },
          },
        },
      });
    }

    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, taxId, planName, maxProjects, maxUsers } = body;

    if (!id) return NextResponse.json({ error: 'ID da empresa é obrigatório.' }, { status: 400 });

    const prev = await prisma.company.findUnique({ where: { id } });

    const updated = await prisma.company.update({
      where: { id },
      data: {
        name,
        taxId,
        planName,
        maxProjects: Number(maxProjects) || 10,
        maxUsers: Number(maxUsers) || 20,
      },
    });

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'Company',
      entityId: id,
      previousValue: prev,
      newValue: updated,
      details: `Dados da empresa e limitações de uso do SaaS atualizados (Plano: ${updated.planName}, Máx Obras: ${updated.maxProjects}, Máx Usuários: ${updated.maxUsers}).`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
