'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import KpiCards from '@/components/dashboard/KpiCards';
import BiCharts from '@/components/dashboard/BiCharts';
import { AlertTriangle, HardHat, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard?projectId=${selectedProject.id}`);
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
  }, [selectedProject]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">Carregando indicadores do dashboard...</p>
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
            <span>Dashboard Executivo & BI</span>
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

      {/* KPI Cards (8 Cards) */}
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
    </div>
  );
}
