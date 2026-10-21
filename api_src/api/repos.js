const UA = { 'User-Agent': 'PromptReel (promptreels.vercel.app)', 'Accept': 'application/vnd.github+json' };
const num = s => parseInt(String(s || '0').replace(/,/g, ''), 10) || 0;
const dec = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
export async function trending(since, lang) {
  const r = await fetch(`https://github.com/trending${lang ? '/' + encodeURIComponent(lang) : ''}?since=${since}`, { headers: { 'User-Agent': 'PromptReel' }, signal:AbortSignal.timeout(10000) });
  if(!r.ok)throw Error('GitHub Trending unavailable');
  const h = await r.text();
  return h.split(/<article class="Box-row/).slice(1).map(a => {
    const name = (a.match(/<h2[^>]*>[\s\S]*?href="\/([^"]+)"/) || [])[1] || '';
    const counts = [...a.matchAll(/href="\/[^"]+\/(stargazers|forks)"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/g)];
    const gain = a.match(/([\d,]+) stars? (today|this week|this month)/);
    return { name, desc: dec((a.match(/<p class="[^"]*">([\s\S]*?)<\/p>/) || [])[1]), lang: (a.match(/itemprop="programmingLanguage">([^<]+)/) || [])[1] || '',
      stars: num((counts.find(c => c[1] === 'stargazers') || [])[2]), forks: num((counts.find(c => c[1] === 'forks') || [])[2]), gain: gain ? num(gain[1]) : 0 };
  }).filter(x => x.name);
}
export async function search(q, n = 100) {
  const r = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${n}`, { headers: UA, signal:AbortSignal.timeout(10000) });
  if(!r.ok)throw Error('GitHub API unavailable');
  const j = await r.json();
  return (j.items || []).map(x => ({ name: x.full_name, desc: x.description || '', lang: x.language || '', stars: x.stargazers_count, forks: x.forks_count, created: x.created_at, pushed: x.pushed_at, topics: (x.topics || []).slice(0, 5) }));
}
const TOPICS = { agents: 'topic:ai-agents', claude: 'claude in:name,description,topics', mcp: 'topic:mcp', llm: 'topic:llm', video: 'topic:video-generation', motion: 'remotion OR motion-graphics in:name,description,topics', devtools: 'topic:developer-tools' };
export default async function handler(req, res) {
  const { view = 'daily', lang = '', topic = '' } = req.query;
  if(req.method&&req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  if(!['daily','weekly','monthly','top','all','rising'].includes(view)||typeof lang!=='string'||lang.length>40)return res.status(400).json({error:'Invalid filters'});
  try {
    let items;
    if (['daily', 'weekly', 'monthly'].includes(view)) items = (await trending(view, lang)).sort((a, b) => b.gain - a.gain);
    else if (view === 'rising') { const d = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10); items = await search(`created:>${d}${topic && TOPICS[topic] ? ' ' + TOPICS[topic] : ''}${lang ? ' language:' + lang : ''}`, 50); }
    else items = await search(`${topic && TOPICS[topic] ? TOPICS[topic] : 'stars:>0'}${lang ? ' language:' + lang : ''}`, 100);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ view, updated: new Date().toISOString(), items });
  } catch (e) { res.status(502).json({ error: 'source unavailable', items: [] }); }
}
