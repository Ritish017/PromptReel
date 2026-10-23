import { readAll, unsubToken } from './_people.js';
export default async function handler(req, res) {
  const u = new URL(req.url, 'https://x');
  if (!process.env.ADMIN_KEY || u.searchParams.get('key') !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'unauthorized' });
  const [subs, users, unsub] = await Promise.all([readAll('subs'), readAll('users'), readAll('unsub')]);
  const gone = new Set(unsub.map(x => x.email));
  const base = 'https://' + (req.headers.host || 'promptreels.vercel.app');
  const list = new Map();
  for (const s of subs) list.set(s.email, { email: s.email, name: '', subscribed: true, signed_in: false, source: s.source || '', ts: s.ts });
  for (const x of users) { const o = list.get(x.email) || { email: x.email, subscribed: false, source: 'google', ts: x.ts }; o.name = x.name; o.signed_in = true; list.set(x.email, o); }
  const rows = [...list.values()].map(o => ({ ...o, unsubscribed: gone.has(o.email), unsubscribe_url: `${base}/api/unsubscribe?e=${encodeURIComponent(o.email)}&t=${unsubToken(o.email)}` })).sort((a, b) => b.ts - a.ts);
  if (u.searchParams.get('format') === 'csv') {
    res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename="promptreel-audience.csv"');
    const cols = ['email', 'name', 'subscribed', 'signed_in', 'unsubscribed', 'source', 'ts', 'unsubscribe_url'];
    return res.send([cols.join(','), ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n'));
  }
  res.status(200).json({ total: rows.length, subscribers: rows.filter(r => r.subscribed && !r.unsubscribed).length, signed_in: rows.filter(r => r.signed_in).length, rows });
}
