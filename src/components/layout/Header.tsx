'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { Building2, Bell, AlertTriangle, Plus, ChevronDown, CheckCircle, Zap, ShieldCheck, Users, Layers } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  const { projects, selectedProject, setSelectedProject } = useProject();
  const { user, updateCompanySession } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlertsMenu, setShowAlertsMenu] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);

  const currentCompany = user?.company;

  useEffect(() => {
    async function fetchAlerts() {
      if (!selectedProject) return;
      try {
        const res = await fetch(`/api/dashboard?projectId=${selectedProject.id}`);
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.alerts || []);
        }
      } catch (e) {
        console.error('Failed to fetch header alerts', e);
      }
    }
    fetchAlerts();
  }, [selectedProject]);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch('/api/companies');
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.companies || []);
        }
      } catch (e) {
        console.error('Failed to fetch companies', e);
      }
    }
    fetchCompanies();
  }, []);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-6 flex items-center justify-between shadow-lg text-slate-100">
      {/* SaaS Multi-Tenant & Active Project Selector */}
      <div className="flex items-center space-x-4 pl-10 lg:pl-0">
        
        {/* Company Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCompanyMenu(!showCompanyMenu)}
            className="flex items-center space-x-2.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl transition shadow-xs cursor-pointer group"
          >
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg group-hover:scale-105 transition">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Empresa SaaS</span>
              <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                {currentCompany?.name || 'Sua Empresa'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Company Switcher Modal */}
          {showCompanyMenu && (
            <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Alternar Empresa</span>
                <Link
                  href="/empresas"
                  onClick={() => setShowCompanyMenu(false)}
                  className="text-[11px] text-emerald-400 hover:underline font-semibold"
                >
                  Gerenciar
                </Link>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {companies.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => {
                      updateCompanySession(comp);
                      setShowCompanyMenu(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition ${
                      currentCompany?.id === comp.id
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{comp.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                      {comp._count?.projects || 0} obras
                    </span>
                  </button>
                ))}
              </div>

              <Link
                href="/empresas?action=new"
                onClick={() => setShowCompanyMenu(false)}
                className="mt-2 w-full flex items-center justify-center space-x-1.5 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Nova Construtora</span>
              </Link>
            </div>
          )}
        </div>

        {/* Separator Divider */}
        <div className="hidden sm:block h-6 w-px bg-slate-800" />

        {/* Active Obra Select */}
        <div className="hidden md:flex items-center space-x-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Obra:</span>
          <div className="relative">
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) setSelectedProject(found);
              }}
              className="appearance-none bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-1.5 font-semibold text-white text-xs pr-7 cursor-pointer focus:outline-hidden hover:border-emerald-500 transition"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* SaaS Subscription Badge & Actions */}
      <div className="flex items-center space-x-3">

        {/* SaaS Plan Badge */}
        <Link
          href="/planos"
          className="hidden xl:flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-emerald-950 to-slate-850 border border-emerald-500/30 rounded-xl text-xs hover:border-emerald-400 transition shadow-xs group"
          title="Clique para gerenciar seu plano SaaS"
        >
          <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="font-bold text-emerald-300 text-[11px] leading-tight group-hover:text-white transition">
              {currentCompany?.planName || 'Plano Premium Multi-Obras'}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center space-x-2">
              <span>{projects.length} / {currentCompany?.maxProjects || 10} Obras</span>
              <span>•</span>
              <span>Limites SaaS</span>
            </span>
          </div>
        </Link>

        {/* Quick Nova Compra Button */}
        <Link
          href="/compras?action=new"
          className="hidden sm:inline-flex items-center px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Compra</span>
        </Link>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsMenu(!showAlertsMenu)}
            className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 transition relative"
            title="Central de Alertas"
          >
            <Bell className="w-5 h-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {alerts.length}
              </span>
            )}
          </button>

          {showAlertsMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <span className="font-bold text-slate-200 text-sm flex items-center">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mr-2" />
                  Alertas Financeiros ({alerts.length})
                </span>
                <button onClick={() => setShowAlertsMenu(false)} className="text-xs text-slate-400 hover:text-white">
                  Fechar
                </button>
              </div>

              {alerts.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Nenhum alerta financeiro pendente! 🟢</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {alerts.map((al, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-xs border ${
                        al.type === 'danger'
                          ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                          : al.type === 'warning'
                          ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                          : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      }`}
                    >
                      <span className="font-bold block mb-0.5">{al.title}</span>
                      <p className="text-[11px] opacity-90">{al.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
