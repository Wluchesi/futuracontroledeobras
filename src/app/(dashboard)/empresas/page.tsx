'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Building2, Plus, Users, Building, ShieldCheck, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function EmpresasPage() {
  const { user, updateCompanySession } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', taxId: '', planName: 'Pro' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch (e) {
      console.error('Error fetching companies', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompany),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setNewCompany({ name: '', taxId: '', planName: 'Pro' });
        fetchCompanies();
      } else {
        setError(data.error || 'Erro ao cadastrar empresa.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao se conectar com o servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>Gestão Multi-Tenant (SaaS)</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Empresas e Construtoras</h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie todas as instâncias de construtoras vinculadas à sua conta SaaS.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Construtora</span>
        </button>
      </div>

      {/* Lista de Empresas */}
      {loading ? (
        <div className="p-12 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((comp) => {
            const isCurrent = user?.company?.id === comp.id;
            return (
              <div
                key={comp.id}
                className={`p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                  isCurrent
                    ? 'bg-slate-900 border-emerald-500/50 text-white shadow-xl'
                    : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl ${isCurrent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-100 text-slate-700'}`}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    {isCurrent ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 uppercase tracking-wider">
                        Ativa Agora
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {comp.planName || 'Pro'}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-lg truncate">{comp.name}</h3>
                    {comp.taxId && (
                      <p className={`text-xs ${isCurrent ? 'text-slate-400' : 'text-slate-500'} font-mono`}>
                        CNPJ/CPF: {comp.taxId}
                      </p>
                    )}
                  </div>

                  <div className={`pt-3 border-t ${isCurrent ? 'border-slate-800' : 'border-slate-100'} grid grid-cols-2 gap-2 text-xs`}>
                    <div className="flex items-center space-x-1.5">
                      <Building className="w-3.5 h-3.5 opacity-70" />
                      <span>{comp._count?.projects || 0} Obras</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Users className="w-3.5 h-3.5 opacity-70" />
                      <span>{comp._count?.users || 0} Usuários</span>
                    </div>
                  </div>
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => updateCompanySession(comp)}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2"
                  >
                    <span>Alternar para Esta Empresa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação de Empresa */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Cadastrar Nova Construtora</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Empresa / Construtora *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Construtora Alfa Ltda"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CNPJ ou CPF (Opcional)</label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={newCompany.taxId}
                  onChange={(e) => setNewCompany({ ...newCompany, taxId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Plano Inicial SaaS</label>
                <select
                  value={newCompany.planName}
                  onChange={(e) => setNewCompany({ ...newCompany, planName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500"
                >
                  <option value="Starter">Starter (3 Obras / 5 Usuários)</option>
                  <option value="Pro">Pro Multi-Obras (10 Obras / 20 Usuários)</option>
                  <option value="Enterprise">Enterprise (Ilimitado)</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex justify-center items-center"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Construtora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
