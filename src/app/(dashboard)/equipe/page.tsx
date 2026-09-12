'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, isSuperAdmin } from '@/context/AuthContext';
import { Users, UserPlus, Shield, Mail, Key, Loader2, AlertCircle, CheckCircle2, Edit3, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EquipePage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [maxUsers, setMaxUsers] = useState(20);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'ENGENHEIRO' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCompany = user?.company;
  const router = useRouter();
  const isSuper = isSuperAdmin(user);
  const isAdmin = user?.role === 'ADMIN' || isSuper;

  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/');
    }
  }, [user, isAdmin, router]);

  if (user && !isAdmin) {
    return null; // Prevents flashing the page content before redirect
  }

  const fetchTeam = async () => {
    if (!currentCompany) return;
    try {
      const res = await fetch(`/api/equipe?companyId=${currentCompany.id}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setMaxUsers(data.maxUsers || 20);
      }
    } catch (e) {
      console.error('Error fetching team', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [currentCompany]);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'ENGENHEIRO' });
    setError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (u: any) => {
    setEditingUser(u);
    setFormData({ name: u.name, email: u.email, password: '', role: u.role });
    setError(null);
    setShowModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);
    setError(null);

    try {
      const url = '/api/equipe';
      const method = editingUser ? 'PUT' : 'POST';
      const payload: any = {
        companyId: currentCompany.id,
        ...formData,
      };

      if (editingUser) {
        payload.id = editingUser.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'ENGENHEIRO' });
        fetchTeam();
      } else {
        setError(data.error || 'Erro ao salvar dados do membro.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao se conectar com o servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (u: any) => {
    if (u.id === user?.id) {
      alert('Você não pode excluir seu próprio usuário.');
      return;
    }

    if (!confirm(`Tem certeza que deseja remover ${u.name} da equipe da construtora? O acesso deste usuário ao sistema será cancelado.`)) {
      return;
    }

    try {
      setDeletingId(u.id);
      const res = await fetch(`/api/equipe?id=${u.id}&companyId=${currentCompany?.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchTeam();
      } else {
        alert(data.error || 'Erro ao remover membro da equipe.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao remover membro da equipe.');
    } finally {
      setDeletingId(null);
    }
  };

  const isLimitReached = users.length >= maxUsers;

  return (
    <div className="space-y-6 pb-12">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Equipe & Controle de Acesso SaaS</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Membros da Construtora</h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie engenheiros, compradores e administradores da <span className="font-semibold text-slate-800">{currentCompany?.name}</span>.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Badge de Consumo de Licenças de Usuário */}
          <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center space-x-2">
            <span>Licenças da Equipe:</span>
            <span className={`px-2 py-0.5 rounded-md font-mono text-white ${isLimitReached ? 'bg-rose-500' : 'bg-emerald-600'}`}>
              {users.length} / {maxUsers}
            </span>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition space-x-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar Membro</span>
          </button>
        </div>
      </div>

      {/* Alerta de Limite do Plano */}
      {isLimitReached && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-medium">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>
              Você atingiu o limite de <strong>{maxUsers} usuários</strong> do seu plano atual (<strong>{currentCompany?.planName}</strong>).
            </span>
          </div>
          <Link
            href="/planos"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition flex-shrink-0"
          >
            Fazer Upgrade
          </Link>
        </div>
      )}

      {/* Tabela de Membros */}
      {loading ? (
        <div className="p-12 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="p-4 pl-6">Nome do Usuário</th>
                <th className="p-4">E-mail de Acesso</th>
                <th className="p-4">Cargo / Função</th>
                <th className="p-4">Data de Cadastro</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-4 pl-6 font-bold text-slate-900 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="p-4 text-slate-600 font-mono">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : u.role === 'ENGENHEIRO'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : u.role === 'COMPRADOR'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center text-emerald-600 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Ativo
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        title="Alterar dados e cargo do usuário"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(u)}
                        disabled={u.id === user?.id || deletingId === u.id}
                        className={`p-1.5 rounded-lg transition ${
                          u.id === user?.id
                            ? 'text-slate-300 cursor-not-allowed opacity-40'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                        }`}
                        title={u.id === user?.id ? 'Você não pode excluir seu próprio usuário' : 'Apagar membro da equipe'}
                      >
                        {deletingId === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Adicionar / Editar Usuário */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingUser ? 'Alterar Membro da Equipe' : 'Novo Membro da Equipe'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingUser
                    ? 'Atualize o nome, e-mail, cargo ou redefina a senha de acesso.'
                    : 'Cadastre um novo usuário com acesso à construtora.'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  placeholder="joao@construtora.com.br"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingUser ? 'Nova Senha (Opcional)' : 'Senha Provisória *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? 'Deixe em branco para manter a senha atual' : '••••••••'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Função / Nível de Acesso</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500"
                >
                  <option value="ENGENHEIRO">Engenheiro de Obra</option>
                  <option value="COMPRADOR">Comprador / Suprimentos</option>
                  <option value="FINANCEIRO">Financeiro & Contas</option>
                  <option value="ADMIN">Administrador Total</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex justify-center items-center cursor-pointer transition"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingUser ? (
                    'Salvar Alterações'
                  ) : (
                    'Cadastrar Membro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
