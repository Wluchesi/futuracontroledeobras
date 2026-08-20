'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface CompanySession {
  id: string;
  name: string;
  taxId?: string | null;
  planName: string;
  maxProjects: number;
  maxUsers: number;
}

export interface UserSession {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  company?: CompanySession;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateCompanySession: (updatedCompany: CompanySession) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Carrega o usuário salvo na inicialização
    const savedUser = localStorage.getItem('user_session');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse user session', e);
        localStorage.removeItem('user_session');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const userSession: UserSession = data.user;
        setUser(userSession);
        localStorage.setItem('user_session', JSON.stringify(userSession));
        
        // Também seta um cookie básico para controle se necessário
        document.cookie = `auth_session=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        
        router.push('/');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Erro ao realizar login.' };
      }
    } catch (err) {
      console.error('Login error in AuthContext:', err);
      return { success: false, error: 'Erro de conexão com o servidor.' };
    }
  };

  const updateCompanySession = (updatedCompany: CompanySession) => {
    if (!user) return;
    const newUser = { ...user, company: updatedCompany };
    setUser(newUser);
    localStorage.setItem('user_session', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user_session');
    document.cookie = 'auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateCompanySession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
