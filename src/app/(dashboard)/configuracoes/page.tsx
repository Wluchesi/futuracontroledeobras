'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { Settings, ShieldAlert, Building2, UserCheck, Save, Plus, Trash2, Edit3, Lock, Users, Layers, Database, Download } from 'lucide-react';

export default function ConfiguracoesPage() {
  const { selectedProject, refreshProjects } = useProject();
  const [exceedRule, setExceedRule] = useState(selectedProject?.exceedRule || 1);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Estados da Empresa e SaaS
  const [company, setCompany] = useState<any>(null);
  const [companyFormData, setCompanyFormData] = useState({ id: '', name: '', taxId: '', planName: 'Premium Multi-Obras', maxProjects: 10, maxUsers: 20 });
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySaveMsg, setCompanySaveMsg] = useState('');

  // Estados de Usuários
  const [usersList, setUsersList] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState({ id: '', name: '', email: '', password: '', role: 'ADMIN', avatarUrl: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userSaveError, setUserSaveError] = useState('');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setUserFormData((prev) => ({ ...prev, avatarUrl: data.url }));
      } else {
        alert('Erro ao enviar imagem.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const fetchCompanyAndUsers = async () => {
    try {
      const [resComp, resUsers] = await Promise.all([fetch('/api/company'), fetch('/api/users')]);
      if (resComp.ok) {
        const comp = await resComp.json();
        setCompany(comp);
        setCompanyFormData({
          id: comp.id,
          name: comp.name || 'Construtora Kitnet Passos Ltda',
          taxId: comp.taxId || '12.345.678/0001-99',
          planName: comp.planName || 'Premium Multi-Obras',
          maxProjects: comp.maxProjects || 10,
          maxUsers: comp.maxUsers || 20,
        });
      }
      if (resUsers.ok) {
        setUsersList(await resUsers.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCompanyAndUsers();
  }, []);

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
        body: JSON.stringify(companyFormData),
      });
      if (res.ok) {
        setCompanySaveMsg('Dados e limites do SaaS atualizados! 🟢');
        setTimeout(() => setCompanySaveMsg(''), 3000);
        fetchCompanyAndUsers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSaveError('');
    try {
      const method = userFormData.id ? 'PUT' : 'POST';
      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userFormData),
      });

      const json = await res.json();
      if (!res.ok) {
        setUserSaveError(json.error || 'Erro ao salvar usuário.');
        return;
      }

      setShowUserModal(false);
      fetchCompanyAndUsers();
    } catch (e: any) {
      setUserSaveError(e.message);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Deseja realmente remover o usuário ${name}?`)) return;
    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Não foi possível excluir.');
        return;
      }
      fetchCompanyAndUsers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Settings className="w-6 h-6 text-emerald-600 mr-2.5" />
            Painel de Administração do SaaS & Limitações
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerenciamento de usuários administradores, limites do SaaS, dados da empresa e regras de bloqueio
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Perfil da Empresa & Limitações do SaaS */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center justify-between border-b pb-3">
            <span className="flex items-center">
              <Building2 className="w-5 h-5 text-emerald-600 mr-2" />
              Perfil da Empresa & Limites de Uso SaaS
            </span>
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full uppercase">
              {company?.planName || 'Premium Multi-Obras'}
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
                className="w-full p-2.5 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">CNPJ / CPF</label>
              <input
                type="text"
                value={companyFormData.taxId}
                onChange={(e) => setCompanyFormData({ ...companyFormData, taxId: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 text-xs block">Configuração de Limites do SaaS</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-[11px] text-slate-600">Plano SaaS</label>
                  <input
                    type="text"
                    value={companyFormData.planName}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, planName: e.target.value })}
                    className="w-full p-2 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-[11px] text-slate-600">Máx. Obras</label>
                  <input
                    type="number"
                    value={companyFormData.maxProjects}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, maxProjects: Number(e.target.value) })}
                    className="w-full p-2 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-[11px] text-slate-600">Máx. Usuários</label>
                  <input
                    type="number"
                    value={companyFormData.maxUsers}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, maxUsers: Number(e.target.value) })}
                    className="w-full p-2 border rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>

            {companySaveMsg && (
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-center text-xs">
                {companySaveMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={savingCompany}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition w-full"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Dados da Empresa e Limites</span>
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

      {/* Seção Backup do Banco de Dados */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center">
            <Database className="w-5 h-5 text-emerald-600 mr-2" />
            Backup do Banco de Dados
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Faça o download de uma cópia de segurança completa do banco de dados SQLite (`dev.db`) diretamente no seu computador para fins de backup e histórico.
          </p>
        </div>
        <div className="flex items-center">
          <a
            href="/api/backup"
            download="backup-gerenciador-de-obras.db"
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Fazer Download do Backup (.db)</span>
          </a>
        </div>
      </div>

      {/* Seção 3: Gestão de Usuários Administradores do SaaS */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <Users className="w-5 h-5 text-emerald-600 mr-2" />
              Gestão de Usuários Administradores ({usersList.length}/{company?.maxUsers || 20})
            </h2>
            <p className="text-xs text-slate-500">
              Administradores possuem acesso irrestrito a todos os serviços do SaaS, edição de usuários e gestão de limites.
            </p>
          </div>
          <button
            onClick={() => {
              setUserFormData({ id: '', name: '', email: '', password: '', role: 'ADMIN', avatarUrl: '' });
              setUserSaveError('');
              setShowUserModal(true);
            }}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Administrador</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {usersList.map((user) => (
            <div key={user.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-9 h-9 rounded-full object-cover shadow border border-emerald-500"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow">
                      {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{user.name}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase">
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setUserFormData({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        password: '',
                        role: user.role,
                        avatarUrl: user.avatarUrl || '',
                      });
                      setUserSaveError('');
                      setShowUserModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-800"
                    title="Editar Usuário"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="Excluir Usuário"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-600">
                <span className="font-semibold block">{user.email}</span>
                <span className="text-[10px] text-slate-400">Cadastrado em: {new Date(user.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Cadastro/Edição de Usuário */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {userFormData.id ? 'Editar Usuário Administrador' : 'Novo Usuário Administrador'}
            </h2>

            {userSaveError && (
              <div className="p-3 bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border border-rose-200">
                {userSaveError}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              {/* Upload de Foto de Perfil */}
              <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                {userFormData.avatarUrl ? (
                  <img
                    src={userFormData.avatarUrl}
                    alt="Preview Avatar"
                    className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-emerald-500"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                    {userFormData.name ? userFormData.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'WL'}
                  </div>
                )}
                <div className="flex-1">
                  <label className="font-semibold block mb-1 text-slate-800">Foto do Perfil / Avatar</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                  />
                  {uploadingAvatar && <span className="text-[10px] text-emerald-600 font-bold block mt-1">Carregando imagem...</span>}
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl"
                  placeholder="ex: Wellington Luchesi"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">E-mail (Login)</label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full p-2.5 border rounded-xl"
                  placeholder="ex: wluchesi@gmail.com"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Senha {userFormData.id ? '(deixe em branco para manter a atual)' : ''}
                </label>
                <input
                  type="password"
                  required={!userFormData.id}
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full p-2.5 border rounded-xl"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Função / Perfil</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-bold"
                >
                  <option value="ADMIN">ADMIN — Administrador Irrestrito</option>
                  <option value="ENGENHEIRO">ENGENHEIRO — Gestor de Obra</option>
                  <option value="COMPRADOR">COMPRADOR — Cotações & Compras</option>
                  <option value="FINANCEIRO">FINANCEIRO — Contas & Pagamentos</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold">
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
