import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logAuditAction } from '@/lib/audit';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role, avatarUrl } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, E-mail e Senha são obrigatórios.' }, { status: 400 });
    }

    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({ data: { name: 'Empresa Principal' } });
    }

    // Checar limite de usuários do SaaS
    const currentUsersCount = await prisma.user.count({ where: { companyId: company.id } });
    if (company.maxUsers && currentUsersCount >= company.maxUsers) {
      return NextResponse.json(
        { error: `LIMITE SAAS ALCANÇADO: O seu plano (${company.planName}) permite no máximo ${company.maxUsers} usuários.` },
        { status: 403 }
      );
    }

    // Checar e-mail duplicado
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: role || 'ADMIN',
        avatarUrl: avatarUrl || null,
      },
    });

    await logAuditAction({
      action: 'CREATE',
      entityName: 'User',
      entityId: user.id,
      newValue: { id: user.id, name: user.name, email: user.email, role: user.role },
      details: `Novo usuário administrador ${user.name} (${user.email}) cadastrado no SaaS.`,
    });

    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email, password, role, avatarUrl } = body;

    if (!id) return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });

    const prev = await prisma.user.findUnique({ where: { id } });
    if (!prev) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase().trim();
    if (role) updateData.role = role;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    await logAuditAction({
      action: 'UPDATE',
      entityName: 'User',
      entityId: id,
      previousValue: { name: prev.name, email: prev.email, role: prev.role },
      newValue: { name: updated.name, email: updated.email, role: updated.role },
      details: `Dados do usuário ${updated.name} alterados pelo Administrador.`,
    });

    const { passwordHash: _, ...safeUser } = updated;
    return NextResponse.json(safeUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });

    // Garantir que haja pelo menos 1 administrador
    const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN' } });
    const deletingUser = await prisma.user.findUnique({ where: { id } });

    if (deletingUser?.role === 'ADMIN' && totalAdmins <= 1) {
      return NextResponse.json({ error: 'Operação não permitida: O sistema precisa manter pelo menos 1 Administrador ativo.' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    await logAuditAction({
      action: 'DELETE',
      entityName: 'User',
      entityId: id,
      previousValue: deletingUser,
      details: `Usuário ${deletingUser?.name} (${deletingUser?.email}) removido do sistema.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
