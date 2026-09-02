'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/calculations';

interface BiChartsProps {
  charts: {
    chart1: any[];
    chart2: any[];
    chart3: any[];
    chart4: any[];
    chart5: any[];
    chart6: any[];
  };
}

const COLORS_PIE = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export default function BiCharts({ charts }: BiChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* GRÁFICO 1: Orçado Vencedor x Realizado por Centro de Custo */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2" />
          1. Orçado (Vencedor) x Realizado por Centro de Custo
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.chart1} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="code" stroke="#64748B" fontSize={11} interval={0} angle={-30} textAnchor="end" />
              <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `R$${v / 1000}k`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="Orçado (Vencedor)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Realizado" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 2: Evolução dos Gastos por Mês */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-2" />
          2. Evolução dos Gastos por Mês
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.chart2} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `R$${v / 1000}k`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="Gastos" stroke="#10B981" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 3: Status das Contas (Pagas x Parcial x A vencer x Vencidas) */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2" />
          3. Status das Contas (🟢 Integral / 🔵 Parcial / 🟡 A Vencer / 🔴 Vencidas)
        </h3>
        <div className="h-72 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={charts.chart3}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {charts.chart3.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value} conta(s)`, 'Quantidade']} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 4: Distribuição dos Gastos por Centro de Custo */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 mr-2" />
          4. Distribuição dos Gastos por Centro de Custo
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={charts.chart4}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name }) => name}
              >
                {charts.chart4.map((entry, index) => (
                  <Cell key={`cell-dist-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 5: Fluxo de Caixa */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 mr-2" />
          5. Fluxo de Caixa (Saídas Previstas vs Realizadas)
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.chart5} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `R$${v / 1000}k`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="Previsto" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Saidas" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 6: Top 10 Fornecedores por Volume Comprado */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 mr-2" />
          6. Top 10 Fornecedores por Volume Comprado
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={charts.chart6} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" stroke="#64748B" fontSize={11} tickFormatter={(v) => `R$${v / 1000}k`} />
              <YAxis type="category" dataKey="name" stroke="#64748B" fontSize={10} width={100} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Bar dataKey="total" fill="#6366F1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
