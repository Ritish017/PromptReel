(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const user=()=>LS.get('pr-user',null);
const K=()=>'pr-saved'+(user()?':'+user().email:'');
const saved=()=>LS.get(K(),null)||LS.get('pr-saved',[]);
const toast=m=>{const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),1800)};
let voter=LS.get('pr-voter',null);if(!voter){voter='v'+Math.random().toString(36).slice(2)+Date.now().toString(36);LS.set('pr-voter',voter)}
const myVotes=()=>LS.get('pr-votes',{});

/* ---------- Google sign-in ---------- */
const auth=$('#auth'),CID=auth&&auth.dataset.client;
function parseJwt(t){return JSON.parse(decodeURIComponent(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')))}
function onCred(r){const p=parseJwt(r.credential);const old=saved();LS.set('pr-user',{email:p.email,name:p.name,picture:p.picture});sessionStorage.setItem('pr-cred',r.credential);
  LS.set(K(),[...new Set([...(LS.get(K(),[])),...old])]);
  const back=sessionStorage.getItem('pr-back');sessionStorage.removeItem('pr-back');toast('Signed in as '+p.name);setTimeout(()=>{if(back)location.href=back;else location.reload()},600)}
function renderAuth(){const u=user();if(!auth||!u)return;
  auth.innerHTML=`<img src="${u.picture}" title="${u.name} · click to sign out" alt="${u.name}">`;
  auth.querySelector('img').onclick=()=>{if(confirm('Sign out of PromptReel?')){localStorage.removeItem('pr-user');sessionStorage.removeItem('pr-cred');window.google&&google.accounts.id.disableAutoSelect();location.reload()}}}
renderAuth();
let gReady=false;
function initG(){if(gReady||!CID||!window.google||!google.accounts)return;gReady=true;
  google.accounts.id.initialize({client_id:CID,callback:onCred,auto_select:false,cancel_on_tap_outside:true});
  const gb=$('#gbtn');if(gb)google.accounts.id.renderButton(gb,{theme:'outline',size:'large',shape:'pill',text:'continue_with'});
  }
window.addEventListener('load',initG);const gi=setInterval(()=>{initG();if(gReady)clearInterval(gi)},400);setTimeout(()=>clearInterval(gi),8000);
function needSignIn(msg){return false;
  const m=document.createElement('div');m.className='modal';m.innerHTML=`<div><h3 style="margin:0 0 6px;font-size:22px">${msg||'Sign in to continue'}</h3><p style="color:var(--mute);margin:0">Free with Google. No password, no card.</p><div id="gbtn2" style="display:grid;place-items:center;margin:18px 0"></div><button class="btn ghost sm" id="mclose">Not now</button></div>`;
  document.body.appendChild(m);m.onclick=e=>{if(e.target===m||e.target.id==='mclose')m.remove()};
  if(window.google&&gReady)google.accounts.id.renderButton($('#gbtn2'),{theme:'outline',size:'large',shape:'pill',text:'continue_with'});else{sessionStorage.setItem('pr-back',location.href);location.href='/signin/'}
  return true}

/* ---------- votes, saves, counts ---------- */
let STATS={};
function paint(){
  const mv=myVotes();
  $$('[data-vote]').forEach(b=>{const id=b.dataset.vid,s=STATS[id]||{u:0,d:0,c:0},v=+b.dataset.vote;
    b.querySelector('span').textContent=v>0?s.u:s.d;b.classList.toggle('on',mv[id]===v)});
  $$('.act.cm').forEach(a=>{const id=(a.closest('[data-id]')||{}).dataset?.id||($('[data-vote]')||{}).dataset?.vid;const s=STATS[id];if(s)a.querySelector('span').textContent=s.c});
  $$('#grid .card[data-id]').forEach(c=>{const s=STATS[c.dataset.id]||{u:0,d:0,c:0};c.dataset.net=s.u-s.d;c.dataset.cm=s.c});
}
fetch('/api/stats').then(r=>r.ok?r.json():{}).then(s=>{STATS=s||{};paint();if(window.__apply)window.__apply()}).catch(()=>{});
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-vote]');
  if(b){ev.preventDefault();const id=b.dataset.vid,v=+b.dataset.vote,mv=myVotes(),prev=mv[id]||0,nv=prev===v?0:v;
    const s=STATS[id]=STATS[id]||{u:0,d:0,c:0};if(prev>0)s.u--;if(prev<0)s.d--;if(nv>0)s.u++;if(nv<0)s.d++;
    if(nv)mv[id]=nv;else delete mv[id];LS.set('pr-votes',mv);paint();
    fetch('/api/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,voter,value:nv})}).then(r=>r.ok&&r.json()).then(j=>{if(j){STATS[id]={...STATS[id],...j};paint()}}).catch(()=>{});
    return}
  const sv=ev.target.closest('[data-like]');
  if(sv){ev.preventDefault();const id=sv.dataset.like;let s=saved();s=s.includes(id)?s.filter(x=>x!==id):[...s,id];LS.set(K(),s);syncSaves();toast(s.includes(id)?'Saved to your Library':'Removed from Library');if(window.__apply)window.__apply();return}
  const cp=ev.target.closest('[data-copyp]');
  if(cp){ev.preventDefault();ev.stopPropagation();const h=cp.innerHTML;const d=await ENT();const x=d.find(y=>y.id===cp.dataset.copyp);if(!x)return;const t=x.prompt_text||x.skill||'';try{await navigator.clipboard.writeText(t)}catch(_){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}cp.textContent='Copied ✓';cp.classList.add('done');toast('Prompt copied. Paste it into Claude or your agent.');setTimeout(()=>{cp.innerHTML=h;cp.classList.remove('done')},1500);return}
});
function syncSaves(){const s=saved();$$('[data-like]').forEach(b=>b.classList.toggle('on',s.includes(b.dataset.like)))}
syncSaves();
let ENTP=null;const ENT=()=>ENTP||(ENTP=fetch('/entries.json').then(r=>r.json()));

/* ---------- video previews ---------- */
let paused=LS.get('pr-paused',false);
const io=('IntersectionObserver' in window)?new IntersectionObserver(es=>es.forEach(en=>{const v=en.target;
  if(en.isIntersecting&&!paused){if(!v.src&&v.dataset.src){v.src=v.dataset.src}const p=v.play();p&&p.catch(()=>{})}else{v.pause()}}),{rootMargin:'120px 0px',threshold:.35}):null;
$$('.media video').forEach(v=>{v.addEventListener('playing',()=>v.classList.add('on'));v.addEventListener('error',()=>v.remove());io&&io.observe(v)});
const pb=$('#pause');
function setPause(p){paused=p;LS.set('pr-paused',p);if(pb){pb.textContent=p?'▶':'❚❚';pb.title=p?'Play previews':'Pause previews';pb.classList.toggle('on',p)}
  $$('.media video').forEach(v=>{if(p)v.pause();else{const r=v.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0&&!v.closest('[hidden]')){if(!v.src)v.src=v.dataset.src;v.play().catch(()=>{})}}})}
