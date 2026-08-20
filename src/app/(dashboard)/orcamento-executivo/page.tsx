'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { Calculator, Plus, Search, Filter, Edit3, ShoppingCart, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import Link from 'next/link';

export default function OrcamentoExecutivoPage() {
  const { selectedProject } = useProject();
  const [items, setItems] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCc, setSelectedCc] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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

  const fetchBudget = async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const [resItems, resCc, resSup] = await Promise.all([
        fetch(`/api/budget-items?projectId=${selectedProject.id}`),
        fetch('/api/cost-centers'),
        fetch('/api/suppliers'),
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

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.stage.toLowerCase().includes(search.toLowerCase());
    const matchesCc = !selectedCc || item.costCenterId === selectedCc;
    return matchesSearch && matchesCc;
  });

  // Somatórias do topo
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

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Calculator className="w-6 h-6 text-emerald-600 mr-2.5" />
            Orçamento Executivo — {selectedProject?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Controle de serviços, cotações, preços contratados e saldos orçamentários
          </p>
        </div>
        <button
          onClick={() => {
            const nextCode = `ORC-${String(items.length + 1).padStart(4, '0')}`;
            setFormData({
              id: '',
              code: nextCode,
              costCenterId: costCenters[0]?.id || '',
              stage: '01. Projetos',
              itemName: '',
              description: '',
              unit: 'un',
              quantity: 1,
              contractedUnitPrice: 0,
              chosenSupplierId: '',
              notes: '',
            });
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Item no Orçamento</span>
        </button>
      </div>

      {/* Cards de Resumo Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
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
                <th className="py-3 px-3 text-right">Pago</th>
                <th className="py-3 px-3 text-right">Saldo</th>
                <th className="py-3 px-3 text-center">Cotações</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="table-row-hover">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{item.code}</td>
                  <td className="py-3 px-3 font-semibold text-slate-600">{item.costCenter.code}</td>
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
                  <td className="py-3 px-3 text-right text-emerald-600 font-semibold">{formatCurrency(item.paidTotal)}</td>
                  <td className="py-3 px-3 text-right font-bold text-cyan-700">{formatCurrency(item.balance)}</td>
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
                          setShowModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-800 rounded"
                        title="Editar Item"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/compras?action=new&budgetItemId=${item.id}`}
                        className="p-1 text-emerald-600 hover:text-emerald-800 rounded"
                        title="Efetuar Compra"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Link>
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {formData.id ? 'Editar Item do Orçamento' : 'Novo Item no Orçamento'}
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
                <div className="col-span-2">
                  <label className="font-semibold block mb-1">Centro de Custo</label>
                  <select
                    value={formData.costCenterId}
                    onChange={(e) => setFormData({ ...formData, costCenterId: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  >
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.code} — {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Etapa</label>
                  <input
                    type="text"
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
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
                <div>
                  <label className="font-semibold block mb-1">Unidade</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                    placeholder="m², un, kg, m³"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Quantidade</label>
                  <input
                    type="number"
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
              <div>
                <label className="font-semibold block mb-1">Fornecedor Escolhido</label>
                <select
                  value={formData.chosenSupplierId}
                  onChange={(e) => setFormData({ ...formData, chosenSupplierId: e.target.value })}
                  className="w-full p-2.5 border rounded-xl"
                >
                  <option value="">Selecione o fornecedor vitorioso</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.tradeName || s.corporateName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold">
                  Salvar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
