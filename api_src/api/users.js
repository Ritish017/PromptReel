import { body } from './_store.js';
import { upsert } from './_people.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { credential } = await body(req);
  if (!credential) return res.status(400).json({ error: 'no credential' });
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
  if (!r.ok) return res.status(401).json({ error: 'bad token' });
  const p = await r.json();
  if (!p.email || p.email_verified === 'false') return res.status(401).json({ error: 'unverified' });
  await upsert('users', p.email, { name: p.name || '', picture: p.picture || '', ts: Date.now(), via: 'google' });
  res.status(200).json({ ok: true });
}
