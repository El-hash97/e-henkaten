# Admin Settings: Manage Line Name & Departemen Options — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a password-gated settings panel (gear icon, top-right of navbar) that lets an admin add/remove custom Line Name and Departemen options at runtime, which immediately become available in the Input Form and Rekap Data filter for all users.

**Architecture:** Two new Supabase tables (`custom_line_names`, `custom_departments`) hold admin-added options. `LineName`/`Departemen` types widen from string literal unions to `string`, with the old literals moved into `DEFAULT_LINE_NAME_OPTIONS`/`DEFAULT_DEPARTEMEN_OPTIONS` constants. The Zustand store fetches and mutates the custom tables. A new `SettingsModal` component (password gate → manage UI) is opened from a new icon in `Navbar`.

**Tech Stack:** React 19, TypeScript, Vite, Zustand, Supabase (`@supabase/supabase-js`), Tailwind CSS, `lucide-react` icons, `react-hot-toast`.

## Global Constraints

- No test runner exists in this repo (`package.json` has no `test` script, no vitest/jest). Verification is: `npx tsc -b` (typecheck), `npm run lint`, and manual browser verification — per the approved spec's Testing section.
- RLS policies for the two new tables must allow full `anon` access, matching how `henkaten_records` already works (no Supabase Auth in this app — see spec Non-goals).
- `VITE_ADMIN_PASSWORD` is a soft gate only, not real security (spec Non-goals) — do not add rate-limiting, hashing, or lockout logic.
- Default (hardcoded) options must never be deletable from the Settings UI.
- Spec: `docs/superpowers/specs/2026-08-04-admin-settings-line-departemen-design.md`

---

### Task 1: Create Supabase tables for custom options

