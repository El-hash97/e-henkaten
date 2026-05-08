import { useForm } from 'react-hook-form';
import { Upload, X, Check, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';
import { useRef, useState, useEffect } from 'react';
import type { HenkatenRecord } from '../types';

type FormData = Omit<HenkatenRecord, 'id' | 'createdAt' | 'createdBy'>;

export function InputForm({ onSave, editingRecordId = null }: { onSave: () => void, editingRecordId?: string | null }) {
  const addRecord = useStore((state) => state.addRecord);
  const updateRecord = useStore((state) => state.updateRecord);
  const records = useStore((state) => state.records);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      lineName: '',
      dateStart: '',
      dateFinish: '',
      category: '',
      henkatenInfo: '',
      riskLevel: '',
      tujuanHenkaten: '',
      picName: '',
      departemen: '',
      photo: null,
    }
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingRecordId) {
      const record = records.find(r => r.id === editingRecordId);
      if (record) {
        reset(record);
        setPhotoPreview(record.photo);
        setPhotoFile(null);
      }
    } else {
      reset({
        lineName: '', dateStart: '', dateFinish: '', category: '', henkatenInfo: '', 
        riskLevel: '', tujuanHenkaten: '', picName: '', departemen: '', photo: null
      });
      setPhotoPreview(null);
      setPhotoFile(null);
    }
  }, [editingRecordId, records, reset]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    setValue('photo', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      if (editingRecordId) {
        await updateRecord(editingRecordId, data, photoFile);
        toast.success('Data Henkaten berhasil diperbarui!');
      } else {
        const newRecord: Omit<HenkatenRecord, 'id' | 'createdAt' | 'photo'> = {
          ...data,
          createdBy: 'Member Henkaten',
        };
        await addRecord(newRecord, photoFile);
        toast.success('Data Henkaten berhasil disimpan!');
      }
      
      reset();
      setPhotoPreview(null);
      setPhotoFile(null);
      setIsSaving(false);
      onSave();
    } catch (err: any) {
      setIsSaving(false);
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan data.');
    }
  };

  const inputClass = "mt-1 block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-navy-900 sm:text-sm sm:leading-6 bg-white transition-all duration-200 outline-none";
  const labelClass = "block text-sm font-semibold leading-6 text-slate-800 tracking-tight";

  return (
    <div className="w-full">
      <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-6 drop-shadow-sm">Form Input</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Line Name */}
        <div>
          <label className={labelClass}>Line Name</label>
          <select {...register('lineName', { required: true })} className={inputClass}>
            <option value="">Pilih Line Name</option>
            <option value="Mel-Pour-Analys">Mel-Pour-Analys</option>
            <option value="Mould-RCS">Mould-RCS</option>
            <option value="Core Making">Core Making</option>
            <option value="Finishing">Finishing</option>
          </select>
          {errors.lineName && <span className="text-xs text-red-500 mt-1">Line Name wajib diisi</span>}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Date Start</label>
            <input type="date" {...register('dateStart', { required: true })} className={inputClass} />
            {errors.dateStart && <span className="text-xs text-red-500 mt-1">Date Start wajib diisi</span>}
          </div>
          <div>
            <label className={labelClass}>Date Finish</label>
            <input type="date" {...register('dateFinish')} className={inputClass} />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className={labelClass}>Category</label>
          <select {...register('category', { required: true })} className={inputClass}>
            <option value="">Pilih Category</option>
            <option value="Methode">Methode</option>
            <option value="Material">Material</option>
            <option value="Man">Man</option>
            <option value="Machine">Machine</option>
          </select>
          {errors.category && <span className="text-xs text-red-500 mt-1">Category wajib diisi</span>}
        </div>

        {/* Henkaten */}
        <div>
          <label className={labelClass}>Henkaten</label>
          <textarea 
            rows={4} 
            placeholder="Tuliskan perubahan proses..." 
            {...register('henkatenInfo', { required: true })} 
            className={inputClass} 
          />
          {errors.henkatenInfo && <span className="text-xs text-red-500 mt-1">Deskripsi Henkaten wajib diisi</span>}
        </div>

        {/* Risk Level */}
        <div>
          <label className={labelClass}>Risk Level</label>
          <select {...register('riskLevel', { required: true })} className={inputClass}>
            <option value="">Pilih Risk Level</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          {errors.riskLevel && <span className="text-xs text-red-500 mt-1">Risk Level wajib diisi</span>}
        </div>

        {/* Tujuan Henkaten */}
        <div>
          <label className={labelClass}>Tujuan Henkaten</label>
          <textarea 
            rows={4} 
            placeholder="Tuliskan tujuan perubahan..." 
            {...register('tujuanHenkaten', { required: true })} 
            className={inputClass} 
          />
          {errors.tujuanHenkaten && <span className="text-xs text-red-500 mt-1">Tujuan Henkaten wajib diisi</span>}
        </div>

        {/* PIC Name & Departemen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>PIC Name</label>
            <input type="text" placeholder="Masukkan nama PIC" {...register('picName', { required: true })} className={inputClass} />
            {errors.picName && <span className="text-xs text-red-500 mt-1">PIC Name wajib diisi</span>}
          </div>
          <div>
            <label className={labelClass}>Departemen</label>
            <select {...register('departemen', { required: true })} className={inputClass}>
              <option value="">Pilih Departemen</option>
              <option value="Production">Production</option>
              <option value="Engineering">Engineering</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Die Maintenance">Die Maintenance</option>
            </select>
            {errors.departemen && <span className="text-xs text-red-500 mt-1">Departemen wajib diisi</span>}
          </div>
        </div>

        {/* Upload Foto */}
        <div>
          <label className={labelClass}>Upload Foto</label>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handlePhotoUpload} 
          />
          
          <div className="mt-2 flex items-center space-x-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-navy-900 shadow-sm"
            >
              <Upload size={18} className="text-slate-500" />
              <span className="text-sm font-medium">Pilih Foto</span>
            </button>
            <span className="text-sm text-slate-500">
              {photoPreview ? "1 file terpilih" : "No file chosen"}
            </span>
          </div>

          {photoPreview && (
            <div className="mt-4 relative inline-block">
              <div className="relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50 w-32 h-32 flex items-center justify-center">
                <img src={photoPreview} alt="Preview" className="object-cover w-full h-full" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-1 right-1 bg-white/80 p-1 rounded-md text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={isSaving}
          className="mt-6 bg-navy-900 text-white font-medium py-3 px-6 rounded-lg float-left hover:bg-navy-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 focus:ring-4 focus:ring-navy-900/30 flex items-center space-x-2 disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          <span>{isSaving ? 'Menyimpan...' : (editingRecordId ? 'Update Data' : 'Simpan Data')}</span>
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
        </button>
        <div className="clear-both"></div>
      </form>
    </div>
  );
}
