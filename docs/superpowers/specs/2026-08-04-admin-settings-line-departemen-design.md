# Admin Settings: Manage Line Name & Departemen Options

**Date:** 2026-08-04
**Status:** Approved

## Problem

`LineName` and `Departemen` values are hardcoded in three places (`src/types/index.ts`,
`src/components/InputForm.tsx`, `src/components/RekapData.tsx`). Adding a new line or
department currently requires a code change and redeploy. The user wants a way for an
admin to add (and remove) custom options at runtime, gated behind a simple login, without
needing a developer.

## Goals

- A settings icon in the top-right of the navbar opens an admin-gated panel.
- Admin can add new Line Name and Departemen options that immediately become available in
  the Input Form dropdowns and the Rekap Data filter, for all users of the app.
- Admin can remove custom options they added (in case of typos).
- Existing hardcoded default options remain untouched and cannot be deleted from this UI.

## Non-goals

- Real multi-user authentication / user accounts. This is a single shared admin password,
  a soft gate to deter casual editing — not a security boundary. The app is an internal
  SPA with no backend server, so any client-side secret is inherently visible to a
  technical user inspecting the bundle.
- Editing/renaming existing options (only add + delete of custom entries).
- Editing the default (hardcoded) option list through this UI.

## Architecture & Flow

1. `Navbar.tsx` gets a gear icon (`Settings` from `lucide-react`) positioned top-right.
   Clicking it calls `onOpenSettings` (passed from `App.tsx`), which opens
   `SettingsModal.tsx`.
2. `SettingsModal` has two internal stages:
   - **`login`**: single password input, checked against
     `import.meta.env.VITE_ADMIN_PASSWORD`. Wrong password → toast error, stay on form.
     Correct password → set `sessionStorage.setItem('henkaten_admin', '1')`, move to
     `manage` stage.
   - **`manage`**: management panel for Line Name and Departemen options (see UI section).
3. On modal open, if `sessionStorage.getItem('henkaten_admin') === '1'`, skip straight to
   `manage` stage (avoids re-login every time the modal is reopened within the same tab
   session). Session flag is cleared naturally when the tab/browser closes (sessionStorage
   semantics) — no explicit logout button needed for v1.
4. `.env.local` and `.env.example` get a new `VITE_ADMIN_PASSWORD` entry.

## Data Model (Supabase)

Two new tables, mirroring the existing `henkaten_records` pattern (anon-key access, RLS
enabled with open policies — consistent with how the rest of the app already works without
Supabase Auth):

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

### Type changes (`src/types/index.ts`)

`LineName` and `Departemen` change from string-literal unions to plain `string`, since they
must now accept arbitrary custom values from the database:

```ts
export type LineName = string;
export type Departemen = string;

export const DEFAULT_LINE_NAME_OPTIONS: LineName[] = [
  'Mel-Pour-Analys', 'Mould-RCS', 'Core Making', 'Finishing', 'Maintenance', 'Die Maintenance',
];
export const DEFAULT_DEPARTEMEN_OPTIONS: Departemen[] = [
  'Production', 'Engineering', 'Maintenance', 'Die Maintenance',
];
```

`InputForm.tsx` and `RekapData.tsx` drop their local hardcoded arrays and instead build
their dropdown options as `[...DEFAULT_LINE_NAME_OPTIONS, ...customLineNames]` (dedup not
required since inserts are validated unique at add-time — see below).

### Store changes (`src/store/useStore.ts`)

New state and actions:

```ts
customLineNames: { id: string; name: string }[];
customDepartments: { id: string; name: string }[];
fetchOptions: () => Promise<void>;       // called once alongside fetchRecords on app load
addLineName: (name: string) => Promise<void>;
deleteLineName: (id: string) => Promise<void>;
addDepartment: (name: string) => Promise<void>;
deleteDepartment: (id: string) => Promise<void>;
```

`addLineName`/`addDepartment` validate client-side before insert: non-empty (trimmed), and
not a case-insensitive duplicate of any default or existing custom option. Supabase's
`unique` constraint on `name` is the backstop.

## UI

- **Navbar icon**: `<Settings size={20} />`, `absolute right-3 sm:right-6 top-1/2
  -translate-y-1/2`, `text-slate-500 hover:text-navy-900 transition-colors`.
- **Login stage**: centered modal (same visual pattern as existing modals in
  `RekapData.tsx` — `fixed inset-0 z-50 flex items-center justify-center p-4
  bg-slate-900/50 backdrop-blur-sm`), title "Login Admin", one password `<input
  type="password">`, submit button, error toast on mismatch via `react-hot-toast`
  (already a project dependency).
- **Manage stage**: two sections, "Line Name" and "Departemen", each showing:
  - Default options listed as plain read-only text (muted color, no delete button) so the
    admin can see what already exists and won't try to remove it here.
  - Custom options listed below, each with a delete (`Trash2`) button. Delete asks for
    confirmation using the same `confirmDelete` pattern already used for trial documents in
    `RekapData.tsx` (a small inline confirm, not a native `window.confirm`, to match
    existing UX).
  - A small add form at the bottom of each section: text input + "Tambah" button.
- Modal close (`X` button or backdrop click) always returns to `manage` stage next time it
  reopens (within the same session) — it does not log the admin out.

## Error Handling

- Wrong password: toast error, no lockout/rate-limiting (not needed for an internal soft
  gate).
- Add with empty/duplicate name: inline validation message, no network call made.
- Supabase insert/delete failure (network, RLS, etc.): caught and surfaced via
  `toast.error(err.message)`, consistent with existing store error handling patterns.

## Testing

- Manual verification in the browser (per project convention — no existing test suite in
  this repo): open settings, wrong password rejected, correct password enters manage view,
  add a line name and confirm it appears in `InputForm` dropdown and `RekapData` filter
  without a page reload, delete it and confirm it disappears from both, confirm default
  options are never deletable, confirm session persists across modal close/reopen within
  the same tab.
