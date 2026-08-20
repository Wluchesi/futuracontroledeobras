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
    const { companyId, name, email, password, role } = await request.json();

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
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('Error creating team user:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar membro da equipe.' }, { status: 500 });
  }
}
