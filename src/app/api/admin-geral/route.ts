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

    // 4. AÇÃO: Editar Cadastro Completo da Empresa (Nome, CNPJ/CPF, Limites)
    if (action === 'update_company') {
      const { companyId, name, taxId, maxProjects, maxUsers } = body;

      if (!companyId || !name?.trim()) {
        return NextResponse.json({ error: 'ID e Nome da construtora são obrigatórios.' }, { status: 400 });
      }

      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          name: name.trim(),
          taxId: taxId ? taxId.trim() : null,
          ...(maxProjects !== undefined && maxProjects !== null ? { maxProjects: Number(maxProjects) } : {}),
          ...(maxUsers !== undefined && maxUsers !== null ? { maxUsers: Number(maxUsers) } : {}),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Cadastro da empresa "${updatedCompany.name}" atualizado com sucesso!`,
        company: updatedCompany,
      });
    }

    // 5. AÇÃO: Excluir Empresa (Cascade em obras, usuários e lançamentos)
    if (action === 'delete_company') {
      const { companyId } = body;

      if (!companyId) {
        return NextResponse.json({ error: 'ID da empresa é obrigatório.' }, { status: 400 });
      }

      const companyToDelete = await prisma.company.findUnique({
        where: { id: companyId },
        include: { users: true },
      });

      if (!companyToDelete) {
        return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
      }

      const hasCurrentUser = companyToDelete.users.some(
        (u) => u.email.toLowerCase() === emailToCheck?.toLowerCase()
      );
      if (hasCurrentUser) {
        return NextResponse.json(
          { error: 'Não é permitido excluir a construtora vinculada ao seu usuário administrador ativo.' },
          { status: 400 }
        );
      }

      await prisma.company.delete({
        where: { id: companyId },
      });

      return NextResponse.json({
        success: true,
        message: `Empresa "${companyToDelete.name}" e seus registros foram removidos com sucesso!`,
      });
    }

    // 6. AÇÃO: Editar Cadastro Completo do Usuário (Nome, E-mail, Cargo, Senha opcional)
    if (action === 'update_user') {
      const { userId, name, email, role, newPassword } = body;

      if (!userId || !name?.trim() || !email?.trim()) {
        return NextResponse.json({ error: 'ID, Nome e E-mail do usuário são obrigatórios.' }, { status: 400 });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const existingUserWithEmail = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: { id: userId },
        },
      });

      if (existingUserWithEmail) {
        return NextResponse.json(
          { error: `O e-mail "${normalizedEmail}" já pertence a outro usuário cadastrado no sistema.` },
          { status: 400 }
        );
      }

      const dataToUpdate: any = {
        name: name.trim(),
        email: normalizedEmail,
        ...(role ? { role } : {}),
      };

      if (newPassword && newPassword.trim().length > 0) {
        if (newPassword.trim().length < 6) {
          return NextResponse.json(
            { error: 'Se for alterar a senha, ela deve ter no mínimo 6 caracteres.' },
            { status: 400 }
          );
        }
        dataToUpdate.passwordHash = await bcrypt.hash(newPassword.trim(), 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
      });

      return NextResponse.json({
        success: true,
        message: `Cadastro do usuário "${updatedUser.name}" atualizado com sucesso!`,
        user: updatedUser,
      });
    }

    // 7. AÇÃO: Excluir Usuário
    if (action === 'delete_user') {
      const { userId } = body;

      if (!userId) {
        return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
      }

      const userToDelete = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userToDelete) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      }

      if (userToDelete.email.toLowerCase() === emailToCheck?.toLowerCase()) {
        return NextResponse.json(
          { error: 'Você não pode excluir o seu próprio usuário administrador conectado.' },
          { status: 400 }
        );
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      return NextResponse.json({
        success: true,
        message: `Usuário "${userToDelete.name}" (${userToDelete.email}) excluído com sucesso!`,
      });
    }

    return NextResponse.json({ error: 'Ação inválida solicitada.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in admin-geral PUT:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar alteração.' }, { status: 500 });
  }
}
