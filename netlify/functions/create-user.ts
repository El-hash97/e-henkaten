import { createClient } from '@supabase/supabase-js';

type Role = 'admin' | 'user';

interface RequestBody {
  email?: string;
  password?: string;
  superAdminPassword?: string;
  accessToken?: string;
  tenantId?: string;
  role?: Role;
}

/**
 * Bikin akun Supabase Auth (tenant-admin atau tenant-user). Dua cara caller
 * bisa berwenang:
 *  - superAdminPassword cocok -> boleh bikin akun apapun (admin/user) di
 *    tenant manapun. Dipakai super-admin untuk bikin tenant-admin pertama
 *    sebuah divisi baru.
 *  - accessToken (JWT dari sesi Supabase Auth yang sedang login) milik user
 *    dengan app_metadata.role === 'admin' -> hanya boleh bikin tenant-user
 *    (role dipaksa 'user') di tenant-nya sendiri (tenantId dipaksa dari
 *    token, bukan dari body - supaya admin nakal tidak bisa bikin akun di
 *    tenant lain).
 */
export const handler = async (event: { httpMethod: string; body: string | null }) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: RequestBody;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body bukan JSON valid.' }) };
  }

  const { email, password, superAdminPassword, accessToken, tenantId: requestedTenantId, role: requestedRole } = body;

  if (!email?.trim() || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email dan password wajib diisi.' }) };
  }

  const admin = createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

  let tenantId: string;
  let role: Role;

  if (superAdminPassword) {
    if (!process.env.SUPER_ADMIN_PASSWORD || superAdminPassword !== process.env.SUPER_ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Password super-admin salah.' }) };
    }
    if (!requestedTenantId || (requestedRole !== 'admin' && requestedRole !== 'user')) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tenantId dan role wajib diisi untuk super-admin.' }) };
    }
    tenantId = requestedTenantId;
    role = requestedRole;
  } else if (accessToken) {
    const { data: callerData, error: callerError } = await admin.auth.getUser(accessToken);
    const caller = callerData?.user;
    const callerRole = caller?.app_metadata?.role;
    const callerTenantId = caller?.app_metadata?.tenant_id;
    if (callerError || !caller || callerRole !== 'admin' || !callerTenantId) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Hanya tenant-admin yang boleh membuat akun.' }) };
    }
    tenantId = callerTenantId as string;
    role = 'user';
  } else {
    return { statusCode: 401, body: JSON.stringify({ error: 'Tidak terautentikasi.' }) };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    app_metadata: { tenant_id: tenantId, role },
  });

  if (error) {
    return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ userId: data.user?.id, tenantId, role }) };
};
