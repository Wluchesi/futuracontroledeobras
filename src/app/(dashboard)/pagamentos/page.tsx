'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { CreditCard, CheckCircle2, Search, RotateCcw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/calculations';

export default function PagamentosPage() {
  const { selectedProject } = useProject();
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/payments`);
      if (res.ok) {
        const data = await res.json();
        // Filtrar pagamentos das contas a pagar deste projeto
        const projectPayments = data.filter(
          (p: any) => p.accountPayable && p.accountPayable.projectId === selectedProject.id
        );
        setPayments(projectPayments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [selectedProject]);

  const handleCancelPayment = async (paymentId: string) => {
    if (!confirm('Tem certeza que deseja estornar / cancelar esta baixa? O saldo será devolvido à conta a pagar.')) return;
    try {
      const res = await fetch(`/api/payments?id=${paymentId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPayments();
      } else {
        alert('Erro ao cancelar pagamento.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = payments.filter(
    (p) =>
      p.accountPayable?.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.accountPayable?.supplier?.corporateName?.toLowerCase().includes(search.toLowerCase()) ||
      p.notes?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPaidSum = filtered.reduce((acc, p) => acc + p.amountPaid, 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <CreditCard className="w-6 h-6 text-emerald-600 mr-2.5" />
            Histórico de Pagamentos & Baixas Efetuadas
          </h1>
          <p className="text-xs text-slate-500 mt-1">Registro de todas as baixas (parciais e totais) com opção de estorno</p>
        </div>
        <div className="glass-card px-4 py-2 rounded-2xl border border-emerald-300 bg-emerald-50/50">
          <span className="text-[10px] font-bold text-emerald-700 uppercase block">Total Pago em Baixas</span>
          <div className="text-lg font-extrabold text-emerald-800">{formatCurrency(totalPaidSum)}</div>
        </div>
      </div>

      <div className="glass-card p-4 rounded-2xl border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar histórico de pagamentos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Data Baixa</th>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4">Descrição da Conta</th>
                <th className="py-3 px-4">Forma</th>
                <th className="py-3 px-4">Observações</th>
                <th className="py-3 px-4 text-right">Valor Pago</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filtered.map((p) => (
                <tr key={p.id} className="table-row-hover">
                  <td className="py-3 px-4 font-semibold text-emerald-700 whitespace-nowrap">
                    <span className="inline-flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      {formatDate(p.paymentDate)}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {p.accountPayable?.supplier?.tradeName || p.accountPayable?.supplier?.corporateName || '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-800 font-medium">{p.accountPayable?.description}</td>
                  <td className="py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px]">
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs">{p.notes || '-'}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                    {formatCurrency(p.amountPaid)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleCancelPayment(p.id)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-rose-600 hover:bg-rose-100 rounded-lg text-[11px] font-bold transition"
                      title="Estornar / Cancelar Baixa"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Estornar</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
