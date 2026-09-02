'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { FileSpreadsheet, Plus, CheckCircle, TrendingDown, Award, Edit3, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

export default function CotacoesPage() {
  const { selectedProject } = useProject();
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedItemFilter, setSelectedItemFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    budgetItemId: '',
    supplierId: '',
    quantity: 1,
    unitPrice: 0,
    freight: 0,
    discount: 0,
    taxes: 0,
    deliveryDays: 3,
    paymentTerms: '30 dias',
    notes: '',
    isChosen: false,
  });

  const fetchData = async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const [resBudget, resSuppliers] = await Promise.all([
        fetch(`/api/budget-items?projectId=${selectedProject.id}`),
        fetch('/api/suppliers'),
      ]);
      if (resBudget.ok) setBudgetItems(await resBudget.json());
      if (resSuppliers.ok) setSuppliers(await resSuppliers.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProject]);

  const filteredItems = selectedItemFilter
    ? budgetItems.filter((i) => i.id === selectedItemFilter)
    : budgetItems;

  const handleSelectWinningQuotation = async (quotationId: string) => {
    try {
      const res = await fetch('/api/quotations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quotationId, isChosen: true }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta cotação?')) return;
    try {
      const res = await fetch(`/api/quotations?id=${quotationId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditQuotation = (q: any) => {
    setFormData({
      id: q.id,
      budgetItemId: q.budgetItemId,
      supplierId: q.supplierId,
      quantity: q.quantity,
      unitPrice: q.unitPrice,
      freight: q.freight,
      discount: q.discount,
      taxes: q.taxes,
      deliveryDays: q.deliveryDays,
      paymentTerms: q.paymentTerms || '30 dias',
      notes: q.notes || '',
      isChosen: q.isChosen,
    });
    setShowModal(true);
  };

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const res = await fetch('/api/quotations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId: selectedProject?.id,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 mr-2.5" />
            Matriz de Cotações & Comparação de Fornecedores
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Compare propostas por item, edite condições de pagamento e escolha a vencedora
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              id: '',
              budgetItemId: budgetItems[0]?.id || '',
              supplierId: suppliers[0]?.id || '',
              quantity: budgetItems[0]?.quantity || 1,
              unitPrice: 0,
              freight: 0,
              discount: 0,
              taxes: 0,
              deliveryDays: 3,
              paymentTerms: '30 dias',
              notes: '',
              isChosen: false,
            });
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Cotação</span>
        </button>
      </div>

      {/* Filtro por Item do Orçamento */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200">
        <label className="text-xs font-bold text-slate-700 block mb-1">Filtrar por Item do Orçamento</label>
        <select
          value={selectedItemFilter}
          onChange={(e) => setSelectedItemFilter(e.target.value)}
          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
        >
          <option value="">Todos os Itens do Orçamento ({budgetItems.length})</option>
          {budgetItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} — {item.itemName} ({item.quotations.length} cotação/ões)
            </option>
          ))}
        </select>
      </div>

      {/* Matriz de Comparação Visual de Fornecedores */}
      <div className="space-y-6">
        {filteredItems.map((item) => {
          const quots = item.quotations || [];
          const prices = quots.map((q: any) => q.finalPrice);
          const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;
          const chosenQuot = quots.find((q: any) => q.isChosen);
          const economy = highestPrice > 0 && chosenQuot ? Math.max(0, highestPrice - chosenQuot.finalPrice) : 0;

          return (
            <div key={item.id} className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {item.code}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">{item.itemName}</h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    Etapa: {item.stage} • Quantidade: {item.quantity} {item.unit}
                  </span>
                </div>
                {economy > 0 && (
                  <div className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs border border-emerald-300">
                    <TrendingDown className="w-4 h-4 mr-1 text-emerald-600" />
                    Economia de {formatCurrency(economy)} nesta cotação!
                  </div>
                )}
              </div>

              {/* Matriz de 3 Colunas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => {
                  const q = quots[index];
                  if (!q) {
                    return (
                      <div
                        key={index}
                        onClick={() => {
                          setFormData({
                            id: '',
                            budgetItemId: item.id,
                            supplierId: suppliers[0]?.id || '',
                            quantity: item.quantity,
                            unitPrice: item.contractedUnitPrice || 0,
                            freight: 0,
                            discount: 0,
                            taxes: 0,
                            deliveryDays: 3,
                            paymentTerms: '30 dias',
                            notes: '',
                            isChosen: false,
                          });
                          setShowModal(true);
                        }}
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition group"
                      >
                        <Plus className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-2" />
                        <span className="text-xs font-semibold text-slate-500 group-hover:text-emerald-700">
                          + Adicionar Fornecedor {index + 1}
                        </span>
                      </div>
                    );
                  }

                  const isLowest = q.finalPrice === lowestPrice;
                  const isChosen = q.isChosen;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border transition-all relative ${
                        isChosen
                          ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                          : isLowest
                          ? 'bg-amber-50/50 border-amber-300'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      {/* Badge Vencedora ou Menor Preço */}
                      {isChosen && (
                        <span className="absolute -top-3 left-4 bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs flex items-center">
                          <Award className="w-3 h-3 mr-1" /> Vencedora Escolhida
                        </span>
                      )}

                      {isLowest && !isChosen && (
                        <span className="absolute -top-3 left-4 bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                          🟢 Melhor Preço
                        </span>
                      )}

                      {/* Botões de Ação: Editar e Excluir */}
                      <div className="absolute top-3 right-3 flex items-center space-x-1">
                        <button
                          onClick={() => handleEditQuotation(q)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
                          title="Editar Cotação"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuotation(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition"
                          title="Excluir Cotação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="font-bold text-slate-900 text-sm mt-2 pr-12">
                        {q.supplier.tradeName || q.supplier.corporateName}
                      </div>
                      <span className="text-[11px] text-slate-500 block mb-2">{q.supplier.supplierType}</span>

                      <div className="space-y-1 text-xs text-slate-700 my-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Preço Unit.:</span>
                          <span>{formatCurrency(q.unitPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Frete / Impostos:</span>
                          <span>{formatCurrency(q.freight + q.taxes)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>Desconto:</span>
                          <span>- {formatCurrency(q.discount)}</span>
                        </div>
                        <div className="flex justify-between font-extrabold text-sm border-t border-slate-200/80 pt-1 text-slate-900">
                          <span>Valor Final:</span>
                          <span className={isLowest ? 'text-emerald-700' : ''}>{formatCurrency(q.finalPrice)}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1 mb-3 bg-white/60 p-2 rounded-xl border border-slate-200/60">
                        <div>⏱️ Prazo: <strong>{q.deliveryDays} dias úteis</strong></div>
                        <div>💳 Condição: <strong className="text-emerald-700">{q.paymentTerms || 'A combinar'}</strong></div>
                      </div>

                      {!isChosen && (
                        <button
                          onClick={() => handleSelectWinningQuotation(q.id)}
                          className="w-full py-1.5 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Selecionar Esta Opção</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nova / Editar Cotação */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {formData.id ? 'Editar Cotação' : 'Cadastrar Cotação de Fornecedor'}
            </h2>
            <form onSubmit={handleSaveQuotation} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Item do Orçamento</label>
                <select
                  value={formData.budgetItemId}
                  onChange={(e) => {
                    const found = budgetItems.find((i) => i.id === e.target.value);
                    setFormData({
                      ...formData,
                      budgetItemId: e.target.value,
                      quantity: found ? found.quantity : 1,
                      unitPrice: found ? found.contractedUnitPrice : 0,
                    });
                  }}
                  className="w-full p-2.5 border rounded-xl"
                >
                  {budgetItems.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.itemName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Fornecedor Cotado</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full p-2.5 border rounded-xl"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.tradeName || s.corporateName} ({s.supplierType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Qtd</label>
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
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Frete (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.freight}
                    onChange={(e) => setFormData({ ...formData, freight: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Impostos (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxes}
                    onChange={(e) => setFormData({ ...formData, taxes: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Prazo Entrega (dias)</label>
                  <input
                    type="number"
                    value={formData.deliveryDays}
                    onChange={(e) => setFormData({ ...formData, deliveryDays: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Condição de Pagamento</label>
                  <input
                    type="text"
                    required
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-semibold"
                    placeholder="ex: À vista / 30 dias / 50% entrada"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border rounded-xl text-slate-600"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isChosenModal"
                  checked={formData.isChosen}
                  onChange={(e) => setFormData({ ...formData, isChosen: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded-sm"
                />
                <label htmlFor="isChosenModal" className="font-semibold text-slate-700 cursor-pointer">
                  Marcar esta proposta como a vencedora
                </label>
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
                  {formData.id ? 'Atualizar Cotação' : 'Salvar Cotação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
