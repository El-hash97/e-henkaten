export function Navbar() {
  return (
    <nav className="relative bg-[#F0F1F3] border-b-4 border-[#EB0A1E] px-6 py-4 flex items-center shadow-sm sticky top-0 z-30 w-full">
      <div className="flex items-center">
        <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
      </div>
      <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold text-navy-900 tracking-tight">HENKATEN SHEET</h1>
    </nav>
  );
}
