'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { useAuth, isSuperAdmin } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  ShieldAlert,
  Building2,
  UserCheck,
  Save,
  Users,
  Database,
  Download,
  Zap,
  ArrowRight,
  Shield,
} from 'lucide-react';

export default function ConfiguracoesPage() {
  const { selectedProject, refreshProjects } = useProject();
  const { user } = useAuth();
  const router = useRouter();

  const isSuper = isSuperAdmin(user);
  const isAdmin = user?.role === 'ADMIN' || isSuper;

  // Proteção estrita de acesso: Somente Administradores ou Super Admin
  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/');
    }
  }, [user, isAdmin, router]);

  const [exceedRule, setExceedRule] = useState(selectedProject?.exceedRule || 1);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Estados da Empresa e SaaS
  const [company, setCompany] = useState<any>(null);
  const [companyFormData, setCompanyFormData] = useState({
    id: '',
    name: '',
    taxId: '',
    planName: 'Plano Gratuito (1 Obra / 4 Kitnets)',
    maxProjects: 1,
    maxUsers: 2,
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySaveMsg, setCompanySaveMsg] = useState('');

  // Lista de Membros da Empresa (isolada por tenant)
  const [usersList, setUsersList] = useState<any[]>([]);

  const fetchCompanyAndUsers = async () => {
    try {
      const companyId = user?.company?.id || user?.companyId;
      if (!companyId) return;

      const [resComp, resTeam] = await Promise.all([
        fetch(`/api/company?companyId=${companyId}`),
        fetch(`/api/equipe?companyId=${companyId}`),
      ]);

      if (resComp.ok) {
        const comp = await resComp.json();
        setCompany(comp);
        setCompanyFormData({
          id: comp.id,
          name: comp.name || 'Sua Construtora',
          taxId: comp.taxId || '',
          planName: comp.planName || 'Plano Gratuito',
          maxProjects: comp.maxProjects || 1,
          maxUsers: comp.maxUsers || 2,
        });
      }

      if (resTeam.ok) {
        const teamData = await resTeam.json();
        setUsersList(teamData.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchCompanyAndUsers();
    }
  }, [user, isAdmin]);

  const handleSaveExceedRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProject.id,
          exceedRule: Number(exceedRule),
        }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        refreshProjects();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCompany(true);
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...companyFormData,
          isSuperAdmin: isSuper,
        }),
      });
      if (res.ok) {
        setCompanySaveMsg('Dados da empresa atualizados com sucesso! 🟢');
        setTimeout(() => setCompanySaveMsg(''), 3000);
        fetchCompanyAndUsers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingCompany(false);
    }
  };

  if (user && !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Settings className="w-6 h-6 text-emerald-600 mr-2.5" />
            Configurações da Empresa & Sistema
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerenciamento de dados cadastrais, regras orçamentárias e visão de equipe
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Perfil da Empresa & Limites SaaS */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center justify-between border-b pb-3">
            <span className="flex items-center">
              <Building2 className="w-5 h-5 text-emerald-600 mr-2" />
              Perfil da Empresa
            </span>
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full uppercase">
              {company?.planName || 'Plano Gratuito'}
            </span>
          </h2>

          <form onSubmit={handleSaveCompany} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Razão Social / Nome da Empresa</label>
              <input
                type="text"
                required
                value={companyFormData.name}
                onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden"
                placeholder="Ex: Construtora Passos Ltda"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">CNPJ / CPF</label>
              <input
                type="text"
                value={companyFormData.taxId}
                onChange={(e) => setCompanyFormData({ ...companyFormData, taxId: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden"
                placeholder="00.000.000/0001-00"
              />
            </div>

            {/* Configuração de Limites do SaaS */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  Limites do Plano SaaS
                </span>
                {!isSuper && (
                  <Link
                    href="/planos"
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <span>Mudar de Plano</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {isSuper ? (
                /* Super Admin pode editar limites diretamente */
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold block mb-1 text-[11px] text-slate-600">Plano SaaS</label>
                    <input
                      type="text"
                      value={companyFormData.planName}
                      onChange={(e) => setCompanyFormData({ ...companyFormData, planName: e.target.value })}
                      className="w-full p-2 border rounded-xl font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-[11px] text-slate-600">Máx. Obras</label>
                    <input
                      type="number"
                      value={companyFormData.maxProjects}
                      onChange={(e) => setCompanyFormData({ ...companyFormData, maxProjects: Number(e.target.value) })}
                      className="w-full p-2 border rounded-xl font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-[11px] text-slate-600">Máx. Usuários</label>
                    <input
                      type="number"
                      value={companyFormData.maxUsers}
                      onChange={(e) => setCompanyFormData({ ...companyFormData, maxUsers: Number(e.target.value) })}
                      className="w-full p-2 border rounded-xl font-bold text-xs"
                    />
                  </div>
                </div>
              ) : (
                /* Usuário Administrador de Tenant: visualização clara dos limites de sua assinatura */
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Limite de Obras</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {company?.maxProjects || 1} {company?.maxProjects === 1 ? 'obra ativa' : 'obras ativas'}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Limite de Equipe</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {company?.maxUsers || 2} {company?.maxUsers === 1 ? 'usuário' : 'usuários'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {companySaveMsg && (
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-center text-xs">
                {companySaveMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={savingCompany}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition w-full"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Dados Cadastrais</span>
            </button>
          </form>
        </div>

        {/* Card 2: Regra de Extrapolação de Orçamento */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center border-b pb-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 mr-2" />
            Regra de Extrapolação de Orçamento (Seção 17)
          </h2>
          <p className="text-xs text-slate-500">
            Defina como o sistema deve agir quando uma compra ultrapassar o valor contratado para o item:
          </p>

          <form onSubmit={handleSaveExceedRule} className="space-y-3">
            <div className="space-y-2 text-xs">
              <label className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="radio"
                  name="exceedRule"
                  value={1}
                  checked={Number(exceedRule) === 1}
                  onChange={() => setExceedRule(1)}
                  className="mt-0.5 text-emerald-600"
                />
                <div>
                  <span className="font-bold block text-slate-800">1. Apenas Alerta (Permite Compra)</span>
                  <span className="text-[11px] text-slate-500">
                    O sistema gera um banner de aviso com o valor excedente mas permite finalizar a compra.
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-100/60 transition">
                <input
                  type="radio"
                  name="exceedRule"
                  value={2}
                  checked={Number(exceedRule) === 2}
                  onChange={() => setExceedRule(2)}
                  className="mt-0.5 text-amber-600"
                />
                <div>
                  <span className="font-bold block text-amber-900">2. Solicita Confirmação Explícita</span>
                  <span className="text-[11px] text-amber-700">
                    Exibe um modal de confirmação exigindo aprovação manual para liberar a compra.
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 bg-rose-50/60 rounded-xl border border-rose-200 cursor-pointer hover:bg-rose-100/60 transition">
                <input
                  type="radio"
                  name="exceedRule"
                  value={3}
                  checked={Number(exceedRule) === 3}
                  onChange={() => setExceedRule(3)}
                  className="mt-0.5 text-rose-600"
                />
                <div>
                  <span className="font-bold block text-rose-900">3. Bloqueia a Compra Totalmente</span>
                  <span className="text-[11px] text-rose-700">
                    Impede rigorosamente qualquer compra que supere o saldo contratado do orçamento.
                  </span>
                </div>
              </label>
            </div>

            {savedSuccess && (
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-center">
                Configurações salvas com sucesso! 🟢
              </div>
            )}

            <button
              type="submit"
              className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition w-full"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Regra Orçamentária</span>
            </button>
          </form>
        </div>
      </div>

      {/* Card 3: Gestão de Equipe & Permissões (Centralizado com /equipe) */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <Users className="w-5 h-5 text-emerald-600 mr-2" />
              Equipe & Permissões da Construtora ({usersList.length}/{company?.maxUsers || 2})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Usuários cadastrados e funções atribuídas (Engenheiros, Compradores, Financeiro e Administradores).
            </p>
          </div>
          <Link
            href="/equipe"
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
          >
            <UserCheck className="w-4 h-4" />
            <span>Gerenciar Equipe Completa</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {usersList.map((u) => (
            <div key={u.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                  {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <span className="font-bold text-slate-900 text-sm block truncate">{u.name}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase inline-block mt-0.5">
                    {u.role}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                <span className="truncate block font-medium">{u.email}</span>
                {u.createdAt && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Cadastrado em: {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seção Backup do Banco de Dados — Apenas Super Admin */}
      {isSuper && (
        <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <Database className="w-5 h-5 text-emerald-600 mr-2" />
              Backup Geral da Plataforma (Super Admin)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Exportação de segurança completa do banco de dados relacional para preservação de dados.
            </p>
          </div>
          <div className="flex items-center">
            <a
              href="/api/backup"
              download="backup-gerenciador-de-obras.db"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Fazer Download do Backup</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
