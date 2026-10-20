import { upsert, unsubToken } from './_people.js';
export default async function handler(req, res) {
  const u = new URL(req.url, 'https://x');
  const e = (u.searchParams.get('e') || '').toLowerCase(), t = u.searchParams.get('t') || '';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!e || t !== unsubToken(e)) return res.status(400).send('<p style="font:16px system-ui;padding:40px">This unsubscribe link is not valid. Email kurmaritish017@gmail.com and we will remove you.</p>');
  await upsert('unsub', e, { ts: Date.now() });
  res.status(200).send('<p style="font:16px system-ui;padding:40px">You are unsubscribed from PromptReel Weekly. Sorry to see you go. <a href="/">Back to PromptReel</a></p>');
}
