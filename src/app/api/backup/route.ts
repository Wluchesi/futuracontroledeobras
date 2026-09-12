import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Consultas sequenciais para respeitar o limite de conexões do pool PostgreSQL (pgbouncer)
    const companies = await prisma.company.findMany();
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
    });
    const projects = await prisma.project.findMany();
    const costCenters = await prisma.costCenter.findMany();
    const suppliers = await prisma.supplier.findMany();
    const budgetItems = await prisma.budgetItem.findMany();
    const quotations = await prisma.quotation.findMany();
    const purchases = await prisma.purchase.findMany();
    const accountsPayable = await prisma.accountPayable.findMany();
    const payments = await prisma.payment.findMany();
    const bankAccounts = await prisma.bankAccount.findMany();
    const attachments = await prisma.attachment.findMany();
    const auditLogs = await prisma.auditLog.findMany({
      take: 1000,
      orderBy: { createdAt: 'desc' },
    });

    const nowIso = new Date().toISOString();
    const dateFile = nowIso.split('T')[0];

    const backupData = {
      version: '1.0',
      exportedAt: nowIso,
      system: 'Futura Controle de Obras SaaS',
      databaseProvider: 'PostgreSQL',
      summary: {
        companies: companies.length,
        users: users.length,
        projects: projects.length,
        costCenters: costCenters.length,
        suppliers: suppliers.length,
        budgetItems: budgetItems.length,
        quotations: quotations.length,
        purchases: purchases.length,
        accountsPayable: accountsPayable.length,
        payments: payments.length,
        bankAccounts: bankAccounts.length,
        attachments: attachments.length,
        auditLogs: auditLogs.length,
      },
      data: {
        companies,
        users,
        projects,
        costCenters,
        suppliers,
        budgetItems,
        quotations,
        purchases,
        accountsPayable,
        payments,
        bankAccounts,
        attachments,
        auditLogs,
      },
    };

    const jsonString = JSON.stringify(backupData, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="backup-gerenciador-de-obras-${dateFile}.json"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar backup da plataforma.', details: error.message },
      { status: 500 }
    );
  }
}
