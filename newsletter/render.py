"""Portable table-based email with linked video posters and explicit source labels."""
import datetime
import html
import json
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
e = html.escape

def url(value):
    return value if isinstance(value, str) and urlsplit(value).scheme == 'https' and urlsplit(value).netloc else '#'

def render(issue, domain, unsubscribe_url=None, sample=False):
    intro = 'SAMPLE EDITION · NOT SENT' if sample else e(issue['period'])
    repo_cards = []
    for item in issue.get('repos', [])[:3]:
        delta = '+' + format(item['gain'], ',') + ' stars this week' if isinstance(item.get('gain'), int) else 'Weekly growth unavailable'
        repo_cards.append(f'''<tr><td style="padding:24px 28px;border-top:1px solid #e4e6ec"><p style="font-size:11px;letter-spacing:2px;color:#52657b">REPOSITORY / {e(item.get('lang') or 'MULTI-LANGUAGE')}</p><h2 style="font-size:23px;margin:6px 0"><a style="color:#0b2340;text-decoration:none" href="{e(url('https://github.com/'+item['name']))}">{e(item['name'])} ↗</a></h2><p style="color:#12614a;font-weight:bold">{delta} · {item.get('stars',0):,} total</p><p>{e(item.get('desc') or 'Read the project documentation for its purpose and setup.')}</p><p><b>Try this — a suggested experiment:</b> {e(item.get('build_idea') or 'Read the quickstart, run the smallest supported example, and adapt one useful part to your project.')}</p><a href="{e(url('https://github.com/'+item['name']+'#readme'))}" style="color:#075dc5">Setup, examples, and community demos ↗</a></td></tr>''')
    example_cards = []
    for item in issue.get('examples', [])[:3]:
        page = domain + '/p/' + item['id'] + '/'
        poster = f'<a href="{e(page)}"><img src="{e(url(item.get("image_url")))}" width="544" alt="Watch {e(item["title"])}" style="width:100%;max-width:544px;height:auto;display:block;border-radius:12px"></a>' if url(item.get('image_url')) != '#' else ''
        prompt = item.get('prompt_text') or item.get('skill') or 'Open the original source for instructions.'
        example_cards.append(f'''<tr><td style="padding:24px 28px;border-top:1px solid #e4e6ec"><p style="font-size:11px;letter-spacing:2px;color:#52657b">CREATIVE FIELD NOTE / {e(item.get('date_label','SOURCE EXAMPLE'))}</p><h2 style="font-size:23px">{e(item['title'])}</h2>{poster}<p>By @{e(item['handle'])} · {e(item.get('model') or 'Tool not confirmed')}</p><p><b>Source status:</b> {e(item.get('verification_label','Shared instructions; independently verify against the original source.'))}</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f4f8;padding:16px;border-radius:10px;font-size:13px;line-height:1.6">{e(prompt[:1100])}{'…' if len(prompt)>1100 else ''}</pre><a href="{e(page)}" style="color:#075dc5">Watch and copy the full instructions ↗</a> · <a href="{e(url(item.get('post_url') or item.get('repo')))}" style="color:#075dc5">Original source ↗</a></td></tr>''')
    repo_block = ''.join(repo_cards) or '<tr><td style="padding:24px 28px">Repository source was unavailable. No weekly gain was invented. Visit <a href="'+domain+'/repos/">Repos</a> for current data.</td></tr>'
    sponsors = []
    for row in issue.get('sponsors', [])[:5]:
        sponsors.append(f'<p><b>Sponsored · {e(row["name"])}</b><br>{e(row["description"])}<br><a href="{e(url(row["url"]))}">Explore product ↗</a></p>')
    sponsor_block = '<tr><td style="padding:24px 28px;background:#f2f5fa"><h2>Products for builders</h2>'+''.join(sponsors)+'</td></tr>' if sponsors else ''
    unsubscribe = f'<a href="{e(unsubscribe_url)}">Unsubscribe</a>' if unsubscribe_url else '<a href="'+domain+'/newsletter/">Manage newsletter settings</a>'
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(issue['subject'])}</title></head><body style="margin:0;background:#edf1f6;color:#142b43;font-family:Arial,Helvetica,sans-serif;line-height:1.65"><div style="display:none;max-height:0;overflow:hidden">{e(issue.get('preheader','Useful repositories, creative examples, and a small idea to build.'))}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:white;border-radius:18px;overflow:hidden"><tr><td style="padding:36px 28px;background:#0b2340;color:white"><p style="margin:0;letter-spacing:3px;font-size:12px;color:#8ddace">PROMPTREEL / FIELD NOTES</p><p style="font-size:11px;color:#bccbdd">{intro}</p><h1 style="font-size:36px;line-height:1.15;letter-spacing:-1px;margin:24px 0">{e(issue['subject'])}</h1><p style="color:#d8e3ef">{e(issue.get('intro','Find a useful tool. Understand the creative work. Make one small thing.'))}</p></td></tr><tr><td style="padding:28px 28px 8px"><p>Hi builder,</p><p>{e(issue.get('editor_note','This week, focus on the problem you can solve with a tool, not the size of the bookmark list. Source links and practical next steps are included.'))}</p><p style="font-size:12px;color:#52657b">Repo ranking: {e(issue.get('ranking_label','GitHub Trending weekly subset; not all GitHub repositories.'))}</p></td></tr>{repo_block}{''.join(example_cards)}<tr><td style="padding:28px;background:#e9f4f1"><p style="font-size:11px;letter-spacing:2px">THE 30-MINUTE BUILD BRIEF</p><h2>{e(issue.get('brief_title','Ship the smallest useful demo'))}</h2><p>{e(issue.get('brief','Pick one repo, run its quickstart, and turn one feature into a useful demo. Record the source, setup, and what did not work. Share your result with the creator credited.'))}</p><a href="{domain}/submit/" style="color:#075dc5">Share what you built ↗</a></td></tr>{sponsor_block}<tr><td style="padding:28px"><p>Curated by <b>Ritish Kurma</b><br>Rynavo · PromptReel</p><p><a href="https://x.com/KurmaRitish">@KurmaRitish on X</a> · <a href="mailto:kurmaritish017@gmail.com">Email Ritish</a> · <a href="{domain}/">Explore the gallery</a></p><p style="color:#52657b;font-size:12px">You receive this only after confirmed sign-in and newsletter opt-in. Free newsletter. No payment details. {unsubscribe} · <a href="{domain}/privacy/">Privacy</a></p><p style="color:#52657b;font-size:12px">Creator media belongs to the credited creators. Video posters open a watch page; email clients do not reliably play embedded video. Suggested build ideas are proposals, not claims that a creator used a particular repository.</p></td></tr></table></td></tr></table></body></html>'''

