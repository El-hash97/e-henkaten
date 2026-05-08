import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { Search, Edit2, Printer, Trash2, Loader2 } from 'lucide-react';
import type { RiskLevel, HenkatenRecord } from '../types';
import toast from 'react-hot-toast';

export function RekapData({ onEdit }: { onEdit: (id: string) => void }) {
  const { records, deleteRecord, isLoading } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    const lower = searchTerm.toLowerCase();
    return records.filter(
      (r) =>
        r.lineName.toLowerCase().includes(lower) ||
        r.category.toLowerCase().includes(lower) ||
        r.henkatenInfo.toLowerCase().includes(lower) ||
        r.tujuanHenkaten.toLowerCase().includes(lower) ||
        r.picName.toLowerCase().includes(lower) ||
        r.departemen.toLowerCase().includes(lower)
    );
  }, [records, searchTerm]);

  const getRiskBadge = (level: RiskLevel | '') => {
    switch (level) {
      case 'Low':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-200">Low</span>;
      case 'Medium':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">Medium</span>;
      case 'High':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-500 text-white animate-blink-red shadow-sm border border-red-600">High</span>;
      default:
        return <span>-</span>;
    }
  };

  const handlePrint = (record: HenkatenRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Henkaten Record</title>
          <style>
            body { font-family: sans-serif; padding: 20px; line-height: 1.6; color: #1e293b; }
            h2 { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; color: #0b1120; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; vertical-align: top; }
            th { width: 30%; background-color: #f8fafc; font-weight: 600; }
            img { max-width: 400px; max-height: 400px; display: block; margin-top: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .header-info { margin-bottom: 30px; font-size: 1.1em; }
            .badge { padding: 4px 8px; border-radius: 9999px; font-size: 0.85em; font-weight: bold; }
            .badge-Low { background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-Medium { background-color: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
            .badge-High { background-color: #ef4444; color: white; border: 1px solid #dc2626; }
          </style>
        </head>
        <body>
          <h2>Henkaten Detail Record</h2>
          <div class="header-info">
            <strong>Line Name:</strong> ${record.lineName}<br/>
            <strong>Date:</strong> ${format(new Date(record.dateStart), 'dd MMM yyyy')} - ${record.dateFinish ? format(new Date(record.dateFinish), 'dd MMM yyyy') : 'N/A'}<br/>
            <strong>PIC:</strong> ${record.picName} (${record.departemen})
          </div>
          <table>
            <tr><th>Category</th><td>${record.category}</td></tr>
            <tr><th>Henkaten</th><td><pre style="font-family:inherit;margin:0;white-space:pre-wrap;">${record.henkatenInfo}</pre></td></tr>
            <tr><th>Risk Level</th><td><span class="badge badge-${record.riskLevel}">${record.riskLevel}</span></td></tr>
            <tr><th>Tujuan Henkaten</th><td><pre style="font-family:inherit;margin:0;white-space:pre-wrap;">${record.tujuanHenkaten}</pre></td></tr>
            <tr><th>Created By</th><td>${record.createdBy} on ${format(new Date(record.createdAt), 'dd MMM yyyy HH:mm')}</td></tr>
            ${record.photo ? `<tr><th>Photo</th><td><img src="${record.photo}" alt="Henkaten Visual Evidence" /></td></tr>` : ''}
          </table>
          <script>
            window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      try {
        await deleteRecord(id);
        toast.success('Data berhasil dihapus');
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus data');
      }
    }
  };

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 drop-shadow-sm">Rekap Data</h2>
        
        <div className="relative w-full md:w-64 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors shadow-sm"
            placeholder="Cari data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 relative">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs font-semibold text-white uppercase bg-blue-600 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-4">No</th>
                <th scope="col" className="px-6 py-4">Line Name</th>
                <th scope="col" className="px-6 py-4">Date Start</th>
                <th scope="col" className="px-6 py-4">Date Finish</th>
                <th scope="col" className="px-6 py-4">Category</th>
                <th scope="col" className="px-6 py-4 w-64 max-w-xs">Henkaten</th>
                <th scope="col" className="px-6 py-4 text-center">Risk Level</th>
                <th scope="col" className="px-6 py-4 w-64 max-w-xs">Tujuan Henkaten</th>
                <th scope="col" className="px-6 py-4">PIC Name</th>
                <th scope="col" className="px-6 py-4">Departemen</th>
                <th scope="col" className="px-6 py-4 text-center">Photo</th>
                <th scope="col" className="px-6 py-4">Created By</th>
                <th scope="col" className="px-6 py-4">Created At</th>
                <th scope="col" className="px-6 py-4 text-center sticky right-0 bg-blue-700 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                       <Loader2 className="animate-spin text-navy-900" size={24} />
                       <span>Memuat data dari database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{index + 1}</td>
                    <td className="px-6 py-4">{record.lineName}</td>
                    <td className="px-6 py-4">{format(new Date(record.dateStart), 'dd MMM yyyy')}</td>
                    <td className="px-6 py-4">{record.dateFinish ? format(new Date(record.dateFinish), 'dd MMM yyyy') : '-'}</td>
                    <td className="px-6 py-4">{record.category}</td>
                    <td className="px-6 py-4 whitespace-normal min-w-[200px]">{record.henkatenInfo}</td>
                    <td className="px-6 py-4 text-center">
                      {getRiskBadge(record.riskLevel)}
                    </td>
                    <td className="px-6 py-4 whitespace-normal min-w-[200px]">{record.tujuanHenkaten}</td>
                    <td className="px-6 py-4">{record.picName}</td>
                    <td className="px-6 py-4">{record.departemen}</td>
                    <td className="px-6 py-4 text-center">
                      {record.photo ? (
                        <div className="flex justify-center">
                          <img src={record.photo} alt="Henkaten" className="w-10 h-10 object-cover rounded-md shadow-sm border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity" title="Lihat Foto" />
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{record.createdBy}</td>
                    <td className="px-6 py-4">{format(new Date(record.createdAt), 'dd MMM yyyy HH:mm')}</td>
                    <td className="px-6 py-4 text-center sticky right-0 bg-white shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">
                      <div className="flex items-center justify-center space-x-2">
                        <button onClick={() => onEdit(record.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handlePrint(record)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Print">
                          <Printer size={16} />
                        </button>
                        <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
