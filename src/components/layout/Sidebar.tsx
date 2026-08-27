'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Calculator,
  Users,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  CreditCard,
  TrendingUp,
  BarChart3,
  Settings,
  History,
  FileUp,
  HardHat,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Zap,
  ShieldCheck,
  Building,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const OPERATIONAL_MENU = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/obras', label: 'Obras', icon: Building2 },
  { href: '/centros-de-custos', label: 'Centros de Custos', icon: FolderKanban },
  { href: '/orcamento-executivo', label: 'Orçamento Executivo', icon: Calculator },
  { href: '/fornecedores', label: 'Fornecedores', icon: Users },
  { href: '/cotacoes', label: 'Cotações', icon: FileSpreadsheet },
  { href: '/compras', label: 'Compras', icon: ShoppingCart },
  { href: '/contas-a-pagar', label: 'Contas a Pagar', icon: Receipt },
  { href: '/pagamentos', label: 'Pagamentos', icon: CreditCard },
  { href: '/fluxo-de-caixa', label: 'Fluxo de Caixa', icon: TrendingUp },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
];

const SAAS_MENU = [
  { href: '/planos', label: 'Planos & Assinatura', icon: Zap, badge: 'SaaS', adminOnly: true },
  { href: '/empresas', label: 'Empresas (Tenants)', icon: Building, adminOnly: true },
  { href: '/equipe', label: 'Equipe & Permissões', icon: UserCheck, adminOnly: true },
];

const SYSTEM_MENU = [
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/auditoria', label: 'Auditoria', icon: History, adminOnly: true },
  { href: '/importar-excel', label: 'Importar Excel', icon: FileUp },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const userProfile = {
    name: user?.name || 'Usuário',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl,
    companyName: user?.company?.name || 'Construtora',
    planName: user?.company?.planName || 'Premium Multi-Obras',
    role: user?.role || 'USER',
  };

  const isAdmin = userProfile.role === 'ADMIN';

  const renderLink = (item: any) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group ${
          isActive
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
        title={collapsed ? item.label : undefined}
      >
        <Icon
          className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
            isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
          }`}
        />
        {!collapsed && <span className="ml-3 truncate">{item.label}</span>}
        {item.badge && !collapsed && (
          <span className="ml-auto px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
            {item.badge}
          </span>
        )}
        {isActive && !collapsed && !item.badge && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Botão Hambúrguer Mobile */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition border border-slate-700"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay Mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 bg-slate-900 text-slate-100 flex flex-col transition-all duration-300 shadow-2xl border-r border-slate-800 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl shadow-md font-bold flex-shrink-0">
              <HardHat className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-xs tracking-wide text-white whitespace-nowrap">FUTURA GESTÃO DE OBRAS</span>
                <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase flex items-center space-x-1">
                  <span>SaaS Multi-Tenant</span>
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          
          {/* Seção Operacional */}
          <div className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Operacional</span>
            )}
            {OPERATIONAL_MENU.map(renderLink)}
          </div>

          {/* Seção SaaS & Gestão */}
          {isAdmin && (
            <div className="space-y-1 pt-2 border-t border-slate-800/60">
              {!collapsed && (
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Plataforma SaaS</span>
              )}
              {SAAS_MENU.map(renderLink)}
            </div>
          )}

          {/* Seção Sistema */}
          <div className="space-y-1 pt-2 border-t border-slate-800/60">
            {!collapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Sistema</span>
            )}
            {SYSTEM_MENU.filter(item => !item.adminOnly || isAdmin).map(renderLink)}
          </div>

        </nav>

        {/* User Info & Company Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex flex-col space-y-2">
          
          {!collapsed && (
            <div className="px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex flex-col truncate">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Empresa Ativa</span>
                <span className="text-xs font-bold text-emerald-400 truncate">{userProfile.companyName}</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                SaaS
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Link href="/configuracoes" className="flex items-center space-x-2.5 group cursor-pointer truncate">
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name}
                  className="w-8 h-8 rounded-full object-cover shadow border border-emerald-500/50 group-hover:scale-105 transition"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow group-hover:scale-105 transition flex-shrink-0">
                  {userProfile.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <div className="flex flex-col truncate">
                  <span className="text-xs font-semibold text-white truncate group-hover:text-emerald-400 transition">
                    {userProfile.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">{userProfile.email}</span>
                </div>
              )}
            </Link>

            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </aside>
    </>
  );
}
