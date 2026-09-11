import { useState } from 'react';
import { X, LogIn, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '../lib/auth';

export function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await login(username.trim(), password);
      toast.success('Berhasil login.');
      setUsername('');
      setPassword('');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Login gagal. Periksa username/password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-blue-600 text-white rounded-t-xl">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <LogIn size={18} /> Login Divisi
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Tutup">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <p className="text-sm text-slate-500">
            Login hanya diperlukan untuk divisi selain Casting. Masukkan akun divisi Anda.
          </p>
          <input
            type="text"
            autoFocus
            placeholder="Username akun divisi"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors shadow-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors shadow-sm"
          />
          <button
            type="submit"
            disabled={isLoggingIn || !username || !password}
            className="w-full flex items-center justify-center gap-2 bg-navy-900 text-white font-medium py-2.5 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? <Loader2 size={16} className="animate-spin" /> : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
