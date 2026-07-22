import { create } from 'zustand';
import type { HenkatenRecord } from '../types';
import { supabase } from '../lib/supabase';

interface AppState {
  records: HenkatenRecord[];
  isLoading: boolean;
  error: string | null;
  fetchRecords: () => Promise<void>;
  addRecord: (record: Omit<HenkatenRecord, 'id' | 'createdAt' | 'photo'>, photoFile?: File | null) => Promise<void>;
  updateRecord: (id: string, record: Partial<HenkatenRecord>, newPhotoFile?: File | null) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  uploadTrialDocument: (id: string, file: File) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,
  
  fetchRecords: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('henkaten_records')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const formattedData = data.map((d: any) => ({
        id: d.id,
        lineName: d.line_name,
        dateStart: d.date_start,
        dateFinish: d.date_finish,
        category: d.category,
        henkatenInfo: d.henkaten_info,
        riskLevel: d.risk_level,
        tujuanHenkaten: d.tujuan_henkaten,
        picName: d.pic_name,
        departemen: d.departemen,
        photo: d.photo,
        trialDocument: d.trial_document,
        trialDocumentName: d.trial_document_name,
        createdBy: d.created_by,
        createdAt: d.created_at,
      }));
      
      set({ records: formattedData, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
  
  addRecord: async (record, photoFile) => {
    try {
      let photoUrl = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const filePath = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('henkaten_photos')
          .upload(filePath, photoFile);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('henkaten_photos')
          .getPublicUrl(filePath);
        photoUrl = publicUrl;
      }

      const dbRecord = {
        line_name: record.lineName,
        date_start: record.dateStart,
        date_finish: record.dateFinish,
        category: record.category,
        henkaten_info: record.henkatenInfo,
        risk_level: record.riskLevel,
        tujuan_henkaten: record.tujuanHenkaten,
        pic_name: record.picName,
        departemen: record.departemen,
        photo: photoUrl,
        created_by: record.createdBy,
      };
      
      const { error } = await supabase
        .from('henkaten_records')
        .insert([dbRecord]);
        
      if (error) throw error;
      await get().fetchRecords();
    } catch (err: any) {
      throw new Error(err.message);
    }
  },
  
  updateRecord: async (id, updatedRecord, newPhotoFile) => {
    try {
      const dbRecord: any = {};
      if (updatedRecord.lineName !== undefined) dbRecord.line_name = updatedRecord.lineName;
      if (updatedRecord.dateStart !== undefined) dbRecord.date_start = updatedRecord.dateStart;
      if (updatedRecord.dateFinish !== undefined) dbRecord.date_finish = updatedRecord.dateFinish;
      if (updatedRecord.category !== undefined) dbRecord.category = updatedRecord.category;
      if (updatedRecord.henkatenInfo !== undefined) dbRecord.henkaten_info = updatedRecord.henkatenInfo;
      if (updatedRecord.riskLevel !== undefined) dbRecord.risk_level = updatedRecord.riskLevel;
      if (updatedRecord.tujuanHenkaten !== undefined) dbRecord.tujuan_henkaten = updatedRecord.tujuanHenkaten;
      if (updatedRecord.picName !== undefined) dbRecord.pic_name = updatedRecord.picName;
      if (updatedRecord.departemen !== undefined) dbRecord.departemen = updatedRecord.departemen;
      if (updatedRecord.createdBy !== undefined) dbRecord.created_by = updatedRecord.createdBy;

      // Handle photo update
      if (newPhotoFile) {
        const fileExt = newPhotoFile.name.split('.').pop();
        const filePath = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('henkaten_photos')
          .upload(filePath, newPhotoFile);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('henkaten_photos')
          .getPublicUrl(filePath);
        dbRecord.photo = publicUrl;
      } else if (updatedRecord.photo !== undefined) {
        dbRecord.photo = updatedRecord.photo;
      }

      const { error } = await supabase
        .from('henkaten_records')
        .update(dbRecord)
        .eq('id', id);
        
      if (error) throw error;
      await get().fetchRecords();
    } catch (err: any) {
      throw new Error(err.message);
    }
  },
  
  deleteRecord: async (id) => {
    try {
      const { error } = await supabase
        .from('henkaten_records')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
    } catch (err: any) {
      throw new Error(err.message);
    }
  },

  uploadTrialDocument: async (id, file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('henkaten_trial_docs')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('henkaten_trial_docs')
        .getPublicUrl(filePath);

      const { error } = await supabase
        .from('henkaten_records')
        .update({ trial_document: publicUrl, trial_document_name: file.name })
        .eq('id', id);

      if (error) throw error;
      await get().fetchRecords();
    } catch (err: any) {
      throw new Error(err.message);
    }
  }
}));
