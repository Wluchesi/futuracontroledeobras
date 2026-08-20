'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { Receipt, Search, Filter, CheckCircle2, Clock, AlertCircle, CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/calculations';

export default function ContasAPagarPage() {
  const { selectedProject } = useProject();
  const [payables, setPayables] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal Dar Baixa / Registrar Pagamento
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    amountPaid: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'PIX',
    notes: 'Pagamento efetuado via PIX Banco do Brasil',
  });

  const fetchPayables = async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/accounts-payable?projectId=${selectedProject.id}`);
      if (res.ok) setPayables(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, [selectedProject]);

  const filteredPayables = payables.filter((p) => {
    const matchesSearch =
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier.corporateName.toLowerCase().includes(search.toLowerCase()) ||
      (p.documentNumber && p.documentNumber.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Totais
  const totalPaid = payables.filter((p) => p.status === 'PAGO').reduce((acc, p) => acc + p.amount, 0);
  const totalPending = payables.filter((p) => p.status === 'A_VENCER').reduce((acc, p) => acc + p.amount, 0);
  const totalOverdue = payables.filter((p) => p.status === 'VENCIDO').reduce((acc, p) => acc + p.amount, 0);

  const handleOpenPayment = (p: any) => {
    setSelectedPayable(p);
    setPaymentData({
      amountPaid: p.amount,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'PIX',
      notes: `Pagamento de ${p.description}`,
    });
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayable) return;
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountPayableId: selectedPayable.id,
          ...paymentData,
        }),
      });
      if (res.ok) {
        setShowPaymentModal(false);
        fetchPayables();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Receipt className="w-6 h-6 text-emerald-600 mr-2.5" />
            Contas a Pagar & Controle Financeiro
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Status automático com código de cores: 🟢 PAGO, 🟡 A VENCER, 🔴 VENCIDO
          </p>
        </div>
      </div>

      {/* Cards de Resumo com Regra de Cores Verde/Amarelo/Vermelho */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-emerald-500 border border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>🟢 TOTAL PAGO</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{formatCurrency(totalPaid)}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Títulos baixados no caixa</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-amber-500 border border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
            <span>🟡 A VENCER (NO PRAZO)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{formatCurrency(totalPending)}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Vencimento futuro</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-rose-500 border border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold text-rose-800">
            <span>🔴 VENCIDO (EM ATRASO)</span>
            <AlertCircle className="w-4 h-4 text-rose-600 animate-bounce" />
          </div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">{formatCurrency(totalOverdue)}</div>
          <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Necessita pagamento urgente!</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-3 border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por descrição, fornecedor ou número do documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden font-bold"
        >
          <option value="">Todos os Status (🟢 🟡 🔴)</option>
          <option value="PAGO">🟢 PAGO</option>
          <option value="A_VENCER">🟡 A VENCER</option>
          <option value="VENCIDO">🔴 VENCIDO</option>
        </select>
      </div>

      {/* Tabela Financeira com Badges Coloridos */}
      <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Centro Custo</th>
                <th className="py-3 px-4">Doc. N°</th>
                <th className="py-3 px-4 text-center">Emissão</th>
                <th className="py-3 px-4 text-center">Vencimento</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredPayables.map((p) => (
                <tr key={p.id} className="table-row-hover">
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${p.badgeColor}`}>
                      {p.statusLabel}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{p.supplier.tradeName || p.supplier.corporateName}</td>
                  <td className="py-3 px-4 text-slate-800">{p.description}</td>
                  <td className="py-3 px-4 text-slate-500 font-semibold">{p.costCenter?.code}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{p.documentNumber || '-'}</td>
                  <td className="py-3 px-4 text-center text-slate-500">{formatDate(p.issueDate)}</td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-800">{formatDate(p.dueDate)}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-900">{formatCurrency(p.amount)}</td>
                  <td className="py-3 px-4 text-right">
                    {p.status !== 'PAGO' ? (
                      <button
                        onClick={() => handleOpenPayment(p)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition shadow-xs flex items-center justify-center space-x-1"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Baixar Pagamento</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600">Pago em {formatDate(p.paymentDate)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Efetuar Pagamento */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Registrar Baixa de Pagamento</h2>
            <div className="p-3 bg-slate-100 rounded-xl text-xs space-y-1">
              <div>Fornecedor: <strong>{selectedPayable?.supplier?.tradeName}</strong></div>
              <div>Descrição: <strong>{selectedPayable?.description}</strong></div>
              <div>Valor Original: <strong>{formatCurrency(selectedPayable?.amount)}</strong></div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Valor Efetivamente Pago (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentData.amountPaid}
                  onChange={(e) => setPaymentData({ ...paymentData, amountPaid: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl font-bold text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Data do Pagamento</label>
                  <input
                    type="date"
                    required
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  >
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="TRANSFERENCIA">TED / DOC</option>
                    <option value="CARTAO">Cartão de Crédito</option>
                    <option value="DINHEIRO">Dinheiro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Observações do Comprovante</label>
                <input
                  type="text"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold">
                  Confirmar Baixa 🟢
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
