import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const companies = await prisma.company.findMany();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        passwordHash: true,
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

export async function POST(request: Request) {
  try {
    let payload: any = null;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo de backup enviado.' }, { status: 400 });
      }
      const text = await file.text();
      try {
        payload = JSON.parse(text);
      } catch (parseErr: any) {
        return NextResponse.json({ error: 'O arquivo enviado não é um JSON válido.' }, { status: 400 });
      }
    } else {
      payload = await request.json().catch(() => null);
    }

    if (!payload) {
      return NextResponse.json({ error: 'Dados de backup vazios ou formato inválido.' }, { status: 400 });
    }

    // Suporte a restauração particionada por etapas (step) para evitar 504 Gateway Timeout em serverless
    const step = payload.step || 'all';
    const backupData = payload.data || (payload.companies ? payload : payload.data) || {};

    const summary: Record<string, number> = {
      companies: 0,
      costCenters: 0,
      users: 0,
      suppliers: 0,
      bankAccounts: 0,
      projects: 0,
      budgetItems: 0,
      quotations: 0,
      purchases: 0,
      accountsPayable: 0,
      payments: 0,
      attachments: 0,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // ETAPA 1: BASE (Empresas, Centros de Custo, Usuários, Fornecedores, Bancos, Obras)
    // ─────────────────────────────────────────────────────────────────────────
    if (step === 'all' || step === 'base') {
      if (Array.isArray(backupData.companies)) {
        for (const comp of backupData.companies) {
          if (!comp.id) continue;
          await prisma.company.upsert({
            where: { id: comp.id },
            create: {
              id: comp.id,
              name: comp.name || 'Empresa',
              taxId: comp.taxId || null,
              planName: comp.planName || 'Plano Gratuito (1 Obra / 4 Kitnets)',
              maxProjects: Number(comp.maxProjects) || 1,
              maxUsers: Number(comp.maxUsers) || 2,
              createdAt: comp.createdAt ? new Date(comp.createdAt) : new Date(),
              updatedAt: comp.updatedAt ? new Date(comp.updatedAt) : new Date(),
            },
            update: {
              name: comp.name || 'Empresa',
              taxId: comp.taxId || null,
              planName: comp.planName || undefined,
              maxProjects: Number(comp.maxProjects) || undefined,
              maxUsers: Number(comp.maxUsers) || undefined,
              updatedAt: new Date(),
            },
          });
          summary.companies++;
        }
      }

      if (Array.isArray(backupData.costCenters)) {
        for (const cc of backupData.costCenters) {
          if (!cc.code) continue;
          await prisma.costCenter.upsert({
            where: { code: cc.code },
            create: {
              id: cc.id || undefined,
              code: cc.code,
              name: cc.name || 'Centro de Custo',
              category: cc.category || 'Geral',
              description: cc.description || null,
              isActive: cc.isActive !== undefined ? Boolean(cc.isActive) : true,
              createdAt: cc.createdAt ? new Date(cc.createdAt) : new Date(),
              updatedAt: cc.updatedAt ? new Date(cc.updatedAt) : new Date(),
            },
            update: {
              name: cc.name || 'Centro de Custo',
              category: cc.category || 'Geral',
              description: cc.description || null,
              isActive: cc.isActive !== undefined ? Boolean(cc.isActive) : true,
              updatedAt: new Date(),
            },
          });
          summary.costCenters++;
        }
      }

      // Pré-carrega IDs de empresas para validar usuários e obras
      const companies = await prisma.company.findMany({ select: { id: true } });
      const compIds = new Set(companies.map((c) => c.id));

      if (Array.isArray(backupData.users)) {
        for (const u of backupData.users) {
          if (!u.id || !u.email || !compIds.has(u.companyId)) continue;
          await prisma.user.upsert({
            where: { email: u.email },
            create: {
              id: u.id,
              companyId: u.companyId,
              name: u.name || 'Usuário',
              email: u.email,
              passwordHash: u.passwordHash || '$2a$10$wK1k6O1t4hQp6cO0r8kOfe4W5xV7l4m1q1w2e3r4t5y6u7i8o9p0a',
              role: u.role || 'ADMIN',
              avatarUrl: u.avatarUrl || null,
              createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
              updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
            },
            update: {
              name: u.name || 'Usuário',
              companyId: u.companyId,
              role: u.role || 'ADMIN',
              avatarUrl: u.avatarUrl || null,
              updatedAt: new Date(),
            },
          });
          summary.users++;
        }
      }

      if (Array.isArray(backupData.suppliers)) {
        for (const s of backupData.suppliers) {
          if (!s.id || !compIds.has(s.companyId)) continue;
          await prisma.supplier.upsert({
            where: { id: s.id },
            create: {
              id: s.id,
              companyId: s.companyId,
              corporateName: s.corporateName || 'Fornecedor',
              tradeName: s.tradeName || null,
              taxId: s.taxId || null,
              contactPerson: s.contactPerson || null,
              phone: s.phone || null,
              whatsapp: s.whatsapp || null,
              email: s.email || null,
              address: s.address || null,
              city: s.city || null,
              state: s.state || null,
              supplierType: s.supplierType || 'MATERIAL',
              notes: s.notes || null,
              createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
              updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
            },
            update: {
              corporateName: s.corporateName || 'Fornecedor',
              tradeName: s.tradeName || null,
              taxId: s.taxId || null,
              contactPerson: s.contactPerson || null,
              phone: s.phone || null,
              whatsapp: s.whatsapp || null,
              email: s.email || null,
              address: s.address || null,
              city: s.city || null,
              state: s.state || null,
              supplierType: s.supplierType || 'MATERIAL',
              notes: s.notes || null,
              updatedAt: new Date(),
            },
          });
          summary.suppliers++;
        }
      }

      if (Array.isArray(backupData.bankAccounts)) {
        for (const b of backupData.bankAccounts) {
          if (!b.id || !compIds.has(b.companyId)) continue;
          await prisma.bankAccount.upsert({
            where: { id: b.id },
            create: {
              id: b.id,
              companyId: b.companyId,
              bankName: b.bankName || 'Banco',
              accountNumber: b.accountNumber || '-',
              agency: b.agency || '-',
              initialBalance: Number(b.initialBalance) || 0,
              currentBalance: Number(b.currentBalance) || 0,
              createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
              updatedAt: b.updatedAt ? new Date(b.updatedAt) : new Date(),
            },
            update: {
              bankName: b.bankName || 'Banco',
              accountNumber: b.accountNumber || '-',
              agency: b.agency || '-',
              initialBalance: Number(b.initialBalance) || 0,
              currentBalance: Number(b.currentBalance) || 0,
              updatedAt: new Date(),
            },
          });
          summary.bankAccounts++;
        }
      }

      if (Array.isArray(backupData.projects)) {
        for (const p of backupData.projects) {
          if (!p.id || !compIds.has(p.companyId)) continue;
          await prisma.project.upsert({
            where: { id: p.id },
            create: {
              id: p.id,
              companyId: p.companyId,
              name: p.name || 'Obra',
              ownerClient: p.ownerClient || 'Cliente',
              address: p.address || '-',
              city: p.city || '-',
              state: p.state || 'MG',
              startDate: p.startDate ? new Date(p.startDate) : new Date(),
              endDate: p.endDate ? new Date(p.endDate) : new Date(),
              landArea: Number(p.landArea) || 0,
              builtArea: Number(p.builtArea) || 0,
              unitsCount: Number(p.unitsCount) || 1,
              description: p.description || null,
              status: p.status || 'EM_ANDAMENTO',
              exceedRule: Number(p.exceedRule) || 1,
              createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
              updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
            },
            update: {
              name: p.name || 'Obra',
              ownerClient: p.ownerClient || 'Cliente',
              address: p.address || '-',
              city: p.city || '-',
              state: p.state || 'MG',
              startDate: p.startDate ? new Date(p.startDate) : undefined,
              endDate: p.endDate ? new Date(p.endDate) : undefined,
              landArea: Number(p.landArea) || 0,
              builtArea: Number(p.builtArea) || 0,
              unitsCount: Number(p.unitsCount) || 1,
              description: p.description || null,
              status: p.status || 'EM_ANDAMENTO',
              exceedRule: Number(p.exceedRule) || 1,
              updatedAt: new Date(),
            },
          });
          summary.projects++;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ETAPA 2: ORÇAMENTOS (Itens de Orçamento)
    // ─────────────────────────────────────────────────────────────────────────
    if (step === 'all' || step === 'budget') {
      const [projects, costCenters, suppliers] = await Promise.all([
        prisma.project.findMany({ select: { id: true } }),
        prisma.costCenter.findMany({ select: { id: true } }),
        prisma.supplier.findMany({ select: { id: true } }),
      ]);

      const projectIds = new Set(projects.map((p) => p.id));
      const costCenterIds = new Set(costCenters.map((c) => c.id));
      const supplierIds = new Set(suppliers.map((s) => s.id));
      const fallbackCostCenterId = costCenters[0]?.id;

      if (Array.isArray(backupData.budgetItems)) {
        for (const item of backupData.budgetItems) {
          if (!item.id || !projectIds.has(item.projectId)) continue;
          const targetCostCenterId = costCenterIds.has(item.costCenterId) ? item.costCenterId : fallbackCostCenterId;
          if (!targetCostCenterId) continue;

          const chosenSupplierId = item.chosenSupplierId && supplierIds.has(item.chosenSupplierId)
            ? item.chosenSupplierId
            : null;

          await prisma.budgetItem.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              projectId: item.projectId,
              costCenterId: targetCostCenterId,
              code: item.code || 'ORC-0000',
              stage: item.stage || 'Geral',
              itemName: item.itemName || 'Item',
              description: item.description || null,
              unit: item.unit || 'un',
              quantity: Number(item.quantity) || 0,
              chosenSupplierId,
              contractedUnitPrice: Number(item.contractedUnitPrice) || 0,
              contractedTotal: Number(item.contractedTotal) || 0,
              purchasedTotal: Number(item.purchasedTotal) || 0,
              paidTotal: Number(item.paidTotal) || 0,
              balance: Number(item.balance) || 0,
              status: item.status || 'PLANEJADO',
              notes: item.notes || null,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
              updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
            },
            update: {
              code: item.code || 'ORC-0000',
              stage: item.stage || 'Geral',
              itemName: item.itemName || 'Item',
              description: item.description || null,
              unit: item.unit || 'un',
              quantity: Number(item.quantity) || 0,
              chosenSupplierId,
              contractedUnitPrice: Number(item.contractedUnitPrice) || 0,
              contractedTotal: Number(item.contractedTotal) || 0,
              purchasedTotal: Number(item.purchasedTotal) || 0,
              paidTotal: Number(item.paidTotal) || 0,
              balance: Number(item.balance) || 0,
              status: item.status || 'PLANEJADO',
              notes: item.notes || null,
              updatedAt: new Date(),
            },
          });
          summary.budgetItems++;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ETAPA 3: COMPRAS E COTAÇÕES
    // ─────────────────────────────────────────────────────────────────────────
    if (step === 'all' || step === 'purchases') {
      const [projects, costCenters, budgetItems, suppliers] = await Promise.all([
        prisma.project.findMany({ select: { id: true } }),
        prisma.costCenter.findMany({ select: { id: true } }),
        prisma.budgetItem.findMany({ select: { id: true } }),
        prisma.supplier.findMany({ select: { id: true } }),
      ]);

      const projectIds = new Set(projects.map((p) => p.id));
      const costCenterIds = new Set(costCenters.map((c) => c.id));
      const budgetItemIds = new Set(budgetItems.map((b) => b.id));
      const supplierIds = new Set(suppliers.map((s) => s.id));
      const fallbackCostCenterId = costCenters[0]?.id;

      if (Array.isArray(backupData.quotations)) {
        for (const q of backupData.quotations) {
          if (!q.id || !budgetItemIds.has(q.budgetItemId) || !projectIds.has(q.projectId) || !supplierIds.has(q.supplierId)) continue;
          await prisma.quotation.upsert({
            where: { id: q.id },
            create: {
              id: q.id,
              budgetItemId: q.budgetItemId,
              projectId: q.projectId,
              supplierId: q.supplierId,
              date: q.date ? new Date(q.date) : new Date(),
              validityDate: q.validityDate ? new Date(q.validityDate) : null,
              quantity: Number(q.quantity) || 0,
              unitPrice: Number(q.unitPrice) || 0,
              freight: Number(q.freight) || 0,
              discount: Number(q.discount) || 0,
              taxes: Number(q.taxes) || 0,
              finalPrice: Number(q.finalPrice) || 0,
              deliveryDays: Number(q.deliveryDays) || 0,
              paymentTerms: q.paymentTerms || null,
              notes: q.notes || null,
              attachmentUrl: q.attachmentUrl || null,
              isChosen: Boolean(q.isChosen),
              createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
              updatedAt: q.updatedAt ? new Date(q.updatedAt) : new Date(),
            },
            update: {
              quantity: Number(q.quantity) || 0,
              unitPrice: Number(q.unitPrice) || 0,
              freight: Number(q.freight) || 0,
              discount: Number(q.discount) || 0,
              taxes: Number(q.taxes) || 0,
              finalPrice: Number(q.finalPrice) || 0,
              deliveryDays: Number(q.deliveryDays) || 0,
              paymentTerms: q.paymentTerms || null,
              notes: q.notes || null,
              attachmentUrl: q.attachmentUrl || null,
              isChosen: Boolean(q.isChosen),
              updatedAt: new Date(),
            },
          });
          summary.quotations++;
        }
      }

      if (Array.isArray(backupData.purchases)) {
        for (const pur of backupData.purchases) {
          if (!pur.id || !projectIds.has(pur.projectId) || !budgetItemIds.has(pur.budgetItemId) || !supplierIds.has(pur.supplierId)) continue;
          const targetCostCenterId = costCenterIds.has(pur.costCenterId) ? pur.costCenterId : fallbackCostCenterId;
          if (!targetCostCenterId) continue;

          await prisma.purchase.upsert({
            where: { id: pur.id },
            create: {
              id: pur.id,
              purchaseNumber: pur.purchaseNumber || 'COMP-0000',
              projectId: pur.projectId,
              costCenterId: targetCostCenterId,
              budgetItemId: pur.budgetItemId,
              supplierId: pur.supplierId,
              date: pur.date ? new Date(pur.date) : new Date(),
              invoiceNumber: pur.invoiceNumber || null,
              description: pur.description || 'Compra',
              quantity: Number(pur.quantity) || 1,
              unit: pur.unit || 'un',
              unitPrice: Number(pur.unitPrice) || 0,
              discount: Number(pur.discount) || 0,
              freight: Number(pur.freight) || 0,
              totalAmount: Number(pur.totalAmount) || 0,
              paymentCondition: pur.paymentCondition || null,
              dueDate: pur.dueDate ? new Date(pur.dueDate) : new Date(),
              notes: pur.notes || null,
              attachmentUrl: pur.attachmentUrl || null,
              createdAt: pur.createdAt ? new Date(pur.createdAt) : new Date(),
              updatedAt: pur.updatedAt ? new Date(pur.updatedAt) : new Date(),
            },
            update: {
              purchaseNumber: pur.purchaseNumber || 'COMP-0000',
              description: pur.description || 'Compra',
              quantity: Number(pur.quantity) || 1,
              unit: pur.unit || 'un',
              unitPrice: Number(pur.unitPrice) || 0,
              discount: Number(pur.discount) || 0,
              freight: Number(pur.freight) || 0,
              totalAmount: Number(pur.totalAmount) || 0,
              paymentCondition: pur.paymentCondition || null,
              dueDate: pur.dueDate ? new Date(pur.dueDate) : new Date(),
              notes: pur.notes || null,
              attachmentUrl: pur.attachmentUrl || null,
              updatedAt: new Date(),
            },
          });
          summary.purchases++;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ETAPA 4: FINANCEIRO (Contas a Pagar, Pagamentos e Anexos)
    // ─────────────────────────────────────────────────────────────────────────
    if (step === 'all' || step === 'financial') {
      const [projects, costCenters, suppliers, purchases, bankAccounts] = await Promise.all([
        prisma.project.findMany({ select: { id: true } }),
        prisma.costCenter.findMany({ select: { id: true } }),
        prisma.supplier.findMany({ select: { id: true } }),
        prisma.purchase.findMany({ select: { id: true } }),
        prisma.bankAccount.findMany({ select: { id: true } }),
      ]);

      const projectIds = new Set(projects.map((p) => p.id));
      const costCenterIds = new Set(costCenters.map((c) => c.id));
      const supplierIds = new Set(suppliers.map((s) => s.id));
      const purchaseIds = new Set(purchases.map((pur) => pur.id));
      const bankAccountIds = new Set(bankAccounts.map((b) => b.id));
      const fallbackCostCenterId = costCenters[0]?.id;

      if (Array.isArray(backupData.accountsPayable)) {
        for (const ap of backupData.accountsPayable) {
          if (!ap.id || !projectIds.has(ap.projectId) || !supplierIds.has(ap.supplierId)) continue;
          const targetCostCenterId = costCenterIds.has(ap.costCenterId) ? ap.costCenterId : fallbackCostCenterId;
          if (!targetCostCenterId) continue;

          const purchaseId = ap.purchaseId && purchaseIds.has(ap.purchaseId) ? ap.purchaseId : null;
          const bankAccountId = ap.bankAccountId && bankAccountIds.has(ap.bankAccountId) ? ap.bankAccountId : null;

          await prisma.accountPayable.upsert({
            where: { id: ap.id },
            create: {
              id: ap.id,
              projectId: ap.projectId,
              costCenterId: targetCostCenterId,
              purchaseId,
              supplierId: ap.supplierId,
              documentNumber: ap.documentNumber || null,
              description: ap.description || 'Conta a pagar',
              amount: Number(ap.amount) || 0,
              issueDate: ap.issueDate ? new Date(ap.issueDate) : new Date(),
              dueDate: ap.dueDate ? new Date(ap.dueDate) : new Date(),
              paymentDate: ap.paymentDate ? new Date(ap.paymentDate) : null,
              paymentMethod: ap.paymentMethod || 'PIX',
              bankAccountId,
              status: ap.status || 'A_VENCER',
              notes: ap.notes || null,
              createdAt: ap.createdAt ? new Date(ap.createdAt) : new Date(),
              updatedAt: ap.updatedAt ? new Date(ap.updatedAt) : new Date(),
            },
            update: {
              documentNumber: ap.documentNumber || null,
              description: ap.description || 'Conta a pagar',
              amount: Number(ap.amount) || 0,
              issueDate: ap.issueDate ? new Date(ap.issueDate) : new Date(),
              dueDate: ap.dueDate ? new Date(ap.dueDate) : new Date(),
              paymentDate: ap.paymentDate ? new Date(ap.paymentDate) : null,
              paymentMethod: ap.paymentMethod || 'PIX',
              bankAccountId,
              status: ap.status || 'A_VENCER',
              notes: ap.notes || null,
              updatedAt: new Date(),
            },
          });
          summary.accountsPayable++;
        }
      }

      // Pré-carrega IDs de contas a pagar para pagamentos
      const apList = await prisma.accountPayable.findMany({ select: { id: true } });
      const apIds = new Set(apList.map((a) => a.id));

      if (Array.isArray(backupData.payments)) {
        for (const pay of backupData.payments) {
          if (!pay.id || !apIds.has(pay.accountPayableId)) continue;
          await prisma.payment.upsert({
            where: { id: pay.id },
            create: {
              id: pay.id,
              accountPayableId: pay.accountPayableId,
              amountPaid: Number(pay.amountPaid) || 0,
              paymentDate: pay.paymentDate ? new Date(pay.paymentDate) : new Date(),
              paymentMethod: pay.paymentMethod || 'PIX',
              receiptAttachmentUrl: pay.receiptAttachmentUrl || null,
              notes: pay.notes || null,
              createdAt: pay.createdAt ? new Date(pay.createdAt) : new Date(),
            },
            update: {
              amountPaid: Number(pay.amountPaid) || 0,
              paymentDate: pay.paymentDate ? new Date(pay.paymentDate) : new Date(),
              paymentMethod: pay.paymentMethod || 'PIX',
              receiptAttachmentUrl: pay.receiptAttachmentUrl || null,
              notes: pay.notes || null,
            },
          });
          summary.payments++;
        }
      }

      if (Array.isArray(backupData.attachments)) {
        for (const att of backupData.attachments) {
          if (!att.id) continue;
          await prisma.attachment.upsert({
            where: { id: att.id },
            create: {
              id: att.id,
              entityType: att.entityType || 'PROJECT',
              entityId: att.entityId,
              fileName: att.fileName || 'anexo',
              filePath: att.filePath || '',
              fileSize: Number(att.fileSize) || 0,
              mimeType: att.mimeType || 'application/octet-stream',
              createdAt: att.createdAt ? new Date(att.createdAt) : new Date(),
            },
            update: {
              fileName: att.fileName || 'anexo',
              filePath: att.filePath || '',
              fileSize: Number(att.fileSize) || 0,
              mimeType: att.mimeType || 'application/octet-stream',
            },
          });
          summary.attachments++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      step,
      message: `Etapa ${step} processada com sucesso!`,
      restoredSummary: summary,
    });
  } catch (error: any) {
    console.error('Backup restore error:', error);
    return NextResponse.json(
      { error: 'Erro ao restaurar backup da plataforma.', details: error.message },
      { status: 500 }
    );
  }
}