if(pb){pb.onclick=()=>setPause(!paused);setPause(paused)}
document.addEventListener('visibilitychange',()=>{if(document.hidden)$$('video').forEach(v=>v.pause())});

/* ---------- gallery filters (all combine) ---------- */
const grid=$('#grid'),q=$('#q');
if(grid&&q){
  const st={type:'all',tags:new Set(),plat:'',ar:'',saved:false,q:'',sort:'new'};
  const P=new URLSearchParams(location.search);
  if(P.get('q')){st.q=P.get('q').toLowerCase();q.value=P.get('q')}if(P.get('tag'))st.tags.add(P.get('tag'));if(P.get('type'))st.type=P.get('type');if(P.get('sort'))st.sort=P.get('sort');if(P.get('plat'))st.plat=P.get('plat');
  const cards=[...grid.querySelectorAll('.card[data-id]')];const tpl=document.getElementById('promos');const PROMOS=tpl?[...tpl.content.children]:[];
  const seed=Math.random();const rnd=id=>{let h=0;for(const c of id+seed)h=(h*31+c.charCodeAt(0))|0;return h};
  function apply(){
    const sv=saved();let shown=0;
    const cmp={new:(a,b)=>(b.dataset.added||'').localeCompare(a.dataset.added||''),popular:(a,b)=>(+b.dataset.likes)-(+a.dataset.likes),
      liked:(a,b)=>((+b.dataset.net||0)-(+a.dataset.net||0))||((+b.dataset.likes)-(+a.dataset.likes)),discussed:(a,b)=>((+b.dataset.cm||0)-(+a.dataset.cm||0))||((+b.dataset.net||0)-(+a.dataset.net||0)),random:(a,b)=>rnd(a.dataset.id)-rnd(b.dataset.id)}[st.sort];
    const list=cards.slice().sort((a,b)=>((+b.dataset.m)-(+a.dataset.m))||cmp(a,b));const frag=document.createDocumentFragment();
    list.forEach(c=>{const tags=c.dataset.tags.split('|');
      const ok=(st.type==='all'||c.dataset.type===st.type)&&[...st.tags].every(t=>tags.includes(t))&&(!st.plat||c.dataset.plat.split('|').includes(st.plat))&&(!st.ar||c.dataset.ar===st.ar)&&(!st.saved||sv.includes(c.dataset.id))&&(!st.q||st.q.split(/\s+/).every(w=>c.dataset.text.includes(w)));
      c.hidden=!ok;if(ok)shown++;frag.appendChild(c)});
    grid.appendChild(frag);
    grid.querySelectorAll('.promo').forEach(p=>p.remove());
    const vis=list.filter(c=>!c.hidden);let k=0,out=[];vis.forEach(c=>{out.push(c);if(out.length%8===7&&PROMOS.length){const p=PROMOS[k++%PROMOS.length].cloneNode(true);out.push(p);c.after(p)}});
    const cols=getComputedStyle(grid).gridTemplateColumns.split(' ').length||4;out.forEach((c,i)=>c.classList.toggle('snap',i%(cols*2)===0));
    $('#empty').hidden=shown>0;$('#count').textContent=shown+' of '+cards.length;
    const any=st.tags.size||st.q||st.plat||st.ar||st.saved||st.type!=='all';$('#clear').hidden=!any;
    $$('[data-ftype]').forEach(b=>b.classList.toggle('on',b.dataset.ftype===st.type));const fc=st.tags.size+(st.plat?1:0)+(st.ar?1:0);const fb=$('#fcount');fb.hidden=!fc;fb.textContent=fc;
    $$('[data-ftag]').forEach(b=>b.classList.toggle('on',st.tags.has(b.dataset.ftag)));
    $$('[data-fplat]').forEach(b=>b.classList.toggle('on',b.dataset.fplat===st.plat));
    $$('[data-far]').forEach(b=>b.classList.toggle('on',b.dataset.far===st.ar));
    $$('[data-fsaved]').forEach(b=>b.classList.toggle('on',st.saved));
    $('#sort').value=st.sort;
    const u=new URLSearchParams();if(st.q)u.set('q',st.q);if(st.tags.size)u.set('tag',[...st.tags][0]);if(st.type!=='all')u.set('type',st.type);if(st.sort!=='new')u.set('sort',st.sort);if(st.plat)u.set('plat',st.plat);
    history.replaceState(null,'',location.pathname+(u.toString()?'?'+u:'')+location.hash);
    if(!paused)setTimeout(()=>setPause(false),50);
  }
  window.__apply=apply;
  const ft=$('#ftoggle'),fp=$('#fpanel');ft.onclick=()=>{fp.hidden=!fp.hidden;ft.setAttribute('aria-expanded',!fp.hidden);ft.classList.toggle('on',!fp.hidden);setTB()};
  const tbEl=$('#toolbar');function setTB(){document.documentElement.style.setProperty('--tb',tbEl.offsetHeight+'px');document.documentElement.style.setProperty('--hdr',document.querySelector('header').offsetHeight+'px')}
  setTB();addEventListener('resize',setTB);document.documentElement.classList.add('snapy');
  $$('[data-ftype]').forEach(b=>b.onclick=()=>{st.type=b.dataset.ftype;apply()});
  $$('[data-ftag]').forEach(b=>b.onclick=()=>{const t=b.dataset.ftag;st.tags.has(t)?st.tags.delete(t):st.tags.add(t);apply()});
  $$('[data-fplat]').forEach(b=>b.onclick=()=>{st.plat=st.plat===b.dataset.fplat?'':b.dataset.fplat;apply()});
  $$('[data-far]').forEach(b=>b.onclick=()=>{st.ar=st.ar===b.dataset.far?'':b.dataset.far;apply()});
  $$('[data-fsaved]').forEach(b=>b.onclick=()=>{st.saved=!st.saved;apply()});
  $('#sort').onchange=e=>{st.sort=e.target.value;apply()};
  $('#clear').onclick=()=>{st.type='all';st.tags.clear();st.plat='';st.ar='';st.saved=false;st.q='';q.value='';apply()};
  let tm;q.oninput=e=>{clearTimeout(tm);tm=setTimeout(()=>{st.q=e.target.value.trim().toLowerCase();apply()},120)};
  document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA'){e.preventDefault();q.focus()}});
  const tb=$('#toolbar');if(tb)new IntersectionObserver(([en])=>tb.classList.toggle('stuck',en.intersectionRatio<1),{threshold:[1],rootMargin:'-59px 0px 0px 0px'}).observe(tb);
  apply();
}

