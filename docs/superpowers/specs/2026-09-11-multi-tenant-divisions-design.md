# Multi-Tenant Henkaten — Design & Planning

**Status:** Draft untuk direview user, belum diimplementasikan.
**Pola dasar:** [bolt-on-multi-tenancy skill](../../../.claude/skills/bolt-on-multi-tenancy/SKILL.md) — 1 database, kolom `tenant_id`, 3 role, tanpa infra baru. Sudah dipakai sekali di `problem-produksi-app`.

## 1. Kondisi Henkaten sekarang (baseline)

- **Stack:** Vite + React 19 SPA murni, deploy ke Netlify. **Tidak ada backend/API route** — `src/lib/supabase.ts` bikin Supabase client langsung di browser pakai `VITE_SUPABASE_ANON_KEY`.
- **Auth:** tidak ada login sama sekali untuk pemakaian normal (Input Form & Rekap Data terbuka untuk siapa saja). Satu-satunya gerbang adalah `VITE_ADMIN_PASSWORD` di [SettingsModal.tsx](../../../src/components/SettingsModal.tsx) — password tunggal, dibandingkan di client, hanya untuk kelola opsi Line Name/Departemen.
- **Data tenant-owned (3 tabel + 2 bucket):**
  - `henkaten_records` (data utama, lihat [types/index.ts](../../../src/types/index.ts))
  - `custom_line_names`, `custom_departments` (opsi dropdown custom, `name` UNIQUE global)
  - Storage bucket `henkaten_photos`, `henkaten_trial_docs`
- Default options (`Mel-Pour-Analys`, `Mould-RCS`, dst) jelas spesifik divisi **Casting** — ini calon "default tenant".

## 2. Keputusan arsitektur penting (beda dari problem-produksi-app)

Di problem-produksi-app (Next.js), API route jadi penjaga: browser tidak pernah bicara langsung ke DB, jadi filter `.eq('tenantId', ...)` di server route sudah cukup aman, dan session cookie custom (scrypt+HMAC) masuk akal karena memang ada server yang memverifikasinya.

**Henkaten tidak punya server itu.** `supabase-js` + anon key ada di bundle browser — siapapun bisa buka DevTools dan query tabel manapun langsung. Kalau isolasi tenant cuma ditulis di kode React (`.eq('tenant_id', activeTenantId)`), itu bisa dilewati begitu saja. Isolasi **wajib ditegakkan di level database (Row Level Security)**, bukan cuma di kode klien.

**Rekomendasi (dan yang akan saya pakai kecuali Anda minta lain):** pakai **Supabase Auth** (bukan cookie session buatan sendiri) + **RLS policy** per tabel.
- Alasan ladder-nya: `@supabase/supabase-js` sudah ter-install, Supabase project sudah ada — ini "dependency yang sudah terpasang" menang lawan bikin scrypt/HMAC/session table dari nol.
- RLS berarti isolasi tenant tetap tegak walau ada bug di React, walau anon key bocor — sesuatu yang wajib untuk SPA client-only, bukan opsional.
- Konsekuensi: butuh **1–2 Netlify Function kecil** (bukan 10 seperti di Next.js) — hanya untuk aksi yang butuh `service_role` key (bikin akun user baru), karena bikin Supabase Auth user tidak bisa dilakukan dari browser dengan anon key. Login harian tetap 100% client-side via `supabase.auth.signInWithPassword`.

Kalau Anda tetap ingin persis meniru mekanisme problem-produksi-app (cookie signed sendiri), itu berarti pindah dari "SPA murni" ke "SPA + backend nyata" untuk *semua* request berisi data, bukan cuma admin action — jauh lebih banyak kode. Saya sarankan tidak, kecuali ada alasan kuat (mis. rencana lepas dari Supabase).

## 3. Model peran (3 role, nested — sama seperti skill)

| Role | Scope | Mekanisme | Bisa bikin |
|---|---|---|---|
| **Super-admin** | global | 1 kredensial di env var (naik level dari `VITE_ADMIN_PASSWORD` sekarang), login lewat Netlify Function karena perlu `service_role` | tenant (divisi) baru, akun tenant-admin |
| **Tenant-admin** | 1 divisi | akun asli di Supabase Auth, `app_metadata.role='admin'`, `app_metadata.tenant_id` | kelola Line Name/Departemen (fitur existing, tinggal di-scope), akun tenant-user |
| **Tenant-user** | 1 divisi | akun asli di Supabase Auth (opsional — lihat §4) | isi Henkaten record (Input Form) |

`app_metadata` dipakai (bukan `user_metadata`) karena hanya bisa diubah lewat `service_role`, tidak bisa diedit user sendiri dari client — itu yang dibaca RLS policy.

## 4. Trik "default tenant" — supaya Casting tidak perlu login

Sama seperti skill: satu tenant ditandai `is_default = true`. **Divisi Casting (data yang sudah ada sekarang) jadi default tenant** — traffic anonim (belum login) otomatis resolve ke tenant ini. Artinya:

- Pengguna Casting sekarang **tidak perlu login sama sekali** — persis seperti hari ini, zero disruption.
- Divisi baru (Stamping, dll) **wajib login** dari hari pertama — termasuk tenant-user-nya, karena tidak ada cara lain bagi app untuk tahu "record ini punya divisi mana" tanpa identitas.
- Navbar dapat tombol Login/Logout + indikator nama tenant aktif (langkah 7 di skill), tersembunyi/default untuk tenant Casting.

