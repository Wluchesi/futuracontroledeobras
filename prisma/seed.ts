import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const COST_CENTERS_DATA = [
  { code: '01', name: 'Projetos e Engenharia', category: 'Planejamento' },
  { code: '02', name: 'Documentação e Aprovações', category: 'Planejamento' },
  { code: '03', name: 'Serviços Preliminares', category: 'Infraestrutura' },
  { code: '04', name: 'Terraplenagem e Movimento de Terra', category: 'Infraestrutura' },
  { code: '05', name: 'Fundações', category: 'Estrutura' },
  { code: '06', name: 'Estrutura', category: 'Estrutura' },
  { code: '07', name: 'Alvenaria e Divisórias', category: 'Vedações' },
  { code: '08', name: 'Cobertura', category: 'Vedações' },
  { code: '09', name: 'Instalações Hidráulicas', category: 'Instalações' },
  { code: '10', name: 'Instalações Elétricas', category: 'Instalações' },
  { code: '11', name: 'Gás / Incêndio / Segurança', category: 'Instalações' },
  { code: '12', name: 'Esquadrias e Vidros', category: 'Acabamentos' },
  { code: '13', name: 'Revestimentos', category: 'Acabamentos' },
  { code: '14', name: 'Pisos e Rodapés', category: 'Acabamentos' },
  { code: '15', name: 'Louças e Metais', category: 'Acabamentos' },
  { code: '16', name: 'Pintura', category: 'Acabamentos' },
  { code: '17', name: 'Marmoraria', category: 'Acabamentos' },
  { code: '18', name: 'Marcenaria / Móveis Planejados', category: 'Acabamentos' },
  { code: '19', name: 'Área Externa / Calçada', category: 'Externa' },
  { code: '20', name: 'Muro, Portão e Fechamentos', category: 'Externa' },
  { code: '21', name: 'Mão de Obra Geral', category: 'Mão de Obra' },
  { code: '22', name: 'Equipamentos e Locação', category: 'Logística' },
  { code: '23', name: 'Fretes e Transportes', category: 'Logística' },
  { code: '24', name: 'Canteiro e Consumo', category: 'Operacional' },
  { code: '25', name: 'Administração da Obra', category: 'Gestão' },
  { code: '26', name: 'Contingência / Reserva', category: 'Gestão' },
];