/* ---------- copy / customize ---------- */
$$('[data-copy]').forEach(b=>b.onclick=()=>{navigator.clipboard.writeText($(b.dataset.copy).innerText);const t=b.textContent;b.textContent='Copied ✓';setTimeout(()=>b.textContent=t,1400)});
const go=$('#c-go');
if(go)go.onclick=()=>{const v=id=>$(id).value.trim();let extra=[];
  if(v('#c-what'))extra.push('Make this video for: '+v('#c-what')+'. Replace any product, brand or copy in the original with this.');
  if(v('#c-fmt'))extra.push('Format: '+v('#c-fmt')+'.');if(v('#c-len'))extra.push('Length: '+v('#c-len')+'.');
  if(v('#c-style'))extra.push('Colours and style: '+v('#c-style')+'.');if(v('#c-inc'))extra.push('Must include: '+v('#c-inc')+'.');
  const out=$('#p').innerText+(extra.length?'\n\n--- Adapt it for my project ---\n'+extra.join('\n'):'');
  const o=$('#c-out');o.hidden=false;o.textContent=out;navigator.clipboard.writeText(out);go.textContent='Copied ✓';setTimeout(()=>go.textContent='Copy my version',1500)};

/* ---------- comments ---------- */
const cf=$('#cform');
if(cf){const id=cf.dataset.id,cl=$('#clist');const u=user();if(u){$('#cwho').textContent='Commenting as '+u.name;const cn=$('#cname');if(cn)cn.hidden=true}
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ago=t=>{const s=(Date.now()-t)/1000;return s<60?'just now':s<3600?Math.floor(s/60)+'m ago':s<86400?Math.floor(s/3600)+'h ago':Math.floor(s/86400)+'d ago'};
  const draw=l=>{cl.innerHTML=l.length?l.slice().reverse().map(c=>`<div class="c">${c.p?`<img src="${esc(c.p)}" alt="">`:`<span class="ini">${esc((c.n||'G')[0])}</span>`}<div><b>${esc(c.n)}</b><small>${ago(c.ts)}</small><p>${esc(c.t)}</p></div></div>`).join(''):'<p style="color:var(--mute);margin:0">No comments yet. Be the first to share what you made.</p>';
    const s=STATS[id]=STATS[id]||{u:0,d:0,c:0};s.c=l.length;paint()};
  fetch('/api/comments?id='+encodeURIComponent(id)).then(r=>r.ok?r.json():[]).then(draw).catch(()=>draw([]));
  cf.onsubmit=async e=>{e.preventDefault();if(needSignIn('Sign in to comment'))return;const ta=cf.querySelector('textarea');const t=ta.value.trim();if(t.length<2)return;
    const btn=cf.querySelector('button');btn.disabled=true;
    const r=await fetch('/api/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,text:t,name:(user()||{}).name||($('#cname')||{}).value,credential:sessionStorage.getItem('pr-cred')})}).catch(()=>null);
    btn.disabled=false;if(r&&r.ok){ta.value='';draw(await r.json());toast('Comment posted')}else toast('Could not post. Try again.')};
}

/* ---------- subscribe ---------- */
const sf=$('#subform');
if(sf)sf.onsubmit=async e=>{e.preventDefault();const i=sf.querySelector('input');const r=await fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:i.value})}).catch(()=>null);
  if(r&&r.ok){sf.innerHTML='<div class="btn" style="cursor:default">✓ You\'re subscribed</div>'}else toast('Check the email and try again')};

