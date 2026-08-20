import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { companyName, taxId, userName, email, password, planName } = await request.json();

    if (!companyName || !userName || !email || !password) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Já existe uma conta cadastrada com este e-mail.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let formattedPlanName = 'Kitneteiro Pro (R$ 49/mês)';
    let maxProjects = 1;
    let maxUsers = 10;

    if (planName === 'Gratuito') {
      formattedPlanName = 'Plano Gratuito (1 Obra / 4 Kitnets)';
      maxProjects = 1;
      maxUsers = 2;
    } else if (planName === 'Pro') {
      formattedPlanName = 'Kitneteiro Pro (1 Obra / Kitnets Ilimitadas)';
      maxProjects = 1;
      maxUsers = 10;
    } else if (planName === 'Premium') {
      formattedPlanName = 'Kitneteiro Premium (5 Obras / SINAPI / IA)';
      maxProjects = 5;
      maxUsers = 50;
    }

    // Criar a empresa e o usuário Admin associado
    const company = await prisma.company.create({
      data: {
        name: companyName,
        taxId,
        planName: formattedPlanName,
        maxProjects,
        maxUsers,
        users: {
          create: {
            name: userName,
            email: email.toLowerCase().trim(),
            passwordHash,
            role: 'ADMIN',
          },
        },
      },
      include: {
        users: true,
      },
    });

    const createdUser = company.users[0];
    const { passwordHash: _, ...userWithoutPassword } = createdUser;

    return NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        company: {
          id: company.id,
          name: company.name,
          taxId: company.taxId,
          planName: company.planName,
          maxProjects: company.maxProjects,
          maxUsers: company.maxUsers,
        },
      },
    });
  } catch (error: any) {
    console.error('Error registering SaaS tenant:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar empresa e usuário.' }, { status: 500 });
  }
}
