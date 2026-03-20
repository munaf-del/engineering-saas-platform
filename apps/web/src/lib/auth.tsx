'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser, Organisation, OrgRole } from '@eng/shared';
import { api, clearTokens, loadTokens, setTokens } from './api-client';

interface AuthState {
  user: AuthUser | null;
  organisations: Organisation[];
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  switchOrg: (organisationId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  currentOrg: Organisation | null;
  hasOrgRole: (...roles: OrgRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    organisations: [],
    loading: true,
    error: null,
  });

  const fetchUser = useCallback(async () => {
    try {
      const data = await api<{ user: AuthUser; organisations: Organisation[] }>('/auth/me');
      setState({ user: data.user, organisations: data.organisations ?? [], loading: false, error: null });
    } catch {
      setState({ user: null, organisations: [], loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    loadTokens();
    const t = localStorage.getItem('eng_access_token');
    if (t) {
      fetchUser();
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [fetchUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
        organisations: Organisation[];
      }>('/auth/login', { method: 'POST', body: { email, password } });
      setTokens(data.accessToken, data.refreshToken);
      setState({ user: data.user, organisations: data.organisations ?? [], loading: false, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setState((s) => ({ ...s, loading: false, error: msg }));
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    api('/auth/logout', { method: 'POST' }).catch(() => {});
    clearTokens();
    setState({ user: null, organisations: [], loading: false, error: null });
    if (typeof window !== 'undefined') window.location.href = '/sign-in';
  }, []);

  const switchOrg = useCallback(async (organisationId: string) => {
    const data = await api<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
      organisations: Organisation[];
    }>('/auth/switch-org', { method: 'POST', body: { organisationId } });
    setTokens(data.accessToken, data.refreshToken);
    setState({ user: data.user, organisations: data.organisations ?? [], loading: false, error: null });
  }, []);

  const currentOrg = useMemo(() => {
    if (!state.user) return null;
    return state.organisations.find((o) => o.id === state.user!.organisationId) ?? null;
  }, [state.user, state.organisations]);

  const hasOrgRole = useCallback(
    (...roles: OrgRole[]) => {
      if (!state.user) return false;
      return roles.includes(state.user.orgRole);
    },
    [state.user],
  );

  const value = useMemo(
    () => ({ ...state, signIn, signOut, switchOrg, refreshUser: fetchUser, currentOrg, hasOrgRole }),
    [state, signIn, signOut, switchOrg, fetchUser, currentOrg, hasOrgRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