/* ---------- sections ---------- */
let SEC=null;const secs=()=>SEC||(SEC=fetch('/sections.json').then(r=>r.json()));
$$('[data-copysec]').forEach(b=>b.onclick=async()=>{if(needSignIn('Sign in to copy sections'))return;const all=await secs();const x=all.find(s=>s.id===b.dataset.copysec);
  const txt=b.dataset.only==='prompt'?x.prompt:`Add this "${x.name}" section to my site.\n\n${x.prompt}\n\nReference implementation (adapt to my stack and brand):\n\n${x.html}`;
  await navigator.clipboard.writeText(txt);const c=LS.get('pr-copied',[]).filter(i=>i!==x.id);c.unshift(x.id);LS.set('pr-copied',c.slice(0,30));
  const t=b.textContent;b.textContent='Copied ✓';setTimeout(()=>b.textContent=t,1400)});

$$('[data-cat]').forEach(b=>b.onclick=()=>{$$('[data-cat]').forEach(x=>x.classList.toggle('on',x===b));$$('#sgrid .sec').forEach(c=>c.hidden=!!b.dataset.cat&&c.dataset.cat!==b.dataset.cat)});

/* ---------- library ---------- */
const lib=$('#saved');
if(lib){const u=user();if(u)$('#lib-who').textContent='Signed in as '+u.email+'. Your saved videos and sections live here.';
  let tab='videos';const draw=async()=>{const s=saved();let n=0;const ss=$('#saved-sec');
    if(tab==='videos'){const d=await ENT();const list=d.filter(x=>s.includes(x.id));n=list.length;lib.hidden=false;ss.hidden=true;
      lib.className='grid';lib.innerHTML=list.map(x=>`<article class="card"><a class="media" href="/p/${x.id}/">${x.image_url?`<img src="${x.image_url}" alt="">`:''}</a><div class="cmeta"><div class="t"><h3><a href="/p/${x.id}/">${x.title}</a></h3><div class="h">@${x.handle} · ${x.model||''}</div></div></div></article>`).join('')}
    else{const all=await secs();const ids=tab==='sections'?s.filter(i=>i.startsWith('sec:')).map(i=>i.slice(4)):LS.get('pr-copied',[]);const list=ids.map(i=>all.find(x=>x.id===i)).filter(Boolean);n=list.length;lib.hidden=true;ss.hidden=false;
      ss.innerHTML=list.map(x=>`<a class="card" href="/sections/${x.id}/"><div class="sthumb"><iframe sandbox="allow-scripts" srcdoc="${x.html.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></iframe></div><div class="cmeta"><div class="t"><h3>${x.name}</h3><div class="h">${x.cat}</div></div></div></a>`).join('')}
    $('#empty').hidden=n>0};
  $$('[data-lib]').forEach(b=>b.onclick=()=>{tab=b.dataset.lib;$$('[data-lib]').forEach(x=>x.classList.toggle('on',x===b));draw()});draw()}

