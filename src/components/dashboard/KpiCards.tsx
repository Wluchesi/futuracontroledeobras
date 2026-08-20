'use client';

import React from 'react';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import {
  Wallet,
  ShoppingCart,
  CheckCircle2,
  Clock,
  AlertCircle,
  PiggyBank,
  PieChart,
  TrendingDown,
} from 'lucide-react';

interface KpiCardsProps {
  kpis: {
    totalContracted: number;
    totalPurchased: number;
    totalPaid: number;
    openAmount: number;
    overdueAmount: number;
    budgetBalance: number;
    percentConsumed: number;
    quotationSavings: number;
  };
}

export default function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. ORÇAMENTO CONTRATADO */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/80 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Orçamento Contratado</span>
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(kpis.totalContracted)}</div>
        <p className="text-[11px] text-slate-400 mt-1">Total aprovado para a obra</p>
      </div>

      {/* 2. TOTAL COMPRADO */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/80 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Comprado</span>
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(kpis.totalPurchased)}</div>
        <p className="text-[11px] text-slate-400 mt-1">Ordens de compra emitidas</p>
      </div>

      {/* 3. TOTAL PAGO */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/80 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pago</span>
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-emerald-600">{formatCurrency(kpis.totalPaid)}</div>
        <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
          🟢 Baixado no caixa
        </span>
      </div>

      {/* 4. A PAGAR */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/80 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">A Pagar</span>
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-amber-600">{formatCurrency(kpis.openAmount)}</div>
        <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-1">
          🟡 Títulos no prazo
        </span>
      </div>

      {/* 5. VENCIDO */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/80 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vencido</span>
          <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-rose-600">{formatCurrency(kpis.overdueAmount)}</div>
        <span className="inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md mt-1 animate-pulse">
          🔴 Atraso no pagamento
        </span>
      </div>

      {/* 6. SALDO DO ORÇAMENTO */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/80 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Orçamento</span>
          <div className="p-2 bg-cyan-100 text-cyan-600 rounded-xl">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-cyan-600">{formatCurrency(kpis.budgetBalance)}</div>
        <p className="text-[11px] text-slate-400 mt-1">Orçamento disponível</p>
      </div>

      {/* 7. % DO ORÇAMENTO CONSUMIDO */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/80 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">% Consumido</span>
          <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
            <PieChart className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-purple-600">{formatPercent(kpis.percentConsumed)}</div>
        <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, kpis.percentConsumed)}%` }}
          />
        </div>
      </div>

      {/* 8. ECONOMIA NAS COTAÇÕES */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/80 hover:shadow-lg transition-shadow bg-gradient-to-br from-emerald-500/5 to-teal-500/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Economia Cotações</span>
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-emerald-700">{formatCurrency(kpis.quotationSavings)}</div>
        <p className="text-[11px] text-emerald-600 font-medium mt-1">Obtida na escolha dos melhores preços</p>
      </div>
    </div>
  );
}
