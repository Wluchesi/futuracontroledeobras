import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: {
            projects: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, companies });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Erro ao buscar empresas.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, taxId, planName } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Nome da empresa é obrigatório.' }, { status: 400 });
    }

    let formattedPlan = 'Kitneteiro Pro (1 Obra / Kitnets Ilimitadas)';
    let maxProjects = 1;
    let maxUsers = 10;

    if (planName === 'Gratuito') {
      formattedPlan = 'Plano Gratuito (1 Obra / 4 Kitnets)';
      maxProjects = 1;
      maxUsers = 2;
    } else if (planName === 'Premium') {
      formattedPlan = 'Kitneteiro Premium (5 Obras / SINAPI / IA)';
      maxProjects = 5;
      maxUsers = 50;
    }

    const company = await prisma.company.create({
      data: {
        name,
        taxId,
        planName: formattedPlan,
        maxProjects,
        maxUsers,
      },
    });

    return NextResponse.json({ success: true, company });
  } catch (error: any) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar empresa.' }, { status: 500 });
  }
}