async function main() {
  console.log('🌱 Iniciando Seed do Banco de Dados...');

  // 1. Limpar dados anteriores
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.accountPayable.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.budgetItem.deleteMany();
  await prisma.project.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // 2. Criar Empresa Demo
  const company = await prisma.company.create({
    data: {
      name: 'Construtora Kitnet Passos Ltda',
      taxId: '12.345.678/0001-99',
      planName: 'Kitneteiro Premium (5 Obras / SINAPI / IA)',
      maxProjects: 5,
      maxUsers: 50,
    },
  });

  // 3. Criar os 2 Usuários Administradores Iniciais
  const passwordHash = await bcrypt.hash('C@n@l4141', 10);

  const admin1 = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Wellington Luchesi',
      email: 'wluchesi@gmail.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Cinzia Luchesi',
      email: 'cinzialuchesi@gmail.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  // 4. Criar Conta Bancária Demo
  const bankAccount = await prisma.bankAccount.create({
    data: {
      companyId: company.id,
      bankName: 'Banco do Brasil',
      accountNumber: '98765-4',
      agency: '1234-5',
      initialBalance: 150000.0,
      currentBalance: 112450.0,
    },
  });

  // 5. Criar 26 Centros de Costo
  const costCenterMap: Record<string, string> = {};
  for (const cc of COST_CENTERS_DATA) {
    const created = await prisma.costCenter.create({
      data: {
        code: cc.code,
        name: `${cc.code} — ${cc.name}`,
        category: cc.category,
        isActive: true,
      },
    });
    costCenterMap[cc.code] = created.id;
  }

  // 6. Criar 10 Fornecedores Demo
  const suppliersData = [
    { corporateName: 'Engenharia & Arquitetura Passos Ltda', tradeName: 'Passos Engenharia', taxId: '11.222.333/0001-01', contactPerson: 'Arq. Roberto', phone: '(35) 99881-1122', email: 'roberto@passoseng.com.br', supplierType: 'PROJETO' },
    { corporateName: 'Escavadeira & Terraplenagem Sul de Minas', tradeName: 'Sul Terraplenagem', taxId: '22.333.444/0001-02', contactPerson: 'Marcos Escavação', phone: '(35) 99882-2233', email: 'vendas@sulterrap.com.br', supplierType: 'SERVICO' },
    { corporateName: 'Premoldados & Concreto Passos S/A', tradeName: 'Concreto Passos', taxId: '33.444.555/0001-03', contactPerson: 'Fernanda Concreto', phone: '(35) 3521-4455', email: 'comercial@concretopassos.com.br', supplierType: 'MATERIAL' },
    { corporateName: 'Aço & Ferro Cintra Eireli', tradeName: 'Cintra Aço', taxId: '44.555.666/0001-04', contactPerson: 'Lucas Cintra', phone: '(35) 3522-9900', email: 'vendas@cintraco.com.br', supplierType: 'MATERIAL' },
    { corporateName: 'Depósito de Materiais São José Ltda', tradeName: 'Depósito São José', taxId: '55.666.777/0001-05', contactPerson: 'Seu José', phone: '(35) 3521-1020', email: 'contato@saojosemateriais.com.br', supplierType: 'MATERIAL' },
    { corporateName: 'Comercial Elétrica Luz & Força', tradeName: 'Elétrica Luz', taxId: '66.777.888/0001-06', contactPerson: 'Mateus Elétrica', phone: '(35) 99771-3344', email: 'orcamentos@eletricaluz.com.br', supplierType: 'MATERIAL' },
    { corporateName: 'Hidráulica & Tubos Tigre Vendas', tradeName: 'Tigre Passos', taxId: '77.888.999/0001-07', contactPerson: 'Claudio Tubos', phone: '(35) 3522-8811', email: 'claudio@tigrepassos.com.br', supplierType: 'MATERIAL' },
    { corporateName: 'Empreiteira Silva & Filhos Ltda', tradeName: 'Empreiteira Silva', taxId: '88.999.000/0001-08', contactPerson: 'Mestre Silva', phone: '(35) 99123-4567', email: 'silva.obra@gmail.com', supplierType: 'MAO_DE_OBRA' },
    { corporateName: 'Locadora de Equipamentos Minasmach', tradeName: 'Minasmach Locações', taxId: '99.000.111/0001-09', contactPerson: 'Juliana Locações', phone: '(35) 3521-7766', email: 'locacao@minasmach.com.br', supplierType: 'EQUIPAMENTO' },
    { corporateName: 'Pinturas & Revestimentos Arte & Cor', tradeName: 'Arte & Cor Pinturas', taxId: '10.111.222/0001-10', contactPerson: 'Marcelo Pintor', phone: '(35) 99812-9988', email: 'marcelo@arteecor.com.br', supplierType: 'SERVICO' },
  ];

  const supplierMap: Record<string, string> = {};
  for (const s of suppliersData) {
    const created = await prisma.supplier.create({
      data: {
        companyId: company.id,
        corporateName: s.corporateName,
        tradeName: s.tradeName,
        taxId: s.taxId,
        contactPerson: s.contactPerson,
        phone: s.phone,
        whatsapp: s.phone,
        email: s.email,
        supplierType: s.supplierType,
        city: 'Passos',
        state: 'MG',
      },
    });
    supplierMap[s.tradeName] = created.id;
  }

  // 7. Criar Obra Principal Demo
  const project = await prisma.project.create({
    data: {
      companyId: company.id,
      name: 'Residencial Kitnet Passos (12 Unidades)',
      ownerClient: 'Dr. Pedro Passos',
      address: 'Av. Arlindo Figueiredo, 1500',
      city: 'Passos',
      state: 'MG',
      startDate: new Date('2026-01-10'),
      endDate: new Date('2026-12-20'),
      landArea: 450.0,
      builtArea: 380.0,
      unitsCount: 12,
      description: 'Edifício Residencial de 2 pavimentos contendo 12 kitnets com acabamento de médio/alto padrão.',
      status: 'EM_ANDAMENTO',
      exceedRule: 1, // Alert
    },
  });

  // 8. Criar Itens do Orçamento Executivo (30+ itens)
  const budgetItemsData = [
    { code: 'ORC-0001', cc: '01', stage: '01. Projetos e Engenharia', name: 'Projeto Arquitetônico e Estrutural', unit: 'verba', qty: 1, price: 18500.0, supplier: 'Passos Engenharia' },
    { code: 'ORC-0002', cc: '01', stage: '01. Projetos e Engenharia', name: 'Projetos Hidrossanitários e Elétricos', unit: 'verba', qty: 1, price: 12000.0, supplier: 'Passos Engenharia' },
    { code: 'ORC-0003', cc: '02', stage: '02. Documentação e Aprovações', name: 'Alvará de Construção e Taxas da Prefeitura', unit: 'verba', qty: 1, price: 6800.0, supplier: 'Passos Engenharia' },
    { code: 'ORC-0004', cc: '03', stage: '03. Serviços Preliminares', name: 'Instalação de Tapume e Canteiro de Obras', unit: 'm', qty: 60, price: 95.0, supplier: 'Empreiteira Silva' },
    { code: 'ORC-0005', cc: '03', stage: '03. Serviços Preliminares', name: 'Ligação Provisória de Água e Energia', unit: 'un', qty: 1, price: 2500.0, supplier: 'Depósito São José' },
    { code: 'ORC-0006', cc: '04', stage: '04. Terraplenagem', name: 'Escavação e Nivelamento do Terreno', unit: 'hrs', qty: 40, price: 220.0, supplier: 'Sul Terraplenagem' },
    { code: 'ORC-0007', cc: '05', stage: '05. Fundações', name: 'Perfuração de Estacas (Sapatas e Brocas)', unit: 'm', qty: 180, price: 140.0, supplier: 'Sul Terraplenagem' },
    { code: 'ORC-0008', cc: '05', stage: '05. Fundações', name: 'Concreto Usinado FCK 30 MPa (Fundações)', unit: 'm³', qty: 45, price: 480.0, supplier: 'Concreto Passos' },
    { code: 'ORC-0009', cc: '05', stage: '05. Fundações', name: 'Aço CA-50 10mm e 12mm (Fundações)', unit: 'kg', qty: 2500, price: 8.90, supplier: 'Cintra Aço' },
    { code: 'ORC-0010', cc: '06', stage: '06. Estrutura', name: 'Pilares, Vigas e Laje Pré-Moldada 1° Pavimento', unit: 'm²', qty: 190, price: 180.0, supplier: 'Concreto Passos' },
    { code: 'ORC-0011', cc: '06', stage: '06. Estrutura', name: 'Pilares, Vigas e Laje Pré-Moldada 2° Pavimento', unit: 'm²', qty: 190, price: 185.0, supplier: 'Concreto Passos' },
    { code: 'ORC-0012', cc: '07', stage: '07. Alvenaria e Divisórias', name: 'Tijolo Baiano 9x19x29 (Vedações)', unit: 'milheiro', qty: 18, price: 1250.0, supplier: 'Depósito São José' },
    { code: 'ORC-0013', cc: '07', stage: '07. Alvenaria e Divisórias', name: 'Cimento CP-II (Alvenaria e Emboço)', unit: 'saco', qty: 450, price: 36.50, supplier: 'Depósito São José' },
    { code: 'ORC-0014', cc: '08', stage: '08. Cobertura', name: 'Estrutura Metálica e Telha Termoacústica Sandwich', unit: 'm²', qty: 210, price: 145.0, supplier: 'Cintra Aço' },
    { code: 'ORC-0015', cc: '09', stage: '09. Instalações Hidráulicas', name: 'Tubos e Conexões Água Fria e Esgoto (Kit 12 Unid)', unit: 'verba', qty: 1, price: 28400.0, supplier: 'Tigre Passos' },
    { code: 'ORC-0016', cc: '10', stage: '10. Instalações Elétricas', name: 'Fios, Cabos, Eletrodutos e Quadros Elétricos', unit: 'verba', qty: 1, price: 31200.0, supplier: 'Elétrica Luz' },
    { code: 'ORC-0017', cc: '12', stage: '12. Esquadrias e Vidros', name: 'Janelas e Portas de Alumínio Preto Linha Suprema', unit: 'm²', qty: 75, price: 620.0, supplier: 'Passos Engenharia' },
    { code: 'ORC-0018', cc: '13', stage: '13. Revestimentos', name: 'Argamassa AC-III (Banheiros e Cozinhas)', unit: 'saco', qty: 180, price: 34.0, supplier: 'Depósito São José' },
    { code: 'ORC-0019', cc: '14', stage: '14. Pisos e Rodapés', name: 'Porcelanato Retificado 60x60 Extra Polido', unit: 'm²', qty: 420, price: 68.50, supplier: 'Depósito São José' },
    { code: 'ORC-0020', cc: '15', stage: '15. Louças e Metais', name: 'Vasos Sanitários com Caixa Acoplada e Torneiras', unit: 'kit', qty: 12, price: 980.0, supplier: 'Tigre Passos' },
    { code: 'ORC-0021', cc: '16', stage: '16. Pintura', name: 'Tinta Acrílica Premium Interna e Externa', unit: 'lata 18L', qty: 45, price: 390.0, supplier: 'Arte & Cor Pinturas' },
    { code: 'ORC-0022', cc: '16', stage: '16. Pintura', name: 'Serviço de Pintura Completa (Interna/Externa)', unit: 'm²', qty: 1100, price: 22.0, supplier: 'Arte & Cor Pinturas' },
    { code: 'ORC-0023', cc: '17', stage: '17. Marmoraria', name: 'Bancadas de Granito Preto São Gabriel com Cuba', unit: 'un', qty: 12, price: 850.0, supplier: 'Depósito São José' },
    { code: 'ORC-0024', cc: '21', stage: '21. Mão de Obra Geral', name: 'Contrato Mão de Obra Global de Pedreiros e Ajudantes', unit: 'mês', qty: 10, price: 24000.0, supplier: 'Empreiteira Silva' },
    { code: 'ORC-0025', cc: '22', stage: '22. Equipamentos e Locação', name: 'Locação de Betoneira, Andaimes e Escoras', unit: 'mês', qty: 8, price: 2800.0, supplier: 'Minasmach Locações' },
    { code: 'ORC-0026', cc: '24', stage: '24. Canteiro e Consumo', name: 'Consumo de Energia e Água da Obra', unit: 'mês', qty: 10, price: 650.0, supplier: 'Depósito São José' },
    { code: 'ORC-0027', cc: '25', stage: '25. Administração da Obra', name: 'Honorários de Mestre de Obras e Engenharia', unit: 'mês', qty: 10, price: 7500.0, supplier: 'Empreiteira Silva' },
    { code: 'ORC-0028', cc: '26', stage: '26. Contingência / Reserva', name: 'Fundo de Reserva Orçamentária', unit: 'verba', qty: 1, price: 35000.0, supplier: 'Depósito São José' },
  ];

  const createdBudgetItems: any[] = [];
  for (const item of budgetItemsData) {
    const contractedTotal = item.qty * item.price;
    const created = await prisma.budgetItem.create({
      data: {
        projectId: project.id,
        costCenterId: costCenterMap[item.cc],
        code: item.code,
        stage: item.stage,
        itemName: item.name,
        unit: item.unit,
        quantity: item.qty,
        contractedUnitPrice: item.price,
        contractedTotal: contractedTotal,
        purchasedTotal: 0,
        paidTotal: 0,
        balance: contractedTotal,
        chosenSupplierId: supplierMap[item.supplier],
        status: 'CONTRATADO',
      },
    });
    createdBudgetItems.push(created);
  }

  // 9. Inserir Cotações Exemplo (3 Cotações por item principal)
  // Cotação para Concreto Usinado (ORC-0008)
  const itemConcreto = createdBudgetItems.find((i) => i.code === 'ORC-0008');
  if (itemConcreto) {
    await prisma.quotation.createMany({
      data: [
        {
          budgetItemId: itemConcreto.id,
          projectId: project.id,
          supplierId: supplierMap['Concreto Passos'],
          quantity: 45,
          unitPrice: 480.0,
          freight: 0,
          discount: 900.0,
          finalPrice: 20700.0,
          deliveryDays: 2,
          paymentTerms: '28 dias',
          isChosen: true,
          notes: 'Melhor condição de entrega e desconto pontualidade.',
        },
        {
          budgetItemId: itemConcreto.id,
          projectId: project.id,
          supplierId: supplierMap['Depósito São José'],
          quantity: 45,
          unitPrice: 510.0,
          freight: 450.0,
          discount: 0,
          finalPrice: 23400.0,
          deliveryDays: 5,
          paymentTerms: 'À vista',
          isChosen: false,
        },
        {
          budgetItemId: itemConcreto.id,
          projectId: project.id,
          supplierId: supplierMap['Cintra Aço'],
          quantity: 45,
          unitPrice: 525.0,
          freight: 300.0,
          discount: 0,
          finalPrice: 23925.0,
          deliveryDays: 3,
          paymentTerms: '14 dias',
          isChosen: false,
        },
      ],
    });
  }

  // Cotação para Porcelanato (ORC-0019)
  const itemPorcelanato = createdBudgetItems.find((i) => i.code === 'ORC-0019');
  if (itemPorcelanato) {
    await prisma.quotation.createMany({
      data: [
        {
          budgetItemId: itemPorcelanato.id,
          projectId: project.id,
          supplierId: supplierMap['Depósito São José'],
          quantity: 420,
          unitPrice: 68.50,
          freight: 0,
          discount: 500.0,
          finalPrice: 28270.0,
          deliveryDays: 3,
          paymentTerms: '30/60 dias',
          isChosen: true,
        },
        {
          budgetItemId: itemPorcelanato.id,
          projectId: project.id,
          supplierId: supplierMap['Arte & Cor Pinturas'],
          quantity: 420,
          unitPrice: 74.00,
          freight: 600.0,
          discount: 0,
          finalPrice: 31680.0,
          deliveryDays: 7,
          paymentTerms: 'À vista',
          isChosen: false,
        },
      ],
    });
  }

  // 10. Criar Compras e Contas a Pagar (Realizadas, PENDENTES e VENCIDAS)
  const purchasesSeedData = [
    // 🟢 PAGAS
    {
      itemCode: 'ORC-0001',
      supplier: 'Passos Engenharia',
      desc: 'Pagamento Parcela 1 Projeto Arquitetônico',
      qty: 1,
      unitPrice: 9250.0,
      total: 9250.0,
      daysAgo: 45,
      dueDaysAgo: 30,
      paid: true,
      paidDaysAgo: 30,
      nf: 'NF-1045',
    },
    {
      itemCode: 'ORC-0006',
      supplier: 'Sul Terraplenagem',
      desc: 'Serviço de Escavação e Nivelamento',
      qty: 40,
      unitPrice: 220.0,
      total: 8800.0,
      daysAgo: 35,
      dueDaysAgo: 20,
      paid: true,
      paidDaysAgo: 20,
      nf: 'NF-8821',
    },
    {
      itemCode: 'ORC-0008',
      supplier: 'Concreto Passos',
      desc: 'Fornecimento Concreto Usinado Fundações 45m³',
      qty: 45,
      unitPrice: 480.0,
      total: 21600.0,
      daysAgo: 25,
      dueDaysAgo: 10,
      paid: true,
      paidDaysAgo: 10,
      nf: 'NF-9912',
    },
    {
      itemCode: 'ORC-0009',
      supplier: 'Cintra Aço',
      desc: 'Lote de Aço CA-50 10mm e 12mm',
      qty: 2500,
      unitPrice: 8.90,
      total: 22250.0,
      daysAgo: 20,
      dueDaysAgo: 5,
      paid: true,
      paidDaysAgo: 5,
      nf: 'NF-3321',
    },

    // 🔴 VENCIDAS (Alertas Vermelhos)
    {
      itemCode: 'ORC-0004',
      supplier: 'Empreiteira Silva',
      desc: 'Construção Tapume e Canteiro Obra',
      qty: 60,
      unitPrice: 95.0,
      total: 5700.0,
      daysAgo: 20,
      dueDaysAgo: 8, // Vencido há 8 dias!
      paid: false,
      nf: 'REC-0012',
    },
    {
      itemCode: 'ORC-0025',
      supplier: 'Minasmach Locações',
      desc: 'Aluguel Mensal Betoneira e Andaimes Mês 1',
      qty: 1,
      unitPrice: 2800.0,
      total: 2800.0,
      daysAgo: 18,
      dueDaysAgo: 3, // Vencido há 3 dias!
      paid: false,
      nf: 'NF-5511',
    },

    // 🟡 A VENCER (Próximos 7 a 30 dias)
    {
      itemCode: 'ORC-0010',
      supplier: 'Concreto Passos',
      desc: 'Estrutura Laje Pré-Moldada 1° Pavimento',
      qty: 190,
      unitPrice: 180.0,
      total: 34200.0,
      daysAgo: 5,
      dueDaysFuture: 5, // Vence em 5 dias
      paid: false,
      nf: 'NF-9988',
    },
    {
      itemCode: 'ORC-0015',
      supplier: 'Tigre Passos',
      desc: 'Lote Tubulação Hidrossanitária Kitnets',
      qty: 1,
      unitPrice: 14200.0,
      total: 14200.0,
      daysAgo: 3,
      dueDaysFuture: 12, // Vence em 12 dias
      paid: false,
      nf: 'NF-1122',
    },
    {
      itemCode: 'ORC-0016',
      supplier: 'Elétrica Luz',
      desc: 'Entrada Eletrodutos e Cabos Flexíveis 6mm',
      qty: 1,
      unitPrice: 12500.0,
      total: 12500.0,
      daysAgo: 2,
      dueDaysFuture: 20, // Vence em 20 dias
      paid: false,
      nf: 'NF-4499',
    },
  ];

  let purchaseIndex = 1;
  for (const p of purchasesSeedData) {
    const item = createdBudgetItems.find((i) => i.code === p.itemCode);
    if (!item) continue;

    const pDate = new Date();
    pDate.setDate(pDate.getDate() - p.daysAgo);

    let dueDate = new Date();
    if (p.dueDaysAgo) {
      dueDate.setDate(dueDate.getDate() - p.dueDaysAgo);
    } else if (p.dueDaysFuture) {
      dueDate.setDate(dueDate.getDate() + p.dueDaysFuture);
    }

    const purchaseNum = `COMP-${String(purchaseIndex++).padStart(4, '0')}`;
    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber: purchaseNum,
        projectId: project.id,
        costCenterId: item.costCenterId,
        budgetItemId: item.id,
        supplierId: supplierMap[p.supplier],
        date: pDate,
        invoiceNumber: p.nf,
        description: p.desc,
        quantity: p.qty,
        unitPrice: p.unitPrice,
        totalAmount: p.total,
        dueDate: dueDate,
      },
    });

    // Atualizar total comprado do item do orçamento
    const updatedPurchasedTotal = item.purchasedTotal + p.total;
    let updatedPaidTotal = item.paidTotal;

    const today = new Date();
    let status = 'A_VENCER';
    let paymentDate: Date | null = null;

    if (p.paid) {
      status = 'PAGO';
      paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() - (p.paidDaysAgo || 0));
      updatedPaidTotal += p.total;
    } else if (dueDate < today) {
      status = 'VENCIDO';
    }

    const payable = await prisma.accountPayable.create({
      data: {
        projectId: project.id,
        costCenterId: item.costCenterId,
        purchaseId: purchase.id,
        supplierId: supplierMap[p.supplier],
        documentNumber: p.nf,
        description: p.desc,
        amount: p.total,
        issueDate: pDate,
        dueDate: dueDate,
        paymentDate: paymentDate,
        paymentMethod: p.paid ? 'PIX' : null,
        bankAccountId: p.paid ? bankAccount.id : null,
        status: status,
      },
    });

    if (p.paid && paymentDate) {
      await prisma.payment.create({
        data: {
          accountPayableId: payable.id,
          amountPaid: p.total,
          paymentDate: paymentDate,
          paymentMethod: 'PIX',
          notes: 'Pagamento efetuado via PIX Banco do Brasil',
        },
      });
    }

    // Atualizar no item de orçamento
    await prisma.budgetItem.update({
      where: { id: item.id },
      data: {
        purchasedTotal: updatedPurchasedTotal,
        paidTotal: updatedPaidTotal,
        balance: item.contractedTotal - updatedPaidTotal,
      },
    });
  }

  // 11. Criar Auditoria Inicial
  await prisma.auditLog.create({
    data: {
      userId: admin1.id,
      userName: admin1.name,
      action: 'CREATE',
      entityName: 'Project',
      entityId: project.id,
      newValue: JSON.stringify({ name: project.name, budget: 450000.0 }),
      details: 'Obra inicial cadastrada com massa demonstrativa completa.',
    },
  });

  console.log('✅ Seed executado com sucesso!');
  console.log(`🏢 Empresa: ${company.name}`);
  console.log(`👤 Admin 1: ${admin1.name} (${admin1.email})`);
  console.log(`👤 Admin 2: ${admin2.name} (${admin2.email})`);
  console.log(`🏗️ Obra: ${project.name}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
