import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { Search, Edit2, Printer, Trash2, Loader2, ListChecks, AlertTriangle, AlertCircle, CheckCircle2, X, FileDown } from 'lucide-react';
import type { RiskLevel, HenkatenRecord, LineName, Category } from '../types';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LINE_NAME_OPTIONS: LineName[] = ['Mel-Pour-Analys', 'Mould-RCS', 'Core Making', 'Finishing'];
const CATEGORY_OPTIONS: Category[] = ['Methode', 'Material', 'Man', 'Machine'];
const RISK_LEVEL_OPTIONS: RiskLevel[] = ['Low', 'Medium', 'High'];

export function RekapData({ onEdit }: { onEdit: (id: string) => void }) {
  const { records, deleteRecord, isLoading } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [lineNameFilter, setLineNameFilter] = useState<LineName | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');
  const [riskLevelFilter, setRiskLevelFilter] = useState<RiskLevel | ''>('');
  const [dateStartFilter, setDateStartFilter] = useState('');
  const [dateFinishFilter, setDateFinishFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HenkatenRecord | null>(null);

  const filteredRecords = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return records.filter((r) => {
      const matchesSearch =
        !lower ||
        r.lineName.toLowerCase().includes(lower) ||
        r.category.toLowerCase().includes(lower) ||
        r.henkatenInfo.toLowerCase().includes(lower) ||
        r.tujuanHenkaten.toLowerCase().includes(lower) ||
        r.picName.toLowerCase().includes(lower) ||
        r.departemen.toLowerCase().includes(lower);
      const matchesLineName = !lineNameFilter || r.lineName === lineNameFilter;
      const matchesCategory = !categoryFilter || r.category === categoryFilter;
      const matchesRiskLevel = !riskLevelFilter || r.riskLevel === riskLevelFilter;
      const matchesDateStart = !dateStartFilter || r.dateStart >= dateStartFilter;
      const matchesDateFinish = !dateFinishFilter || r.dateStart <= dateFinishFilter;
      return matchesSearch && matchesLineName && matchesCategory && matchesRiskLevel && matchesDateStart && matchesDateFinish;
    });
  }, [records, searchTerm, lineNameFilter, categoryFilter, riskLevelFilter, dateStartFilter, dateFinishFilter]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const high = filteredRecords.filter((r) => r.riskLevel === 'High').length;
    const medium = filteredRecords.filter((r) => r.riskLevel === 'Medium').length;
    const low = filteredRecords.filter((r) => r.riskLevel === 'Low').length;
    return { total, high, medium, low };
  }, [filteredRecords]);

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

  const handleExportPDF = () => {
    if (filteredRecords.length === 0) {
      toast.error('Tidak ada data untuk dieksport.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.text('Rekap Data Henkaten', 14, 12);
    doc.setFontSize(9);
    doc.text(`Diekspor pada ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 18);

    autoTable(doc, {
      startY: 22,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [37, 99, 235] },
      head: [[
        'No', 'Line Name', 'Date Start', 'Date Finish', 'Category',
        'Henkaten', 'Risk Level', 'Tujuan Henkaten', 'PIC Name',
        'Departemen', 'Created By', 'Created At',
      ]],
      body: filteredRecords.map((r, i) => [
        i + 1,
        r.lineName,
        format(new Date(r.dateStart), 'dd MMM yyyy'),
        r.dateFinish ? format(new Date(r.dateFinish), 'dd MMM yyyy') : '-',
        r.category,
        r.henkatenInfo,
        r.riskLevel,
        r.tujuanHenkaten,
        r.picName,
        r.departemen,
        r.createdBy,
        format(new Date(r.createdAt), 'dd MMM yyyy HH:mm'),
      ]),
    });

    doc.save(`henkaten_export_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    toast.success('PDF berhasil diekspor');
  };

  const handleExportSinglePDF = (record: HenkatenRecord) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.text('Detail Henkaten', 14, 15);
    doc.setFontSize(9);
    doc.text(`Diekspor pada ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235] },
      theme: 'grid',
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
      body: [
        ['Line Name', record.lineName],
        ['Date', `${format(new Date(record.dateStart), 'dd MMM yyyy')} - ${record.dateFinish ? format(new Date(record.dateFinish), 'dd MMM yyyy') : 'N/A'}`],
        ['Category', record.category],
        ['Henkaten', record.henkatenInfo],
        ['Risk Level', record.riskLevel],
        ['Tujuan Henkaten', record.tujuanHenkaten],
        ['PIC Name', `${record.picName} (${record.departemen})`],
        ['Created By', `${record.createdBy} on ${format(new Date(record.createdAt), 'dd MMM yyyy HH:mm')}`],
      ],
    });

    doc.save(`henkaten_${record.id}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    toast.success('PDF berhasil diekspor');
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
      <div className="flex flex-wrap items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 drop-shadow-sm">Rekap Data</h2>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <FileDown size={16} />
          <span>Export PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <ListChecks size={18} className="sm:hidden" />
            <ListChecks size={20} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Henkaten</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
            <AlertTriangle size={18} className="sm:hidden" />
            <AlertTriangle size={20} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">High Risk</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.high}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center">
            <AlertCircle size={18} className="sm:hidden" />
            <AlertCircle size={20} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Medium Risk</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.medium}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
            <CheckCircle2 size={18} className="sm:hidden" />
            <CheckCircle2 size={20} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Low Risk</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.low}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-end items-start md:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2.5 sm:gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label htmlFor="dateStartFilter" className="text-[11px] font-medium text-slate-500">Date Start</label>
              <input
                id="dateStartFilter"
                type="date"
                className="w-full sm:w-auto border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors shadow-sm bg-white"
                value={dateStartFilter}
                onChange={(e) => setDateStartFilter(e.target.value)}
              />
            </div>
            <span className="text-slate-400 text-sm shrink-0 mt-5">-</span>
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label htmlFor="dateFinishFilter" className="text-[11px] font-medium text-slate-500">Date Finish</label>
              <input
                id="dateFinishFilter"
                type="date"
                className="w-full sm:w-auto border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors shadow-sm bg-white"
                value={dateFinishFilter}
                onChange={(e) => setDateFinishFilter(e.target.value)}
              />
            </div>
          </div>

          <select
            className="w-full sm:w-auto border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors shadow-sm bg-white"
            value={lineNameFilter}
            onChange={(e) => setLineNameFilter(e.target.value as LineName | '')}
          >
            <option value="">Semua Line Name</option>
            {LINE_NAME_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select
            className="w-full sm:w-auto border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors shadow-sm bg-white"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as Category | '')}
          >
            <option value="">Semua Category</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select
            className="w-full sm:w-auto border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors shadow-sm bg-white"
            value={riskLevelFilter}
            onChange={(e) => setRiskLevelFilter(e.target.value as RiskLevel | '')}
          >
            <option value="">Semua Risk Level</option>
            {RISK_LEVEL_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <div className="relative w-full sm:w-64 max-w-sm">
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
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative isolate h-[65vh] sm:h-[75vh] md:h-[85vh]">
        <div className="overflow-auto h-full [-webkit-overflow-scrolling:touch]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs font-semibold text-white uppercase bg-blue-600 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4">No</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4">Line Name</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4">Date Start</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4">Date Finish</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4">Category</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4 max-w-[220px]">Henkaten</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4 text-center">Risk Level</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4 max-w-[220px]">Tujuan Henkaten</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4">PIC Name</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4">Departemen</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4 text-center">Photo</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4">Created By</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4">Created At</th>
                <th scope="col" className="px-3 sm:px-6 py-3 sm:py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="px-3 sm:px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                       <Loader2 className="animate-spin text-navy-900" size={24} />
                       <span>Memuat data dari database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-3 sm:px-6 py-12 text-center text-slate-500">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className={`cursor-pointer transition-colors hover:bg-blue-100 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-blue-50'
                    }`}
                  >
                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-slate-900">{index + 1}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">{record.lineName}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">{format(new Date(record.dateStart), 'dd MMM yyyy')}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">{record.dateFinish ? format(new Date(record.dateFinish), 'dd MMM yyyy') : '-'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">{record.category}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 max-w-[220px] truncate" title={record.henkatenInfo}>{record.henkatenInfo}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                      {getRiskBadge(record.riskLevel)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 max-w-[220px] truncate" title={record.tujuanHenkaten}>{record.tujuanHenkaten}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">{record.picName}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">{record.departemen}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                      {record.photo ? (
                        <div className="flex justify-center">
                          <img src={record.photo} alt="Henkaten" className="w-10 h-10 object-cover rounded-md shadow-sm border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity" title="Lihat Foto" />
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">{record.createdBy}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">{format(new Date(record.createdAt), 'dd MMM yyyy HH:mm')}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                          <Trash2 size={16} className="opacity-60" />
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

      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 sticky top-0 bg-blue-600 text-white rounded-t-xl">
              <h3 className="text-base sm:text-lg font-semibold">Detail Henkaten</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold underline text-slate-500 uppercase mb-1">Line Name</p>
                  <p className="text-sm text-slate-900">{selectedRecord.lineName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold underline text-slate-500 uppercase mb-1">Category</p>
                  <p className="text-sm text-slate-900">{selectedRecord.category}</p>
                </div>
                <div>
                  <p className="text-xs font-bold underline text-slate-500 uppercase mb-1">Date Start</p>
                  <p className="text-sm text-slate-900">{format(new Date(selectedRecord.dateStart), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs font-bold underline text-slate-500 uppercase mb-1">Date Finish</p>
                  <p className="text-sm text-slate-900">{selectedRecord.dateFinish ? format(new Date(selectedRecord.dateFinish), 'dd MMM yyyy') : '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold underline text-slate-500 uppercase mb-1">PIC Name</p>
                  <p className="text-sm text-slate-900">{selectedRecord.picName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold underline text-slate-500 uppercase mb-1">Departemen</p>
                  <p className="text-sm text-slate-900">{selectedRecord.departemen}</p>
                </div>
                <div>
                  <p className="text-xs font-bold underline text-slate-500 uppercase mb-1">Risk Level</p>
                  {getRiskBadge(selectedRecord.riskLevel)}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold underline text-slate-500 uppercase mb-1">Henkaten</p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap">{selectedRecord.henkatenInfo}</p>
              </div>

              <div>
                <p className="text-xs font-bold underline text-slate-500 uppercase mb-1">Tujuan Henkaten</p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap">{selectedRecord.tujuanHenkaten}</p>
              </div>

              {selectedRecord.photo && (
                <div>
                  <p className="text-xs font-bold underline text-slate-500 uppercase mb-1">Photo</p>
                  <img
                    src={selectedRecord.photo}
                    alt="Henkaten"
                    className="max-w-full max-h-72 rounded-lg border border-slate-200 shadow-sm"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Dibuat oleh {selectedRecord.createdBy}</span>
                <span>{format(new Date(selectedRecord.createdAt), 'dd MMM yyyy HH:mm')}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button
                onClick={() => handleExportSinglePDF(selectedRecord)}
                className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Download PDF"
              >
                <FileDown size={16} />
              </button>
              <button
                onClick={() => handlePrint(selectedRecord)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Printer size={16} /> Print
              </button>
              <button
                onClick={() => {
                  onEdit(selectedRecord.id);
                  setSelectedRecord(null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit2 size={16} /> Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
