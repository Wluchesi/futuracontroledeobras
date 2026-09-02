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
  await prisma.sinapiItem.deleteMany();
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

  // ═══════════════════════════════════════════════════════════════
  // SINAPI — Tabela de Insumos de Referência da Construção Civil
  // ═══════════════════════════════════════════════════════════════
  console.log('📊 Inserindo base de insumos SINAPI...');

  // Insumos base com preços medianos de referência (base MG 08/2024)
  const SINAPI_INSUMOS_BASE = [
    // ── FUNDAÇÕES ──
    { codigoSinapi: '00000370', descricao: 'CONCRETO USINADO BOMBEAVEL, CLASSE DE RESISTENCIA C25, COM BRITA 0 E 1, SLUMP = 100 +/- 20 MM', unidade: 'M3', precoMediano: 485.50, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00000371', descricao: 'CONCRETO USINADO BOMBEAVEL, CLASSE DE RESISTENCIA C30, COM BRITA 0 E 1, SLUMP = 100 +/- 20 MM', unidade: 'M3', precoMediano: 520.80, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00004345', descricao: 'ACO CA-50, 6,3 MM, VERGALHAO', unidade: 'KG', precoMediano: 7.85, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00004346', descricao: 'ACO CA-50, 8,0 MM, VERGALHAO', unidade: 'KG', precoMediano: 7.62, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00004347', descricao: 'ACO CA-50, 10,0 MM, VERGALHAO', unidade: 'KG', precoMediano: 7.55, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00004348', descricao: 'ACO CA-50, 12,5 MM, VERGALHAO', unidade: 'KG', precoMediano: 7.48, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00004350', descricao: 'ACO CA-60, 4,2 MM, VERGALHAO', unidade: 'KG', precoMediano: 9.12, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00004351', descricao: 'ACO CA-60, 5,0 MM, VERGALHAO', unidade: 'KG', precoMediano: 8.75, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00011001', descricao: 'ARAME RECOZIDO 18 BWG, 1,25 MM (0,01 KG/M)', unidade: 'KG', precoMediano: 12.40, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00005061', descricao: 'FORMA DE MADEIRA PARA FUNDACAO, COM TABUA DE PINUS', unidade: 'M2', precoMediano: 58.90, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00003777', descricao: 'BRITA 1 - PEDRA BRITADA N.1 (9,5 A 19 MM) POSTO PEDREIRA/FORNECEDOR', unidade: 'M3', precoMediano: 89.50, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00003776', descricao: 'BRITA 0 - PEDRISCO (4,8 A 9,5 MM) POSTO PEDREIRA/FORNECEDOR', unidade: 'M3', precoMediano: 82.30, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00000367', descricao: 'AREIA MEDIA - POSTO JAZIDA/FORNECEDOR (RETIRADO NA JAZIDA, SEM TRANSPORTE)', unidade: 'M3', precoMediano: 75.60, categoria: 'MATERIAL', grupo: 'Fundações' },
    { codigoSinapi: '00001379', descricao: 'CIMENTO PORTLAND COMPOSTO CP II-32', unidade: 'KG', precoMediano: 0.72, categoria: 'MATERIAL', grupo: 'Fundações' },

    // ── ALVENARIA ──
    { codigoSinapi: '00003384', descricao: 'TIJOLO CERAMICO MACICO COMUM 5 X 10 X 20 CM', unidade: 'UN', precoMediano: 0.68, categoria: 'MATERIAL', grupo: 'Alvenaria' },
    { codigoSinapi: '00003382', descricao: 'BLOCO CERAMICO (TIJOLO FURADO) DE 9 X 19 X 19 CM', unidade: 'UN', precoMediano: 0.85, categoria: 'MATERIAL', grupo: 'Alvenaria' },
    { codigoSinapi: '00003383', descricao: 'BLOCO CERAMICO (TIJOLO FURADO) DE 14 X 19 X 29 CM', unidade: 'UN', precoMediano: 1.45, categoria: 'MATERIAL', grupo: 'Alvenaria' },
    { codigoSinapi: '00010567', descricao: 'BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 39 CM, CLASSE A (NBR 6136)', unidade: 'UN', precoMediano: 4.25, categoria: 'MATERIAL', grupo: 'Alvenaria' },
    { codigoSinapi: '00010568', descricao: 'BLOCO DE CONCRETO VEDACAO 14 X 19 X 39 CM, CLASSE C (NBR 6136)', unidade: 'UN', precoMediano: 3.10, categoria: 'MATERIAL', grupo: 'Alvenaria' },
    { codigoSinapi: '00001106', descricao: 'ARGAMASSA INDUSTRIALIZADA PARA ASSENTAMENTO DE ALVENARIA', unidade: 'KG', precoMediano: 0.58, categoria: 'MATERIAL', grupo: 'Alvenaria' },
    { codigoSinapi: '00001100', descricao: 'CAL HIDRATADA CH-I PARA ARGAMASSAS', unidade: 'KG', precoMediano: 0.82, categoria: 'MATERIAL', grupo: 'Alvenaria' },
    { codigoSinapi: '00003385', descricao: 'VERGA PRE-MOLDADA CONCRETO PARA PORTAS/JANELAS, L=1,20 M', unidade: 'UN', precoMediano: 22.50, categoria: 'MATERIAL', grupo: 'Alvenaria' },

    // ── COBERTURA ──
    { codigoSinapi: '00003421', descricao: 'TELHA CERAMICA TIPO ROMANA, CAPA E CANAL', unidade: 'UN', precoMediano: 2.15, categoria: 'MATERIAL', grupo: 'Cobertura' },
    { codigoSinapi: '00003422', descricao: 'TELHA CERAMICA TIPO COLONIAL', unidade: 'UN', precoMediano: 1.95, categoria: 'MATERIAL', grupo: 'Cobertura' },
    { codigoSinapi: '00011765', descricao: 'TELHA DE FIBROCIMENTO ONDULADA E = 6 MM, 2,44 X 1,10 M (SEM AMIANTO)', unidade: 'UN', precoMediano: 52.80, categoria: 'MATERIAL', grupo: 'Cobertura' },
    { codigoSinapi: '00020083', descricao: 'TELHA METALICA / GALVANIZADA TRAPEZOIDAL, E=0,43MM', unidade: 'M2', precoMediano: 38.90, categoria: 'MATERIAL', grupo: 'Cobertura' },
    { codigoSinapi: '00005075', descricao: 'MADEIRA SERRADA NAO APARELHADA (BRUTAS) CAMBARA / CEDRINHO PARA TELHADO', unidade: 'M3', precoMediano: 2850.00, categoria: 'MATERIAL', grupo: 'Cobertura' },
    { codigoSinapi: '00005071', descricao: 'CUMEEIRA CERAMICA PARA TELHA ROMANA', unidade: 'UN', precoMediano: 3.80, categoria: 'MATERIAL', grupo: 'Cobertura' },
    { codigoSinapi: '00021090', descricao: 'MANTA SUBCOBERTURA (MANTA TERMICA / ISOLANTE) PARA TELHADO', unidade: 'M2', precoMediano: 6.50, categoria: 'MATERIAL', grupo: 'Cobertura' },
    { codigoSinapi: '00006123', descricao: 'CALHA EM CHAPA DE ACO GALVANIZADO N.26, DESENVOLVIMENTO 33 CM', unidade: 'M', precoMediano: 32.40, categoria: 'MATERIAL', grupo: 'Cobertura' },

    // ── REVESTIMENTO ──
    { codigoSinapi: '00001107', descricao: 'ARGAMASSA INDUSTRIALIZADA PARA REBOCO/EMBOÇO, ESPESSURA 20MM', unidade: 'KG', precoMediano: 0.55, categoria: 'MATERIAL', grupo: 'Revestimento' },
    { codigoSinapi: '00007267', descricao: 'MASSA CORRIDA PVA PARA PAREDES INTERNAS', unidade: 'L', precoMediano: 5.80, categoria: 'MATERIAL', grupo: 'Revestimento' },
    { codigoSinapi: '00006070', descricao: 'CHAPISCO TRACO 1:3 (CIMENTO E AREIA GROSSA) PREPARO MANUAL', unidade: 'M2', precoMediano: 4.25, categoria: 'COMPOSICAO', grupo: 'Revestimento' },
    { codigoSinapi: '00006071', descricao: 'EMBOÇO/REBOCO TRACO 1:2:8 (CIMENTO, CAL E AREIA) ESPESSURA 20MM', unidade: 'M2', precoMediano: 18.50, categoria: 'COMPOSICAO', grupo: 'Revestimento' },
    { codigoSinapi: '00025955', descricao: 'TEXTURA ACRILICA PARA FACHADA EXTERNA, APLICACAO MANUAL', unidade: 'M2', precoMediano: 14.80, categoria: 'COMPOSICAO', grupo: 'Revestimento' },
    { codigoSinapi: '00007290', descricao: 'GESSO EM PO PARA REVESTIMENTO', unidade: 'KG', precoMediano: 1.10, categoria: 'MATERIAL', grupo: 'Revestimento' },
    { codigoSinapi: '00034513', descricao: 'FORRO DE PVC, LAMINAS DE 200 MM, BRANCO', unidade: 'M2', precoMediano: 32.50, categoria: 'MATERIAL', grupo: 'Revestimento' },

    // ── PISOS ──
    { codigoSinapi: '00007334', descricao: 'PISO CERAMICO ESMALTADO PARA AREA INTERNA, PEI-4, 45X45 CM', unidade: 'M2', precoMediano: 35.90, categoria: 'MATERIAL', grupo: 'Pisos' },
    { codigoSinapi: '00007335', descricao: 'PORCELANATO ESMALTADO PARA PISO, RETIFICADO, 60X60 CM', unidade: 'M2', precoMediano: 52.80, categoria: 'MATERIAL', grupo: 'Pisos' },
    { codigoSinapi: '00007330', descricao: 'PISO CERAMICO ANTIDERRAPANTE PARA AREA EXTERNA/BANHEIRO, 45X45 CM', unidade: 'M2', precoMediano: 38.70, categoria: 'MATERIAL', grupo: 'Pisos' },
    { codigoSinapi: '00001108', descricao: 'ARGAMASSA COLANTE INDUSTRIALIZADA AC-II PARA PISOS E PAREDES', unidade: 'KG', precoMediano: 0.95, categoria: 'MATERIAL', grupo: 'Pisos' },
    { codigoSinapi: '00001109', descricao: 'ARGAMASSA COLANTE INDUSTRIALIZADA AC-III PARA PORCELANATO', unidade: 'KG', precoMediano: 1.85, categoria: 'MATERIAL', grupo: 'Pisos' },
    { codigoSinapi: '00007336', descricao: 'REJUNTE INDUSTRIALIZADO CIMENTICIO PARA PISOS E AZULEJOS', unidade: 'KG', precoMediano: 4.20, categoria: 'MATERIAL', grupo: 'Pisos' },
    { codigoSinapi: '00034741', descricao: 'CONTRAPISO EM ARGAMASSA TRACO 1:4 (CIMENTO E AREIA), E=3CM', unidade: 'M2', precoMediano: 22.40, categoria: 'COMPOSICAO', grupo: 'Pisos' },
    { codigoSinapi: '00007331', descricao: 'AZULEJO CERAMICO ESMALTADO PARA PAREDE, 33X45 CM', unidade: 'M2', precoMediano: 28.90, categoria: 'MATERIAL', grupo: 'Pisos' },

    // ── HIDRÁULICA ──
    { codigoSinapi: '00002691', descricao: 'TUBO PVC SOLDAVEL, DN 25 MM (3/4"), PARA AGUA FRIA, BARRA 6M', unidade: 'M', precoMediano: 4.85, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00002692', descricao: 'TUBO PVC SOLDAVEL, DN 32 MM (1"), PARA AGUA FRIA, BARRA 6M', unidade: 'M', precoMediano: 7.20, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00002693', descricao: 'TUBO PVC SOLDAVEL, DN 50 MM (1.1/2"), PARA AGUA FRIA', unidade: 'M', precoMediano: 12.30, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00002700', descricao: 'TUBO PVC ESGOTO SERIE NORMAL, DN 40 MM, BARRA 6M', unidade: 'M', precoMediano: 6.85, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00002701', descricao: 'TUBO PVC ESGOTO SERIE NORMAL, DN 50 MM, BARRA 6M', unidade: 'M', precoMediano: 8.40, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00002702', descricao: 'TUBO PVC ESGOTO SERIE NORMAL, DN 100 MM, BARRA 6M', unidade: 'M', precoMediano: 15.90, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00002703', descricao: 'TUBO PVC ESGOTO SERIE NORMAL, DN 150 MM, BARRA 6M', unidade: 'M', precoMediano: 32.60, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00002750', descricao: 'JOELHO PVC SOLDAVEL 90 GRAUS, DN 25 MM (3/4")', unidade: 'UN', precoMediano: 0.85, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00002751', descricao: 'TE PVC SOLDAVEL 90 GRAUS, DN 25 MM (3/4")', unidade: 'UN', precoMediano: 1.65, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00002760', descricao: 'REGISTRO DE GAVETA BRUTO EM LATAO, DN 3/4"', unidade: 'UN', precoMediano: 32.50, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00002761', descricao: 'REGISTRO DE PRESSAO CROMADO, DN 1/2" OU 3/4"', unidade: 'UN', precoMediano: 45.80, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00010757', descricao: 'CAIXA DAGUA EM POLIETILENO / FIBRA, 500 LITROS', unidade: 'UN', precoMediano: 285.00, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00010758', descricao: 'CAIXA DAGUA EM POLIETILENO / FIBRA, 1000 LITROS', unidade: 'UN', precoMediano: 420.00, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00009843', descricao: 'COLA / ADESIVO PARA PVC, BISNAGA 75G', unidade: 'UN', precoMediano: 8.50, categoria: 'MATERIAL', grupo: 'Hidráulica' },
    { codigoSinapi: '00034621', descricao: 'CAIXA SIFONADA PVC 150 X 150 X 50 MM COM GRELHA QUADRADA BRANCA', unidade: 'UN', precoMediano: 14.90, categoria: 'MATERIAL', grupo: 'Hidráulica' },

    // ── ELÉTRICA ──
    { codigoSinapi: '00001560', descricao: 'FIO DE COBRE FLEXIVEL ISOLADO, 750V, SECAO 1,5 MM2', unidade: 'M', precoMediano: 1.25, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00001561', descricao: 'FIO DE COBRE FLEXIVEL ISOLADO, 750V, SECAO 2,5 MM2', unidade: 'M', precoMediano: 1.95, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00001562', descricao: 'FIO DE COBRE FLEXIVEL ISOLADO, 750V, SECAO 4,0 MM2', unidade: 'M', precoMediano: 3.25, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00001563', descricao: 'FIO DE COBRE FLEXIVEL ISOLADO, 750V, SECAO 6,0 MM2', unidade: 'M', precoMediano: 4.80, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00001564', descricao: 'CABO DE COBRE FLEXIVEL ISOLADO, 750V, SECAO 10,0 MM2', unidade: 'M', precoMediano: 8.50, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00001590', descricao: 'ELETRODUTO PVC RIGIDO ROSCAVEL, DN 20 MM (1/2")', unidade: 'M', precoMediano: 2.40, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00001591', descricao: 'ELETRODUTO PVC RIGIDO ROSCAVEL, DN 25 MM (3/4")', unidade: 'M', precoMediano: 3.10, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00001600', descricao: 'CURVA PVC ROSCAVEL PARA ELETRODUTO, 90 GRAUS, DN 20 MM', unidade: 'UN', precoMediano: 0.95, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00012100', descricao: 'DISJUNTOR TERMOMAGNETICO MONOPOLAR 10A / 16A / 20A', unidade: 'UN', precoMediano: 12.80, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00012101', descricao: 'DISJUNTOR TERMOMAGNETICO BIPOLAR 20A / 25A / 32A', unidade: 'UN', precoMediano: 35.60, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00012102', descricao: 'DISJUNTOR DIFERENCIAL RESIDUAL (DR) BIPOLAR 25A / 30MA', unidade: 'UN', precoMediano: 95.00, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00012110', descricao: 'QUADRO DE DISTRIBUICAO EM PVC PARA 8 / 12 DISJUNTORES, EMBUTIR', unidade: 'UN', precoMediano: 62.50, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00012150', descricao: 'TOMADA 2P+T 10A, 250V, PADRAO NBR 14136, COMPLETA (PLACA + SUPORTE + MODULO)', unidade: 'UN', precoMediano: 15.80, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00012151', descricao: 'INTERRUPTOR SIMPLES 1 TECLA, 10A, 250V, COMPLETO (PLACA + SUPORTE + MODULO)', unidade: 'UN', precoMediano: 14.50, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00012152', descricao: 'INTERRUPTOR SIMPLES 2 TECLAS, 10A, 250V, COMPLETO (PLACA + SUPORTE + MODULO)', unidade: 'UN', precoMediano: 22.30, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00001520', descricao: 'CAIXA DE PASSAGEM / CONDULETE 4X2 PVC, FUNDO MOVEL, EMBUTIR', unidade: 'UN', precoMediano: 2.10, categoria: 'MATERIAL', grupo: 'Elétrica' },
    { codigoSinapi: '00001521', descricao: 'CAIXA OCTOGONAL 4X4 PVC PARA PONTO DE LUZ/TETO', unidade: 'UN', precoMediano: 2.80, categoria: 'MATERIAL', grupo: 'Elétrica' },

    // ── PINTURA ──
    { codigoSinapi: '00006189', descricao: 'TINTA LATEX ACRILICA PREMIUM PARA PAREDES INTERNAS E EXTERNAS', unidade: 'L', precoMediano: 18.50, categoria: 'MATERIAL', grupo: 'Pintura' },
    { codigoSinapi: '00006190', descricao: 'TINTA LATEX PVA STANDARD PARA PAREDES INTERNAS', unidade: 'L', precoMediano: 8.90, categoria: 'MATERIAL', grupo: 'Pintura' },
    { codigoSinapi: '00006195', descricao: 'SELADOR ACRILICO PARA PAREDES', unidade: 'L', precoMediano: 7.20, categoria: 'MATERIAL', grupo: 'Pintura' },
    { codigoSinapi: '00006196', descricao: 'FUNDO PREPARADOR DE PAREDES BASE AGUA', unidade: 'L', precoMediano: 14.80, categoria: 'MATERIAL', grupo: 'Pintura' },
    { codigoSinapi: '00007268', descricao: 'MASSA ACRILICA PARA PAREDES EXTERNAS', unidade: 'L', precoMediano: 7.50, categoria: 'MATERIAL', grupo: 'Pintura' },
    { codigoSinapi: '00006200', descricao: 'TINTA ESMALTE SINTETICO BRILHANTE PARA MADEIRA/METAL', unidade: 'L', precoMediano: 28.50, categoria: 'MATERIAL', grupo: 'Pintura' },
    { codigoSinapi: '00006198', descricao: 'ROLO DE LA PARA PINTURA, 23 CM', unidade: 'UN', precoMediano: 12.80, categoria: 'MATERIAL', grupo: 'Pintura' },
    { codigoSinapi: '00006199', descricao: 'LIXA DAGUA PARA MASSA E PINTURA, GRAO 120 / 150', unidade: 'UN', precoMediano: 2.30, categoria: 'MATERIAL', grupo: 'Pintura' },

    // ── ESQUADRIAS ──
    { codigoSinapi: '00011722', descricao: 'JANELA DE ALUMINIO DE CORRER, 2 FOLHAS, COM VIDRO, 1,20 X 1,20 M', unidade: 'UN', precoMediano: 520.00, categoria: 'MATERIAL', grupo: 'Esquadrias' },
    { codigoSinapi: '00011723', descricao: 'JANELA DE ALUMINIO DE CORRER, 2 FOLHAS, COM VIDRO, 1,50 X 1,20 M', unidade: 'UN', precoMediano: 620.00, categoria: 'MATERIAL', grupo: 'Esquadrias' },
    { codigoSinapi: '00011725', descricao: 'JANELA DE ALUMINIO BASCULANTE, COM VIDRO, 0,60 X 0,60 M (BANHEIRO)', unidade: 'UN', precoMediano: 195.00, categoria: 'MATERIAL', grupo: 'Esquadrias' },
    { codigoSinapi: '00011730', descricao: 'PORTA DE MADEIRA SEMI-OCA PARA PINTURA, 0,70 X 2,10 M (INTERNA)', unidade: 'UN', precoMediano: 165.00, categoria: 'MATERIAL', grupo: 'Esquadrias' },
    { codigoSinapi: '00011731', descricao: 'PORTA DE MADEIRA SEMI-OCA PARA PINTURA, 0,80 X 2,10 M (INTERNA)', unidade: 'UN', precoMediano: 178.00, categoria: 'MATERIAL', grupo: 'Esquadrias' },
    { codigoSinapi: '00011735', descricao: 'PORTA DE MADEIRA MACICA PARA ENTRADA PRINCIPAL, 0,80 X 2,10 M', unidade: 'UN', precoMediano: 450.00, categoria: 'MATERIAL', grupo: 'Esquadrias' },
    { codigoSinapi: '00011738', descricao: 'BATENTE / MARCO DE MADEIRA PARA PORTA, LARGURA 14 CM', unidade: 'JG', precoMediano: 85.00, categoria: 'MATERIAL', grupo: 'Esquadrias' },
    { codigoSinapi: '00011740', descricao: 'FECHADURA DE EMBUTIR PARA PORTA INTERNA, PADRAO POPULAR', unidade: 'UN', precoMediano: 42.00, categoria: 'MATERIAL', grupo: 'Esquadrias' },
    { codigoSinapi: '00011741', descricao: 'FECHADURA DE EMBUTIR PARA PORTA EXTERNA/ENTRADA, COM CHAVE', unidade: 'UN', precoMediano: 68.00, categoria: 'MATERIAL', grupo: 'Esquadrias' },
    { codigoSinapi: '00011742', descricao: 'DOBRADICA DE FERRO/ACO 3" X 2.1/2" PARA PORTA', unidade: 'UN', precoMediano: 6.50, categoria: 'MATERIAL', grupo: 'Esquadrias' },

    // ── LOUÇAS E METAIS ──
    { codigoSinapi: '00009836', descricao: 'VASO SANITARIO (BACIA) CONVENCIONAL DE LOUCA BRANCA COM CAIXA ACOPLADA', unidade: 'UN', precoMediano: 295.00, categoria: 'MATERIAL', grupo: 'Louças e Metais' },
    { codigoSinapi: '00009838', descricao: 'LAVATORIO / PIA DE LOUCA BRANCA PARA BANHEIRO, COM COLUNA, 45 X 35 CM', unidade: 'UN', precoMediano: 145.00, categoria: 'MATERIAL', grupo: 'Louças e Metais' },
    { codigoSinapi: '00009840', descricao: 'TANQUE DE LOUCA / MARMORE SINTETICO PARA LAVANDERIA, 22 LITROS', unidade: 'UN', precoMediano: 185.00, categoria: 'MATERIAL', grupo: 'Louças e Metais' },
    { codigoSinapi: '00009842', descricao: 'PIA DE COZINHA EM ACO INOXIDAVEL COM 1 CUBA, 1,20 X 0,52 M', unidade: 'UN', precoMediano: 195.00, categoria: 'MATERIAL', grupo: 'Louças e Metais' },
    { codigoSinapi: '00009850', descricao: 'TORNEIRA CROMADA DE MESA PARA PIA DE COZINHA, BICA MOVEL, 1/2" OU 3/4"', unidade: 'UN', precoMediano: 75.00, categoria: 'MATERIAL', grupo: 'Louças e Metais' },
    { codigoSinapi: '00009851', descricao: 'TORNEIRA CROMADA DE PAREDE PARA LAVATORIO, 1/2" OU 3/4"', unidade: 'UN', precoMediano: 38.00, categoria: 'MATERIAL', grupo: 'Louças e Metais' },
    { codigoSinapi: '00009855', descricao: 'CHUVEIRO ELETRICO TIPO DUCHA, 4 TEMPERATURAS, 5500W', unidade: 'UN', precoMediano: 62.00, categoria: 'MATERIAL', grupo: 'Louças e Metais' },
    { codigoSinapi: '00009845', descricao: 'SIFAO SANFONADO UNIVERSAL EM PVC CROMADO 1" X 1.1/2"', unidade: 'UN', precoMediano: 12.50, categoria: 'MATERIAL', grupo: 'Louças e Metais' },
    { codigoSinapi: '00009846', descricao: 'ENGATE FLEXIVEL PLASTICO / INOX 1/2" X 30 CM', unidade: 'UN', precoMediano: 8.90, categoria: 'MATERIAL', grupo: 'Louças e Metais' },

    // ── IMPERMEABILIZAÇÃO ──
    { codigoSinapi: '00001885', descricao: 'MANTA ASFALTICA ELASTOMERICA PRE-FABRICADA, E=3MM, COM ARMADURA (TIPO II)', unidade: 'M2', precoMediano: 28.50, categoria: 'MATERIAL', grupo: 'Impermeabilização' },
    { codigoSinapi: '00001886', descricao: 'MANTA ASFALTICA ELASTOMERICA PRE-FABRICADA, E=4MM, COM ARMADURA (TIPO III)', unidade: 'M2', precoMediano: 38.90, categoria: 'MATERIAL', grupo: 'Impermeabilização' },
    { codigoSinapi: '00001890', descricao: 'IMPERMEABILIZANTE LIQUIDO FLEXIVEL (MANTA LIQUIDA) BASE ACRILICA', unidade: 'KG', precoMediano: 18.50, categoria: 'MATERIAL', grupo: 'Impermeabilização' },
    { codigoSinapi: '00001891', descricao: 'PRIMER / EMULSAO ASFALTICA PARA IMPERMEABILIZACAO', unidade: 'L', precoMediano: 15.20, categoria: 'MATERIAL', grupo: 'Impermeabilização' },
    { codigoSinapi: '00001895', descricao: 'ADITIVO IMPERMEABILIZANTE PARA ARGAMASSA E CONCRETO (VEDACIT/SIKA)', unidade: 'L', precoMediano: 12.80, categoria: 'MATERIAL', grupo: 'Impermeabilização' },

    // ── MÃO DE OBRA ──
    { codigoSinapi: '00025957', descricao: 'PEDREIRO COM ENCARGOS COMPLEMENTARES', unidade: 'H', precoMediano: 23.50, categoria: 'MAO_DE_OBRA', grupo: 'Mão de Obra' },
    { codigoSinapi: '00025958', descricao: 'SERVENTE / AUXILIAR DE OBRAS COM ENCARGOS COMPLEMENTARES', unidade: 'H', precoMediano: 16.80, categoria: 'MAO_DE_OBRA', grupo: 'Mão de Obra' },
    { codigoSinapi: '00025960', descricao: 'ELETRICISTA COM ENCARGOS COMPLEMENTARES', unidade: 'H', precoMediano: 25.40, categoria: 'MAO_DE_OBRA', grupo: 'Mão de Obra' },
    { codigoSinapi: '00025961', descricao: 'ENCANADOR / BOMBEIRO HIDRAULICO COM ENCARGOS COMPLEMENTARES', unidade: 'H', precoMediano: 24.80, categoria: 'MAO_DE_OBRA', grupo: 'Mão de Obra' },
    { codigoSinapi: '00025962', descricao: 'PINTOR COM ENCARGOS COMPLEMENTARES', unidade: 'H', precoMediano: 22.30, categoria: 'MAO_DE_OBRA', grupo: 'Mão de Obra' },
    { codigoSinapi: '00025963', descricao: 'CARPINTEIRO / MARCENEIRO COM ENCARGOS COMPLEMENTARES', unidade: 'H', precoMediano: 24.10, categoria: 'MAO_DE_OBRA', grupo: 'Mão de Obra' },
    { codigoSinapi: '00025964', descricao: 'ARMADOR / FERREIRO COM ENCARGOS COMPLEMENTARES', unidade: 'H', precoMediano: 23.80, categoria: 'MAO_DE_OBRA', grupo: 'Mão de Obra' },
    { codigoSinapi: '00025965', descricao: 'AZULEJISTA / LADRILHISTA COM ENCARGOS COMPLEMENTARES', unidade: 'H', precoMediano: 23.50, categoria: 'MAO_DE_OBRA', grupo: 'Mão de Obra' },
    { codigoSinapi: '00025970', descricao: 'MESTRE DE OBRA COM ENCARGOS COMPLEMENTARES', unidade: 'MES', precoMediano: 5800.00, categoria: 'MAO_DE_OBRA', grupo: 'Mão de Obra' },
    { codigoSinapi: '00025971', descricao: 'ENGENHEIRO CIVIL DE OBRA JUNIOR (RESPONSAVEL TECNICO)', unidade: 'MES', precoMediano: 12500.00, categoria: 'MAO_DE_OBRA', grupo: 'Mão de Obra' },

    // ── EQUIPAMENTOS ──
    { codigoSinapi: '00005932', descricao: 'BETONEIRA CAPACIDADE NOMINAL DE 400 L, MOTOR ELETRICO', unidade: 'H', precoMediano: 1.85, categoria: 'EQUIPAMENTO', grupo: 'Equipamentos' },
    { codigoSinapi: '00005935', descricao: 'VIBRADOR DE IMERSAO PARA CONCRETO, MOTOR ELETRICO 2 HP', unidade: 'H', precoMediano: 1.20, categoria: 'EQUIPAMENTO', grupo: 'Equipamentos' },
    { codigoSinapi: '00005940', descricao: 'ANDAIME METALICO TUBULAR DE ENCAIXE (LOCACAO)', unidade: 'M2/MES', precoMediano: 8.50, categoria: 'EQUIPAMENTO', grupo: 'Equipamentos' },
    { codigoSinapi: '00005950', descricao: 'RETROESCAVADEIRA SOBRE RODAS, POTENCIA 75 HP (LOCACAO / HORA PRODUTIVA)', unidade: 'H', precoMediano: 165.00, categoria: 'EQUIPAMENTO', grupo: 'Equipamentos' },
    { codigoSinapi: '00005955', descricao: 'CAMINHAO BASCULANTE 6 M3, POTENCIA 170 CV (LOCACAO / HORA PRODUTIVA)', unidade: 'H', precoMediano: 185.00, categoria: 'EQUIPAMENTO', grupo: 'Equipamentos' },

    // ── ÁREA EXTERNA ──
    { codigoSinapi: '00034600', descricao: 'PISO INTERTRAVADO (BLOQUETE) DE CONCRETO RETANGULAR, E=6CM, COR NATURAL', unidade: 'M2', precoMediano: 42.00, categoria: 'MATERIAL', grupo: 'Área Externa' },
    { codigoSinapi: '00034601', descricao: 'MEIO-FIO / GUIA DE CONCRETO PRE-MOLDADO, 100 X 15 X 30 CM', unidade: 'M', precoMediano: 18.50, categoria: 'MATERIAL', grupo: 'Área Externa' },
    { codigoSinapi: '00034605', descricao: 'GRAMA EM PLACAS / LEIVA PARA JARDIM (ESMERALDA OU SAO CARLOS)', unidade: 'M2', precoMediano: 12.00, categoria: 'MATERIAL', grupo: 'Área Externa' },
    { codigoSinapi: '00020085', descricao: 'PORTAO METALICO / DE FERRO PARA GARAGEM, CHAPA 18, 3,00 X 2,20 M', unidade: 'UN', precoMediano: 1850.00, categoria: 'MATERIAL', grupo: 'Área Externa' },
    { codigoSinapi: '00020086', descricao: 'GRADE / GRADIL METALICO PARA MURO OU JANELA, FERRO REDONDO 1/2"', unidade: 'M2', precoMediano: 185.00, categoria: 'MATERIAL', grupo: 'Área Externa' },
    { codigoSinapi: '00020088', descricao: 'MURO DE BLOCO DE CONCRETO, E=14CM, COM FUNDACAO E PILARES (COMPOSICAO)', unidade: 'M2', precoMediano: 165.00, categoria: 'COMPOSICAO', grupo: 'Área Externa' },
  ];

  // Gerar variações por UF com fator multiplicador
  const UF_FATORES: Record<string, number> = {
    'MG': 1.00,  // Base
    'SP': 1.12,  // São Paulo: +12%
    'RJ': 1.08,  // Rio de Janeiro: +8%
    'BA': 0.92,  // Bahia: -8%
    'PR': 1.05,  // Paraná: +5%
    'GO': 0.95,  // Goiás: -5%
    'CE': 0.90,  // Ceará: -10%
    'PE': 0.93,  // Pernambuco: -7%
  };

  const sinapiData: Array<{
    codigoSinapi: string;
    descricao: string;
    unidade: string;
    precoMediano: number;
    categoria: string;
    grupo: string;
    uf: string;
    mesReferencia: string;
    tipo: string;
  }> = [];

  for (const [uf, fator] of Object.entries(UF_FATORES)) {
    for (const insumo of SINAPI_INSUMOS_BASE) {
      sinapiData.push({
        ...insumo,
        precoMediano: Math.round(insumo.precoMediano * fator * 100) / 100,
        uf,
        mesReferencia: '08/2024',
        tipo: 'NAO_DESONERADO',
      });
    }
  }

  await prisma.sinapiItem.createMany({ data: sinapiData });
  console.log(`✅ ${sinapiData.length} insumos SINAPI inseridos para ${Object.keys(UF_FATORES).length} estados.`);

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