**Keputusan terbuka untuk Anda:** apakah tenant-user di divisi baru **harus** punya akun individual (by name), atau cukup 1 akun bersama per divisi (mis. `stamping@internal`, mirip semangat "siapapun bisa isi form" yang berlaku sekarang)? Ini tidak mengubah arsitektur DB, hanya berapa banyak akun yang tenant-admin bikin. Saya asumsikan **1 akun bersama per divisi baru dulu** (paling dekat dengan perilaku sekarang) kecuali Anda bilang butuh per-orang.

## 5. Skema migrasi (SQL, garis besar)

```sql
-- tenants
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index tenants_one_default on tenants ((is_default)) where is_default;
insert into tenants (name, slug, is_default) values ('Casting', 'casting', true);

-- tenant_id di 3 tabel existing, backfill ke Casting, lalu NOT NULL
alter table henkaten_records add column tenant_id uuid references tenants(id);
alter table custom_line_names add column tenant_id uuid references tenants(id);
alter table custom_departments add column tenant_id uuid references tenants(id);
update henkaten_records set tenant_id = (select id from tenants where is_default);
update custom_line_names set tenant_id = (select id from tenants where is_default);
update custom_departments set tenant_id = (select id from tenants where is_default);
alter table henkaten_records alter column tenant_id set not null;
alter table custom_line_names alter column tenant_id set not null;
alter table custom_departments alter column tenant_id set not null;

-- unique constraint lama harus ikut di-scope per tenant (Common Mistake #4 di skill)
alter table custom_line_names drop constraint custom_line_names_name_key;
alter table custom_line_names add constraint custom_line_names_tenant_name_key unique (tenant_id, name);
alter table custom_departments drop constraint custom_departments_name_key;
alter table custom_departments add constraint custom_departments_tenant_name_key unique (tenant_id, name);

-- RLS: anon (belum login) hanya boleh sentuh tenant default; user login hanya boleh sentuh tenant_id di JWT-nya
create policy "read own or default" on henkaten_records for select using (
  tenant_id = (select id from tenants where is_default)
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);
create policy "write own or default" on henkaten_records for insert with check (
  (auth.role() = 'anon' and tenant_id = (select id from tenants where is_default))
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);
-- (policy serupa untuk update/delete henkaten_records, dan untuk custom_line_names/custom_departments)
```

**Storage** (`henkaten_photos`, `henkaten_trial_docs`): prefix path upload dengan `tenant_id/...` (bukan bikin bucket baru per tenant), lalu tambah Storage RLS policy yang mencocokkan folder prefix dengan tenant aktif — pola standar multi-tenant Supabase Storage.

## 6. Urutan implementasi (tiap langkah bisa di-deploy & tes sendiri)

1. Migrasi schema + backfill + RLS (SQL di atas) — dites dulu: data Casting existing harus tetap terbaca tanpa login.
2. Modul auth tipis: `getSession()`, `getActiveTenantId()` di client (wrap `supabase.auth`), plus util role-check.
3. Halaman/komponen Login (email atau username + password via `supabase.auth.signInWithPassword`) + tombol Logout di Navbar.
4. Netlify Function `create-tenant` + `create-user` (pakai `SUPABASE_SERVICE_ROLE_KEY`, hanya server-side) — dipanggil oleh UI super-admin/tenant-admin.
5. Scope semua read/write di `useStore.ts` dengan `tenant_id` dari session (default ke tenant default kalau belum login) — 1 helper dipakai di semua tempat, bukan inline di tiap action.
6. UI tenant-admin: extend `SettingsModal` untuk bikin akun tenant-user di divisinya (gate `role==='admin'`).
7. UI super-admin: halaman baru untuk bikin tenant + akun tenant-admin pertamanya (gate role super-admin).
8. Navbar: indikator nama divisi aktif + Login/Logout.
9. Hapus `VITE_ADMIN_PASSWORD` lama setelah akun asli tenant-admin Casting dibuat.
10. Deploy → super-admin bikin tenant Stamping + akun tenant-admin-nya → tes isolasi (data Stamping tidak kelihatan dari sesi Casting dan sebaliknya).

## 7. Kesalahan umum yang harus dihindari (dari skill, relevan di sini)

- Lupa scope `tenant_id` di satu query → taruh di satu helper, jangan inline `session.tenantId` di tiap pemanggil.
- Password admin global dipakai semua tenant → setiap tenant-admin punya akun sendiri; `VITE_ADMIN_PASSWORD` dihapus begitu akun asli ada (bukan dibiarkan sebagai backdoor).
- Constraint `UNIQUE(name)` yang lupa di-scope ke tenant → sudah masuk §5.
- Filter tenant hanya di kode client (bukan RLS) → **ini yang paling penting untuk Henkaten** karena SPA client-only, ditegaskan di §2.
- Hapus tenant tanpa cek data anak / tanpa cek `is_default` → guard di UI super-admin nanti.

## 8. Keputusan (dikonfirmasi user, 2026-09-11)

1. **Auth: Supabase Auth + RLS** — disetujui, bukan cookie session custom.
2. **Tenant-user divisi baru: 1 akun bersama per divisi** — disetujui.
3. **Divisi baru:** belum ditentukan namanya sekarang — arsitektur disiapkan generik, nama divisi (Stamping, Moulding, dll) diisi lewat UI super-admin saat deploy nanti (Langkah 10).
4. Kredensial super-admin: default tetap dipegang user (pemilik `VITE_ADMIN_PASSWORD` sekarang), naik level jadi env var super-admin.

Planning ini final dan siap dieksekusi kapan pun user memberi go-ahead — belum ada kode yang diubah.
