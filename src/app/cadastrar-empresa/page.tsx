'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HardHat, Building2, User, Mail, Lock, Zap, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function CadastrarEmpresaPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    taxId: '',
    userName: '',
    email: '',
    password: '',
    planName: 'Pro',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('user_session', JSON.stringify(data.user));
        document.cookie = `auth_session=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        router.push('/');
      } else {
        setError(data.error || 'Erro ao cadastrar empresa.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-emerald-500 text-slate-950 rounded-2xl shadow-lg font-bold">
            <HardHat className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Criar Conta no Futura Gestão de Obras</h1>
          <p className="text-xs text-slate-400 max-w-sm">
            Cadastre sua construtora e comece a gerenciar suas obras, compras e financeiro em minutos.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-xl font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">1. Dados da Construtora</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nome da Empresa *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Minha Construtora Ltda"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">CNPJ / CPF</label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">2. Administrador da Conta</span>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Seu Nome Completo *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Eng. Carlos Silva"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">E-mail Comercial *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="carlos@construtora.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Senha de Acesso *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">3. Escolha o Plano Inicial</span>
            
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Gratuito', name: 'Gratuito', label: '1 Obra (4 Kitnets)' },
                { id: 'Pro', name: 'Kitneteiro Pro', label: 'R$ 49/mês' },
                { id: 'Premium', name: 'Kitneteiro Premium', label: 'R$ 99/mês + SINAPI' },
              ].map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, planName: plan.id })}
                  className={`p-2.5 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
                    formData.planName === plan.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>{plan.name}</div>
                  <div className="text-[9px] font-normal opacity-80 mt-0.5">
                    {plan.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl transition flex items-center justify-center space-x-2 mt-4 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Cadastrar Construtora e Acessar SaaS</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
          Já possui uma conta da empresa?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline font-bold">
            Fazer Login
          </Link>
        </div>
      </div>
    </div>
  );
}
