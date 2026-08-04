import { useEffect, useState } from 'react';
import { X, Settings as SettingsIcon, Trash2, Plus, Loader2, AlertTriangle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { DEFAULT_LINE_NAME_OPTIONS, DEFAULT_DEPARTEMEN_OPTIONS } from '../types';

const ADMIN_SESSION_KEY = 'henkaten_admin';

type DeleteTarget = { kind: 'line' | 'department'; id: string; name: string };

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    customLineNames, customDepartments,
    addLineName, deleteLineName, addDepartment, deleteDepartment,
  } = useStore();

  const [stage, setStage] = useState<'login' | 'manage'>('login');
  const [password, setPassword] = useState('');
  const [newLineName, setNewLineName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const alreadyAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
      setStage(alreadyAdmin ? 'manage' : 'login');
      setPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    if (adminPassword && password === adminPassword) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
      setStage('manage');
    } else {
      toast.error('Password admin salah.');
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
            <SettingsIcon size={18} /> {stage === 'login' ? 'Login Admin' : 'Kelola Line Name & Departemen'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Tutup">
            <X size={18} />
          </button>
        </div>

        {stage === 'login' ? (
          <form onSubmit={handleLogin} className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Lock size={22} />
              </div>
              <p className="text-sm text-slate-500">Masukkan password admin untuk mengelola daftar Line Name dan Departemen.</p>
            </div>
            <input
              type="password"
              autoFocus
              placeholder="Password admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors shadow-sm"
            />
            <button
              type="submit"
              disabled={!password}
              className="w-full flex items-center justify-center gap-2 bg-navy-900 text-white font-medium py-2.5 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Masuk
            </button>
          </form>
        ) : (
          <div className="p-4 sm:p-6 space-y-6">
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
          onClick={() => setDeleteTarget(null)}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Hapus Opsi</h3>
                <p className="text-sm text-slate-500 mt-1">Apakah Anda yakin ingin menghapus "{deleteTarget.name}"?</p>
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
