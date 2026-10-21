import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const base='https://raw.githubusercontent.com/Ritish017/PromptReel/main/';
async function get(url:string){const r=await fetch(url,{headers:{'User-Agent':'PromptReel weekly research'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Source unavailable');return r;}
const clean=(s:string)=>s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
async function trending(since:string){
 const html=await(await get('https://github.com/trending?since='+since)).text();
 const items=html.split(/<article class="Box-row/).slice(1).map(a=>{
  const name=(a.match(/<h2[^>]*>[\s\S]*?href="\/([^"]+)"/)||[])[1]||'';
  const gain=a.match(/([\d,]+) stars? (today|this week|this month)/);
  const star=a.match(/href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/);
  return {name,desc:clean((a.match(/<p class="[^"]*">([\s\S]*?)<\/p>/)||[])[1]||''),lang:(a.match(/itemprop="programmingLanguage">([^<]+)/)||[])[1]||'',stars:Number((star?.[1]||'0').replaceAll(',','')),gain:gain?Number(gain[1].replaceAll(',','')):null};
 }).filter(x=>/^[\w.-]+\/[\w.-]+$/.test(x.name)).sort((a,b)=>(b.gain||0)-(a.gain||0));
 if(!items.length)throw Error('No parsed source results');return items;
}
function check(r:any){if(r.error)throw Error('Database operation failed');return r.data;}
export async function handler(req:Request){
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 let authorized=false;
 const secret=req.headers.get('x-promptreel-job');
 if(secret&&secret.length<=200){const result=await sb.rpc('pr_validate_job_secret',{candidate:secret});authorized=!result.error&&result.data===true;}
 if(!authorized){const token=req.headers.get('authorization')?.replace(/^Bearer /,'');if(token){const {data}=await sb.auth.getUser(token);authorized=data.user?.email==='kurmaritish017@gmail.com'&&!!data.user?.email_confirmed_at&&!data.user?.is_anonymous;}}
 if(!authorized)return Response.json({error:'Unauthorized'},{status:401});
 const raw=await req.text();if(raw.length>1024)return Response.json({error:'Request too large'},{status:413});
 let body;try{body=JSON.parse(raw)}catch{return Response.json({error:'Invalid JSON'},{status:400});}
 const kind=body.kind;if(!['snapshot','weekly'].includes(kind))return Response.json({error:'Invalid job'},{status:400});
 const now=new Date(),day=now.toISOString().slice(0,10),jobKey=kind+':'+day;
 try{
  const claimed=check(await sb.rpc('pr_claim_job',{job_name:jobKey}));
  if(!claimed)return Response.json({ok:true,status:'already-running-or-complete'});
  const items=await trending(kind==='weekly'?'weekly':'daily');
  check(await sb.from('pr_repo_snapshots').upsert(items.map(x=>({repo:x.name,captured_on:day,stars:x.stars,description:x.desc})),{onConflict:'repo,captured_on'}));
  let issueId=null;
  if(kind==='weekly'){
   const entries=await(await get(base+'data/entries.json')).json();
   const removals=check(await sb.from('pr_removals').select('source_id'));const gone=new Set(removals.map((x:any)=>x.source_id));
   const examples=entries.filter((x:any)=>!gone.has(x.id)&&x.image_url&&(x.prompt_text||x.skill)).sort((a:any,b:any)=>(b.added||'').localeCompare(a.added||'')).slice(0,3).map((x:any)=>({...x,date_label:(x.added||x.posted_date||'Date unconfirmed'),verification_label:x.verification_status==='verified'?'Creator-verified source':'Shared instructions; check original source. Not independently reproduced.'}));
   issueId=day+'-field-notes';
   const existing=check(await sb.from('pr_issues').select('status').eq('id',issueId).maybeSingle());
   if(!existing||existing.status==='draft'){
    let sponsors:any[]=[];try{sponsors=await(await get(base+'data/sponsors.json')).json();sponsors=sponsors.filter(x=>x.starts<=day&&x.ends>=day).slice(0,5);}catch{/* No sponsor is safer than an invented one. */}
    const content={id:issueId,subject:'Useful tools. Creative proof. Your next small build.',period:'Week ending '+day,intro:'A useful tool, creative work, and a small next step.',ranking_label:'GitHub Trending weekly subset, sorted by reported stars gained; retrieved '+day+'. This does not rank every GitHub repository.',repos:items.slice(0,3),examples,sponsors};
    check(await sb.from('pr_issues').upsert({id:issueId,subject:content.subject,content,status:'draft'},{onConflict:'id'}));
   }
  }
  check(await sb.from('pr_jobs').update({status:'succeeded',summary:{repos:items.length,issueId,delivery:'not-configured'},updated_at:new Date().toISOString()}).eq('job_key',jobKey));
  return Response.json({ok:true,status:'succeeded',repos:items.length,issueId,delivery:'not-configured'});
 }catch{
  await sb.from('pr_jobs').upsert({job_key:jobKey,status:'failed',summary:{reason:'Source or storage unavailable; no newsletter sent'},updated_at:new Date().toISOString()});
  return Response.json({error:'Job failed; inspect private job status'},{status:503});
 }
}
Deno.serve(handler);