**Files:**
- None in-repo (schema-only change against the project's Supabase instance — this repo has no existing migrations folder or Supabase CLI setup, so schema changes here follow the same convention already used for `henkaten_records`: applied directly against the database, not version-controlled as a repo file).

**Interfaces:**
- Produces: two tables queryable via the existing anon Supabase client (`src/lib/supabase.ts`):
  - `custom_line_names(id uuid, name text unique, created_at timestamptz)`
  - `custom_departments(id uuid, name text unique, created_at timestamptz)`

- [ ] **Step 1: Identify the target Supabase project**

Read `VITE_SUPABASE_URL` from `.env.local` — its host (`https://<project-ref>.supabase.co`) identifies the project. If Supabase MCP tools are available in your environment (tools named like `mcp__*Supabase__list_projects`, `mcp__*Supabase__apply_migration`), use `list_projects` to find the project whose URL matches, then use it for Step 2. Otherwise, log into the Supabase Dashboard for this project and open the SQL Editor.

- [ ] **Step 2: Run the schema SQL**

```sql
create table custom_line_names (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table custom_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table custom_line_names enable row level security;
alter table custom_departments enable row level security;

create policy "anon full access" on custom_line_names
  for all to anon using (true) with check (true);
create policy "anon full access" on custom_departments
  for all to anon using (true) with check (true);
```

Run this via the Supabase MCP `apply_migration` tool (pass a descriptive migration name like `add_custom_line_names_and_departments`) if available, otherwise paste into the Supabase Dashboard SQL Editor and execute.

- [ ] **Step 3: Verify the tables exist and are readable by anon**

If using MCP tools: call `list_tables` and confirm `custom_line_names` and `custom_departments` appear. If using the Dashboard: run `select * from custom_line_names;` and `select * from custom_departments;` in the SQL Editor — both should return zero rows with no error.

No commit needed for this task (no repo files changed).

---

### Task 2: Widen LineName/Departemen types and export default option lists

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `type LineName = string`, `type Departemen = string`, `DEFAULT_LINE_NAME_OPTIONS: LineName[]`, `DEFAULT_DEPARTEMEN_OPTIONS: Departemen[]` — consumed by Tasks 6, 7, 8.

- [ ] **Step 1: Replace the literal unions with widened types + default constants**

Current file (`src/types/index.ts:1-4`):

```ts
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type Category = 'Methode' | 'Material' | 'Man' | 'Machine';
export type LineName = 'Mel-Pour-Analys' | 'Mould-RCS' | 'Core Making' | 'Finishing' | 'Maintenance' | 'Die Maintenance';
export type Departemen = 'Production' | 'Engineering' | 'Maintenance' | 'Die Maintenance';
```

Replace lines 3-4 with:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors. (Widening a literal union to `string` cannot break existing comparisons/assignments — every existing literal is still a valid `string`.)

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "widen LineName/Departemen types, extract default option constants"
```

---

### Task 3: Add custom options state and CRUD actions to the store

**Files:**
- Modify: `src/store/useStore.ts`

**Interfaces:**
- Consumes: `supabase` client from `src/lib/supabase.ts` (already imported in this file).
- Produces (added to `AppState`, consumed by Tasks 5, 6, 7, 8):
  - `customLineNames: { id: string; name: string }[]`
  - `customDepartments: { id: string; name: string }[]`
  - `fetchOptions: () => Promise<void>`
  - `addLineName: (name: string) => Promise<void>`
  - `deleteLineName: (id: string) => Promise<void>`
  - `addDepartment: (name: string) => Promise<void>`
  - `deleteDepartment: (id: string) => Promise<void>`

- [ ] **Step 1: Add state fields and method signatures to the `AppState` interface**

Current (`src/store/useStore.ts:5-15`):

```ts
interface AppState {
  records: HenkatenRecord[];
  isLoading: boolean;
  error: string | null;
  fetchRecords: () => Promise<void>;
  addRecord: (record: Omit<HenkatenRecord, 'id' | 'createdAt' | 'photo'>, photoFile?: File | null) => Promise<void>;
  updateRecord: (id: string, record: Partial<HenkatenRecord>, newPhotoFile?: File | null) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  uploadTrialDocument: (id: string, file: File) => Promise<void>;
  deleteTrialDocument: (id: string) => Promise<void>;
}
```

Replace with:

```ts
interface CustomOption {
  id: string;
  name: string;
}

interface AppState {
  records: HenkatenRecord[];
  isLoading: boolean;
  error: string | null;
  customLineNames: CustomOption[];
  customDepartments: CustomOption[];
  fetchRecords: () => Promise<void>;
  addRecord: (record: Omit<HenkatenRecord, 'id' | 'createdAt' | 'photo'>, photoFile?: File | null) => Promise<void>;
  updateRecord: (id: string, record: Partial<HenkatenRecord>, newPhotoFile?: File | null) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  uploadTrialDocument: (id: string, file: File) => Promise<void>;
  deleteTrialDocument: (id: string) => Promise<void>;
  fetchOptions: () => Promise<void>;
  addLineName: (name: string) => Promise<void>;
  deleteLineName: (id: string) => Promise<void>;
  addDepartment: (name: string) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
}
```

- [ ] **Step 2: Add initial state values**

Current (`src/store/useStore.ts:17-20`):

```ts
export const useStore = create<AppState>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,
```

Replace with:

```ts
export const useStore = create<AppState>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,
  customLineNames: [],
  customDepartments: [],
```

- [ ] **Step 3: Add the new store methods**

Current end of file (`src/store/useStore.ts:182-195`):

```ts
  deleteTrialDocument: async (id) => {
    try {
      const { error } = await supabase
        .from('henkaten_records')
        .update({ trial_document: null, trial_document_name: null })
        .eq('id', id);

      if (error) throw error;
      await get().fetchRecords();
    } catch (err: any) {
      throw new Error(err.message);
    }
  }
}));
```

Replace with (note the added trailing comma after the `deleteTrialDocument` block):

```ts
  deleteTrialDocument: async (id) => {
    try {
      const { error } = await supabase
        .from('henkaten_records')
        .update({ trial_document: null, trial_document_name: null })
        .eq('id', id);

      if (error) throw error;
      await get().fetchRecords();
    } catch (err: any) {
      throw new Error(err.message);
    }
  },

  fetchOptions: async () => {
    try {
      const [lineNamesRes, departmentsRes] = await Promise.all([
        supabase.from('custom_line_names').select('id, name').order('name', { ascending: true }),
        supabase.from('custom_departments').select('id, name').order('name', { ascending: true }),
      ]);

      if (lineNamesRes.error) throw lineNamesRes.error;
      if (departmentsRes.error) throw departmentsRes.error;

      set({
        customLineNames: lineNamesRes.data ?? [],
        customDepartments: departmentsRes.data ?? [],
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  addLineName: async (name) => {
    try {
      const { error } = await supabase.from('custom_line_names').insert([{ name }]);
      if (error) throw error;
      await get().fetchOptions();
    } catch (err: any) {
      throw new Error(err.message);
    }
  },

  deleteLineName: async (id) => {
    try {
      const { error } = await supabase.from('custom_line_names').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({ customLineNames: state.customLineNames.filter((c) => c.id !== id) }));
    } catch (err: any) {
      throw new Error(err.message);
    }
  },

  addDepartment: async (name) => {
    try {
      const { error } = await supabase.from('custom_departments').insert([{ name }]);
      if (error) throw error;
      await get().fetchOptions();
    } catch (err: any) {
      throw new Error(err.message);
    }
  },

  deleteDepartment: async (id) => {
    try {
      const { error } = await supabase.from('custom_departments').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({ customDepartments: state.customDepartments.filter((c) => c.id !== id) }));
    } catch (err: any) {
      throw new Error(err.message);
    }
  },
}));
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/store/useStore.ts
git commit -m "add custom line name/department state and CRUD actions to store"
```

---

### Task 4: Add the admin password environment variable

**Files:**
- Modify: `.env.local` (gitignored via the `*.local` pattern in `.gitignore` — safe to put a real value here)
- Modify: `.env.example` (tracked in git — placeholder only, never a real password)

**Interfaces:**
- Produces: `import.meta.env.VITE_ADMIN_PASSWORD`, consumed by Task 5.

- [ ] **Step 1: Ask the user what admin password they want**

Do not invent a password yourself — ask the user directly what value they want for `VITE_ADMIN_PASSWORD`. This is a real credential for their app, even if it's a soft gate.

- [ ] **Step 2: Add it to `.env.local`**

Append a new line to `.env.local`:

```
VITE_ADMIN_PASSWORD=<the value the user chose>
```

- [ ] **Step 3: Add a placeholder to `.env.example`**

Append to `.env.example`:

```
VITE_ADMIN_PASSWORD=your_admin_password
```

- [ ] **Step 4: Commit**

Only `.env.example` should be staged (`.env.local` is gitignored — verify with `git status` that it does not appear as a tracked change).

```bash
git status
git add .env.example
git commit -m "document VITE_ADMIN_PASSWORD env var for admin settings gate"
```

---

### Task 5: Build the SettingsModal component

**Files:**
- Create: `src/components/SettingsModal.tsx`

**Interfaces:**
- Consumes: `useStore` fields/actions from Task 3 (`customLineNames`, `customDepartments`, `addLineName`, `deleteLineName`, `addDepartment`, `deleteDepartment`); `DEFAULT_LINE_NAME_OPTIONS`, `DEFAULT_DEPARTEMEN_OPTIONS` from Task 2; `import.meta.env.VITE_ADMIN_PASSWORD` from Task 4.
- Produces: `SettingsModal({ isOpen: boolean; onClose: () => void })` component, consumed by Task 6.

- [ ] **Step 1: Write the component**

Create `src/components/SettingsModal.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { X, Settings as SettingsIcon, Trash2, Plus, Loader2, AlertTriangle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { DEFAULT_LINE_NAME_OPTIONS, DEFAULT_DEPARTEMEN_OPTIONS } from '../types';

const ADMIN_SESSION_KEY = 'henkaten_admin';

type DeleteTarget = { kind: 'line' | 'department'; id: string; name: string };

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    customLineNames, customDepartments,
    addLineName, deleteLineName, addDepartment, deleteDepartment,
  } = useStore();

  const [stage, setStage] = useState<'login' | 'manage'>('login');
  const [password, setPassword] = useState('');
  const [newLineName, setNewLineName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const alreadyAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
      setStage(alreadyAdmin ? 'manage' : 'login');
      setPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    if (adminPassword && password === adminPassword) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
      setStage('manage');
    } else {
      toast.error('Password admin salah.');
    }
  };

  const isDuplicate = (name: string, defaults: string[], custom: { name: string }[]) => {
    const lower = name.trim().toLowerCase();
    return defaults.some((d) => d.toLowerCase() === lower) || custom.some((c) => c.name.toLowerCase() === lower);
  };

  const handleAddLineName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLineName.trim();
    if (!trimmed) {
      toast.error('Nama Line Name tidak boleh kosong.');
      return;
    }
    if (isDuplicate(trimmed, DEFAULT_LINE_NAME_OPTIONS, customLineNames)) {
      toast.error('Line Name tersebut sudah ada.');
      return;
    }
    setIsAddingLine(true);
    try {
      await addLineName(trimmed);
      setNewLineName('');
      toast.success('Line Name berhasil ditambahkan.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan Line Name.');
    } finally {
      setIsAddingLine(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDepartment.trim();
    if (!trimmed) {
      toast.error('Nama Departemen tidak boleh kosong.');
      return;
    }
    if (isDuplicate(trimmed, DEFAULT_DEPARTEMEN_OPTIONS, customDepartments)) {
      toast.error('Departemen tersebut sudah ada.');
      return;
    }
    setIsAddingDept(true);
    try {
      await addDepartment(trimmed);
      setNewDepartment('');
      toast.success('Departemen berhasil ditambahkan.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan Departemen.');
    } finally {
      setIsAddingDept(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.kind === 'line') {
        await deleteLineName(deleteTarget.id);
      } else {
        await deleteDepartment(deleteTarget.id);
      }
      toast.success('Opsi berhasil dihapus.');
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus opsi.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 sticky top-0 bg-blue-600 text-white rounded-t-xl">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <SettingsIcon size={18} /> {stage === 'login' ? 'Login Admin' : 'Kelola Line Name & Departemen'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Tutup">
            <X size={18} />
          </button>
        </div>

        {stage === 'login' ? (
          <form onSubmit={handleLogin} className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Lock size={22} />
              </div>
              <p className="text-sm text-slate-500">Masukkan password admin untuk mengelola daftar Line Name dan Departemen.</p>
            </div>
            <input
              type="password"
              autoFocus
              placeholder="Password admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors shadow-sm"
            />
            <button
              type="submit"
              disabled={!password}
              className="w-full flex items-center justify-center gap-2 bg-navy-900 text-white font-medium py-2.5 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Masuk
            </button>
          </form>
        ) : (
          <div className="p-4 sm:p-6 space-y-6">
            <OptionSection
              title="Line Name"
              defaults={DEFAULT_LINE_NAME_OPTIONS}
              custom={customLineNames}
              newValue={newLineName}
              onNewValueChange={setNewLineName}
              onAdd={handleAddLineName}
              isAdding={isAddingLine}
              onDelete={(id, name) => setDeleteTarget({ kind: 'line', id, name })}
            />
            <OptionSection
              title="Departemen"
              defaults={DEFAULT_DEPARTEMEN_OPTIONS}
              custom={customDepartments}
              newValue={newDepartment}
              onNewValueChange={setNewDepartment}
              onAdd={handleAddDepartment}
              isAdding={isAddingDept}
              onDelete={(id, name) => setDeleteTarget({ kind: 'department', id, name })}
            />
          </div>
        )}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Hapus Opsi</h3>
                <p className="text-sm text-slate-500 mt-1">Apakah Anda yakin ingin menghapus "{deleteTarget.name}"?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OptionSection({
  title, defaults, custom, newValue, onNewValueChange, onAdd, isAdding, onDelete,
}: {
  title: string;
  defaults: string[];
  custom: { id: string; name: string }[];
  newValue: string;
  onNewValueChange: (value: string) => void;
  onAdd: (e: React.FormEvent) => void;
  isAdding: boolean;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <div>
      <h4 className="text-sm font-bold text-slate-900 mb-2">{title}</h4>
      <div className="space-y-1.5 mb-3">
        {defaults.map((name) => (
          <div key={name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-sm text-slate-500">
            <span>{name}</span>
            <span className="text-[10px] uppercase font-semibold tracking-wide text-slate-400">Bawaan</span>
          </div>
        ))}
        {custom.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700">
            <span>{item.name}</span>
            <button
              onClick={() => onDelete(item.id, item.name)}
              className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title={`Hapus ${item.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={onAdd} className="flex items-center gap-2">
        <input
          type="text"
          placeholder={`Tambah ${title} baru...`}
          value={newValue}
          onChange={(e) => onNewValueChange(e.target.value)}
          className="flex-1 border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 transition-colors"
        />
        <button
          type="submit"
          disabled={isAdding || !newValue.trim()}
          className="flex items-center gap-1.5 bg-navy-900 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Tambah
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsModal.tsx
git commit -m "add SettingsModal component with admin login and option management"
```

---

### Task 6: Wire the settings icon into Navbar and mount SettingsModal in App

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `SettingsModal` from Task 5, `fetchOptions` from Task 3.
- Produces: `Navbar({ onOpenSettings: () => void })` (breaking prop change — Navbar previously took no props).

- [ ] **Step 1: Add the settings icon to Navbar**

Replace the full contents of `src/components/Navbar.tsx`:

```tsx
import { Settings } from 'lucide-react';

export function Navbar({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <nav className="relative bg-[#F0F1F3] border-b-4 border-[#EB0A1E] px-3 sm:px-6 py-3 sm:py-4 flex items-center shadow-sm sticky top-0 z-30 w-full">
      <div className="flex items-center shrink-0">
        <img src="/logo.png" alt="Logo" className="h-7 sm:h-10 w-auto object-contain" />
      </div>
      <h1 className="absolute left-1/2 -translate-x-1/2 max-w-[55%] sm:max-w-none truncate text-center text-sm sm:text-xl md:text-2xl font-bold text-navy-900 tracking-tight">HENKATEN SHEET</h1>
      <button
        onClick={onOpenSettings}
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-white/60 transition-colors"
        title="Pengaturan"
      >
        <Settings size={20} />
      </button>
    </nav>
  );
}
```

- [ ] **Step 2: Wire state + SettingsModal into App**

Current `src/App.tsx:1-20`:

```tsx
import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { InputForm } from './components/InputForm';
import { RekapData } from './components/RekapData';
import { clsx } from 'clsx';
import { Toaster } from 'react-hot-toast';

type Tab = 'input' | 'rekap';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('input');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  
  const fetchRecords = useStore((state) => state.fetchRecords);
  
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);
```

Replace with:

```tsx
import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { InputForm } from './components/InputForm';
import { RekapData } from './components/RekapData';
import { SettingsModal } from './components/SettingsModal';
import { clsx } from 'clsx';
import { Toaster } from 'react-hot-toast';

type Tab = 'input' | 'rekap';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('input');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const fetchRecords = useStore((state) => state.fetchRecords);
  const fetchOptions = useStore((state) => state.fetchOptions);
  
  useEffect(() => {
    fetchRecords();
    fetchOptions();
  }, [fetchRecords, fetchOptions]);
```

Current `src/App.tsx:32-36` (return statement start):

```tsx
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <Toaster position="top-right" />
      <Navbar />
      
```

Replace with:

```tsx
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <Toaster position="top-right" />
      <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />
      
```

Current `src/App.tsx:71-76` (end of component, before closing):

```tsx
      </main>

      <Footer />
    </div>
  );
}
```

Replace with:

```tsx
      </main>

      <Footer />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev`, open the app in a browser.

1. Confirm a gear icon appears top-right of the navbar.
2. Click it — a "Login Admin" modal should appear.
3. Enter a wrong password, submit — expect a red toast "Password admin salah." and the modal stays on the login form.
4. Enter the correct password (the value you set in `.env.local` in Task 4), submit — expect the modal to switch to "Kelola Line Name & Departemen" showing the 6 default Line Name entries and 4 default Departemen entries as read-only "Bawaan" rows, with empty custom sections below.
5. Add a Line Name (e.g. "Test Line") — expect a success toast and the new entry to appear in the custom list with a delete button.
6. Close the modal (X or backdrop click) and reopen it — expect it to go straight to the "Kelola..." view without asking for the password again (sessionStorage).
7. Delete "Test Line" via its trash icon — expect a confirmation dialog, then removal after confirming.

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.tsx src/App.tsx
git commit -m "wire settings icon and modal into Navbar/App"
```

---

### Task 7: Use dynamic options in the Input Form

**Files:**
- Modify: `src/components/InputForm.tsx`

**Interfaces:**
- Consumes: `customLineNames`, `customDepartments` from Task 3; `DEFAULT_LINE_NAME_OPTIONS`, `DEFAULT_DEPARTEMEN_OPTIONS` from Task 2.

- [ ] **Step 1: Import the store selectors and default option constants**

Current `src/components/InputForm.tsx:1-6`:

```tsx
import { useForm } from 'react-hook-form';
import { Upload, X, Check, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';
import { useRef, useState, useEffect } from 'react';
import type { HenkatenRecord } from '../types';
```

Replace with:

```tsx
import { useForm } from 'react-hook-form';
import { Upload, X, Check, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';
import { useRef, useState, useEffect } from 'react';
import type { HenkatenRecord } from '../types';
import { DEFAULT_LINE_NAME_OPTIONS, DEFAULT_DEPARTEMEN_OPTIONS } from '../types';
```

- [ ] **Step 2: Read custom options from the store and build combined lists**

Current `src/components/InputForm.tsx:10-13`:

```tsx
export function InputForm({ onSave, editingRecordId = null }: { onSave: () => void, editingRecordId?: string | null }) {
  const addRecord = useStore((state) => state.addRecord);
  const updateRecord = useStore((state) => state.updateRecord);
  const records = useStore((state) => state.records);
```

Replace with:

```tsx
export function InputForm({ onSave, editingRecordId = null }: { onSave: () => void, editingRecordId?: string | null }) {
  const addRecord = useStore((state) => state.addRecord);
  const updateRecord = useStore((state) => state.updateRecord);
  const records = useStore((state) => state.records);
  const customLineNames = useStore((state) => state.customLineNames);
  const customDepartments = useStore((state) => state.customDepartments);
  const lineNameOptions = [...DEFAULT_LINE_NAME_OPTIONS, ...customLineNames.map((c) => c.name)];
  const departmentOptions = [...DEFAULT_DEPARTEMEN_OPTIONS, ...customDepartments.map((c) => c.name)];
```

- [ ] **Step 3: Replace the hardcoded Line Name options**

Current `src/components/InputForm.tsx:107-115`:

```tsx
          <select {...register('lineName', { required: true })} className={inputClass}>
            <option value="">Pilih Line Name</option>
            <option value="Mel-Pour-Analys">Mel-Pour-Analys</option>
            <option value="Mould-RCS">Mould-RCS</option>
            <option value="Core Making">Core Making</option>
            <option value="Finishing">Finishing</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Die Maintenance">Die Maintenance</option>
          </select>
```

Replace with:

```tsx
          <select {...register('lineName', { required: true })} className={inputClass}>
            <option value="">Pilih Line Name</option>
            {lineNameOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
```

- [ ] **Step 4: Replace the hardcoded Departemen options**

Current `src/components/InputForm.tsx:190-196`:

```tsx
            <select {...register('departemen', { required: true })} className={inputClass}>
              <option value="">Pilih Departemen</option>
              <option value="Production">Production</option>
              <option value="Engineering">Engineering</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Die Maintenance">Die Maintenance</option>
            </select>
```

Replace with:

```tsx
            <select {...register('departemen', { required: true })} className={inputClass}>
              <option value="">Pilih Departemen</option>
              {departmentOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Manual browser verification**

With `npm run dev` running: add a custom Line Name and Departemen via Settings (Task 6 flow), then open the Input Form tab — confirm both new values appear at the bottom of their respective dropdowns, after the default options.

- [ ] **Step 7: Commit**

```bash
git add src/components/InputForm.tsx
git commit -m "use dynamic Line Name/Departemen options in Input Form"
```

---

### Task 8: Use dynamic options in the Rekap Data filter

**Files:**
- Modify: `src/components/RekapData.tsx`

**Interfaces:**
- Consumes: `customLineNames` from Task 3; `DEFAULT_LINE_NAME_OPTIONS` from Task 2.

- [ ] **Step 1: Replace the hardcoded module-level constant with an import**

Current `src/components/RekapData.tsx:5` (import line):

```tsx
import type { RiskLevel, HenkatenRecord, LineName, Category } from '../types';
```

Replace with:

```tsx
import type { RiskLevel, HenkatenRecord, LineName, Category } from '../types';
import { DEFAULT_LINE_NAME_OPTIONS } from '../types';
```

Current `src/components/RekapData.tsx:13-15`:

```tsx
const LINE_NAME_OPTIONS: LineName[] = ['Mel-Pour-Analys', 'Mould-RCS', 'Core Making', 'Finishing', 'Maintenance', 'Die Maintenance'];
const CATEGORY_OPTIONS: Category[] = ['Methode', 'Material', 'Man', 'Machine'];
const RISK_LEVEL_OPTIONS: RiskLevel[] = ['Low', 'Medium', 'High'];
```

Replace with:

```tsx
const CATEGORY_OPTIONS: Category[] = ['Methode', 'Material', 'Man', 'Machine'];
const RISK_LEVEL_OPTIONS: RiskLevel[] = ['Low', 'Medium', 'High'];
```

(The `LINE_NAME_OPTIONS` constant is removed entirely — it becomes a per-render computed value in Step 2, since it must now include custom options from the store.)

- [ ] **Step 2: Read custom line names from the store and compute the combined list**

Current `src/components/RekapData.tsx:18`:

```tsx
  const { records, deleteRecord, isLoading, uploadTrialDocument, deleteTrialDocument, updateRecord } = useStore();
```

Replace with:

```tsx
  const { records, deleteRecord, isLoading, uploadTrialDocument, deleteTrialDocument, updateRecord, customLineNames } = useStore();
```

Then, directly after the `stats` `useMemo` block (`src/components/RekapData.tsx:52-58`, ending `}, [filteredRecords]);`), add a new `useMemo`:

```tsx
  const lineNameOptions = useMemo(
    () => [...DEFAULT_LINE_NAME_OPTIONS, ...customLineNames.map((c) => c.name)],
    [customLineNames]
  );
```

- [ ] **Step 3: Update the filter dropdown to use the computed list**

Current `src/components/RekapData.tsx:352-354`:

```tsx
            {LINE_NAME_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
```

Replace with:

```tsx
            {lineNameOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Manual browser verification**

With the custom Line Name added in Task 7's verification still present: open Rekap Data, open the Line Name filter dropdown — confirm the custom value appears after the defaults. Select it — if no records use that line, confirm the table shows "Tidak ada data ditemukan." (existing empty-state behavior, unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/components/RekapData.tsx
git commit -m "use dynamic Line Name options in Rekap Data filter"
```

---

### Task 9: Final full verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck + build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors and produces a `dist/` bundle.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors introduced by this feature (pre-existing warnings, if any, are out of scope).

- [ ] **Step 3: End-to-end manual walkthrough**

Run: `npm run dev`. Using two browser tabs (or one tab, reloading between steps) to simulate two different users:

1. Tab A: open Settings, log in, add a Line Name "QA Line" and a Departemen "Quality".
2. Tab B: reload the page (no login needed here — this is the *consuming* side, not the admin side), open Input Form — confirm "QA Line" and "Quality" appear in their dropdowns.
3. Tab B: open Rekap Data — confirm "QA Line" appears in the Line Name filter.
4. Tab A: delete "QA Line" and "Quality" via Settings.
5. Tab B: reload, confirm both are gone from Input Form and the Rekap Data filter.
6. Confirm the default options (Mel-Pour-Analys, Mould-RCS, Core Making, Finishing, Maintenance, Die Maintenance / Production, Engineering, Maintenance, Die Maintenance) are present throughout and were never deletable from the Settings UI (no delete button next to "Bawaan" rows).

- [ ] **Step 4: Clean up test data**

If any test records were created in `henkaten_records` referencing "QA Line" during manual testing, delete them via the Rekap Data trash icon so they don't pollute real data.

No commit for this task (verification only, no file changes).
