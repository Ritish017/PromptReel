import { put, head } from '@vercel/blob';
const KEY = 'state/state.json';
export async function load() {
  try { const h = await head(KEY); const r = await fetch(h.url + '?t=' + Date.now(), { cache: 'no-store' }); return await r.json(); }
  catch { return { v: {}, c: {}, subs: [] }; }
}
export async function save(s) {
  await put(KEY, JSON.stringify(s), { access: 'public', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60, contentType: 'application/json' });
}
export function summary(s) {
  const out = {};
  for (const [id, m] of Object.entries(s.v || {})) { let u = 0, d = 0; for (const x of Object.values(m)) x > 0 ? u++ : d++; out[id] = { u, d, c: 0 }; }
  for (const [id, l] of Object.entries(s.c || {})) { out[id] = out[id] || { u: 0, d: 0, c: 0 }; out[id].c = l.length; }
  return out;
}
export async function body(req) { if (req.body && typeof req.body === 'object') return req.body; let t = ''; for await (const ch of req) t += ch; try { return JSON.parse(t || '{}'); } catch { return {}; } }
