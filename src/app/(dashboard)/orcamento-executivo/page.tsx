'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { Calculator, Plus, Search, Edit3, ShoppingCart, FileSpreadsheet, Trash2, Copy } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import Link from 'next/link';

const STANDARD_UNITS = [
  'un',
  'm²',
  'm³',
  'kg',
  'm',
  'L',
  'verba',
  'hrs',
  'dia',
  'mês',
  'jg',
  'cx',
  'saco',
  'Outra',
];

export default function OrcamentoExecutivoPage() {
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const [items, setItems] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCc, setSelectedCc] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [customUnitMode, setCustomUnitMode] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    code: '',
    costCenterId: '',
    stage: '01. Projetos',
    itemName: '',
    description: '',
    unit: 'un',
    quantity: 1,
    contractedUnitPrice: 0,
    chosenSupplierId: '',
    notes: '',
  });

  const [showNewSupplierBox, setShowNewSupplierBox] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    corporateName: '',
    tradeName: '',
    supplierType: 'MATERIAL',
    phone: '',
    taxId: '',
  });

  const fetchBudget = async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const supplierUrl = user?.companyId ? `/api/suppliers?companyId=${user.companyId}` : '/api/suppliers';
      const [resItems, resCc, resSup] = await Promise.all([
        fetch(`/api/budget-items?projectId=${selectedProject.id}`),
        fetch('/api/cost-centers'),
        fetch(supplierUrl),
      ]);
      if (resItems.ok) setItems(await resItems.json());
      if (resCc.ok) setCostCenters(await resCc.json());
      if (resSup.ok) setSuppliers(await resSup.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudget();
  }, [selectedProject]);

  // Handler para trocar Centro de Custo -> Preencher Etapa Automaticamente
  const handleCostCenterChange = (costCenterId: string) => {
    const foundCc = costCenters.find((cc) => cc.id === costCenterId);
    let autoStage = formData.stage;
    if (foundCc) {
      autoStage = `${foundCc.code}. ${foundCc.name}`;
    }
    setFormData({
      ...formData,
      costCenterId,
      stage: autoStage,
    });
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.stage.toLowerCase().includes(search.toLowerCase());
    const matchesCc = !selectedCc || item.costCenterId === selectedCc;
    return matchesSearch && matchesCc;
  });

  const isFinancialRole = user?.role === 'ADMIN' || user?.role === 'FINANCEIRO';
  const totalOrçado = filteredItems.reduce((acc, i) => acc + (i.contractedTotal || 0), 0);
  const totalComprado = filteredItems.reduce((acc, i) => acc + (i.purchasedTotal || 0), 0);
  const totalPago = filteredItems.reduce((acc, i) => acc + (i.paidTotal || 0), 0);
  const saldoTotal = Math.max(0, totalOrçado - totalPago);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const res = await fetch('/api/budget-items', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId: selectedProject?.id,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        fetchBudget();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierData.corporateName.trim()) {
      alert('Por favor, informe a Razão Social ou Nome do fornecedor.');
      return;
    }

    try {
      setSavingSupplier(true);
      const companyId = user?.companyId || (selectedProject as any)?.companyId;
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSupplierData,
          companyId,
          projectId: selectedProject?.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        setSuppliers((prev) => {
          const updated = [...prev, data];
          return updated.sort((a, b) =>
            (a.tradeName || a.corporateName || '').localeCompare(b.tradeName || b.corporateName || '')
          );
        });
        setFormData((prev) => ({ ...prev, chosenSupplierId: data.id }));
        setNewSupplierData({
          corporateName: '',
          tradeName: '',
          supplierType: 'MATERIAL',
          phone: '',
          taxId: '',
        });
        setShowNewSupplierBox(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao cadastrar fornecedor.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de rede ao salvar fornecedor.');
    } finally {
      setSavingSupplier(false);
    }
  };

  // Duplicar Item do Orçamento Executivo
  const handleDuplicateItem = (item: any) => {
    const nextCode = `ORC-${String(items.length + 1).padStart(4, '0')}`;
    setFormData({
      id: '',
      code: nextCode,
      costCenterId: item.costCenterId || '',
      stage: item.stage || '',
      itemName: `${item.itemName} (Cópia)`,
      description: item.description || '',
      unit: item.unit || 'un',
      quantity: item.quantity || 1,
      contractedUnitPrice: item.contractedUnitPrice || 0,
      chosenSupplierId: item.chosenSupplierId || '',
      notes: item.notes || '',
    });
    setIsDuplicating(true);
    setCustomUnitMode(!STANDARD_UNITS.includes(item.unit));
    setShowNewSupplierBox(false);
    setShowModal(true);
  };

  const handleDeleteItem = async (id: string, itemName: string) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir o item "${itemName}"? Esta ação removerá também as cotações associadas.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/budget-items?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        if (showModal && formData.id === id) {
          setShowModal(false);
        }
        fetchBudget();
      } else {
        alert(data.error || 'Erro ao excluir item.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao excluir item.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Calculator className="w-6 h-6 text-emerald-600 mr-2.5" />
            Orçamento Executivo — {selectedProject?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Controle de serviços, cotações, preços contratados e acompanhamento da obra
          </p>
        </div>
        <button
          onClick={() => {
            const nextCode = `ORC-${String(items.length + 1).padStart(4, '0')}`;
            const firstCc = costCenters[0];
            const firstStage = firstCc ? `${firstCc.code}. ${firstCc.name}` : '01. Projetos';
            setFormData({
              id: '',
              code: nextCode,
              costCenterId: firstCc?.id || '',
              stage: firstStage,
              itemName: '',
              description: '',
              unit: 'un',
              quantity: 1,
              contractedUnitPrice: 0,
              chosenSupplierId: '',
              notes: '',
            });
            setIsDuplicating(false);
            setCustomUnitMode(false);
            setShowNewSupplierBox(false);
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Item no Orçamento</span>
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {isFinancialRole ? (
          <>
            <div className="glass-card p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Contratado</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">{formatCurrency(totalOrçado)}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Comprado</span>
              <div className="text-xl font-extrabold text-indigo-600 mt-1">{formatCurrency(totalComprado)}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Pago</span>
              <div className="text-xl font-extrabold text-emerald-600 mt-1">{formatCurrency(totalPago)}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Saldo a Pagar</span>
              <div className="text-xl font-extrabold text-cyan-600 mt-1">{formatCurrency(saldoTotal)}</div>
            </div>
          </>
        ) : (
          <>
            <div className="glass-card p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total de Itens</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">{filteredItems.length} itens</div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Orçado</span>
              <div className="text-xl font-extrabold text-blue-600 mt-1">{formatCurrency(totalOrçado)}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Comprado</span>
              <div className="text-xl font-extrabold text-indigo-600 mt-1">{formatCurrency(totalComprado)}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Itens com Cotações</span>
              <div className="text-xl font-extrabold text-emerald-600 mt-1">
                {filteredItems.filter((i) => i.quotationCount > 0).length} itens
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filtros */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-3 border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, etapa ou nome do item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
          />
        </div>
        <select
          value={selectedCc}
          onChange={(e) => setSelectedCc(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden"
        >
          <option value="">Todos os Centros de Custos</option>
          {costCenters.map((cc) => (
            <option key={cc.id} value={cc.id}>
              {cc.code} — {cc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela do Orçamento Executivo */}
      <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Centro Custo</th>
                <th className="py-3 px-3">Serviço / Item</th>
                <th className="py-3 px-3 text-center">Qtd / Un</th>
                <th className="py-3 px-3 text-right">Menor Cotação</th>
                <th className="py-3 px-3 text-right">Preço Contratado</th>
                <th className="py-3 px-3 text-right">Total Contratado</th>
                <th className="py-3 px-3 text-right">Comprado</th>
                {isFinancialRole ? (
                  <>
                    <th className="py-3 px-3 text-right">Pago</th>
                    <th className="py-3 px-3 text-right">Saldo</th>
                  </>
                ) : (
                  <th className="py-3 px-3 text-center">Status Físico</th>
                )}
                <th className="py-3 px-3 text-center">Cotações</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="table-row-hover">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{item.code}</td>
                  <td className="py-3 px-3 font-semibold text-slate-600">{item.costCenter?.code}</td>
                  <td className="py-3 px-3 font-medium text-slate-900 max-w-xs">
                    <div>{item.itemName}</div>
                    <span className="text-[10px] text-slate-400">{item.stage}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                    {item.lowestQuotation > 0 ? formatCurrency(item.lowestQuotation) : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-medium">{formatCurrency(item.contractedUnitPrice)}</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(item.contractedTotal)}</td>
                  <td className="py-3 px-3 text-right text-indigo-600 font-semibold">{formatCurrency(item.purchasedTotal)}</td>
                  {isFinancialRole ? (
                    <>
                      <td className="py-3 px-3 text-right text-emerald-600 font-semibold">{formatCurrency(item.paidTotal)}</td>
                      <td className="py-3 px-3 text-right font-bold text-cyan-700">{formatCurrency(item.balance)}</td>
                    </>
                  ) : (
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'CONCLUIDO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'EM_ANDAMENTO'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.status === 'CONCLUIDO'
                          ? 'Concluído'
                          : item.status === 'EM_ANDAMENTO'
                          ? 'Em Andamento'
                          : 'Planejado'}
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-3 text-center">
                    <Link
                      href={`/cotacoes?budgetItemId=${item.id}`}
                      className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition"
                    >
                      <FileSpreadsheet className="w-3 h-3 mr-1 text-emerald-600" />
                      {item.quotationCount} cotação(ões)
                    </Link>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => {
                          setFormData({
                            id: item.id,
                            code: item.code,
                            costCenterId: item.costCenterId,
                            stage: item.stage,
                            itemName: item.itemName,
                            description: item.description || '',
                            unit: item.unit,
                            quantity: item.quantity,
                            contractedUnitPrice: item.contractedUnitPrice,
                            chosenSupplierId: item.chosenSupplierId || '',
                            notes: item.notes || '',
                          });
                          setIsDuplicating(false);
                          setCustomUnitMode(!STANDARD_UNITS.includes(item.unit));
                          setShowNewSupplierBox(false);
                          setShowModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-800 rounded"
                        title="Editar Item"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateItem(item)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                        title="Duplicar Item do Orçamento"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/cotacoes?itemId=${item.id}&action=quote`}
                        className="p-1 text-amber-600 hover:text-amber-800 rounded transition"
                        title="Cotar / Comparar Fornecedores"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/compras?action=new&budgetItemId=${item.id}`}
                        className="p-1 text-emerald-600 hover:text-emerald-800 rounded transition"
                        title="Efetuar Compra"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.itemName)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Excluir Item do Orçamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulário Item Orçamento */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {isDuplicating ? (
                <>
                  <Copy className="w-5 h-5 text-blue-600" />
                  <span>Duplicar Item do Orçamento</span>
                </>
              ) : formData.id ? (
                'Editar Item do Orçamento'
              ) : (
                'Novo Item no Orçamento'
              )}
            </h2>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono"
                  />
                </div>

                {/* Seleção do Centro de Custo -> Preenche a Etapa automaticamente */}
                <div className="col-span-2">
                  <label className="font-semibold block mb-1">Centro de Custo</label>
                  <select
                    value={formData.costCenterId}
                    onChange={(e) => handleCostCenterChange(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-semibold"
                  >
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.code} — {cc.name} ({cc.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Etapa (Puxada do Centro de Custo)</label>
                  <input
                    type="text"
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-800"
                    placeholder="ex: 05. Fundações"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Serviço / Item</label>
                  <input
                    type="text"
                    required
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Dropdown de Unidades Padrão */}
                <div>
                  <label className="font-semibold block mb-1">Unidade</label>
                  {!customUnitMode ? (
                    <select
                      value={STANDARD_UNITS.includes(formData.unit) ? formData.unit : 'Outra'}
                      onChange={(e) => {
                        if (e.target.value === 'Outra') {
                          setCustomUnitMode(true);
                        } else {
                          setFormData({ ...formData, unit: e.target.value });
                        }
                      }}
                      className="w-full p-2.5 border rounded-xl font-semibold"
                    >
                      {STANDARD_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u === 'un'
                            ? 'un (Unidade)'
                            : u === 'm²'
                            ? 'm² (Metro quadrado)'
                            : u === 'm³'
                            ? 'm³ (Metro cúbico)'
                            : u === 'kg'
                            ? 'kg (Quilograma)'
                            : u === 'm'
                            ? 'm (Metro linear)'
                            : u === 'L'
                            ? 'L (Litro)'
                            : u === 'verba'
                            ? 'verba (Global)'
                            : u === 'hrs'
                            ? 'hrs (Horas)'
                            : u === 'dia'
                            ? 'dia (Diária)'
                            : u === 'mês'
                            ? 'mês (Mensalidade)'
                            : u === 'jg'
                            ? 'jg (Jogo)'
                            : u === 'cx'
                            ? 'cx (Caixa)'
                            : u === 'saco'
                            ? 'saco (Saco)'
                            : 'Outra (Digitar...)'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full p-2.5 border rounded-xl"
                        placeholder="Digitar unidade..."
                      />
                      <button
                        type="button"
                        onClick={() => setCustomUnitMode(false)}
                        className="text-[10px] text-slate-400 hover:text-slate-700 underline"
                      >
                        Lista
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-semibold block mb-1">Quantidade</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Preço Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.contractedUnitPrice}
                    onChange={(e) => setFormData({ ...formData, contractedUnitPrice: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold block text-slate-800 dark:text-slate-200">
                    Fornecedor Escolhido
                  </label>
                  {!showNewSupplierBox && (
                    <button
                      type="button"
                      onClick={() => setShowNewSupplierBox(true)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cadastrar novo fornecedor</span>
                    </button>
                  )}
                </div>

                {showNewSupplierBox ? (
                  <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-emerald-200/80 dark:border-emerald-800/80 pb-1.5">
                      <span className="font-bold text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-emerald-600" /> Cadastrar Fornecedor Rápido
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowNewSupplierBox(false)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        ✕ Cancelar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold block mb-1 text-[11px] text-slate-700 dark:text-slate-300">
                          Razão Social / Nome <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newSupplierData.corporateName}
                          onChange={(e) =>
                            setNewSupplierData({ ...newSupplierData, corporateName: e.target.value })
                          }
                          placeholder="Ex: Comercial Silva Ltda"
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-semibold block mb-1 text-[11px] text-slate-700 dark:text-slate-300">
                          Nome Fantasia
                        </label>
                        <input
                          type="text"
                          value={newSupplierData.tradeName}
                          onChange={(e) =>
                            setNewSupplierData({ ...newSupplierData, tradeName: e.target.value })
                          }
                          placeholder="Ex: Madeireira Silva"
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="font-semibold block mb-1 text-[11px] text-slate-700 dark:text-slate-300">
                          Tipo
                        </label>
                        <select
                          value={newSupplierData.supplierType}
                          onChange={(e) =>
                            setNewSupplierData({ ...newSupplierData, supplierType: e.target.value })
                          }
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-xs font-medium"
                        >
                          <option value="MATERIAL">Material</option>
                          <option value="MAO_DE_OBRA">Mão de Obra</option>
                          <option value="SERVICO">Serviço</option>
                          <option value="EQUIPAMENTO">Equipamento</option>
                          <option value="PROJETO">Projeto</option>
                          <option value="OUTROS">Outros</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-semibold block mb-1 text-[11px] text-slate-700 dark:text-slate-300">
                          Telefone / WhatsApp
                        </label>
                        <input
                          type="text"
                          value={newSupplierData.phone}
                          onChange={(e) =>
                            setNewSupplierData({ ...newSupplierData, phone: e.target.value })
                          }
                          placeholder="(35) 99999-9999"
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-semibold block mb-1 text-[11px] text-slate-700 dark:text-slate-300">
                          CNPJ ou CPF
                        </label>
                        <input
                          type="text"
                          value={newSupplierData.taxId}
                          onChange={(e) =>
                            setNewSupplierData({ ...newSupplierData, taxId: e.target.value })
                          }
                          placeholder="00.000.000/0001-00"
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowNewSupplierBox(false)}
                        className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={savingSupplier}
                        onClick={handleCreateSupplier}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        {savingSupplier ? 'Salvando...' : '✓ Salvar e Selecionar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={formData.chosenSupplierId}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setShowNewSupplierBox(true);
                        } else {
                          setFormData({ ...formData, chosenSupplierId: e.target.value });
                        }
                      }}
                      className="flex-1 p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">Selecione o fornecedor vitorioso</option>
                      <option value="__NEW__" className="text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950">
                        ➕ Cadastrar novo fornecedor...
                      </option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.tradeName || s.corporateName} {s.supplierType ? `(${s.supplierType})` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewSupplierBox(true)}
                      className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shadow-xs"
                      title="Cadastrar novo fornecedor agora"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Novo</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {formData.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(formData.id, formData.itemName)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Item</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer text-xs transition"
                  >
                    {isDuplicating ? 'Salvar Item Duplicado' : 'Salvar Item'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
