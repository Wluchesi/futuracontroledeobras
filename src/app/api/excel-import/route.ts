import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetEntity, projectId, rows } = body;

    if (!targetEntity || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Entidade de destino e linhas de dados são obrigatórias.' }, { status: 400 });
    }

    let importedCount = 0;

    if (targetEntity === 'suppliers') {
      let company = await prisma.company.findFirst();
      if (!company) company = await prisma.company.create({ data: { name: 'Empresa Principal' } });

      for (const row of rows) {
        if (!row.corporateName) continue;
        await prisma.supplier.create({
          data: {
            companyId: company.id,
            corporateName: row.corporateName,
            tradeName: row.tradeName || row.corporateName,
            taxId: row.taxId || null,
            contactPerson: row.contactPerson || null,
            phone: row.phone || null,
            email: row.email || null,
            supplierType: row.supplierType || 'MATERIAL',
          },
        });
        importedCount++;
      }
    } else if (targetEntity === 'budget') {
      if (!projectId) return NextResponse.json({ error: 'ID da obra é obrigatório para importar orçamento.' }, { status: 400 });

      for (const row of rows) {
        if (!row.itemName) continue;

        // Tentar buscar centro de custo pelo código ou usar o padrão "01"
        let ccCode = String(row.costCenterCode || '01').padStart(2, '0');
        let cc = await prisma.costCenter.findUnique({ where: { code: ccCode } });
        if (!cc) cc = (await prisma.costCenter.findFirst())!;

        const qty = Number(row.quantity) || 1;
        const unitPrice = Number(row.contractedUnitPrice) || 0;
        const contractedTotal = qty * unitPrice;

        const count = await prisma.budgetItem.count({ where: { projectId } });
        const code = row.code || `ORC-${String(count + 1).padStart(4, '0')}`;

        await prisma.budgetItem.create({
          data: {
            projectId,
            costCenterId: cc.id,
            code,
            stage: row.stage || 'Etapa Geral',
            itemName: row.itemName,
            description: row.description || null,
            unit: row.unit || 'un',
            quantity: qty,
            contractedUnitPrice: unitPrice,
            contractedTotal,
            purchasedTotal: 0,
            paidTotal: 0,
            balance: contractedTotal,
            status: 'PLANEJADO',
          },
        });
        importedCount++;
      }
    }

    await logAuditAction({
      action: 'CREATE',
      entityName: 'ExcelImport',
      entityId: targetEntity,
      details: `Importados ${importedCount} registros na entidade ${targetEntity}.`,
    });

    return NextResponse.json({ success: true, importedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
