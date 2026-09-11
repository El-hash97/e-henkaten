import { useEffect, useState } from 'react';
import { Settings, LogIn, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useActiveTenant, logout } from '../lib/auth';
import { supabase } from '../lib/supabase';

export function Navbar({ onOpenSettings, onOpenLogin }: { onOpenSettings: () => void; onOpenLogin: () => void }) {
  const tenant = useActiveTenant();
  const [tenantName, setTenantName] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    toast.success('Berhasil logout.');
  };

  useEffect(() => {
    if (!tenant?.tenantId) return;
    let cancelled = false;
    supabase.from('tenants').select('name').eq('id', tenant.tenantId).single().then(({ data }) => {
      if (!cancelled) setTenantName(data?.name ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [tenant?.tenantId]);

  return (
    <nav className="relative bg-[#F0F1F3] border-b-4 border-[#EB0A1E] px-3 sm:px-6 py-3 sm:py-4 flex items-center shadow-sm sticky top-0 z-30 w-full">
      <div className="flex items-center gap-2 shrink-0">
        <img src="/logo.png" alt="Logo" className="h-7 sm:h-10 w-auto object-contain" />
        {tenantName && (
          <span
            className="hidden sm:inline-flex items-center px-2 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wide"
            title="Divisi aktif"
          >
            {tenantName}
          </span>
        )}
      </div>
      <h1 className="absolute left-1/2 -translate-x-1/2 max-w-[55%] sm:max-w-none truncate text-center text-sm sm:text-xl md:text-2xl font-bold text-navy-900 tracking-tight">HENKATEN SHEET</h1>
      <div className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
        {tenant?.isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-white/60 transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        ) : (
          <button
            onClick={onOpenLogin}
            className="p-2 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-white/60 transition-colors"
            title="Login"
          >
            <LogIn size={20} />
          </button>
        )}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-white/60 transition-colors"
          title="Pengaturan"
        >
          <Settings size={20} />
        </button>
      </div>
    </nav>
  );
}
