export type RiskLevel = 'Low' | 'Medium' | 'High';
export type Category = 'Methode' | 'Material' | 'Man' | 'Machine';
export type LineName = string;
export type Departemen = string;

export interface HenkatenRecord {
  id: string;
  lineName: LineName | '';
  dateStart: string;
  dateFinish: string;
  category: Category | '';
  henkatenInfo: string;
  riskLevel: RiskLevel | '';
  tujuanHenkaten: string;
  picName: string;
  departemen: Departemen | '';
  photo: string | null; // base64 string
  trialDocument: string | null;
  trialDocumentName: string | null;
  keterangan: string | null;
  createdBy: string;
  createdAt: string;
}
