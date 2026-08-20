'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { TrendingUp, ArrowUpRight, ArrowDownLeft, Wallet, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/calculations';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FluxoDeCaixaPage() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCashFlow() {
      if (!selectedProject) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/cash-flow?projectId=${selectedProject.id}`);
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchCashFlow();
  }, [selectedProject]);

  if (loading || !data) return <div className="p-8 text-center text-xs">Carregando fluxo de caixa...</div>;

  const { summary, timeline } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <TrendingUp className="w-6 h-6 text-emerald-600 mr-2.5" />
            Fluxo de Caixa Projetado x Realizado
          </h1>
          <p className="text-xs text-slate-500 mt-1">Projeção diária e mensal do saldo da conta bancária da obra</p>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Capital Inicial / Entradas</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{formatCurrency(summary.totalEntries)}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Saídas Pagas 🟢</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-600">{formatCurrency(summary.totalPaid)}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Saldo Realizado no Caixa</span>
            <Wallet className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-xl font-extrabold text-cyan-700">{formatCurrency(summary.realizedBalance)}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-slate-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-indigo-800 uppercase">Saldo Projetado Final</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-extrabold text-indigo-900">{formatCurrency(summary.projectedBalance)}</div>
        </div>
      </div>

      {/* Gráfico do Fluxo de Caixa */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Evolução do Saldo Disponível (R$)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="description" stroke="#64748B" fontSize={10} tick={false} />
              <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `R$${v / 1000}k`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Area type="monotone" dataKey="realizedBalance" stroke="#10B981" fill="#D1FAE5" name="Saldo Realizado" />
              <Area type="monotone" dataKey="projectedBalance" stroke="#6366F1" fill="#E0E7FF" name="Saldo Projetado" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela do Cronograma */}
      <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b bg-slate-50 font-bold text-xs text-slate-800">
          Cronograma Detalhado de Lançamentos Financeiros
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4 text-right">Saída (R$)</th>
                <th className="py-3 px-4 text-right">Saldo Realizado</th>
                <th className="py-3 px-4 text-right">Saldo Projetado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {timeline.map((row: any) => (
                <tr key={row.id} className="table-row-hover">
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${row.badgeColor}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{formatDate(row.date)}</td>
                  <td className="py-3 px-4 text-slate-900 font-medium">{row.supplier}</td>
                  <td className="py-3 px-4 text-slate-700">{row.description}</td>
                  <td className="py-3 px-4 text-right font-bold text-rose-600">- {formatCurrency(row.amount)}</td>
                  <td className="py-3 px-4 text-right font-bold text-cyan-700">{formatCurrency(row.realizedBalance)}</td>
                  <td className="py-3 px-4 text-right font-bold text-indigo-700">{formatCurrency(row.projectedBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
