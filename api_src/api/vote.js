import { load, save, summary, body } from './_store.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { id, voter, value } = await body(req);
  if (!/^[\w:-]{1,80}$/.test(id || '') || !/^[\w@.+-]{6,120}$/.test(voter || '') || ![1, -1, 0].includes(value)) return res.status(400).json({ error: 'bad input' });
  const s = await load(); s.v = s.v || {}; s.v[id] = s.v[id] || {};
  if (value === 0) delete s.v[id][voter]; else s.v[id][voter] = value;
  await save(s); res.status(200).json(summary(s)[id] || { u: 0, d: 0, c: 0 });
}
