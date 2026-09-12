import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkIsSuperAdminEmail } from '@/lib/auth-constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail') || request.headers.get('x-user-email');

    if (!checkIsSuperAdminEmail(userEmail)) {
      return NextResponse.json(
        { error: 'Acesso não autorizado. Apenas Super Administradores da plataforma têm permissão.' },
        { status: 403 }
      );
    }
    const [companies, totalProjects, totalUsers] = await Promise.all([
      prisma.company.findMany({
        include: {
          _count: {
            select: {
              projects: true,
              users: true,
            },
          },
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          projects: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              status: true,
              unitsCount: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count(),
      prisma.user.count(),
    ]);

    let freePlans = 0;
    let proPlans = 0;
    let premiumPlans = 0;

    companies.forEach((c) => {
      const p = (c.planName || '').toLowerCase();
      if (p.includes('premium') || p.includes('teste')) {
        premiumPlans++;
      } else if (p.includes('pro')) {
        proPlans++;
      } else {
        freePlans++;
      }
    });

    const metrics = {
      totalCompanies: companies.length,
      totalUsers,
      totalProjects,
      freePlans,
      proPlans,
      premiumPlans,
    };

    return NextResponse.json({
      success: true,
      metrics,
      companies,
    });
  } catch (error: any) {
    console.error('Error in admin-geral GET:', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar dados de administração.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action, userEmail } = body;
    const emailToCheck = userEmail || request.headers.get('x-user-email');

    if (!checkIsSuperAdminEmail(emailToCheck)) {
      return NextResponse.json(
        { error: 'Acesso não autorizado. Apenas Super Administradores da plataforma têm permissão.' },
        { status: 403 }
      );
    }

    // 1. AÇÃO: Alterar Plano da Empresa (Suporte / Erro de Pagamento / Upgrade Manual)
    if (action === 'update_plan') {
      const { companyId, planType, customPlanName, customMaxProjects, customMaxUsers } = body;

      if (!companyId) {
        return NextResponse.json({ error: 'ID da empresa é obrigatório.' }, { status: 400 });
      }

      let formattedPlan = 'Kitneteiro Pro (1 Obra / Kitnets Ilimitadas)';
      let maxProjects = 1;
      let maxUsers = 20;

      if (planType === 'Gratuito') {
        formattedPlan = 'Plano Gratuito (1 Obra / 4 Kitnets)';
        maxProjects = 1;
        maxUsers = 2;
      } else if (planType === 'Pro') {
        formattedPlan = 'Kitneteiro Pro (1 Obra / Kitnets Ilimitadas)';
        maxProjects = 1;
        maxUsers = 20;
      } else if (planType === 'Premium') {
        formattedPlan = 'Kitneteiro Premium (5 Obras / SINAPI / IA)';
        maxProjects = 5;
        maxUsers = 50;
      } else if (planType === 'Teste') {
        formattedPlan = 'Plano Teste PIX / Cartão (R$ 1,00)';
        maxProjects = 5;
        maxUsers = 50;
      } else if (planType === 'Custom') {
        formattedPlan = customPlanName || 'Plano Personalizado';
        maxProjects = Number(customMaxProjects) || 1;
        maxUsers = Number(customMaxUsers) || 5;
      }

      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          planName: formattedPlan,
          maxProjects,
          maxUsers,
        },
        include: {
          _count: {
            select: { projects: true, users: true },
          },
          users: {
            select: { id: true, name: true, email: true, role: true, createdAt: true },
          },
          projects: {
            select: { id: true, name: true, city: true, state: true, status: true },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Plano da empresa "${updatedCompany.name}" alterado para ${formattedPlan} com sucesso!`,
        company: updatedCompany,
      });
    }

    // 2. AÇÃO: Redefinir Senha de Usuário para Suporte
    if (action === 'reset_user_password') {
      const { userId, newPassword } = body;

      if (!userId || !newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { error: 'A nova senha deve ter no mínimo 6 caracteres.' },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      return NextResponse.json({
        success: true,
        message: 'Senha do usuário redefinida com sucesso!',
      });
    }

    // 3. AÇÃO: Alterar Cargo de Usuário (ex: Delegar permissão de Administrador)
    if (action === 'update_user_role') {
      const { userId, newRole } = body;

      if (!userId || !newRole) {
        return NextResponse.json({ error: 'Usuário e novo cargo são obrigatórios.' }, { status: 400 });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
      });

      return NextResponse.json({
        success: true,
        message: `Cargo do usuário atualizado para ${newRole}!`,
        user: updatedUser,
      });
    }

    return NextResponse.json({ error: 'Ação inválida solicitada.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in admin-geral PUT:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar alteração.' }, { status: 500 });
  }
}
