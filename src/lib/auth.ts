import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type AppRole = 'admin' | 'user';

// Supabase Auth cuma punya field email, tidak ada konsep "username" asli.
// Supaya user tidak pernah lihat/ketik format email, tiap username diubah
// jadi email sintetis di domain internal ini sebelum dikirim ke Supabase -
// satu-satunya tempat transformasi ini terjadi, jangan duplikasi di komponen.
const USERNAME_DOMAIN = 'henkaten.local';
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/i;

export function toAuthEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username.trim());
}

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

export async function login(username: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: toAuthEmail(username), password });
  if (error) throw new Error(error.message);
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

/** Access token sesi yang sedang login, buat dikirim ke Netlify Functions (mis. create-user). null kalau belum login. */
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
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
