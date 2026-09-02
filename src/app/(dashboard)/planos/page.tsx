'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { Zap, CheckCircle2, Award, ArrowRight, Loader2, Lock, FlaskConical, Eye, EyeOff } from 'lucide-react';
import CheckoutModal from '@/components/checkout/CheckoutModal';
import { useRouter } from 'next/navigation';

const PLANS = [
  {
    id: 'Gratuito',
    name: 'Plano Gratuito (Isca)',
    badge: 'Degustação / Teste',
    price: 0,
    priceLabel: 'R$ 0',
    period: '/mês',
    maxProjects: 1,
    maxUnits: 4,
    features: [
      '1 Obra Ativa',
      'Limite Rígido de até 4 Kitnets/Unidades',
      'Entrada Manual de Dados',
      'Orçamento Executivo Básico',
      'Contas a Pagar & Receber',
      'Ideal para Testar a Ferramenta',
    ],
  },
  {
    id: 'Pro',
    name: 'Kitneteiro Pro',
    badge: 'Mais Popular ⚡',
    price: 49,
    priceLabel: 'R$ 49',
    period: '/mês',
    isPopular: true,
    maxProjects: 1,
    maxUnits: 999,
    features: [
      '1 Obra Ativa (Construção Principal)',
      'Kitnets / Unidades ILIMITADAS (ex: 10, 12 ou mais)',
      'Entrada Manual de Dados Completa',
      'Gestão Avançada de Orçamento & Etapas',
      'Cotações & Comparativo de Fornecedores',
      'Gestão Completa de Compras & Contas a Pagar',
      'Fluxo de Caixa & Gráficos Financeiros',
      'Exportação de Dados',
    ],
  },
  {
    id: 'Premium',
    name: 'Kitneteiro Premium (SINAPI & IA)',
    badge: 'Inteligência & Multi-Obras 🚀',
    price: 99,
    priceLabel: 'R$ 99',
    period: '/mês',
    maxProjects: 5,
    maxUnits: 999,
    features: [
      'Até 5 Obras Simultâneas',
      'Kitnets / Unidades ILIMITADAS por Obra',
      'Integração com Tabela SINAPI (Preços Automáticos)',
      'Rateio / Divisão Automática de Compras em Lote',
      'Relatórios Profissionais Customizados (PDF / Excel)',
      'Alertas Financeiros & Lembretes no WhatsApp',
      'Importação de Orçamentos via Excel',
      'Suporte Prioritário por WhatsApp com Especialista',
    ],
  },
];

const TEST_PLAN = {
  id: 'Teste1Real',
  name: 'Plano Teste PIX / Cartão',
  badge: '🧪 TESTE GATEWAY - R$ 1,00',
  price: 1,
  priceLabel: 'R$ 1',
  period: '/mês (Teste)',
  isTest: true,
  maxProjects: 5,
  maxUnits: 999,
  features: [
    'Equivalente ao Plano Premium (Todas as Funções)',
    'Permite Testar PIX Real do Mercado Pago',
    'Permite Testar Cartão de Crédito Real',
    'R$ 1,00 debitado para teste de Gateway',
    'Pode ser ocultado pelo Administrador a qualquer momento',
  ],
};

