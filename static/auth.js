import { createClient } from './supabase-client.js';
const status=message=>{const el=document.querySelector('#signin-msg');if(el)el.textContent=message;};
const track=(name,data)=>window.PRTrack?.(name,data);
const pendingKey='pr-newsletter-consent-v1';
window.PRAuthReady=(async()=>{
 const r=await fetch('/auth-config.json');if(!r.ok)throw Error('Sign-in is not configured');
 const config=await r.json();const client=createClient(config.url,config.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
 const api={
  client,user:null,
  async request(path,options={}){
   const {data:{session}}=await client.auth.getSession();if(!session)throw Error('Sign in to continue');
   const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...options.headers,Authorization:'Bearer '+session.access_token}});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Please try again');return data;
  },
  async subscribe(source){await api.request('/api/subscribe',{method:'POST',body:JSON.stringify({consent:true,source})});track('newsletter_confirmed',{source});localStorage.setItem('pr-sub','1');localStorage.removeItem(pendingKey);},
  async join(email,consent,source='site'){
   if(consent!==true)throw Error('Check the newsletter box to continue');
   email=email.trim().toLowerCase();
   if(api.user?.email?.toLowerCase()===email){await api.subscribe(source);return 'subscribed';}
   localStorage.setItem(pendingKey,JSON.stringify({email,source,expires:Date.now()+86400000}));
   const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+'/signin/'}});
   if(error){localStorage.removeItem(pendingKey);throw Error(error.message);}
   track('newsletter_confirmation_requested',{source});return 'check-email';
  },
  async save(id,on){if(!api.user)return;const q=on?client.from('pr_bookmarks').upsert({user_id:api.user.id,entry_id:id},{onConflict:'user_id,entry_id'}):client.from('pr_bookmarks').delete().eq('user_id',api.user.id).eq('entry_id',id);const {error}=await q;if(error)throw Error('Could not sync this save');},
  async signOut(){await client.auth.signOut();localStorage.removeItem('pr-user');location.assign('/');}
 };
 window.PRAuth=api;
 const {data,error}=await client.auth.getUser();if(!error&&data.user?.email_confirmed_at&&!data.user.is_anonymous)api.user=data.user;
 // Do not trust or migrate the old browser-only identity record.
 localStorage.removeItem('pr-user');sessionStorage.removeItem('pr-cred');
 if(api.user){
  const auth=document.querySelector('#auth');if(auth){const b=document.createElement('button');b.className='btn ghost sm';b.textContent='Sign out';b.addEventListener('click',()=>api.signOut());auth.replaceChildren(b);}
  try{await api.request('/api/users',{method:'POST',body:'{}'});}catch{status('Signed in. Profile sync is temporarily unavailable.');}
  const {data:votes,error:votesError}=await client.from('pr_votes').select('entry_id,value').eq('user_id',api.user.id);
  if(!votesError)localStorage.setItem('pr-votes:'+api.user.id,JSON.stringify(Object.fromEntries((votes||[]).map(v=>[v.entry_id,v.value]))));
  const name=api.user.user_metadata?.full_name||api.user.email;
  status('Signed in as '+name+'. Newsletter signup is optional.');
  const {data:marks,error:marksError}=await client.from('pr_bookmarks').select('entry_id').eq('user_id',api.user.id);
  if(!marksError){let local=[];try{local=[...JSON.parse(localStorage.getItem('pr-saved')||'[]'),...JSON.parse(localStorage.getItem('pr-saved:'+api.user.email)||'[]')].filter(id=>typeof id==='string'&&/^[\w:-]{1,100}$/.test(id))}catch{}
   const combined=[...new Set([...(marks||[]).map(x=>x.entry_id),...local])];localStorage.setItem('pr-saved:'+api.user.id,JSON.stringify(combined));
   if(local.length){const {error:syncError}=await client.from('pr_bookmarks').upsert(local.map(entry_id=>({user_id:api.user.id,entry_id})),{onConflict:'user_id,entry_id'});if(!syncError)localStorage.removeItem('pr-saved');}
  }
  let pending;try{pending=JSON.parse(localStorage.getItem(pendingKey)||'null')}catch{}
  if(pending?.expires>Date.now()&&pending.email===api.user.email?.toLowerCase()){
   try{await api.subscribe(pending.source);status('Email confirmed. You are subscribed to free PromptReel Weekly.');}catch(e){status(e.message);}
  }
 }
 const form=document.querySelector('#auth-form');
 if(form)form.addEventListener('submit',async ev=>{ev.preventDefault();const button=form.querySelector('button');button.disabled=true;
  const email=form.querySelector('[name=email]').value;const consent=form.querySelector('[name=newsletter]').checked;
  try{
   if(consent){const result=await api.join(email,true,'signin');status(result==='subscribed'?'You are subscribed.':'Check your email to sign in and confirm the newsletter.');}
   else{localStorage.removeItem(pendingKey);const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+'/signin/'}});if(error)throw error;status('Check your email for your sign-in link. Newsletter is not enabled.');}
  }catch(e){status(e.message||'Could not send sign-in link.');}finally{button.disabled=false;}
 });
 const google=document.querySelector('#auth-google');if(google&&config.googleEnabled){google.hidden=false;google.addEventListener('click',async()=>{
  const consent=form?.querySelector('[name=newsletter]')?.checked;const email=form?.querySelector('[name=email]')?.value?.trim().toLowerCase();
  if(consent&&email)localStorage.setItem(pendingKey,JSON.stringify({email,source:'google-signin',expires:Date.now()+86400000}));
  else localStorage.removeItem(pendingKey);
  const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/signin/'}});if(error)status(error.message);
 });}
 window.dispatchEvent(new Event('pr-auth-ready'));return api;
})().catch(e=>{status('Sign-in is temporarily unavailable. '+e.message);window.dispatchEvent(new Event('pr-auth-ready'));return null;});
