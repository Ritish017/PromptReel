"""Send one approved issue. Off by default; never infer consent from sign-in."""
import argparse
import datetime
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from newsletter.render import render

def request(url, method='GET', data=None, headers=None):
    raw=json.dumps(data).encode() if data is not None else None
    req=urllib.request.Request(url,data=raw,method=method,headers=headers or {})
    with urllib.request.urlopen(req,timeout=30) as response:
        text=response.read().decode()
        return json.loads(text) if text else None

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--issue',required=True)
    parser.add_argument('--send',action='store_true')
    args=parser.parse_args()
    if not args.send or os.environ.get('NEWSLETTER_SEND_ENABLED')!='true':
        print('Delivery disabled. Configure a verified sender, review an issue, then enable sending explicitly.')
        return
    required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY','NEWSLETTER_FROM','PR_DOMAIN']
    if any(not os.environ.get(key) for key in required):
        raise SystemExit('Missing server integration settings. No email sent.')
    domain=os.environ['PR_DOMAIN'].rstrip('/')
    if not domain.startswith('https://'):
        raise SystemExit('Use a verified HTTPS production domain.')
    key=os.environ['SUPABASE_SERVICE_ROLE_KEY']
    base=os.environ['SUPABASE_URL'].rstrip('/')+'/rest/v1/'
    headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'}
    def db(path,method='GET',data=None,extra=None):
        return request(base+path,method,data,{**headers,**(extra or {})})
    issue_id=urllib.parse.quote(args.issue,safe='')
    rows=db('pr_issues?id=eq.'+issue_id+'&select=*')
    if len(rows)!=1 or rows[0]['status'] not in ('approved','published'):
        raise SystemExit('Issue must be explicitly approved. No email sent.')
    issue=rows[0]
    # Page through all active records, avoiding a silently truncated audience.
    offset=0;sent=0;suppressed=0
    while True:
        audience=db('pr_subscriptions?state=eq.active&select=user_id,email,unsubscribe_token&order=user_id&offset='+str(offset)+'&limit=100')
        if not audience:break
        offset+=len(audience)
        for member in audience:
            uid=member['user_id'];where='issue_id=eq.'+issue_id+'&user_id=eq.'+uid
            delivery=db('pr_deliveries?'+where+'&select=status,updated_at')
            if delivery and delivery[0]['status']=='sent':continue
            # Resend idempotency has a finite window. Do not retry uncertain old sends automatically.
            if delivery:
                stamp=datetime.datetime.fromisoformat(delivery[0]['updated_at'].replace('Z','+00:00'))
                if datetime.datetime.now(datetime.timezone.utc)-stamp>datetime.timedelta(hours=23):
                    suppressed+=1;continue
            state=db('pr_subscriptions?user_id=eq.'+uid+'&select=state')
            if not state or state[0]['state']!='active':suppressed+=1;continue
            if not delivery:
                try:db('pr_deliveries','POST',{'issue_id':args.issue,'user_id':uid,'status':'reserved'})
                except urllib.error.HTTPError as err:
                    if err.code==409:continue
                    raise
            unsubscribe=domain+'/api/unsubscribe?t='+member['unsubscribe_token']
            payload={'from':os.environ['NEWSLETTER_FROM'],'to':[member['email']],'reply_to':'kurmaritish017@gmail.com',
                     'subject':issue['subject'],'html':render(issue['content'],domain,unsubscribe),
                     'text':'PromptReel Weekly by Ritish Kurma. View the issue: '+domain+'/newsletter/issue/?id='+args.issue+' . Unsubscribe: '+unsubscribe,
                     'headers':{'List-Unsubscribe':'<'+unsubscribe+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}
            # A retry reuses exactly the same issue and recipient idempotency key.
            result=request('https://api.resend.com/emails','POST',payload,{'Authorization':'Bearer '+os.environ['RESEND_API_KEY'],'Content-Type':'application/json','Idempotency-Key':args.issue+'/'+uid})
            db('pr_deliveries?'+where,'PATCH',{'status':'sent','provider_id':result['id'],'updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat()})
            sent+=1
    print(json.dumps({'sent':sent,'suppressed_or_uncertain':suppressed}))
if __name__=='__main__':main()
