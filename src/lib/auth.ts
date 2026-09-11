import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type AppRole = 'admin' | 'user';

export interface ActiveTenant {
  tenantId: string;
  role: AppRole | null;
  isAuthenticated: boolean;
}

let cachedDefaultTenantId: string | null = null;

async function getDefaultTenantId(): Promise<string> {
  if (cachedDefaultTenantId) return cachedDefaultTenantId;
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('is_default', true)
    .single();
  if (error || !data) {
    throw new Error('Tenant default tidak ditemukan. Pastikan migrasi multi-tenant (Langkah 1) sudah dijalankan.');
  }
  const id = data.id as string;
  cachedDefaultTenantId = id;
  return id;
}

/**
 * Tenant aktif untuk request saat ini: tenant milik user yang login (dari
 * app_metadata JWT), atau tenant default (Casting) kalau belum login.
 * Ini yang dipakai setiap query/insert/update supaya konsisten dengan RLS
 * policy yang dipasang di Langkah 1 — jangan baca session.tenantId langsung
 * di komponen lain, selalu lewat fungsi ini.
 */
export async function getActiveTenant(): Promise<ActiveTenant> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const tenantId = session.user.app_metadata?.tenant_id as string | undefined;
    const role = (session.user.app_metadata?.role as AppRole | undefined) ?? null;
    if (tenantId) {
      return { tenantId, role, isAuthenticated: true };
    }
  }
  return { tenantId: await getDefaultTenantId(), role: null, isAuthenticated: false };
}

export async function login(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export function onAuthChange(callback: () => void): () => void {
  const { data } = supabase.auth.onAuthStateChange(() => callback());
  return () => data.subscription.unsubscribe();
}

/** React hook: tenant aktif, otomatis refresh saat login/logout. */
export function useActiveTenant(): ActiveTenant | null {
  const [tenant, setTenant] = useState<ActiveTenant | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getActiveTenant().then((t) => {
        if (!cancelled) setTenant(t);
      });
    };
    refresh();
    const unsubscribe = onAuthChange(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return tenant;
}
