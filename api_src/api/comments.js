import { load, save, body } from './_store.js';
const clean = t => String(t || '').replace(/[<>]/g, '').trim();
export default async function handler(req, res) {
  const s = await load(); s.c = s.c || {};
  if (req.method === 'GET') { res.setHeader('Cache-Control', 'no-store'); return res.status(200).json(s.c[req.query.id] || []); }
  if (req.method !== 'POST') return res.status(405).end();
  const { id, name, text, credential } = await body(req);
  if (!/^[\w:-]{1,80}$/.test(id || '')) return res.status(400).json({ error: 'bad id' });
  let who = clean(name).slice(0, 40) || 'Guest', pic = '';
  if (credential) { try { const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + credential); const j = await r.json(); if (j.aud === '887518336592-u62gnnq2a80hprnp7s8mnnp8i5o7cpai.apps.googleusercontent.com') { who = j.name || who; pic = j.picture || ''; } } catch {} }
  const t = clean(text).slice(0, 600); if (t.length < 2) return res.status(400).json({ error: 'empty' });
  s.c[id] = s.c[id] || []; s.c[id].push({ n: who, p: pic, t, ts: Date.now() }); s.c[id] = s.c[id].slice(-200);
  await save(s); res.status(200).json(s.c[id]);
}
