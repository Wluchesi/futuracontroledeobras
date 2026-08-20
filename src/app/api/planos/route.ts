import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { companyId, planName } = await request.json();

    if (!companyId || !planName) {
      return NextResponse.json({ error: 'ID da empresa e nome do plano são obrigatórios.' }, { status: 400 });
    }

    let formattedPlanName = 'Kitneteiro Pro (R$ 49/mês)';
    let maxProjects = 1;
    let maxUsers = 10;

    if (planName.includes('Gratuito') || planName === 'Gratuito') {
      formattedPlanName = 'Plano Gratuito (1 Obra / 4 Kitnets)';
      maxProjects = 1;
      maxUsers = 2;
    } else if (planName.includes('Pro') || planName === 'Pro') {
      formattedPlanName = 'Kitneteiro Pro (1 Obra / Kitnets Ilimitadas)';
      maxProjects = 1;
      maxUsers = 10;
    } else if (planName.includes('Premium') || planName === 'Premium') {
      formattedPlanName = 'Kitneteiro Premium (5 Obras / SINAPI / IA)';
      maxProjects = 5;
      maxUsers = 50;
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        planName: formattedPlanName,
        maxProjects,
        maxUsers,
      },
    });

    return NextResponse.json({ success: true, company: updatedCompany });
  } catch (error: any) {
    console.error('Error updating plan:', error);
    return NextResponse.json({ error: 'Erro ao atualizar plano da empresa.' }, { status: 500 });
  }
}
