import { useState } from 'react';
import { X, Settings as SettingsIcon, Trash2, Plus, Loader2, AlertTriangle, Lock, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { DEFAULT_LINE_NAME_OPTIONS, DEFAULT_DEPARTEMEN_OPTIONS } from '../types';
import { useActiveTenant, getAccessToken, toAuthEmail, isValidUsername } from '../lib/auth';

type DeleteTarget = { kind: 'line' | 'department'; id: string; name: string };

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    customLineNames, customDepartments, records,
    addLineName, deleteLineName, addDepartment, deleteDepartment,
  } = useStore();
  const tenant = useActiveTenant();
  const isRealAdmin = tenant?.role === 'admin';

  const [newLineName, setNewLineName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = newUsername.trim();
    if (!username || !newUserPassword) {
      toast.error('Username dan password akun baru wajib diisi.');
      return;
    }
    if (!isValidUsername(username)) {
      toast.error('Username hanya boleh huruf, angka, titik, strip, underscore (3-32 karakter).');
      return;
    }
    setIsCreatingUser(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Sesi login sudah berakhir, silakan login ulang.');
      const res = await fetch('/.netlify/functions/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: toAuthEmail(username), password: newUserPassword, accessToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Gagal membuat akun.');
      toast.success(`Akun tenant-user "${username}" berhasil dibuat.`);
      setNewUsername('');
      setNewUserPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat akun.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const isDuplicate = (name: string, defaults: string[], custom: { name: string }[]) => {
    const lower = name.trim().toLowerCase();
    return defaults.some((d) => d.toLowerCase() === lower) || custom.some((c) => c.name.toLowerCase() === lower);
  };

  const handleAddLineName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLineName.trim();
    if (!trimmed) {
      toast.error('Nama Line Name tidak boleh kosong.');
      return;
    }
    if (isDuplicate(trimmed, DEFAULT_LINE_NAME_OPTIONS, customLineNames)) {
      toast.error('Line Name tersebut sudah ada.');
      return;
    }
    setIsAddingLine(true);
    try {
      await addLineName(trimmed);
      setNewLineName('');
      toast.success('Line Name berhasil ditambahkan.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan Line Name.');
    } finally {
      setIsAddingLine(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDepartment.trim();
    if (!trimmed) {
      toast.error('Nama Departemen tidak boleh kosong.');
      return;
    }
    if (isDuplicate(trimmed, DEFAULT_DEPARTEMEN_OPTIONS, customDepartments)) {
      toast.error('Departemen tersebut sudah ada.');
      return;
    }
    setIsAddingDept(true);
    try {
      await addDepartment(trimmed);
      setNewDepartment('');
      toast.success('Departemen berhasil ditambahkan.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan Departemen.');
    } finally {
      setIsAddingDept(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.kind === 'line') {
        await deleteLineName(deleteTarget.id);
      } else {
        await deleteDepartment(deleteTarget.id);
      }
      toast.success('Opsi berhasil dihapus.');
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus opsi.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 sticky top-0 bg-blue-600 text-white rounded-t-xl">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <SettingsIcon size={18} /> {isRealAdmin ? 'Kelola Line Name & Departemen' : 'Pengaturan'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Tutup">
            <X size={18} />
          </button>
        </div>

        {!isRealAdmin ? (
          <div className="p-4 sm:p-6 flex flex-col items-center text-center gap-2 py-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Lock size={22} />
            </div>
            <p className="text-sm text-slate-500">
              {tenant?.isAuthenticated
                ? 'Akun Anda tidak punya akses ke Pengaturan. Hubungi tenant-admin divisi Anda.'
                : 'Anda belum login. Klik ikon Login di navbar untuk masuk sebagai tenant-admin divisi Anda.'}
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-6">
            {isRealAdmin && (
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <UserPlus size={15} /> Buat Akun Tenant-User
                </h4>
                <p className="text-xs text-slate-500 mb-2">Akun baru otomatis masuk ke divisi Anda dan bisa langsung dipakai login.</p>
                <form onSubmit={handleCreateUser} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="Username akun baru"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingUser || !newUsername.trim() || !newUserPassword}
                    className="flex items-center justify-center gap-1.5 bg-navy-900 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isCreatingUser ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    Buat
                  </button>
                </form>
              </div>
            )}
            <OptionSection
              title="Line Name"
              defaults={DEFAULT_LINE_NAME_OPTIONS}
              custom={customLineNames}
              newValue={newLineName}
              onNewValueChange={setNewLineName}
              onAdd={handleAddLineName}
              isAdding={isAddingLine}
              onDelete={(id, name) => setDeleteTarget({ kind: 'line', id, name })}
            />
            <OptionSection
              title="Departemen"
              defaults={DEFAULT_DEPARTEMEN_OPTIONS}
              custom={customDepartments}
              newValue={newDepartment}
              onNewValueChange={setNewDepartment}
              onAdd={handleAddDepartment}
              isAdding={isAddingDept}
              onDelete={(id, name) => setDeleteTarget({ kind: 'department', id, name })}
            />
          </div>
        )}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(null); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Hapus Opsi</h3>
                <p className="text-sm text-slate-500 mt-1">Apakah Anda yakin ingin menghapus "{deleteTarget.name}"?</p>
                {(() => {
                  const usageCount = records.filter((r) =>
                    deleteTarget.kind === 'line' ? r.lineName === deleteTarget.name : r.departemen === deleteTarget.name
                  ).length;
                  return usageCount > 0 ? (
                    <p className="text-sm text-amber-600 mt-2 flex items-start gap-1.5">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>{usageCount} data Henkaten masih menggunakan opsi ini. Menghapusnya bisa membuat data tersebut tidak lengkap saat diedit.</span>
                    </p>
                  ) : null;
                })()}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OptionSection({
  title, defaults, custom, newValue, onNewValueChange, onAdd, isAdding, onDelete,
}: {
  title: string;
  defaults: string[];
  custom: { id: string; name: string }[];
  newValue: string;
  onNewValueChange: (value: string) => void;
  onAdd: (e: React.FormEvent) => void;
  isAdding: boolean;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <div>
      <h4 className="text-sm font-bold text-slate-900 mb-2">{title}</h4>
      <div className="space-y-1.5 mb-3">
        {defaults.map((name) => (
          <div key={name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-sm text-slate-500">
            <span>{name}</span>
            <span className="text-[10px] uppercase font-semibold tracking-wide text-slate-400">Bawaan</span>
          </div>
        ))}
        {custom.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700">
            <span>{item.name}</span>
            <button
              onClick={() => onDelete(item.id, item.name)}
              className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title={`Hapus ${item.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={onAdd} className="flex items-center gap-2">
        <input
          type="text"
          placeholder={`Tambah ${title} baru...`}
          value={newValue}
          onChange={(e) => onNewValueChange(e.target.value)}
          className="flex-1 border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors"
        />
        <button
          type="submit"
          disabled={isAdding || !newValue.trim()}
          className="flex items-center gap-1.5 bg-navy-900 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Tambah
        </button>
      </form>
    </div>
  );
}
