export type RiskLevel = 'Low' | 'Medium' | 'High';
export type Category = 'Methode' | 'Material' | 'Man' | 'Machine';
export type LineName = string;
export type Departemen = string;

export const DEFAULT_LINE_NAME_OPTIONS: LineName[] = [
  'Mel-Pour-Analys', 'Mould-RCS', 'Core Making', 'Finishing', 'Maintenance', 'Die Maintenance',
];
export const DEFAULT_DEPARTEMEN_OPTIONS: Departemen[] = [
  'Production', 'Engineering', 'Maintenance', 'Die Maintenance',
];

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
