"""Check generated markup and hostile-input regressions, without live writes."""
import datetime
import importlib.util
import json
import re
import sys
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import build
from newsletter.render import compose,render

class GridParser(HTMLParser):
    def __init__(self):super().__init__();self.divs=[];self.inside=0
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='div':
            if attrs.get('id')=='sgrid':self.divs.append(True)
            else:self.divs.append(False)
            if attrs.get('data-sec') and any(self.divs):self.inside+=1
    def handle_endtag(self,tag):
        if tag=='div' and self.divs:self.divs.pop()

class SiteChecks(unittest.TestCase):
    def test_all_sections_stay_inside_grid(self):
        parser=GridParser();parser.feed((ROOT/'public/sections/index.html').read_text(encoding='utf-8'))
        self.assertEqual(parser.inside,16)
    def test_embedded_json_is_inert(self):
        value={'prompt':'</script><script>alert(1)</script>'}
        encoded=build.json_for_html(value)
        self.assertNotIn('<',encoded);self.assertEqual(json.loads(encoded),value)
    def test_dates_are_real_iso_dates(self):
        self.assertEqual(build.posted_iso('9:28 PM · Oct 18, 2026'),'2026-10-18')
        self.assertIsNone(build.posted_iso('unknown'))
    def test_generated_internal_links_and_jsonld(self):
        for page in (ROOT/'public').rglob('*.html'):
            text=page.read_text(encoding='utf-8')
            for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>',text,re.S):
                item=json.loads(raw)
                if item.get('@type')=='VideoObject':datetime.date.fromisoformat(item['uploadDate'])
            for link in re.findall(r'(?:href|src)="(/[^"<>]*)"',text):
                loc=unquote(urlsplit(link).path)
                if loc.startswith('/api/'):continue
                target=ROOT/'public'/loc.lstrip('/')
                self.assertTrue(target.exists(),str(page)+': '+loc)
    def test_newsletter_consent_is_not_prechecked(self):
        for file in ['signin/index.html','newsletter/index.html','index.html']:
            text=(ROOT/'public'/file).read_text(encoding='utf-8')
            boxes=re.findall(r'<input[^>]+type="checkbox"[^>]*>',text)
            self.assertTrue(boxes)
            self.assertTrue(all('checked' not in box for box in boxes))
            self.assertNotIn('₹99',text)
    def test_email_does_not_execute_prompts_or_fake_video(self):
        issue=compose([{'id':'fixture','title':'Example','handle':'fixture','prompt_text':'<script>bad</script>','added':'2020-01-01','image_url':'https://example.invalid/poster.png','post_url':'https://example.invalid/source'}],[])
        text=render(issue,'https://promptreels.vercel.app',sample=True)
        self.assertNotIn('<script>',text);self.assertNotIn('<video',text);self.assertIn('FROM THE ARCHIVE',text);self.assertIn('No weekly gain was invented',text)

if __name__=='__main__':unittest.main()
