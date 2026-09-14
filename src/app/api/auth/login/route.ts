import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { company: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
    }

    // Retorna usuário autenticado (omitindo hash da senha)
    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    const isDbConfigError = !process.env.DATABASE_URL || error?.message?.includes('DATABASE_URL');
    return NextResponse.json({ 
      error: isDbConfigError 
        ? 'Erro de configuração do servidor: DATABASE_URL não definida.' 
        : 'Erro interno ao autenticar.',
      details: process.env.NODE_ENV !== 'production' || isDbConfigError ? error?.message : undefined
    }, { status: 500 });
  }
}
