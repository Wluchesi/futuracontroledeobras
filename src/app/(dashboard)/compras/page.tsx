'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useProject } from '@/context/ProjectContext';
import { ShoppingCart, Plus, Search, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/calculations';
import { useSearchParams } from 'next/navigation';

function ComprasContent() {
  const { selectedProject } = useProject();
  const searchParams = useSearchParams();
  const defaultAction = searchParams.get('action');
  const defaultBudgetItem = searchParams.get('budgetItemId');

  const [purchases, setPurchases] = useState<any[]>([]);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(defaultAction === 'new');
  const [confirmWarningModal, setConfirmWarningModal] = useState<any>(null);

  const [formData, setFormData] = useState({
    budgetItemId: defaultBudgetItem || '',
    supplierId: '',
    invoiceNumber: '',
    description: '',
    quantity: 1,
    unit: 'un',
    unitPrice: 0,
    discount: 0,
    freight: 0,
    paymentCondition: '30 dias',
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notes: '',
    forceConfirm: false,
  });

  const fetchData = async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const [resPurchases, resBudget, resSuppliers] = await Promise.all([
        fetch(`/api/purchases?projectId=${selectedProject.id}`),
        fetch(`/api/budget-items?projectId=${selectedProject.id}`),
        fetch('/api/suppliers'),
      ]);

      if (resPurchases.ok) setPurchases(await resPurchases.json());
      if (resBudget.ok) {
        const items = await resBudget.json();
        setBudgetItems(items);
        if (items.length > 0 && !formData.budgetItemId) {
          const first = items[0];
          setFormData((prev) => ({
            ...prev,
            budgetItemId: first.id,
            supplierId: first.chosenSupplierId || '',
            description: first.itemName,
            quantity: first.quantity,
            unitPrice: first.contractedUnitPrice,
          }));
        }
      }
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

  const handleBudgetItemChange = (budgetItemId: string) => {
    const item = budgetItems.find((b) => b.id === budgetItemId);
    if (item) {
      setFormData({
        ...formData,
        budgetItemId,
        supplierId: item.chosenSupplierId || suppliers[0]?.id || '',
        description: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.contractedUnitPrice,
      });
    }
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (res.status === 409 && json.requiresConfirmation) {
        setConfirmWarningModal(json);
        return;
      }

      if (!res.ok) {
        alert(json.error || 'Erro ao registrar compra.');
        return;
      }

      setShowModal(false);
      setConfirmWarningModal(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    return (
      p.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier.corporateName.toLowerCase().includes(search.toLowerCase()) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <ShoppingCart className="w-6 h-6 text-emerald-600 mr-2.5" />
            Módulo de Compras & Lançamentos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Lançamento único integrado ao orçamento, fornecedores e geração automática de contas a pagar
          </p>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nova Compra</span>
        </button>
      </div>

      {/* Busca */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por número da compra, descrição, fornecedor ou nota fiscal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Tabela de Compras */}
      <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">N° Compra</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Item do Orçamento</th>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4">NF / Recibo</th>
                <th className="py-3 px-4 text-center">Qtd / Un</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4 text-center">Vencimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredPurchases.map((p) => (
                <tr key={p.id} className="table-row-hover">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.purchaseNumber}</td>
                  <td className="py-3 px-4 text-slate-500">{formatDate(p.date)}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <div>{p.description}</div>
                    <span className="text-[10px] text-slate-400">{p.costCenter?.name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-800 font-semibold">{p.supplier.tradeName || p.supplier.corporateName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{p.invoiceNumber || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    {p.quantity} {p.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatCurrency(p.totalAmount)}</td>
                  <td className="py-3 px-4 text-center font-medium text-slate-600">{formatDate(p.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Compra */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Lançamento de Compra (Lançamento Único)</h2>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                Auto-Vinculado
              </span>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Item do Orçamento Executivo (Origem)</label>
                <select
                  value={formData.budgetItemId}
                  onChange={(e) => handleBudgetItemChange(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-emerald-50/40 border-emerald-300 font-semibold"
                >
                  {budgetItems.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.itemName} (Saldo: {formatCurrency(b.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Fornecedor</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.tradeName || s.corporateName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">NF / Recibo Documento</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                    placeholder="NF-12345"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Descrição do Lançamento</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
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
                  <label className="font-semibold block mb-1">Unidade</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Valor Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Condição de Pagamento</label>
                  <input
                    type="text"
                    value={formData.paymentCondition}
                    onChange={(e) => setFormData({ ...formData, paymentCondition: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                    placeholder="30 dias / PIX"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Valor Total da Compra:</span>
                <span className="text-sm text-emerald-700 font-extrabold">
                  {formatCurrency(Math.max(0, formData.quantity * formData.unitPrice - formData.discount + formData.freight))}
                </span>
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
                  Efetivar Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Extrapolação */}
      {confirmWarningModal && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-amber-400">
            <div className="flex items-center space-x-3 text-amber-600">
              <AlertCircle className="w-8 h-8 flex-shrink-0" />
              <h3 className="font-extrabold text-base text-slate-900">Aviso de Extrapolação do Orçamento!</h3>
            </div>
            <p className="text-xs text-slate-600">{confirmWarningModal.warning}</p>
            <div className="bg-amber-50 p-3 rounded-xl text-xs space-y-1 text-amber-900">
              <div>Orçamento Contratado: <strong>{formatCurrency(confirmWarningModal.budget)}</strong></div>
              <div>Realizado Anterior: <strong>{formatCurrency(confirmWarningModal.purchased)}</strong></div>
              <div>Esta Compra: <strong>{formatCurrency(confirmWarningModal.currentPurchase)}</strong></div>
              <div className="text-rose-700 font-bold">Excedente Orçamentário: {formatCurrency(confirmWarningModal.excessAmount)}</div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setConfirmWarningModal(null)} className="px-4 py-2 border rounded-xl text-slate-600">
                Cancelar Compra
              </button>
              <button
                onClick={async () => {
                  setFormData({ ...formData, forceConfirm: true });
                  setConfirmWarningModal(null);
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold"
              >
                Confirmar Assim Mesmo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComprasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Carregando compras...</div>}>
      <ComprasContent />
    </Suspense>
  );
}