/* ---------- submit ---------- */
const sg=$('#s-go');
if(sg)sg.onclick=()=>{const body=`Post: ${$('#s-url').value}\nModel: ${$('#s-model').value}\n\nPrompt / skill:\n${$('#s-prompt').value}`;
  location.href='mailto:kurmaritish017@gmail.com?subject='+encodeURIComponent('PromptReel submission')+'&body='+encodeURIComponent(body)};
})();
/* ---------- repos ---------- */
(function(){const list=document.getElementById('rlist');if(!list)return;
const $$=s=>[...document.querySelectorAll(s)];const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const st={view:'daily',topic:'',lang:'',q:''};let data=[];const cache={};
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>n>=1e3?(n/1e3).toFixed(n>=1e4?0:1)+'k':String(n);
const unit={daily:'stars today',weekly:'stars this week',monthly:'stars this month'};
function draw(){const w=LS.get('pr-watch',[]);let items=st.view==='watch'?w.map(n=>(Object.values(cache).flat().find(x=>x.name===n))||{name:n,desc:'',lang:'',stars:0}):data;
  if(st.q)items=items.filter(x=>(x.name+' '+x.desc+' '+x.lang+' '+(x.topics||[]).join(' ')).toLowerCase().includes(st.q));
  const max=Math.max(1,...items.map(x=>x.gain||0));
  list.innerHTML=items.length?items.map((x,i)=>{const own=x.name.split('/')[0];const right=x.gain?`<div class="rg"><b>+${x.gain.toLocaleString()}</b><small>${unit[st.view]||'stars'}</small><div class="rbar" style="width:${Math.max(12,Math.round(x.gain/max*90))}px"></div></div>`:st.view==='rising'&&x.created?`<div class="rg"><b>★ ${fmt(x.stars)}</b><small>${Math.max(1,Math.round((Date.now()-new Date(x.created))/864e5))} days old</small></div>`:`<div class="rg"><b style="color:var(--text)">★ ${fmt(x.stars)}</b><small>${fmt(x.forks||0)} forks</small></div>`;
    return `<li class="repo"><span class="rk">${i+1}</span><img class="ow" loading="lazy" src="https://github.com/${esc(own)}.png?size=64" alt=""><div class="rb"><a class="rn" href="https://github.com/${esc(x.name)}" target="_blank" rel="noopener">${esc(x.name)}</a><p>${esc(x.desc)}</p><div class="rm">${x.lang?`<span>${esc(x.lang)}</span>`:''}<span>★ ${x.stars.toLocaleString()}</span>${(x.topics||[]).slice(0,3).map(t=>`<span class="tp">${esc(t)}</span>`).join('')}<button data-clone="${esc(x.name)}">Copy clone</button><a class="ra" target="_blank" rel="noopener" href="https://claude.ai/new?q=${encodeURIComponent('Explain what github.com/'+x.name+' does, who it is for, and how to get started with it in 5 steps.')}">Ask Claude ↗</a><button data-watch="${esc(x.name)}" class="${w.includes(x.name)?'on':''}">${w.includes(x.name)?'★ Watching':'☆ Watch'}</button></div></div>${right}</li>`}).join(''):`<p class="empty">${st.view==='watch'?'Tap ☆ Watch on any repo to track it here.':'Nothing matches.'}</p>`;
  document.getElementById('rcount').textContent=items.length+' repos'}
async function load(){if(st.view==='watch'){draw();return}const k=JSON.stringify([st.view,st.topic,st.lang]);
  if(!cache[k]){list.style.opacity=.5;try{const r=await fetch(`/api/repos?view=${st.view}&topic=${st.topic}&lang=${encodeURIComponent(st.lang)}`);cache[k]=(await r.json()).items||[]}catch{cache[k]=[]}list.style.opacity=1}
  data=cache[k];draw()}
$$('[data-view]').forEach(b=>b.onclick=()=>{st.view=b.dataset.view;$$('[data-view]').forEach(x=>x.classList.toggle('on',x===b));document.getElementById('rtopics').hidden=!['top','rising'].includes(st.view);load()});
$$('[data-topic]').forEach(b=>b.onclick=()=>{st.topic=b.dataset.topic;$$('[data-topic]').forEach(x=>x.classList.toggle('on',x===b));load()});
document.getElementById('rlang').onchange=e=>{st.lang=e.target.value;load()};
document.getElementById('rq').oninput=e=>{st.q=e.target.value.trim().toLowerCase();draw()};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();document.getElementById('rq').focus()}});
list.addEventListener('click',e=>{const c=e.target.closest('[data-clone]');if(c){navigator.clipboard.writeText('git clone https://github.com/'+c.dataset.clone+'.git');c.textContent='Copied ✓';setTimeout(()=>c.textContent='Copy clone',1300)}
  const w=e.target.closest('[data-watch]');if(w){let l=LS.get('pr-watch',[]);const n=w.dataset.watch;l=l.includes(n)?l.filter(x=>x!==n):[...l,n];LS.set('pr-watch',l);draw()}});
load()})();

/* creators search */
const pq=document.getElementById('pq');if(pq)pq.oninput=()=>{const q=pq.value.trim().toLowerCase();document.querySelectorAll('#people .person').forEach(p=>p.hidden=!!q&&!p.dataset.n.includes(q))};
