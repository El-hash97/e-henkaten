export function Navbar() {
  return (
    <nav className="relative bg-[#F0F1F3] border-b-4 border-[#EB0A1E] px-3 sm:px-6 py-3 sm:py-4 flex items-center shadow-sm sticky top-0 z-30 w-full">
      <div className="flex items-center shrink-0">
        <img src="/logo.png" alt="Logo" className="h-7 sm:h-10 w-auto object-contain" />
      </div>
      <h1 className="absolute left-1/2 -translate-x-1/2 max-w-[55%] sm:max-w-none truncate text-center text-sm sm:text-xl md:text-2xl font-bold text-navy-900 tracking-tight">HENKATEN SHEET</h1>
    </nav>
  );
}
