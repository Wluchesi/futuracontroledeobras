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
  Upload,
  AlertTriangle,
  Loader2,
  Zap,
  ArrowRight,
  Shield,
  Camera,
  Trash2,
  User,
  CheckCircle2,
} from 'lucide-react';

export default function ConfiguracoesPage() {
  const { selectedProject, refreshProjects } = useProject();
  const { user, updateUserSession } = useAuth();
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

  // Estados do Perfil Pessoal & Foto
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(user?.avatarUrl || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState('');

  // Estados de Restauração de Backup
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedBackupFile(file);
      setShowRestoreConfirm(true);
      setRestoreSuccess(null);
      setRestoreError(null);
    }
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupFile) return;
    setRestoringBackup(true);
    setRestoreError(null);
    setRestoreSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedBackupFile);

      const res = await fetch('/api/backup', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const s = data.restoredSummary || {};
        const summaryText = `Backup restaurado com sucesso! (${s.companies || 0} empresas, ${s.projects || 0} obras, ${s.budgetItems || 0} orçamentos, ${s.purchases || 0} compras, ${s.suppliers || 0} fornecedores).`;
        setRestoreSuccess(summaryText);
        setShowRestoreConfirm(false);
        setSelectedBackupFile(null);
        refreshProjects();
      } else {
        setRestoreError(data.error || 'Erro ao processar restauração do backup.');
      }
    } catch (err: any) {
      setRestoreError(err.message || 'Falha de conexão ao restaurar backup.');
    } finally {
      setRestoringBackup(false);
    }
  };

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfileAvatarUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setSavingProfile(true);
      const payload: any = {
        id: user.id,
        name: profileName,
        avatarUrl: profileAvatarUrl || null,
      };
      if (profilePassword.trim()) {
        payload.password = profilePassword.trim();
      }

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        updateUserSession({
          name: profileName,
          avatarUrl: profileAvatarUrl || null,
        });
        setProfilePassword('');
        setProfileSaveMsg('Foto e perfil atualizados com sucesso! 🟢');
        setTimeout(() => setProfileSaveMsg(''), 4000);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar perfil.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de rede ao salvar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

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
          userEmail: user?.email,
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
        {/* Card 0: Meu Perfil de Usuário & Foto */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 lg:col-span-2 bg-white">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <User className="w-5 h-5 text-emerald-600 mr-2" />
              Meu Perfil de Usuário & Foto
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-purple-100 text-purple-800">
              {user?.role || 'ADMIN'}
            </span>
          </div>

          {profileSaveMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileSaveMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              {/* Foto / Avatar Preview */}
              <div className="relative group shrink-0">
                {profileAvatarUrl ? (
                  <img
                    src={profileAvatarUrl}
                    alt={profileName}
                    className="w-24 h-24 rounded-full object-cover shadow-md border-2 border-emerald-500"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-2xl shadow-md">
                    {profileName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'US'}
                  </div>
                )}

                <label
                  htmlFor="avatar-file-input"
                  className="absolute bottom-0 right-0 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg cursor-pointer transition"
                  title="Alterar Foto"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    id="avatar-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Botões e Instruções da Foto */}
              <div className="space-y-2 text-center sm:text-left flex-1">
                <h3 className="font-bold text-sm text-slate-800">Foto de Perfil</h3>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Envie uma foto ou imagem pessoal para identificar sua conta na barra lateral e nos relatórios.
                  Recomendado imagem quadrada em PNG, JPG ou WebP (máx. 2MB).
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <label
                    htmlFor="avatar-file-input"
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Carregar Nova Foto</span>
                  </label>

                  {profileAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => setProfileAvatarUrl('')}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1"
                      title="Remover foto atual"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Campos de Nome e Senha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold block mb-1 text-slate-700">Seu Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden text-xs text-slate-900 font-medium"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700">E-mail de Acesso</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold block mb-1 text-slate-700">
                  Alterar Senha Pessoal (Opcional)
                </label>
                <input
                  type="password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden text-xs text-slate-900"
                  placeholder="Preencha apenas se desejar trocar a senha atual..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingProfile ? 'Salvando...' : 'Salvar Alterações do Meu Perfil'}</span>
              </button>
            </div>
          </form>
        </div>

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
                {u.avatarUrl ? (
                  <img
                    src={u.avatarUrl}
                    alt={u.name}
                    className="w-10 h-10 rounded-full object-cover shadow-xs border-2 border-emerald-500 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                    {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
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

      {/* Seção Backup e Restauração do Banco de Dados — Disponível exclusivamente para Planos Pro e Premium */}
      {(isSuper || String(company?.planName || user?.company?.planName || '').toLowerCase().includes('pro') || String(company?.planName || user?.company?.planName || '').toLowerCase().includes('premium')) && (
        <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center">
                <Database className="w-5 h-5 text-emerald-600 mr-2" />
                Backup e Restauração Geral da Plataforma
              </h2>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                {String(company?.planName || user?.company?.planName || '').toLowerCase().includes('premium') ? 'Plano Premium' : String(company?.planName || user?.company?.planName || '').toLowerCase().includes('pro') ? 'Plano Pro' : 'Super Admin'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Exporte uma cópia completa de segurança em arquivo JSON ou suba um arquivo de backup para restaurar obras, cotações, orçamentos, compras e financeiro.
            </p>
          </div>

          {restoreSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{restoreSuccess}</span>
            </div>
          )}

          {restoreError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{restoreError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Download Backup */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                <Download className="w-4 h-4 text-slate-700" />
                <span>Exportar Dados</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Baixe um arquivo JSON completo com todas as tabelas e dados da plataforma.
              </p>
              <a
                href="/api/backup"
                download="backup-gerenciador-de-obras.json"
                className="inline-flex items-center justify-center space-x-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>Fazer Download do Backup (.json)</span>
              </a>
            </div>

            {/* Upload/Restaurar Backup */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-950 font-bold text-xs">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Restaurar / Subir Backup</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Envie um arquivo JSON de backup previamente exportado para recuperar dados no sistema.
              </p>
              <label className="inline-flex items-center justify-center space-x-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Selecionar Arquivo de Backup (.json)</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={restoringBackup}
                />
              </label>
            </div>
          </div>

          {/* Modal de Confirmação de Restauração */}
          {showRestoreConfirm && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
                <div className="flex items-center space-x-3 text-amber-600">
                  <div className="p-2.5 bg-amber-100 rounded-2xl">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Confirmar Restauração de Backup</h3>
                    <p className="text-xs text-slate-500 font-medium">Arquivo: {selectedBackupFile?.name}</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold mb-1">Atenção:</p>
                  <p>
                    A restauração irá atualizar e sincronizar todas as informações do banco de dados (empresas, obras, centros de custo, orçamentos, compras e lançamentos financeiros) conforme os registros do arquivo.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRestoreConfirm(false);
                      setSelectedBackupFile(null);
                    }}
                    disabled={restoringBackup}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    disabled={restoringBackup}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-md cursor-pointer"
                  >
                    {restoringBackup ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Restaurando dados...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Confirmar e Restaurar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
