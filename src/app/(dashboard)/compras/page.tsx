'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useProject } from '@/context/ProjectContext';
import { ShoppingCart, Plus, Search, AlertCircle, Edit3, Trash2, Zap, FileText } from 'lucide-react';
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
    id: '',
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
    isDirectPurchase: false,
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

  const handleEditPurchase = (p: any) => {
    setFormData({
      id: p.id,
      budgetItemId: p.budgetItemId || '',
      supplierId: p.supplierId,
      invoiceNumber: p.invoiceNumber || '',
      description: p.description,
      quantity: p.quantity,
      unit: p.unit || 'un',
      unitPrice: p.unitPrice,
      discount: p.discount || 0,
      freight: p.freight || 0,
      paymentCondition: p.paymentCondition || '30 dias',
      dueDate: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: p.notes || '',
      forceConfirm: false,
      isDirectPurchase: false,
    });
    setShowModal(true);
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta compra? O valor será estornado do orçamento e a conta a pagar será removida.')) return;
    try {
      const res = await fetch(`/api/purchases?id=${purchaseId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Erro ao excluir compra.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const res = await fetch('/api/purchases', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.status === 409 && data.requiresConfirmation) {
        setConfirmWarningModal(data);
        return;
      }

      if (res.ok) {
        setShowModal(false);
        setConfirmWarningModal(null);
        fetchData();
      } else {
        alert(data.error || 'Erro ao salvar compra.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredPurchases = purchases.filter(
    (p) =>
      p.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
      p.supplier?.corporateName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <ShoppingCart className="w-6 h-6 text-emerald-600 mr-2.5" />
            Gestão de Compras Efetivadas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registre compras do orçamento ou compras diretas sem cotação prévia
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Compra Direta */}
          <button
            onClick={() => {
              setFormData({
                id: '',
                budgetItemId: budgetItems[0]?.id || '',
                supplierId: suppliers[0]?.id || '',
                invoiceNumber: '',
                description: 'Compra Direta (Pequenos Materiais)',
                quantity: 1,
                unit: 'un',
                unitPrice: 0,
                discount: 0,
                freight: 0,
                paymentCondition: 'À vista',
                dueDate: new Date().toISOString().split('T')[0],
                notes: 'Compra Direta efetuada sem necessidade de 3 orçamentos.',
                forceConfirm: false,
                isDirectPurchase: true,
              });
              setShowModal(true);
            }}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-xs transition"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>+ Compra Direta</span>
          </button>

          {/* Botão Compra Orçamento */}
          <button
            onClick={() => {
              const first = budgetItems[0];
              setFormData({
                id: '',
                budgetItemId: first?.id || '',
                supplierId: first?.chosenSupplierId || suppliers[0]?.id || '',
                invoiceNumber: '',
                description: first?.itemName || '',
                quantity: first?.quantity || 1,
                unit: first?.unit || 'un',
                unitPrice: first?.contractedUnitPrice || 0,
                discount: 0,
                freight: 0,
                paymentCondition: '30 dias',
                dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                notes: '',
                forceConfirm: false,
                isDirectPurchase: false,
              });
              setShowModal(true);
            }}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Compra Orçada</span>
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código (COMP-0001), nota fiscal, item ou fornecedor..."
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
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Data</th>
                <th className="py-3 px-3">NF / Recibo</th>
                <th className="py-3 px-3">Descrição da Compra</th>
                <th className="py-3 px-3">Fornecedor</th>
                <th className="py-3 px-3">Centro de Custo</th>
                <th className="py-3 px-3 text-center">Qtd / Un</th>
                <th className="py-3 px-3 text-right">Valor Total</th>
                <th className="py-3 px-3 text-center">Vencimento</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredPurchases.map((p) => (
                <tr key={p.id} className="table-row-hover">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">{p.purchaseNumber}</td>
                  <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{formatDate(p.date)}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{p.invoiceNumber || '-'}</td>
                  <td className="py-3 px-3 font-medium text-slate-900 max-w-xs">{p.description}</td>
                  <td className="py-3 px-3 font-semibold text-slate-700">
                    {p.supplier?.tradeName || p.supplier?.corporateName}
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-semibold">{p.costCenter?.code}</td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {p.quantity} {p.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                    {formatCurrency(p.totalAmount)}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">{formatDate(p.dueDate)}</td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => handleEditPurchase(p)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title="Editar Compra"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePurchase(p.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition"
                        title="Excluir Compra"
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

      {/* Modal Formulário de Compra */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              {formData.isDirectPurchase ? (
                <>
                  <Zap className="w-5 h-5 text-amber-500 mr-2" />
                  <span>Nova Compra Direta (Pequenos Valores)</span>
                </>
              ) : formData.id ? (
                'Editar Compra Efetivada'
              ) : (
                'Efetivar Compra do Orçamento'
              )}
            </h2>
            <form onSubmit={handleSavePurchase} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Item do Orçamento Vinculado</label>
                <select
                  value={formData.budgetItemId}
                  onChange={(e) => handleBudgetItemChange(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-semibold"
                >
                  {budgetItems.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.itemName} (Orçado: {formatCurrency(b.contractedTotal)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Fornecedor</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-semibold"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.tradeName || s.corporateName} ({s.supplierType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Descrição da Compra</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nota Fiscal / Recibo</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono"
                    placeholder="NF-e 12345"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Qtd</label>
                  <input
                    type="number"
                    step="0.01"
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
                  <label className="font-semibold block mb-1">Preço Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl font-bold"
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
                  <label className="font-semibold block mb-1">Condição Pagamento</label>
                  <input
                    type="text"
                    value={formData.paymentCondition}
                    onChange={(e) => setFormData({ ...formData, paymentCondition: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                    placeholder="30 dias / À vista"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-semibold"
                  />
                </div>
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
                  {formData.id ? 'Atualizar Compra' : 'Salvar e Gerar a Pagar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Alerta de Extrapolação do Orçamento */}
      {confirmWarningModal && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-base font-bold">Estouro de Orçamento Detectado</h2>
            </div>
            <p className="text-xs text-slate-600">{confirmWarningModal.warning}</p>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
              <div>Orçamento Contratado: {formatCurrency(confirmWarningModal.budget)}</div>
              <div>Realizado Atual: {formatCurrency(confirmWarningModal.purchased)}</div>
              <div>Esta Compra: {formatCurrency(confirmWarningModal.currentPurchase)}</div>
              <div className="font-bold text-rose-700">
                Valor Excedido: {formatCurrency(confirmWarningModal.excessAmount)}
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setConfirmWarningModal(null)}
                className="px-4 py-2 border rounded-xl text-slate-600 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setFormData((prev) => ({ ...prev, forceConfirm: true }));
                  setTimeout(() => {
                    const btn = document.querySelector('form button[type="submit"]') as HTMLButtonElement;
                    if (btn) btn.click();
                  }, 100);
                }}
                className="px-4 py-2 bg-amber-600 text-white text-xs rounded-xl font-bold"
              >
                Confirmar Compra Mesmo Assim
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
