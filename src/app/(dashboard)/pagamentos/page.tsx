'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { CreditCard, CheckCircle2, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/calculations';

export default function PagamentosPage() {
  const { selectedProject } = useProject();
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      if (!selectedProject) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/accounts-payable?projectId=${selectedProject.id}&status=PAGO`);
        if (res.ok) setPayments(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, [selectedProject]);

  const filtered = payments.filter(
    (p) =>
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier.corporateName.toLowerCase().includes(search.toLowerCase())
  );

  const totalPaidSum = filtered.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <CreditCard className="w-6 h-6 text-emerald-600 mr-2.5" />
            Histórico de Pagamentos Efetuados
          </h1>
          <p className="text-xs text-slate-500 mt-1">Registro detalhado de todas as baixas e comprovantes pagos na obra</p>
        </div>
        <div className="glass-card px-4 py-2 rounded-2xl border border-emerald-300 bg-emerald-50/50">
          <span className="text-[10px] font-bold text-emerald-700 uppercase block">Total Eficientemente Pago</span>
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
                <th className="py-3 px-4">Data Pagamento</th>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Forma</th>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4 text-right">Valor Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filtered.map((p) => (
                <tr key={p.id} className="table-row-hover">
                  <td className="py-3 px-4 font-semibold text-emerald-700 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    {formatDate(p.paymentDate || p.updatedAt)}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{p.supplier.tradeName || p.supplier.corporateName}</td>
                  <td className="py-3 px-4 text-slate-800">{p.description}</td>
                  <td className="py-3 px-4 font-semibold text-slate-600">{p.paymentMethod || 'PIX'}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{p.documentNumber || '-'}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-emerald-700">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
