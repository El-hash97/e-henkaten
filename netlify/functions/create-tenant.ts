import { createClient } from '@supabase/supabase-js';

/**
 * Bikin tenant (divisi) baru. Hanya untuk super-admin - diverifikasi lewat
 * SUPER_ADMIN_PASSWORD (env var server-side, tidak pernah dikirim ke bundle
 * client seperti VITE_ADMIN_PASSWORD lama). Pakai service_role key supaya
 * bisa insert ke tabel `tenants` (RLS di tabel itu cuma punya policy SELECT,
 * jadi anon/authenticated tidak bisa insert - service_role selalu bypass RLS).
 */
export const handler = async (event: { httpMethod: string; body: string | null }) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: { name?: string; slug?: string; superAdminPassword?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body bukan JSON valid.' }) };
  }

  const { name, slug, superAdminPassword } = body;

  if (!process.env.SUPER_ADMIN_PASSWORD) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SUPER_ADMIN_PASSWORD belum dikonfigurasi di server.' }) };
  }
  if (superAdminPassword !== process.env.SUPER_ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Password super-admin salah.' }) };
  }
  if (!name?.trim() || !slug?.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Nama dan slug tenant wajib diisi.' }) };
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

  const { data, error } = await supabase
    .from('tenants')
    .insert([{ name: name.trim(), slug: slug.trim().toLowerCase() }])
    .select('id, name, slug')
    .single();

  if (error) {
    return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ tenant: data }) };
};
