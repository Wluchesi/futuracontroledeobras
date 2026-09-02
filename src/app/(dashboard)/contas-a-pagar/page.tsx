'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { Receipt, Search, CheckCircle2, Clock, AlertCircle, CreditCard, Edit3, RotateCcw, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/calculations';

export default function ContasAPagarPage() {
  const { selectedProject } = useProject();
  const [payables, setPayables] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal Baixa / Pagamento (Parcial ou Total)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    amountPaid: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'PIX',
    notes: 'Pagamento efetuado via PIX',
  });

  // Modal Alterar Vencimento / Editar Conta
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    id: '',
    dueDate: '',
    amount: 0,
    description: '',
    documentNumber: '',
    notes: '',
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
      p.supplier?.corporateName?.toLowerCase().includes(search.toLowerCase()) ||
      (p.documentNumber && p.documentNumber.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Totais calculados
  const totalPaid = payables.reduce((acc, p) => acc + (p.totalPaid || (p.status === 'PAGO' ? p.amount : 0)), 0);
  const totalPending = payables.filter((p) => p.status === 'A_VENCER').reduce((acc, p) => acc + (p.balanceRemaining ?? p.amount), 0);
  const totalOverdue = payables.filter((p) => p.status === 'VENCIDO').reduce((acc, p) => acc + (p.balanceRemaining ?? p.amount), 0);
  const totalParcial = payables.filter((p) => p.status === 'PAGO_PARCIAL').reduce((acc, p) => acc + (p.balanceRemaining ?? p.amount), 0);

  const handleOpenPayment = (p: any) => {
    setSelectedPayable(p);
    const remaining = p.balanceRemaining !== undefined ? p.balanceRemaining : (p.status === 'PAGO' ? 0 : p.amount);
    setPaymentData({
      amountPaid: remaining > 0 ? remaining : p.amount,
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
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao registrar pagamento.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEdit = (p: any) => {
    setEditData({
      id: p.id,
      dueDate: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      amount: p.amount,
      description: p.description,
      documentNumber: p.documentNumber || '',
      notes: p.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/accounts-payable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchPayables();
      } else {
        alert('Erro ao atualizar data de vencimento / dados da conta.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    if (!confirm('Tem certeza que deseja estornar / cancelar esta baixa?')) return;
    try {
      const res = await fetch(`/api/payments?id=${paymentId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPayables();
      } else {
        alert('Erro ao estornar pagamento.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Receipt className="w-6 h-6 text-emerald-600 mr-2.5" />
            Contas a Pagar & Controle Financeiro
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Status automático com código de cores: 🟢 PAGO, 🔵 PARCIAL, 🟡 A VENCER, 🔴 VENCIDO
          </p>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Total Pago
          </span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center">
            <DollarSign className="w-3.5 h-3.5 mr-1 text-blue-600" />
            Pendente Parcial
          </span>
          <div className="text-xl font-extrabold text-blue-600 mt-1">{formatCurrency(totalParcial)}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" />
            A Vencer
          </span>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{formatCurrency(totalPending)}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center">
            <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
            Vencidas
          </span>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{formatCurrency(totalOverdue)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3 border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por descrição, documento ou fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden"
        >
          <option value="">Todos os Status</option>
          <option value="PAGO">🟢 PAGO INTEGRAL</option>
          <option value="PAGO_PARCIAL">🔵 PAGO PARCIAL</option>
          <option value="A_VENCER">🟡 A VENCER</option>
          <option value="VENCIDO">🔴 VENCIDO</option>
        </select>
      </div>

      {/* Tabela de Contas */}
      <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Doc / NF</th>
                <th className="py-3 px-3">Descrição da Conta</th>
                <th className="py-3 px-3">Fornecedor</th>
                <th className="py-3 px-3">Centro de Custo</th>
                <th className="py-3 px-3 text-right">Valor Total</th>
                <th className="py-3 px-3 text-right">Total Pago</th>
                <th className="py-3 px-3 text-right">Saldo Restante</th>
                <th className="py-3 px-3 text-center">Vencimento</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredPayables.map((item) => {
                const totalPaidItem = item.totalPaid || 0;
                const balanceRemaining = item.balanceRemaining !== undefined ? item.balanceRemaining : (item.status === 'PAGO' ? 0 : item.amount);

                return (
                  <tr key={item.id} className="table-row-hover">
                    {/* Status Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${item.badgeColor}`}>
                        {item.statusLabel || item.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{item.documentNumber || '-'}</td>
                    <td className="py-3 px-3 font-medium text-slate-900 max-w-xs">{item.description}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {item.supplier?.tradeName || item.supplier?.corporateName}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-600">{item.costCenter?.code}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">{formatCurrency(item.amount)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                      {formatCurrency(totalPaidItem)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-blue-700 whitespace-nowrap">
                      {formatCurrency(balanceRemaining)}
                    </td>
                    <td className="py-3 px-3 text-center font-medium whitespace-nowrap">
                      <div className="inline-flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                        {formatDate(item.dueDate)}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Botão Alterar Vencimento / Editar */}
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="Alterar Vencimento / Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão Baixa (Parcial ou Total) */}
                        {item.status !== 'PAGO' && (
                          <button
                            onClick={() => handleOpenPayment(item)}
                            className="inline-flex items-center px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition shadow-2xs"
                            title="Registrar Pagamento Parcial ou Total"
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            <span>Dar Baixa</span>
                          </button>
                        )}

                        {/* Botão Cancelar / Estornar Pagamento se já houver histórico */}
                        {item.payments && item.payments.length > 0 && (
                          <button
                            onClick={() => handleCancelPayment(item.payments[item.payments.length - 1].id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition"
                            title="Estornar Último Pagamento"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Pagamento (Baixa Parcial / Total) */}
      {showPaymentModal && selectedPayable && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <CreditCard className="w-5 h-5 text-emerald-600 mr-2" />
              Dar Baixa no Pagamento (Parcial ou Total)
            </h2>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{selectedPayable.description}</div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Valor Total da Conta:</span>
                <strong className="text-slate-900">{formatCurrency(selectedPayable.amount)}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Já Pago Anteriormente:</span>
                <strong className="text-emerald-700">{formatCurrency(selectedPayable.totalPaid || 0)}</strong>
              </div>
              <div className="flex justify-between text-slate-600 font-bold border-t border-slate-200 pt-1">
                <span>Saldo Devedor Restante:</span>
                <strong className="text-blue-700">
                  {formatCurrency(
                    selectedPayable.balanceRemaining !== undefined
                      ? selectedPayable.balanceRemaining
                      : selectedPayable.amount
                  )}
                </strong>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Valor do Pagamento Atual (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentData.amountPaid}
                  onChange={(e) => setPaymentData({ ...paymentData, amountPaid: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl font-bold text-emerald-700 text-sm"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  * Insira um valor menor que o saldo devedor para registrar <strong>Baixa Parcial</strong>.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Data do Pagamento</label>
                  <input
                    type="date"
                    required
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-semibold"
                  >
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="TRANSFERENCIA">TED / DOC</option>
                    <option value="CARTAO">Cartão de Crédito</option>
                    <option value="DINHEIRO">Dinheiro / Espécie</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Observação do Pagamento</label>
                <textarea
                  rows={2}
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full p-2 border rounded-xl text-slate-600"
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
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alterar Vencimento / Editar Conta */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <Calendar className="w-5 h-5 text-amber-500 mr-2" />
              Alterar Data de Vencimento & Dados
            </h2>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Descrição da Conta</label>
                <input
                  type="text"
                  required
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Nova Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={editData.dueDate}
                    onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-bold text-amber-700"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Valor da Conta (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editData.amount}
                    onChange={(e) => setEditData({ ...editData, amount: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Documento / Nota Fiscal</label>
                <input
                  type="text"
                  value={editData.documentNumber}
                  onChange={(e) => setEditData({ ...editData, documentNumber: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
