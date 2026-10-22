"""Public pages and clearly labelled, bounded sponsor placements."""
import datetime
import html
import json
from pathlib import Path
from urllib.parse import urlsplit
e = html.escape
ROOT = Path(__file__).parent
CONTACT = "kurmaritish017@gmail.com"

def support_link(value):
    """Accept public PayPal destinations only; never infer a recipient from contact email."""
    value = str(value or '').strip()
    if any(char.isspace() or ord(char) < 32 for char in value):
        return ''
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError:
        return ''
    if (parsed.scheme != 'https' or parsed.hostname not in ('paypal.me', 'www.paypal.me', 'paypal.com', 'www.paypal.com')
            or parsed.username or parsed.password or port or parsed.fragment or not parsed.path.strip('/')):
        return ''
    return value

def support():
    config = json.loads((ROOT / 'data/support.json').read_text(encoding='utf-8'))
    destination = support_link(config.get('paypal_url'))
    parsed = urlsplit(destination)
    parts = parsed.path.strip('/').split('/')
    has_profile = ((parsed.hostname in ('paypal.me', 'www.paypal.me') and len(parts) == 1)
                   or (parsed.hostname in ('paypal.com', 'www.paypal.com') and len(parts) == 2 and parts[0] == 'paypalme'))
    presets = has_profile and not parsed.query and parts[-1].isalnum() and len(parts[-1]) <= 20
    amounts = '<div class="support-amounts" aria-label="Suggested support amounts in US dollars">'
    for amount in (3, 5, 10):
        label = f'${amount}<small> USD</small>'
        amounts += (f'<a href="{e(destination.rstrip("/") + "/" + str(amount) + "USD", quote=True)}" target="_blank" rel="noopener noreferrer" data-support-paypal>{label}</a>'
                    if presets else f'<span>{label}</span>')
    amounts += '</div>'
    action = (f'<a class="btn" href="{e(destination, quote=True)}" target="_blank" rel="noopener noreferrer" data-support-paypal>Support via PayPal ↗</a><p class="hint">Choose your amount and USD currency on PayPal. Review the recipient and final total before paying.</p>'
              if destination else '<p class="support-pending" role="status">PayPal support is coming soon. No payments are being collected here yet.</p>')
    return '''<main class="wrap support-page"><section class="phero"><span class="eyebrow">INDEPENDENTLY CURATED · FREE TO EXPLORE</span><h1>Like the work?<br><span>Help keep it going.</span></h1><p>I’m Ritish Kurma. I curate PromptReels to help you find creative prompts, useful skills, and projects worth building with.</p></section><section class="panel support-card"><span class="support-heart" aria-hidden="true">♡</span><h2>Support the next useful find.</h2><p>If this collection helped you, optional support helps me spend more time finding, reviewing, and organising the work.</p>''' + amounts + action + '''<p class="hint">Suggested amounts in US dollars. Support is optional; the gallery stays free. This does not buy a sponsored placement or newsletter subscription.</p><p class="hint">PayPal availability depends on your country and the receiving account. Indian PayPal accounts cannot receive domestic payments.</p></section><section class="panel"><h2>Sharing helps, too.</h2><p>Send a useful find to a friend, credit the original creator, or tell me what you want to build next.</p><a class="btn ghost" href="https://x.com/KurmaRitish" target="_blank" rel="noopener noreferrer">Follow Ritish Kurma on X ↗</a></section></main>'''

def signup_form(source="newsletter"):
    return f'''<section class="newsletter-teaser signup-form" data-source="{e(source)}"><span class="eyebrow">FREE NEWSLETTER · COMING SOON</span><p>Useful repos, creative prompts, and one small idea to build. Explore the sample and tell us what you would find useful.</p><div class="row"><a class="btn ghost" href="/newsletter/sample/">Read the sample ↗</a><a href="mailto:{CONTACT}?subject=PromptReel%20Weekly%20feedback" data-newsletter-interest="{e(source)}">Like the idea? Tell Ritish ↗</a></div><small>Sample only. No emails are being sent.</small></section>'''


def sponsors():
    rows = json.loads((ROOT / "data/sponsors.json").read_text(encoding="utf-8"))
    if len(rows) > 5:
        raise ValueError("Only five sponsor products may be configured")
    today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    rows = [x for x in rows if x["starts"] <= today <= x["ends"]]
    if sum(x.get("tier") == "featured" for x in rows) > 1:
        raise ValueError("Only one featured sponsor is allowed")
    for x in rows:
        if not x["url"].startswith("https://") or not all(k in x for k in ("id","name","description")):
            raise ValueError("Sponsor requires an HTTPS destination and attribution")
        if not x["id"].replace("-","").isalnum():
            raise ValueError("Invalid campaign id")
    return rows

