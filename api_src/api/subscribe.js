import { body } from './_store.js';
import { upsert } from './_people.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, source } = await body(req);
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email || '')) return res.status(400).json({ error: 'bad email' });
  await upsert('subs', email, { ts: Date.now(), source: String(source || 'site').slice(0, 40), page: String(req.headers.referer || '').slice(0, 200) });
  res.status(200).json({ ok: true });
}
