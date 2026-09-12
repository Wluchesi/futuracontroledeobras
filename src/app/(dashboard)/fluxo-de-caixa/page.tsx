'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProject } from '@/context/ProjectContext';
import { useAuth, isSuperAdmin } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  ShieldCheck,
  Building2,
  Plus,
  Receipt,
  ShoppingCart,
  Loader2,
  CalendarClock,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/calculations';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FluxoDeCaixaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { selectedProject, projects, loading: projectLoading } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isAllowed = user?.role === 'ADMIN' || user?.role === 'FINANCEIRO' || isSuperAdmin(user);

  useEffect(() => {
    if (user && !isAllowed) {
      router.push('/');
    }
  }, [user, isAllowed, router]);

  useEffect(() => {
    async function fetchCashFlow() {
      if (!selectedProject) {
        setLoading(false);
        setData({
          summary: {
            initialBalance: 0,
            totalEntries: 0,
            totalPaid: 0,
            totalPending: 0,
            totalOverdue: 0,
            realizedBalance: 0,
            projectedBalance: 0,
          },
          timeline: [],
        });
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`/api/cash-flow?projectId=${selectedProject.id}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        } else {
          setData({
            summary: {
              initialBalance: 0,
              totalEntries: 0,
              totalPaid: 0,
              totalPending: 0,
              totalOverdue: 0,
              realizedBalance: 0,
              projectedBalance: 0,
            },
            timeline: [],
          });
        }
      } catch (e) {
        console.error('Error fetching cash flow:', e);
        setData({
          summary: {
            initialBalance: 0,
            totalEntries: 0,
            totalPaid: 0,
            totalPending: 0,
            totalOverdue: 0,
            realizedBalance: 0,
            projectedBalance: 0,
          },
          timeline: [],
        });
      } finally {
        setLoading(false);
      }
    }

    if (!projectLoading) {
      fetchCashFlow();
    }
  }, [selectedProject, projectLoading]);

  if (user && !isAllowed) {
    return null;
  }

  // Estado 1: Carregando
  if (projectLoading || (loading && selectedProject)) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="text-xs font-semibold">Calculando projeções do fluxo de caixa...</span>
      </div>
    );
  }

  // Estado 2: Nenhuma Obra Cadastrada na Conta
  if (!projectLoading && (!projects || projects.length === 0)) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <TrendingUp className="w-6 h-6 text-emerald-600 mr-2.5" />
            Fluxo de Caixa Projetado x Realizado
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Projeção diária e mensal do saldo bancário da obra
          </p>
        </div>

        <div className="glass-card p-12 rounded-3xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto my-8 bg-white shadow-xs">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Nenhuma Obra Cadastrada</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Para visualizar o fluxo de caixa projetado e o saldo realizado, cadastre sua primeira obra no sistema.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/obras"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Minha Primeira Obra</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    initialBalance: 0,
    totalEntries: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    realizedBalance: 0,
    projectedBalance: 0,
  };
  const timeline = data?.timeline || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <TrendingUp className="w-6 h-6 text-emerald-600 mr-2.5" />
            Fluxo de Caixa Projetado x Realizado
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Projeção diária e mensal do saldo da conta bancária da obra:{' '}
            <strong className="text-slate-800">{selectedProject?.name || 'Obra Ativa'}</strong>
          </p>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Capital Inicial / Entradas</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{formatCurrency(summary.totalEntries)}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Saídas Pagas 🟢</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-600">{formatCurrency(summary.totalPaid)}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-200 bg-white">
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

      {/* Se não houver lançamentos ainda */}
      {timeline.length === 0 ? (
        <div className="glass-card p-10 rounded-2xl border border-slate-200 text-center space-y-4 bg-white shadow-xs">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <CalendarClock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Você ainda não tem lançamentos financeiros nesta obra</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Cadastre despesas em <strong>Contas a Pagar</strong> ou ordens de <strong>Compras</strong> para visualizar aqui a evolução do saldo bancário e o gráfico do fluxo de caixa.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/contas-a-pagar"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>Lançar Contas a Pagar</span>
            </Link>
            <Link
              href="/compras"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Registrar Compras</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Gráfico do Fluxo de Caixa */}
          <div className="glass-card p-5 rounded-2xl border border-slate-200 shadow-xs bg-white">
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
          <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-white">
            <div className="p-4 border-b bg-slate-50 font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>Cronograma Detalhado de Lançamentos Financeiros</span>
              <span className="text-[11px] text-slate-500 font-medium">{timeline.length} lançamento(s)</span>
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
        </>
      )}
    </div>
  );
}
