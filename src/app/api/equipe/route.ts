import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID é obrigatório.' }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    return NextResponse.json({
      success: true,
      users,
      userCount: users.length,
      maxUsers: company?.maxUsers || 20,
    });
  } catch (error: any) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Erro ao buscar equipe.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { companyId, name, email, password, role, avatarUrl } = await request.json();

    if (!companyId || !name || !email || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    // Verificar limite do plano da empresa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { _count: { select: { users: true } } },
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
    }

    if (company._count.users >= company.maxUsers) {
      return NextResponse.json(
        { error: `Limite do plano atingido (${company.maxUsers} usuários). Faça upgrade do seu plano para adicionar mais usuários.` },
        { status: 403 }
      );
    }

    // Verificar e-mail duplicado
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Já existe um usuário cadastrado com este e-mail.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        companyId,
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: role || 'ENGENHEIRO',
        avatarUrl: avatarUrl || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('Error creating team user:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar membro da equipe.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, companyId, name, email, password, role, avatarUrl } = await request.json();

    if (!id || !name || !email) {
      return NextResponse.json({ error: 'ID, Nome e E-mail são obrigatórios.' }, { status: 400 });
    }

    const userToUpdate = await prisma.user.findUnique({
      where: { id },
    });

    if (!userToUpdate) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    if (companyId && userToUpdate.companyId !== companyId) {
      return NextResponse.json({ error: 'Usuário não pertence a esta empresa.' }, { status: 403 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Se mudou de e-mail, verificar duplicidade
    if (normalizedEmail !== userToUpdate.email) {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Este e-mail já está sendo utilizado por outro usuário.' }, { status: 400 });
      }
    }

    const updateData: any = {
      name,
      email: normalizedEmail,
      role: role || userToUpdate.role,
    };

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }

    if (password && password.trim().length > 0) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error updating team user:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados do membro.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const companyId = searchParams.get('companyId');

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    if (companyId && userToDelete.companyId !== companyId) {
      return NextResponse.json({ error: 'Usuário não pertence a esta empresa.' }, { status: 403 });
    }

    // Se for ADMIN, garantir que a empresa não fique sem nenhum ADMIN
    if (userToDelete.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { companyId: userToDelete.companyId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Não é possível remover o único Administrador da construtora. Defina outro administrador antes.' },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting team user:', error);
    return NextResponse.json({ error: 'Erro ao remover membro da equipe.' }, { status: 500 });
  }
}
