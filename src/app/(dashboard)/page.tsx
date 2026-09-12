'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import KpiCards from '@/components/dashboard/KpiCards';
import BiCharts from '@/components/dashboard/BiCharts';
import EngineeringDashboard from '@/components/dashboard/EngineeringDashboard';
import { AlertTriangle, HardHat, RefreshCw, Building2, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedProject, loading: projectsLoading } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isFinancialRole = user?.role === 'ADMIN' || user?.role === 'FINANCEIRO';

  const fetchDashboard = async () => {
    if (!user?.companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const url = selectedProject?.id
        ? `/api/dashboard?projectId=${selectedProject.id}&companyId=${user.companyId}`
        : `/api/dashboard?companyId=${user.companyId}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedProject?.id, user?.companyId]);

  if (projectsLoading || (loading && !data)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">Carregando indicadores do dashboard...</p>
      </div>
    );
  }

  // Estado Vazio: Empresa nova sem obras cadastradas
  if (!selectedProject) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-4 shadow-xs">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Nenhuma obra cadastrada ainda</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Sua construtora ({user?.company?.name || 'Sua Empresa'}) ainda não possui obras cadastradas.
            Cadastre sua primeira kitnet ou obra para começar a acompanhar orçamentos, compras e fluxo de caixa.
          </p>
        </div>
        {isFinancialRole && (
          <Link
            href="/obras"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeira Obra</span>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <HardHat className="w-4 h-4" />
            <span>
              {isFinancialRole ? 'Dashboard Executivo & BI' : 'Painel Técnico de Engenharia'}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white">{selectedProject?.name}</h1>
          <p className="text-slate-300 text-xs lg:text-sm mt-1">
            {selectedProject?.city} - {selectedProject?.state} • {selectedProject?.ownerClient}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="self-start md:self-center flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {isFinancialRole ? (
        <>
          {/* KPI Cards (8 Cards Financeiros para Admin / Financeiro) */}
          <KpiCards kpis={data.kpis} />

          {/* Seção "Atenção Necessária" */}
          {data.alerts && data.alerts.length > 0 && (
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500 border border-slate-200 shadow-sm">
              <h2 className="font-bold text-slate-900 text-base mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
                Atenção Necessária ({data.alerts.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.alerts.map((alert: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs ${
                      alert.type === 'danger'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : alert.type === 'warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <span className="font-bold text-sm block mb-1">{alert.title}</span>
                    <p className="opacity-90">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6 Gráficos BI */}
          <BiCharts charts={data.charts} />
        </>
      ) : (
        /* Painel Técnico e Físico de Obra para Engenheiro / Comprador */
        <EngineeringDashboard
          engineering={data.engineering}
          charts={data.charts}
          projectName={selectedProject?.name}
        />
      )}
    </div>
  );
}
