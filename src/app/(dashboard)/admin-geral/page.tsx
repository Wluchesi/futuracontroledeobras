'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, isSuperAdmin } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Building2,
  Users,
  Search,
  Zap,
  Key,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Shield,
  Sliders,
  Mail,
  UserCheck,
  Calendar,
  Lock,
} from 'lucide-react';
import { formatDate } from '@/lib/calculations';

export default function AdminGeralPage() {
  const { user, updateCompanySession } = useAuth();
  const router = useRouter();

  const isSuper = isSuperAdmin(user);
  const isAdmin = user?.role === 'ADMIN' || isSuper;

  // Proteção: Somente Administradores têm acesso
  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/');
    }
  }, [user, isAdmin, router]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Alterar Plano
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedCompanyForPlan, setSelectedCompanyForPlan] = useState<any>(null);
  const [selectedPlanType, setSelectedPlanType] = useState('Pro');
  const [customPlanName, setCustomPlanName] = useState('');
  const [customMaxProjects, setCustomMaxProjects] = useState(5);
  const [customMaxUsers, setCustomMaxUsers] = useState(10);
  const [savingPlan, setSavingPlan] = useState(false);

  // Modal Redefinir Senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Modal Alterar Cargo
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<any>(null);
  const [newRole, setNewRole] = useState('ADMIN');
  const [savingRole, setSavingRole] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/admin-geral');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setErrorMsg('Erro ao carregar dados de administração.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Falha de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  if (user && !isAdmin) {
    return null;
  }

  // Filtragem de empresas
  const companies: any[] = data?.companies || [];
  const filteredCompanies = companies.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      (c.taxId && c.taxId.toLowerCase().includes(q)) ||
      c.users?.some(
        (u: any) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );

    const p = (c.planName || '').toLowerCase();
    let matchesPlan = true;
    if (planFilter === 'Gratuito') {
      matchesPlan = !p.includes('pro') && !p.includes('premium') && !p.includes('teste');
    } else if (planFilter === 'Pro') {
      matchesPlan = p.includes('pro');
    } else if (planFilter === 'Premium') {
      matchesPlan = p.includes('premium') || p.includes('teste');
    }

    return matchesSearch && matchesPlan;
  });

  // Salvar Alteração de Plano
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyForPlan) return;

    try {
      setSavingPlan(true);
      setErrorMsg(null);

      const res = await fetch('/api/admin-geral', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_plan',
          companyId: selectedCompanyForPlan.id,
          planType: selectedPlanType,
          customPlanName,
          customMaxProjects,
          customMaxUsers,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(json.message);
        setShowPlanModal(false);
        fetchAdminData();
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setErrorMsg(json.error || 'Erro ao alterar plano da empresa.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Erro de rede ao salvar plano.');
    } finally {
      setSavingPlan(false);
    }
  };

  // Salvar Nova Senha de Usuário
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPassword) return;

    try {
      setSavingPassword(true);
      setErrorMsg(null);

      const res = await fetch('/api/admin-geral', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_user_password',
          userId: selectedUserForPassword.id,
          newPassword,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Senha de ${selectedUserForPassword.name} redefinida com sucesso!`);
        setShowPasswordModal(false);
        setNewPassword('');
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setErrorMsg(json.error || 'Erro ao redefinir senha.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Erro de rede ao redefinir senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Salvar Novo Cargo de Usuário
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForRole) return;

    try {
      setSavingRole(true);
      setErrorMsg(null);

      const res = await fetch('/api/admin-geral', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user_role',
          userId: selectedUserForRole.id,
          newRole,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(json.message);
        setShowRoleModal(false);
        fetchAdminData();
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setErrorMsg(json.error || 'Erro ao atualizar cargo.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Erro de rede ao alterar cargo.');
    } finally {
      setSavingRole(false);
    }
  };

  const getPlanBadge = (planName: string) => {
    const p = (planName || '').toLowerCase();
    if (p.includes('premium') || p.includes('teste')) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <Zap className="w-3 h-3 mr-1 text-amber-500" />
          Premium (SINAPI & IA)
        </span>
      );
    }
    if (p.includes('pro')) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Sparkles className="w-3 h-3 mr-1 text-blue-600" />
          Kitneteiro Pro
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        Plano Gratuito
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Painel Master de Administração & Suporte</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Administração Geral da Plataforma
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Gestão central de todos os cadastros, construtoras e usuários criados na plataforma. Preste suporte direto, redefina senhas e altere planos em caso de falha de pagamento ou upgrade manual.
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer self-start md:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar Cadastros</span>
          </button>
        </div>
      </div>

      {/* Alertas de Feedback */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Cards de Métricas SaaS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Construtoras / Contas</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {data?.metrics?.totalCompanies || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Empresas cadastradas</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total de Usuários</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {data?.metrics?.totalUsers || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Admins, eng., equipes</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Obras Registradas</span>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {data?.metrics?.totalProjects || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Em todas as contas</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Planos Pagos (Pro/Prem.)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {(data?.metrics?.proPlans || 0) + (data?.metrics?.premiumPlans || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Assinantes ativos</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Planos Gratuitos</span>
          <div className="text-2xl font-black text-slate-600 mt-1">
            {data?.metrics?.freePlans || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Em degustação</p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por empresa, CNPJ, nome de usuário ou e-mail de suporte..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-emerald-500"
          />
        </div>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-emerald-500"
        >
          <option value="">Todos os Planos</option>
          <option value="Gratuito">Apenas Gratuitos</option>
          <option value="Pro">Apenas Kitneteiro Pro</option>
          <option value="Premium">Apenas Premium (SINAPI & IA)</option>
        </select>
      </div>

      {/* Lista de Cadastros */}
      {loading && !data ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-500">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-xs font-semibold">Carregando cadastros da plataforma...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-slate-800">Nenhum cadastro encontrado</h3>
          <p className="text-xs text-slate-400 mt-1">Tente ajustar o termo de pesquisa ou o filtro de plano.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCompanies.map((comp) => {
            const isCurrent = user?.company?.id === comp.id || user?.companyId === comp.id;

            return (
              <div
                key={comp.id}
                className={`bg-white rounded-3xl border transition p-5 shadow-xs space-y-4 ${
                  isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Cabeçalho da Empresa */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-black text-base text-slate-900">{comp.name}</h3>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase">
                            Sua Sessão Ativa
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5 font-medium">
                        {comp.taxId && <span>CNPJ/CPF: {comp.taxId}</span>}
                        <span>• Cadastro: {formatDate(comp.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações da Empresa */}
                  <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-y-2">
                    {getPlanBadge(comp.planName)}

                    <button
                      onClick={() => {
                        setSelectedCompanyForPlan(comp);
                        const p = (comp.planName || '').toLowerCase();
                        if (p.includes('premium')) setSelectedPlanType('Premium');
                        else if (p.includes('pro')) setSelectedPlanType('Pro');
                        else if (p.includes('teste')) setSelectedPlanType('Teste');
                        else setSelectedPlanType('Gratuito');
                        setShowPlanModal(true);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer"
                      title="Alterar plano, limites ou corrigir falha de pagamento"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>Alterar Plano</span>
                    </button>

                    {!isCurrent && (
                      <button
                        onClick={() => {
                          updateCompanySession(comp);
                          setSuccessMsg(`Sessão alternada para dar suporte a "${comp.name}".`);
                          setTimeout(() => setSuccessMsg(null), 4000);
                        }}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                        title="Acessar painel desta construtora para prestar suporte"
                      >
                        <span>Acessar Empresa</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Métricas e Obras da Empresa */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Limites do Plano:</span>
                    <span className="font-bold text-slate-800">
                      Até {comp.maxProjects} obra(s) • Até {comp.maxUsers} usuário(s)
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Obras Cadastradas:</span>
                    <span className="font-bold text-slate-800">
                      {comp._count?.projects || 0} obra(s)
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Usuários na Conta:</span>
                    <span className="font-bold text-slate-800">
                      {comp._count?.users || 0} usuário(s)
                    </span>
                  </div>
                </div>

                {/* Tabela de Usuários da Empresa */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    Usuários Cadastrados nesta Construtora ({comp.users?.length || 0})
                  </h4>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <th className="py-2.5 px-3">Nome</th>
                          <th className="py-2.5 px-3">E-mail de Acesso</th>
                          <th className="py-2.5 px-3">Cargo / Função</th>
                          <th className="py-2.5 px-3">Criado em</th>
                          <th className="py-2.5 px-3 text-right">Ações de Suporte</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {comp.users && comp.users.length > 0 ? (
                          comp.users.map((u: any) => (
                            <tr key={u.id} className="hover:bg-slate-50/60 transition">
                              <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center space-x-2.5">
                                {u.avatarUrl ? (
                                  <img
                                    src={u.avatarUrl}
                                    alt={u.name}
                                    className="w-7 h-7 rounded-full object-cover shadow-xs border border-emerald-500/50 shrink-0"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                    {u.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span>{u.name}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{u.email}</td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    u.role === 'ADMIN'
                                      ? 'bg-purple-100 text-purple-800'
                                      : u.role === 'ENGENHEIRO'
                                      ? 'bg-blue-100 text-blue-800'
                                      : u.role === 'FINANCEIRO'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">{formatDate(u.createdAt)}</td>
                              <td className="py-2.5 px-3 text-right space-x-1">
                                <button
                                  onClick={() => {
                                    setSelectedUserForPassword(u);
                                    setNewPassword('');
                                    setShowPasswordModal(true);
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition cursor-pointer"
                                  title="Redefinir senha para suporte"
                                >
                                  Redefinir Senha
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUserForRole(u);
                                    setNewRole(u.role || 'ADMIN');
                                    setShowRoleModal(true);
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition cursor-pointer"
                                  title="Mudar cargo / delegar permissão"
                                >
                                  Cargo
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-3 px-3 text-center text-slate-400">
                              Nenhum usuário encontrado nesta empresa.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Alterar Plano da Empresa (Suporte a Pagamento / Upgrade Manual) */}
      {showPlanModal && selectedCompanyForPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  Suporte & Gestão de Planos
                </span>
                <h2 className="text-lg font-black text-slate-900">
                  Alterar Plano — {selectedCompanyForPlan.name}
                </h2>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Selecione o Plano:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanType('Gratuito')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      selectedPlanType === 'Gratuito'
                        ? 'border-emerald-500 bg-emerald-50/50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs">Plano Gratuito</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">1 Obra • 4 Kitnets • 2 Usuários</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlanType('Pro')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      selectedPlanType === 'Pro'
                        ? 'border-blue-500 bg-blue-50/50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs text-blue-700">Kitneteiro Pro</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">1 Obra • Kitnets Ilimitadas • 20 Usuários</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlanType('Premium')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      selectedPlanType === 'Premium'
                        ? 'border-amber-500 bg-amber-50/50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs text-amber-700 flex items-center">
                      <Zap className="w-3 h-3 mr-1 text-amber-500" />
                      Kitneteiro Premium
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">5 Obras • SINAPI & IA • 50 Usuários</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlanType('Custom')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      selectedPlanType === 'Custom'
                        ? 'border-purple-500 bg-purple-50/50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs text-purple-700">Personalizado / VIP</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Definir limites manuais</div>
                  </button>
                </div>
              </div>

              {selectedPlanType === 'Custom' && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Plano Customizado:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Plano Especial Construtora VIP"
                      value={customPlanName}
                      onChange={(e) => setCustomPlanName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Limite de Obras:
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={customMaxProjects}
                        onChange={(e) => setCustomMaxProjects(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Limite de Usuários:
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={customMaxUsers}
                        onChange={(e) => setCustomMaxUsers(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                A alteração entra em vigor imediatamente e desbloqueia os módulos do plano selecionado para todos os membros da construtora.
              </p>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex justify-center items-center cursor-pointer shadow-md"
                >
                  {savingPlan ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirmar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Redefinir Senha de Usuário */}
      {showPasswordModal && selectedUserForPassword && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  Suporte de Acesso
                </span>
                <h2 className="text-base font-black text-slate-900">
                  Redefinir Senha
                </h2>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <p className="text-xs text-slate-600 mb-2">
                  Usuário: <strong>{selectedUserForPassword.name}</strong> ({selectedUserForPassword.email})
                </p>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nova Senha Temporária:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Digite a nova senha (mín. 6 dígitos)..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500 font-mono"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword || newPassword.length < 6}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex justify-center items-center cursor-pointer shadow-md"
                >
                  {savingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Alterar Cargo de Usuário */}
      {showRoleModal && selectedUserForRole && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                  Permissões & Cargos
                </span>
                <h2 className="text-base font-black text-slate-900">
                  Alterar Cargo do Usuário
                </h2>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <p className="text-xs text-slate-600 mb-2">
                  Usuário: <strong>{selectedUserForRole.name}</strong>
                </p>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selecione o Cargo:
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-emerald-500"
                >
                  <option value="ADMIN">ADMIN (Acesso Total e Gestão)</option>
                  <option value="ENGENHEIRO">ENGENHEIRO (Acesso Técnico e Canteiro)</option>
                  <option value="COMPRADOR">COMPRADOR (Cotações e Suprimentos)</option>
                  <option value="FINANCEIRO">FINANCEIRO (Contas a Pagar e Fluxo)</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="w-1/2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex justify-center items-center cursor-pointer shadow-md"
                >
                  {savingRole ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Salvar Cargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
