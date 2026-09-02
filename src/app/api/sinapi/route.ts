import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const uf = searchParams.get('uf') || 'MG';
    const grupo = searchParams.get('grupo') || '';
    const categoria = searchParams.get('categoria') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const skip = (page - 1) * limit;

    const where: any = {};

    if (uf) {
      where.uf = uf;
    }

    if (grupo) {
      where.grupo = grupo;
    }

    if (categoria) {
      where.categoria = categoria;
    }

    if (search.trim()) {
      const term = search.trim();
      where.OR = [
        { codigoSinapi: { contains: term } },
        { descricao: { contains: term } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.sinapiItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ grupo: 'asc' }, { descricao: 'asc' }],
      }),
      prisma.sinapiItem.count({ where }),
    ]);

    // Buscar lista de grupos únicos disponíveis
    const gruposUnicosRaw = await prisma.sinapiItem.groupBy({
      by: ['grupo'],
      where: uf ? { uf } : {},
      orderBy: { grupo: 'asc' },
    });
    const grupos = gruposUnicosRaw.map((g) => g.grupo);

    return NextResponse.json({
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      grupos,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
