'use client';

import React from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  HardHat,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  ShoppingBag,
  FileSpreadsheet,
  Building2,
  ArrowRight,
  TrendingUp,
  Search,
  Truck,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface EngineeringDashboardProps {
  engineering: {
    totalItems: number;
    plannedItems: number;
    inProgressItems: number;
    completedItems: number;
    quotationsCount: number;
    purchasesCount: number;
    activeStagesCount: number;
    statusChart: Array<{ name: string; value: number; color: string }>;
  };
  charts: {
    chart4: any[];
    chart6: any[];
  };
  projectName?: string;
}

export default function EngineeringDashboard({
  engineering,
  charts,
  projectName,
}: EngineeringDashboardProps) {
  const total = engineering?.totalItems || 0;
  const completed = engineering?.completedItems || 0;
  const inProgress = engineering?.inProgressItems || 0;
  const planned = engineering?.plannedItems || 0;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const kpis = [
    {
      title: 'Progresso Físico',
      value: `${progressPercent}%`,
      subtitle: `${completed} de ${total} itens concluídos`,
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-700',
      bgLight: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    {
      title: 'Itens em Andamento',
      value: inProgress,
      subtitle: 'Serviços ativos no canteiro',
      icon: Clock,
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-700',
      bgLight: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      title: 'Itens Planejados',
      value: planned,
      subtitle: 'Aguardando início de execução',
      icon: Calendar,
      color: 'from-slate-500 to-slate-600',
      textColor: 'text-slate-700',
      bgLight: 'bg-slate-50',
      border: 'border-slate-200',
    },
    {
      title: 'Cotações de Materiais',
      value: engineering?.quotationsCount || 0,
      subtitle: 'Propostas registradas',
      icon: Layers,
      color: 'from-purple-500 to-indigo-600',
      textColor: 'text-purple-700',
      bgLight: 'bg-purple-50',
      border: 'border-purple-200',
    },
    {
      title: 'Pedidos de Compra',
      value: engineering?.purchasesCount || 0,
      subtitle: 'Ordens de suprimentos',
      icon: ShoppingBag,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-700',
      bgLight: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      title: 'Etapas Ativas',
      value: engineering?.activeStagesCount || 0,
      subtitle: 'Frentes com movimentação',
      icon: Building2,
      color: 'from-cyan-500 to-blue-600',
      textColor: 'text-cyan-700',
      bgLight: 'bg-cyan-50',
      border: 'border-cyan-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Barra de Progresso Físico Geral */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center">
              <HardHat className="w-5 h-5 text-emerald-600 mr-2" />
              Acompanhamento Físico da Obra
            </h2>
            <p className="text-xs text-slate-500">
              Evolução percentual baseada no cumprimento dos itens cadastrados no cronograma executivo.
            </p>
          </div>
          <span className="text-2xl font-black text-emerald-600 self-start sm:self-auto">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-slate-500 font-medium">
          <span>0% (Início)</span>
          <span>{completed} Concluídos • {inProgress} Em Execução • {planned} Pendentes</span>
          <span>100% (Conclusão)</span>
        </div>
      </div>

      {/* Grid de KPIs Técnicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl bg-white border ${kpi.border} shadow-xs hover:shadow-md transition`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">{kpi.title}</span>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${kpi.color} text-white shadow-xs`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-black ${kpi.textColor}`}>{kpi.value}</div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{kpi.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Gráficos de Engenharia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status dos Itens da Obra */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-2" />
            Status Físico dos Itens Executivos
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={engineering?.statusChart || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(engineering?.statusChart || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Suprimentos por Fornecedor */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2" />
            Fornecedores Principais da Obra
          </h3>
          <div className="h-64 w-full">
            {charts.chart6 && charts.chart6.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.chart6.slice(0, 6)} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                  <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `R$${v / 1000}k`} />
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  <Bar dataKey="total" name="Volume de Pedidos" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhum pedido de fornecedor registrado ainda.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ações Rápidas do Engenheiro */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
          <HardHat className="w-4 h-4 text-emerald-600 mr-2" />
          Ações Rápidas de Campo & Engenharia
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/orcamento-executivo"
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 font-bold group-hover:bg-emerald-600 group-hover:text-white transition">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">Orçamento Executivo</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Acompanhe itens, serviços e composições da obra.
              </p>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center mt-3 group-hover:translate-x-1 transition">
              Abrir planilha <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Link>

          <Link
            href="/cotacoes"
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 font-bold group-hover:bg-blue-600 group-hover:text-white transition">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">Cotações de Materiais</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Compare fornecedores e selecione o menor preço.
              </p>
            </div>
            <span className="text-[11px] font-bold text-blue-600 flex items-center mt-3 group-hover:translate-x-1 transition">
              Acessar cotações <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Link>

          <Link
            href="/compras"
            className="p-4 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2 font-bold group-hover:bg-amber-600 group-hover:text-white transition">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">Pedidos de Compra</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Consulte ordens de compras emitidas para entrega na obra.
              </p>
            </div>
            <span className="text-[11px] font-bold text-amber-600 flex items-center mt-3 group-hover:translate-x-1 transition">
              Ver pedidos <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Link>

          <Link
            href="/sinapi"
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2 font-bold group-hover:bg-purple-600 group-hover:text-white transition">
                <Search className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">Base SINAPI</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Consulte tabelas e índices oficiais da Caixa Econômica.
              </p>
            </div>
            <span className="text-[11px] font-bold text-purple-600 flex items-center mt-3 group-hover:translate-x-1 transition">
              Consultar banco <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
