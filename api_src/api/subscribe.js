import { put } from '@vercel/blob';
import { body } from './_store.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email } = await body(req);
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email || '')) return res.status(400).json({ error: 'bad email' });
  await put('subs/' + Date.now() + '.json', JSON.stringify({ email: email.toLowerCase(), ts: Date.now() }), { access: 'public', addRandomSuffix: true, contentType: 'application/json' });
  res.status(200).json({ ok: true });
}
