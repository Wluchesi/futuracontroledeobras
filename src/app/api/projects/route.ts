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

    const projects = await prisma.project.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            budgetItems: true,
            purchases: true,
            accountsPayable: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      companyId,
      name,
      ownerClient,
      address,
      city,
      state,
      startDate,
      endDate,
      landArea,
      builtArea,
      unitsCount,
      description,
      status,
      exceedRule,
    } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'ID da empresa é obrigatório.' }, { status: 400 });
    }

    if (!name || !ownerClient) {
      return NextResponse.json({ error: 'Nome da obra e proprietário são obrigatórios.' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
    }

    // Validar limite de obras do plano SaaS
    const currentProjectsCount = await prisma.project.count({ where: { companyId } });
    if (company.maxProjects && currentProjectsCount >= company.maxProjects) {
      return NextResponse.json(
        {
          error: `LIMITE DO PLANO ATINGIDO: O seu plano (${company.planName}) permite gerenciar no máximo ${company.maxProjects} obra(s). Faça upgrade na aba Planos para cadastrar mais obras.`,
        },
        { status: 403 }
      );
    }

    const project = await prisma.project.create({
      data: {
        companyId,
        name,
        ownerClient,
        address: address || '',
        city: city || '',
        state: state || 'MG',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(),
        landArea: Number(landArea) || 0,
        builtArea: Number(builtArea) || 0,
        unitsCount: Number(unitsCount) || 1,
        description,
        status: status || 'EM_ANDAMENTO',
        exceedRule: Number(exceedRule) || 1,
      },
    });

    await logAuditAction({
      action: 'CREATE',
      entityName: 'Project',
      entityId: project.id,
      newValue: project,
      details: `Obra ${project.name} criada com sucesso.`,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) return NextResponse.json({ error: 'ID da obra é obrigatório.' }, { status: 400 });

    const prev = await prisma.project.findUnique({ where: { id } });

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        landArea: data.landArea !== undefined ? Number(data.landArea) : undefined,
        builtArea: data.builtArea !== undefined ? Number(data.builtArea) : undefined,
        unitsCount: data.unitsCount !== undefined ? Number(data.unitsCount) : undefined,
        exceedRule: data.exceedRule !== undefined ? Number(data.exceedRule) : undefined,
      },
    });

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'Project',
      entityId: id,
      previousValue: prev,
      newValue: updated,
      details: `Obra ${updated.name} atualizada.`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
