import { useEffect, useState } from 'react';
import { X, ShieldCheck, Lock, Loader2, Building2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { toAuthEmail, isValidUsername } from '../lib/auth';

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

async function callFunction(name: string, body: Record<string, unknown>) {
  const res = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');
  return data;
}

export function SuperAdminModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [stage, setStage] = useState<'password' | 'manage'>('password');
  const [password, setPassword] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

  const [adminTenantId, setAdminTenantId] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const loadTenants = async () => {
    const { data, error } = await supabase.from('tenants').select('id, name, slug').order('name');
    if (error) {
      toast.error('Gagal memuat daftar tenant: ' + error.message);
      return;
    }
    setTenants(data ?? []);
  };

  useEffect(() => {
    if (isOpen) {
      setStage('password');
      setPassword('');
      loadTenants();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 401 dari function berarti password super-admin yang tersimpan di state salah/kadaluarsa -
  // lempar balik ke stage password, jangan biarkan tersimpan lebih lama dari sesi modal ini.
  const handleAuthError = (err: Error) => {
    if (err.message.includes('salah') || err.message.includes('belum dikonfigurasi')) {
      setStage('password');
    }
    toast.error(err.message);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = tenantName.trim();
    const slug = tenantSlug.trim().toLowerCase();
    if (!name || !slug) {
      toast.error('Nama dan slug tenant wajib diisi.');
      return;
    }
    setIsCreatingTenant(true);
    try {
      await callFunction('create-tenant', { name, slug, superAdminPassword: password });
      toast.success(`Tenant "${name}" berhasil dibuat.`);
      setTenantName('');
      setTenantSlug('');
      await loadTenants();
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsCreatingTenant(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = adminUsername.trim();
    if (!adminTenantId || !username || !adminPassword) {
      toast.error('Tenant, username, dan password wajib diisi.');
      return;
    }
    if (!isValidUsername(username)) {
      toast.error('Username hanya boleh huruf, angka, titik, strip, underscore (3-32 karakter).');
      return;
    }
    setIsCreatingAdmin(true);
    try {
      await callFunction('create-user', {
        email: toAuthEmail(username), password: adminPassword, superAdminPassword: password,
        tenantId: adminTenantId, role: 'admin',
      });
      toast.success(`Akun tenant-admin "${username}" berhasil dibuat.`);
      setAdminUsername('');
      setAdminPassword('');
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 sticky top-0 bg-slate-900 text-white rounded-t-xl">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <ShieldCheck size={18} /> Super Admin
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Tutup">
            <X size={18} />
          </button>
        </div>

        {stage === 'password' ? (
          <form
            onSubmit={(e) => { e.preventDefault(); if (password) setStage('manage'); }}
            className="p-4 sm:p-6 space-y-4"
          >
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                <Lock size={22} />
              </div>
              <p className="text-sm text-slate-500">Password super-admin diverifikasi server-side setiap aksi, tidak pernah dicek di browser.</p>
            </div>
            <input
              type="password"
              autoFocus
              placeholder="Password super-admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors shadow-sm"
            />
            <button
              type="submit"
              disabled={!password}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Lanjut
            </button>
          </form>
        ) : (
          <div className="p-4 sm:p-6 space-y-6">
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Building2 size={15} /> Buat Tenant (Divisi) Baru
              </h4>
              <form onSubmit={handleCreateTenant} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Nama divisi, mis. Stamping"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors"
                />
                <input
                  type="text"
                  placeholder="slug, mis. stamping"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isCreatingTenant || !tenantName.trim() || !tenantSlug.trim()}
                  className="flex items-center justify-center gap-1.5 bg-navy-900 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isCreatingTenant ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                  Buat
                </button>
              </form>
              <div className="mt-3 space-y-1">
                {tenants.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 text-sm text-slate-600">
                    <span>{t.name}</span>
                    <span className="text-xs text-slate-400">{t.slug}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <UserPlus size={15} /> Buat Akun Tenant-Admin Pertama
              </h4>
              <form onSubmit={handleCreateAdmin} className="space-y-2">
                <select
                  value={adminTenantId}
                  onChange={(e) => setAdminTenantId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors"
                >
                  <option value="">Pilih tenant</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="Username tenant-admin"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingAdmin || !adminTenantId || !adminUsername.trim() || !adminPassword}
                    className="flex items-center justify-center gap-1.5 bg-navy-900 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isCreatingAdmin ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    Buat
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
