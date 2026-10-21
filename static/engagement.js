// Count real activity; sales placeholders are never advertiser clicks.
const track=(name,params)=>window.PRTrack?.(name,params);
const campaigns=new Set();
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  const el=entry.target;if(el._prTimer){clearTimeout(el._prTimer);el._prTimer=null;}
  const key=el.dataset.campaign+':'+el.dataset.slot;
  if(entry.intersectionRatio>=.5&&!document.hidden&&!campaigns.has(key))el._prTimer=setTimeout(()=>{
   if(document.hidden)return;campaigns.add(key);track('sponsor_impression',{campaign:el.dataset.campaign,slot:el.dataset.slot});observer.unobserve(el);
  },1000);
 }),{threshold:[0,.5]});
 document.querySelectorAll('[data-campaign]').forEach(el=>observer.observe(el));
}
document.querySelectorAll('video').forEach(video=>{
 const id=video.closest('[data-id]')?.dataset.id||location.pathname;const preview=video.closest('.media')!==null;
 video.addEventListener('playing',()=>track(preview?'video_preview':'video_start',{id}),{once:true});
 const milestones=new Set();video.addEventListener('timeupdate',()=>{if(preview||!Number.isFinite(video.duration))return;const progress=100*video.currentTime/video.duration;for(const percent of [25,50,75,100])if(progress>=percent&&!milestones.has(percent)){milestones.add(percent);track('video_progress',{id,percent});}});
});
const optout=document.querySelector('#analytics-optout');
if(optout){const paint=()=>optout.textContent=localStorage.getItem('pr-analytics')==='off'?'Turn analytics on on this browser':'Turn analytics off on this browser';paint();optout.onclick=()=>{localStorage.setItem('pr-analytics',localStorage.getItem('pr-analytics')==='off'?'on':'off');location.reload();};}
window.addEventListener('pr-auth-ready',async()=>{
 const api=window.PRAuth;if(!api?.user)return;
 const state=document.querySelector('#newsletter-state'),stop=document.querySelector('#newsletter-stop');
 if(state){const {data,error}=await api.client.from('pr_subscriptions').select('state,unsubscribe_token').eq('user_id',api.user.id).maybeSingle();
  if(error){state.textContent='Could not load newsletter settings. Please reload.';return;}
  state.textContent=data?.state==='active'?'You are subscribed to the free newsletter.':'You are signed in. Use the form above and check the newsletter box to subscribe.';
  if(data?.state==='active'&&stop){stop.hidden=false;stop.onclick=async()=>{stop.disabled=true;try{const response=await fetch('/api/unsubscribe?t='+encodeURIComponent(data.unsubscribe_token),{method:'POST'});if(!response.ok)throw Error();state.textContent='You are unsubscribed. Your account remains available.';stop.hidden=true;localStorage.removeItem('pr-sub');}catch{state.textContent='Could not unsubscribe. Please try again or email Ritish.';stop.disabled=false;}};}
 }
 const list=document.querySelector('#issue-list');
 if(list){const {data,error}=await api.client.from('pr_issues').select('id,subject,published_at').eq('status','published').order('published_at',{ascending:false}).limit(12);
  if(!error&&data?.length){list.replaceChildren();for(const issue of data){const a=document.createElement('a');a.className='panel';a.href='/newsletter/issue/?id='+encodeURIComponent(issue.id);a.textContent=issue.subject+' · '+new Date(issue.published_at).toLocaleDateString();list.append(a);}}
 }
});
