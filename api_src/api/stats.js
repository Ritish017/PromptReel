import { load, summary } from './_store.js';
export default async function handler(req, res) {
  const s = await load(); res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
  res.status(200).json(summary(s));
}
