export function Footer({ onOpenSuperAdmin }: { onOpenSuperAdmin: () => void }) {
  return (
    <footer className="w-full border-t border-slate-200 bg-white px-4 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm text-slate-500">
      © 2026 PT. Toyota Motor Manufacturing Indonesia — E-Henkaten Sheet
      {' · '}
      <button onClick={onOpenSuperAdmin} className="hover:text-slate-700 hover:underline transition-colors">
        Super Admin
      </button>
    </footer>
  );
}
