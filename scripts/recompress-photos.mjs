// One-time maintenance: re-compress photos already in the henkaten_photos bucket.
// New uploads are compressed client-side (src/lib/compressImage.ts); this fixes the backlog.
//
// Usage (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key from Supabase dashboard>"
//   node --env-file=.env.local scripts/recompress-photos.mjs --dry-run   # preview
//   node --env-file=.env.local scripts/recompress-photos.mjs             # apply
//
// The service_role key is required: it bypasses RLS so the script can read every
// row and overwrite storage objects. Never commit it, never ship it to the browser.

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const BUCKET = 'henkaten_photos';
const MAX_DIMENSION = 1600;
const QUALITY = 72;
const SKIP_BELOW_BYTES = 400 * 1024; // already small enough, leave it

const DRY_RUN = process.argv.includes('--dry-run');

// --- pure helper (self-tested below) -----------------------------------------
/** Extract the in-bucket object path from a Supabase public URL, or null. */
export function objectPathFromUrl(url) {
  if (typeof url !== 'string') return null;
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const path = url.slice(i + marker.length).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}

if (process.argv.includes('--self-test')) {
  const assert = (await import('node:assert')).strict;
  const base = 'https://x.supabase.co/storage/v1/object/public/henkaten_photos/';
  assert.equal(objectPathFromUrl(base + '123-abc.jpg'), '123-abc.jpg');
  assert.equal(objectPathFromUrl(base + 'a%20b.png?token=1'), 'a b.png');
  assert.equal(objectPathFromUrl('https://other.com/x.jpg'), null);
  assert.equal(objectPathFromUrl(null), null);
  console.log('self-test ok');
  process.exit(0);
}

// --- main -------------------------------------------------------------------
const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL (from .env.local) or SUPABASE_SERVICE_ROLE_KEY (from env).');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: rows, error } = await supabase
  .from('henkaten_records')
  .select('id, photo')
  .not('photo', 'is', null);
if (error) throw error;

console.log(`${rows.length} record(s) with a photo. ${DRY_RUN ? '(dry run)' : ''}`);

let compressed = 0, skipped = 0, failed = 0, bytesBefore = 0, bytesAfter = 0;

for (const row of rows) {
  const path = objectPathFromUrl(row.photo);
  if (!path) {
    console.log(`- skip ${row.id}: photo URL not in ${BUCKET} (${row.photo})`);
    skipped++;
    continue;
  }

  try {
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path);
    if (dlErr) throw dlErr;
    const input = Buffer.from(await blob.arrayBuffer());

    if (input.length < SKIP_BELOW_BYTES) {
      skipped++;
      continue;
    }

    const output = await sharp(input, { failOn: 'none' }) // tolerate slightly-truncated JPEGs
      .rotate() // bake in EXIF orientation before metadata is dropped
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY })
      .toBuffer();

    if (output.length >= input.length) {
      skipped++;
      continue;
    }

    bytesBefore += input.length;
    bytesAfter += output.length;
    const pct = Math.round((1 - output.length / input.length) * 100);
    console.log(`- ${path}: ${(input.length / 1024 / 1024).toFixed(2)}MB -> ${(output.length / 1024).toFixed(0)}KB (-${pct}%)`);

    if (!DRY_RUN) {
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, output, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
    }
    compressed++;
  } catch (err) {
    console.error(`- FAIL ${path}: ${err.message}`);
    failed++;
  }
}

console.log(
  `\nDone. compressed=${compressed} skipped=${skipped} failed=${failed}\n` +
  `Saved ${((bytesBefore - bytesAfter) / 1024 / 1024).toFixed(1)}MB ` +
  `(${(bytesBefore / 1024 / 1024).toFixed(1)}MB -> ${(bytesAfter / 1024 / 1024).toFixed(1)}MB)` +
  (DRY_RUN ? ' — dry run, nothing written.' : '')
);