def compose(entries, repos, now=None):
    now = now or datetime.datetime.now(datetime.timezone.utc)
    cutoff = (now-datetime.timedelta(days=7)).date().isoformat()
    recent = sorted(entries, key=lambda x:x.get('added',''), reverse=True)
    chosen = [dict(x) for x in recent if x.get('image_url') and (x.get('prompt_text') or x.get('skill'))][:3]
    for item in chosen:
        date = item.get('added') or item.get('posted_date') or 'Date unconfirmed'
        item['date_label'] = ('THIS WEEK' if str(date)>=cutoff and str(date)<=now.date().isoformat() else 'FROM THE ARCHIVE')+' · '+str(date)
        item['verification_label'] = 'Creator-verified source' if item.get('verification_status')=='verified' else 'Shared instructions; check original source. Not independently reproduced.'
    return {'id':now.strftime('%Y-%m-%d')+'-field-notes','subject':'Useful tools. Creative proof. Your next small build.','period':(now-datetime.timedelta(days=7)).strftime('%d %b')+' – '+now.strftime('%d %b %Y'),'repos':repos[:3],'examples':chosen,'ranking_label':'GitHub Trending weekly subset, sorted by reported stars gained; retrieved '+now.date().isoformat()+'.','sponsors':[]}

def build_sample(entries, domain):
    cache = ROOT/'data/newsletter/repo_week.json'
    snapshot = json.loads(cache.read_text(encoding='utf-8')) if cache.exists() else {}
    issue=compose(entries,snapshot.get('items',[]))
    if snapshot.get('retrieved_at'):
        issue['ranking_label']='GitHub Trending weekly subset; source snapshot '+snapshot['retrieved_at']+'. Preview data is not a live ranking.'
    return render(issue,domain,sample=True)