def products_zone():
    rows = sponsors()
    if not rows:
        return '<section class="product-zone panel"><small>FOR PRODUCT BUILDERS</small><h2>Your next users are building here.</h2><p>Show your tool with a useful, clearly labelled product card. Up to five active products.</p><a class="btn ghost" href="/sponsor/">Promote your product</a></section>'
    cards = "".join(f'''<a class="product-card" href="{e(x["url"])}" target="_blank" rel="sponsored noopener" data-campaign="{e(x["id"])}" data-slot="product-grid"><small>SPONSORED</small><h3>{e(x["name"])}</h3><p>{e(x["description"])}</p><span>Explore product ↗</span></a>''' for x in rows)
    return f'<section class="product-zone"><h2>Products for your next build</h2><p>Paid placements. Editorial picks remain independent.</p><div class="product-grid">{cards}</div></section>'

def hero_sponsor():
    row = next((x for x in sponsors() if x.get("tier") == "featured"), None)
    if row:
        return f'''<aside class="spot panel"><small>SPONSORED</small><a href="{e(row["url"])}" rel="sponsored noopener" target="_blank" data-campaign="{e(row["id"])}" data-slot="homepage-feature"><h2>{e(row["name"])}</h2><p>{e(row["description"])}</p><span class="btn">Explore product ↗</span></a></aside>'''
    return '<aside class="spot launch-note"><span class="pill">BUILD SOMETHING USEFUL</span><h2>Less scrolling.<br>More shipping.</h2><p>Discover a prompt, inspect the source, and turn an idea into your next project.</p><a class="btn ghost" href="/newsletter/">Preview the upcoming field notes</a></aside>'

def newsletter():
    return '''<main class="wrap newsletter-page"><section class="newsletter-hero"><div><span class="eyebrow">PROMPTREEL WEEKLY · COMING SOON</span><h1>A useful find.<br><span>Your next small build.</span></h1><p>We are shaping a free weekly email about useful GitHub projects, creative skills, and the people making things with them.</p><div class="row"><a class="btn" href="/newsletter/sample/">Explore the sample edition ↗</a><a class="btn ghost" href="mailto:kurmaritish017@gmail.com?subject=PromptReel%20Weekly%20feedback" data-newsletter-interest="newsletter">Like this idea? Share your thoughts</a></div><p class="hint">Coming soon. This is a sample, not a sent issue. Tell us what would make it worth opening.</p><p class="hint">Save your favourite finds in <a href="/library/">your browser library</a>. No account needed. Newsletter delivery will launch separately.</p></div><aside class="issue-cover"><span>A PREVIEW OF WHAT WE ARE BUILDING</span><h2>A problem.<br>A useful tool.<br>A reason to build.</h2><ol><li>Three repositories gaining attention</li><li>Creative examples and their original sources</li><li>One small project you can finish</li></ol><a href="/newsletter/sample/">Read the sample ↗</a></aside></section><section class="newsletter-benefits"><article><span>01 / DISCOVER</span><h2>Repos with context</h2><p>Descriptions, reported weekly star gains, and links to the original documentation.</p></article><article><span>02 / LEARN</span><h2>See the work behind the work</h2><p>Videos, source links, skills, and prompts. Shared examples and suggested experiments are labelled clearly.</p></article><article><span>03 / MAKE</span><h2>Leave with a small next step</h2><p>One practical build idea you can try. What would you like us to cover first?</p></article></section><section class="panel"><h2>Help shape the first edition</h2><p>Would this be useful to you? Tell Ritish which tools, creative workflows, or problems deserve a closer look.</p><a class="btn ghost" href="mailto:kurmaritish017@gmail.com?subject=PromptReel%20Weekly%20feedback" data-newsletter-interest="feedback">Send feedback by email</a><p>Written and curated by Ritish Kurma · Rynavo · <a href="https://x.com/KurmaRitish" rel="noopener" target="_blank">Follow on X ↗</a></p></section></main>'''


def signin():
    return '''<main class="wrap auth-page"><section class="phero"><span class="eyebrow">EXPLORE WITHOUT AN ACCOUNT</span><h1>No account needed.</h1><p>Login and signup are paused. Browse the library, copy prompts and sections, and save favourites in this browser.</p><div class="row"><a class="btn" href="/">Explore the gallery</a><a class="btn ghost" href="/library/">Your saved finds</a></div></section></main>'''


