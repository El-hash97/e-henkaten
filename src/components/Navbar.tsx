import { Settings } from 'lucide-react';

export function Navbar({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <nav className="relative bg-[#F0F1F3] border-b-4 border-[#EB0A1E] px-3 sm:px-6 py-3 sm:py-4 flex items-center shadow-sm sticky top-0 z-30 w-full">
      <div className="flex items-center shrink-0">
        <img src="/logo.png" alt="Logo" className="h-7 sm:h-10 w-auto object-contain" />
      </div>
      <h1 className="absolute left-1/2 -translate-x-1/2 max-w-[55%] sm:max-w-none truncate text-center text-sm sm:text-xl md:text-2xl font-bold text-navy-900 tracking-tight">HENKATEN SHEET</h1>
      <button
        onClick={onOpenSettings}
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-white/60 transition-colors"
        title="Pengaturan"
      >
        <Settings size={20} />
      </button>
    </nav>
  );
}
