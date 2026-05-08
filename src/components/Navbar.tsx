import { Download } from 'lucide-react';
import Papa from 'papaparse';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';

export function Navbar() {
  const records = useStore((state) => state.records);

  const handleExportCSV = () => {
    if (records.length === 0) {
      alert('Tidak ada data untuk dieksport.');
      return;
    }
    
    // Format the data for CSV
    const csvData = records.map((r, i) => ({
      No: i + 1,
      'Line Name': r.lineName,
      'Date Start': format(new Date(r.dateStart), 'dd MMM yyyy'),
      'Date Finish': r.dateFinish ? format(new Date(r.dateFinish), 'dd MMM yyyy') : '-',
      Category: r.category,
      Henkaten: r.henkatenInfo,
      'Risk Level': r.riskLevel,
      'Tujuan Henkaten': r.tujuanHenkaten,
      'PIC Name': r.picName,
      Departemen: r.departemen,
      'Created By': r.createdBy,
      'Created At': format(new Date(r.createdAt), 'dd MMM yyyy HH:mm'),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `henkaten_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 w-full">
      <div className="flex items-center space-x-3">
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">HENKATEN SHEET</h1>
      </div>
      
      <div>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>
    </nav>
  );
}
