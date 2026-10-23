import { put, list } from '@vercel/blob';
import crypto from 'node:crypto';
const SALT = () => process.env.ADMIN_KEY || 'pr';
export const hid = e => crypto.createHash('sha256').update(String(e).toLowerCase() + SALT()).digest('hex').slice(0, 32);
export const unsubToken = e => crypto.createHmac('sha256', SALT()).update(String(e).toLowerCase()).digest('hex').slice(0, 20);
export async function upsert(prefix, email, data) {
  await put(`${prefix}/${hid(email)}.json`, JSON.stringify({ ...data, email: String(email).toLowerCase() }), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
}
export async function readAll(prefix) {
  const out = []; let cursor;
  do { const r = await list({ prefix: prefix + '/', cursor, limit: 1000 }); cursor = r.cursor;
    const got = await Promise.all(r.blobs.map(b => fetch(b.url + '?t=' + Date.now()).then(x => x.json()).catch(() => null)));
    out.push(...got.filter(Boolean)); } while (cursor);
  return out;
}