export default function PlanosPage() {
  const { user, updateCompanySession } = useAuth();
  const { projects } = useProject();
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<{
    id: string;
    title: string;
    price: number;
  } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Controle de Exibição do Plano de R$ 1,00 pelo Administrador
  const [showTestPlan, setShowTestPlan] = useState<boolean>(true);

  useEffect(() => {
    const savedState = localStorage.getItem('showTestPlan');
    if (savedState !== null) {
      setShowTestPlan(savedState === 'true');
    }
  }, []);

  const toggleTestPlan = (enabled: boolean) => {
    setShowTestPlan(enabled);
    localStorage.setItem('showTestPlan', String(enabled));
  };

  const currentCompany = user?.company;
  const currentPlan = currentCompany?.planName || 'Kitneteiro Premium';
  const currentMaxProjects = currentCompany?.maxProjects || 5;

  const router = useRouter();
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, router]);

  if (user && user.role !== 'ADMIN') {
    return null;
  }

  const activePlans = showTestPlan ? [...PLANS, TEST_PLAN] : PLANS;

  const handleSelectPlan = (plan: typeof PLANS[0] | typeof TEST_PLAN) => {
    setMessage(null);

    // Se for um plano PAGO (Pro, Premium ou Teste R$ 1,00), ABRE O CHECKOUT DE PAGAMENTO
    if (plan.price > 0) {
      setSelectedPlanForCheckout({
        id: plan.id,
        title: plan.name,
        price: plan.price,
      });
      return;
    }

    // Se for o plano Gratuito, muda sem pagamento
    handleDowngradeToFree();
  };

  const handleDowngradeToFree = async () => {
    if (!currentCompany) return;
    setLoadingPlan('Gratuito');
    try {
      const res = await fetch('/api/planos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: currentCompany.id,
          planName: 'Gratuito',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        updateCompanySession(data.company);
        setMessage({ type: 'success', text: 'Plano alterado para Gratuito.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao alterar plano.' });
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Erro de conexão com o servidor.' });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Modal de Checkout / Pagamento */}
      {selectedPlanForCheckout && (
        <CheckoutModal
          isOpen={!!selectedPlanForCheckout}
          onClose={() => setSelectedPlanForCheckout(null)}
          planId={selectedPlanForCheckout.id}
          planTitle={selectedPlanForCheckout.title}
          planPrice={selectedPlanForCheckout.price}
        />
      )}

      {/* Header da Página */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>Planos Futura Gestão de Obras</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Planos & Assinatura do Kitneteiro</h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Escolha o plano sob medida para suas kitnets. Assinatura segura via <strong className="text-white">PIX Instantâneo</strong> ou <strong className="text-white">Cartão de Crédito</strong>.
            </p>
          </div>

          {/* Card de Status de Consumo */}
          <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-2xl space-y-3 min-w-[260px]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>SEU PLANO ATUAL</span>
              <span className="text-emerald-400 font-mono font-extrabold">{currentPlan}</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Obras Ativas:</span>
                <span className="font-bold text-white">{projects.length} / {currentMaxProjects}</span>
              </div>
              <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((projects.length / currentMaxProjects) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Unidades por Obra:</span>
              <span className="text-emerald-300 font-bold">
                {currentPlan.includes('Gratuito') ? 'Até 4 Kitnets' : 'Ilimitadas 🔥'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Painel do Administrador: Controle do Plano de Teste (R$ 1,00) */}
      <div className="glass-card bg-slate-900/90 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-white text-sm flex items-center space-x-2">
              <span>Modo de Teste de Pagamentos (Plano de R$ 1,00)</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] uppercase rounded font-bold">
                Painel Admin
              </span>
            </h4>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Habilite ou desabilite a exibição do card de **R$ 1,00** para testar pagamentos reais com PIX ou Cartão.
            </p>
          </div>
        </div>

        <button
          onClick={() => toggleTestPlan(!showTestPlan)}
          className={`px-4 py-2 rounded-xl font-bold transition flex items-center space-x-2 cursor-pointer ${
            showTestPlan
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
        >
          {showTestPlan ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span>{showTestPlan ? 'Plano R$ 1,00 Visível (Clique p/ Ocultar)' : 'Oculto (Clique p/ Exibir R$ 1,00)'}</span>
        </button>
      </div>

      {/* Alertas de Retorno */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Grid de Planos SaaS */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${activePlans.length} gap-6`}>
        {activePlans.map((plan: any) => {
          const isCurrent = currentPlan.toLowerCase().includes(plan.id.toLowerCase());
          const isTestPlanCard = plan.isTest;

          return (
            <div
              key={plan.id}
              className={`rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 relative ${
                isTestPlanCard
                  ? 'bg-slate-900/90 border-amber-500/60 shadow-xl ring-2 ring-amber-500/20'
                  : plan.isPopular
                  ? 'bg-slate-900 border-emerald-500/50 shadow-2xl shadow-emerald-950/50 scale-102'
                  : 'bg-white border-slate-200 shadow-lg hover:border-slate-300'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-slate-950 text-[10px] font-extrabold tracking-wider uppercase rounded-full shadow-md">
                  RECOMENDADO PARA KITNETEIROS
                </div>
              )}

              {isTestPlanCard && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-500 text-slate-950 text-[10px] font-extrabold tracking-wider uppercase rounded-full shadow-md">
                  TESTE DE GATEWAY R$ 1,00
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    isTestPlanCard
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : plan.isPopular
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {plan.badge}
                  </span>
                  {isCurrent && (
                    <span className="inline-flex items-center text-xs font-extrabold text-emerald-500">
                      <Award className="w-4 h-4 mr-1" />
                      PLANO ATIVO
                    </span>
                  )}
                </div>

                <div>
                  <h3 className={`text-xl font-bold ${plan.isPopular || isTestPlanCard ? 'text-white' : 'text-slate-900'}`}>
                    {plan.name}
                  </h3>
                  <div className="mt-2 flex items-baseline space-x-1">
                    <span className={`text-3xl font-extrabold ${plan.isPopular || isTestPlanCard ? 'text-white' : 'text-slate-900'}`}>
                      {plan.priceLabel}
                    </span>
                    <span className={`text-xs font-medium ${plan.isPopular || isTestPlanCard ? 'text-slate-400' : 'text-slate-500'}`}>
                      {plan.period}
                    </span>
                  </div>
                </div>

                <div className={`pt-4 border-t ${plan.isPopular || isTestPlanCard ? 'border-slate-800' : 'border-slate-100'} space-y-2.5`}>
                  {plan.features.map((feat: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2.5 text-xs">
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        isTestPlanCard
                          ? 'text-amber-400'
                          : plan.isPopular
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                      }`} />
                      <span className={plan.isPopular || isTestPlanCard ? 'text-slate-300' : 'text-slate-600'}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4">
                <button
                  disabled={isCurrent || loadingPlan === plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-3.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-2 cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                      : isTestPlanCard
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                      : plan.isPopular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-current" />
                  ) : isCurrent ? (
                    <span>Seu Plano Atual</span>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        {isTestPlanCard
                          ? 'Pagar R$ 1,00 (Testar Gateway)'
                          : plan.price > 0
                          ? `Pagar & Assinar ${plan.name.split(' ')[0]}`
                          : 'Ativar Plano Gratuito'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