def pricing():
    return '''<main class="wrap"><section class="phero"><span class="eyebrow">CLEAR PRICES IN USD. USEFUL PLACEMENTS.</span><h1>Free for makers.<br><span>A launchpad for products.</span></h1><p>The gallery and sections are free. Our free newsletter is coming soon. Sponsors fund the work with clearly labelled placements.</p></section><div class="prices"><article class="panel"><h2>For readers</h2><div class="price">$0<small> / free newsletter</small></div><p>Browse the library. Copy prompts. Discover skills and repositories. Preview the upcoming free weekly newsletter and help shape the first edition.</p><a href="/newsletter/" class="btn">Preview the upcoming newsletter</a><small>No trial countdown. No payment details.</small></article><article class="panel hi"><span class="eyebrow">LAUNCH RATE</span><h2>Product card</h2><div class="price">$6<small> USD / 7 days</small></div><ul><li>Your name, useful pitch, and destination link</li><li>Products block on Gallery, Repos, Prompts, and Products pages</li><li>Up to five active products across the site</li><li>Campaign impressions, clicks, and CTR report</li></ul><a class="btn" href="mailto:kurmaritish017@gmail.com?subject=PromptReel%20product%20card">Email to book</a></article><article class="panel"><h2>Featured launch</h2><div class="price">$12<small> USD / 7 days</small></div><ul><li>Everything in the product card</li><li>Dedicated homepage hero placement</li><li>One featured launch at a time</li><li>Creative and dates agreed before booking</li></ul><a class="btn ghost" href="mailto:kurmaritish017@gmail.com?subject=PromptReel%20featured%20launch">Plan a launch by email</a></article></div><section class="panel"><h2>What you are buying</h2><p>Placement for the agreed dates. No guaranteed traffic, leads, sales, or search ranking. Ask for the current dated audience report before booking. Newsletter placement is quoted separately only when email delivery is operating.</p><p>Launch rates are introductory. Your quote fixes the price for your booking. No automatic renewal. Payment method, applicable taxes, cancellation, and creative requirements are confirmed by email before payment.</p></section><section class="panel"><h2>Reporting you can understand</h2><p>Site reach, actual campaign visibility, outbound clicks, click-through rate, and relevant reader engagement. Aggregate numbers only. Newsletter signups and test visits are not paid customer conversions.</p></section></main>'''

def sponsor():
    return '''<main class="wrap"><section class="phero"><span class="eyebrow">PROMOTE SOMETHING WORTH BUILDING WITH</span><h1>Your product.<br><span>In the right creative context.</span></h1><p>Reach people exploring AI motion, creative coding, agent skills, and useful GitHub projects.</p><div class="row"><a class="btn" href="mailto:kurmaritish017@gmail.com?subject=Promote%20my%20product%20on%20PromptReel">Contact Ritish about promotion</a><a class="btn ghost" href="/pricing/">Launch placements from $6 USD</a></div></section><div class="newsletter-benefits"><article><h2>Show what it solves</h2><p>Send your product link, audience, one useful example, and preferred dates. Clear use cases work better than empty slogans.</p></article><article><h2>Five products, maximum</h2><p>At most five active product cards and one featured hero. Paid products are labelled Sponsored and kept separate from editorial picks.</p></article><article><h2>Real campaign evidence</h2><p>Request a dated audience report. After the placement, get measured impressions, clicks, and CTR. No invented reach or guaranteed sales.</p></article></div><section class="panel"><h2>What we need from you</h2><p>Product name and HTTPS URL, a short factual pitch, optional approved artwork, campaign dates, and confirmation you can supply these assets. We review every placement before publication.</p><p>Contact: <a href="mailto:kurmaritish017@gmail.com">kurmaritish017@gmail.com</a> · Ritish Kurma, Rynavo.</p></section>''' + products_zone() + '</main>'

def privacy():
    return '''<main class="wrap" style="max-width:800px"><section class="phero"><h1>Privacy</h1><p>Updated 22 October 2026.</p></section><div class="panel"><p>PromptReel is run by Ritish Kurma (Rynavo). Contact kurmaritish017@gmail.com.</p><p><b>Account.</b> Public login and signup are currently paused. Previously created account information remains protected by Supabase. Private audience records use database access policies. Google sign-in, when enabled, provides your basic profile. Signing in does not automatically subscribe you.</p><p><b>Newsletter.</b> We record explicit consent, its date, and signup source after email confirmation. Newsletter is free. You can unsubscribe from your account or each email. A sending provider is required before newsletters can be delivered; we disclose it when configured.</p><p><b>Library and community.</b> Saves and recently copied items stay in your browser and are removed if you clear its data. Public voting and commenting are paused. Previously stored account records remain protected.</p><p><b>Analytics.</b> Google Analytics measures page visits and successful actions where available. Sponsor reports contain aggregates, never your email or account details. We do not sell subscriber lists. Use the analytics preference below to opt out on this browser.</p><button id="analytics-optout" class="btn ghost">Turn analytics off on this browser</button><p><b>Media.</b> Linked or embedded creator media can contact X, GitHub, or other credited services. Their policies apply. Vercel hosts the site and may retain operational logs.</p><p><b>Rights and deletion.</b> Email us to request access, correction, deletion, or removal of creator content. We verify ownership before taking action.</p></div></main>'''
