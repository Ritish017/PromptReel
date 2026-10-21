// Render source content with DOM methods, never untrusted HTML.
const safeUrl=value=>{if(value==='mailto:kurmaritish017@gmail.com')return value;try{const u=new URL(value,location.origin);return ['https:','http:'].includes(u.protocol)?u.href:'#'}catch{return '#'}};
const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n};
const link=(label,href)=>{const a=node('a',label);a.href=safeUrl(href);a.rel='noopener';return a};
function showIssue(parent,issue){
 parent.replaceChildren();parent.append(node('p',issue.status==='published'?'Published web edition':'Private editorial draft · not sent'));
 parent.append(node('h1',issue.subject));const content=issue.content;
 parent.append(node('p',content.period),node('p',content.ranking_label));
 for(const repo of content.repos||[]){const card=node('article');card.className='panel';card.append(link(repo.name,'https://github.com/'+repo.name),node('p',repo.desc||'See project documentation.'),node('p',Number.isInteger(repo.gain)?'+'+repo.gain.toLocaleString()+' stars this week':'Weekly gain unavailable'),link('Documentation and community examples ↗','https://github.com/'+repo.name+'#readme'),node('p','Suggested experiment: run the smallest supported example, then adapt one feature to a useful project.'));parent.append(card);}
 for(const example of content.examples||[]){const card=node('article');card.className='panel';card.append(node('h2',example.title),node('p','By @'+example.handle+' · '+(example.date_label||'Date unconfirmed')),node('p',example.verification_label||'Check the original source before reuse.'));
 if(example.image_url){const a=link('','/p/'+encodeURIComponent(example.id)+'/');const img=node('img');img.src=safeUrl(example.image_url);img.alt='Watch '+example.title;img.style.cssText='max-width:100%;max-height:340px;object-fit:contain;border-radius:14px';a.append(img);card.append(a);}
 card.append(node('pre',example.prompt_text||example.skill||'See source for instructions.'),link('Watch and copy full instructions ↗','/p/'+encodeURIComponent(example.id)+'/'),node('p'),link('Original creator source ↗',example.post_url||example.repo));parent.append(card);}
 parent.append(node('h2','Your small next build'),node('p',content.brief||'Pick one tool, run its quickstart, and make one useful demo. Credit the original creator and record your setup.'),node('p','Curated by Ritish Kurma · Rynavo'),link('Contact Ritish','mailto:kurmaritish017@gmail.com'));
}
window.addEventListener('pr-auth-ready',async()=>{
 const api=window.PRAuth;if(!api)return;
 const archive=document.querySelector('#issue-list');
 if(archive){const {data,error}=await api.client.from('pr_issues').select('id,subject,published_at').eq('status','published').order('published_at',{ascending:false}).limit(12);if(!error&&data?.length){archive.replaceChildren();for(const issue of data){const a=link(issue.subject,'/newsletter/issue/?id='+encodeURIComponent(issue.id));a.className='panel';a.style.display='block';archive.append(a);}}}
 const reader=document.querySelector('#issue-reader');
 if(reader){const id=new URLSearchParams(location.search).get('id');if(!id||!/^[a-z0-9-]{1,80}$/.test(id)){reader.textContent='Choose an edition from the newsletter archive.';return}
 const {data,error}=await api.client.from('pr_issues').select('id,subject,content,status').eq('id',id).maybeSingle();if(error||!data){reader.textContent='Edition not published, or sign in as the editor to preview a draft.';return}showIssue(reader,data);}
 const admin=document.querySelector('#editor-issues');
 if(admin){if(api.user?.email!=='kurmaritish017@gmail.com'){admin.textContent='Sign in with the owner account to view editorial drafts.';return}
 const {data,error}=await api.client.from('pr_issues').select('id,subject,status,created_at').order('created_at',{ascending:false}).limit(30);if(error){admin.textContent='Could not load drafts.';return}admin.replaceChildren();for(const issue of data){const card=node('article');card.className='panel';card.append(node('h2',issue.subject),node('p',issue.id+' · '+issue.status),link('Preview edition','/newsletter/issue/?id='+encodeURIComponent(issue.id)));
 if(issue.status==='draft'||issue.status==='approved'){
 const next=issue.status==='draft'?'approved':'published';const action=node('button',next==='approved'?'Approve draft':'Publish web edition');action.className='btn ghost';
 action.onclick=async()=>{action.disabled=true;const change={status:next};if(next==='published')change.published_at=new Date().toISOString();
 const {data:updated,error}=await api.client.from('pr_issues').update(change).eq('id',issue.id).eq('status',issue.status).select('id');
 if(error||updated?.length!==1){action.textContent='Could not update. Reload and try again.';action.disabled=false;return}
 action.textContent=next==='published'?'Web edition published. No email sent.':'Approved. Reload to publish the web edition.';};card.append(node('p'),action);
 }admin.append(card);}

 }
});
