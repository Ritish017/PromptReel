import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../../static/auth.js',import.meta.url),'utf8').replace(/^import [^\n]*\n/,'');
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
const element=()=>({hidden:false,disabled:false,textContent:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;}});
async function boot({enabled=true,consent=false,user=null,local=storage(),back=null}={}){
 const elements=Object.fromEntries(['#signin-msg','#auth-form','#auth-email','#auth-email-submit','#auth-google','#auth-continue'].map(k=>[k,element()]));
 const email={value:'',required:false},checkbox={checked:consent};
 elements['#auth-form'].querySelector=key=>key==='[name=email]'?email:key==='[name=newsletter]'?checkbox:null;
 elements['#auth-continue'].href='/library/';
 const calls={oauth:[],subscribe:0};
 const chain={select(){return this},eq(){return this},upsert(){return Promise.resolve({error:null})},then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)}};
 const client={from:()=>chain,auth:{getUser:async()=>({data:{user},error:null}),getSession:async()=>({data:{session:{access_token:'fixture'}}}),signInWithOAuth:async args=>{calls.oauth.push(args);return {error:null}}}};
 const session=storage();if(back)session.setItem('pr-back',back);
 const window={dispatchEvent(){}};
 const context={createClient:()=>client,window,document:{querySelector:key=>elements[key]||null},localStorage:local,sessionStorage:session,
  location:{origin:'https://promptreels.vercel.app',pathname:'/signin/',search:''},history:{replaceState(){}},URL,URLSearchParams,AbortSignal,Date,Event,
  fetch:async url=>({ok:true,json:async()=>{
   if(url==='/auth-config.json')return {url:'https://fixture.supabase.co',publishableKey:'fixture',emailEnabled:false};
   if(url.endsWith('/auth/v1/settings'))return {external:{google:enabled}};
   if(url==='/api/subscribe')calls.subscribe++;
   return {};
  }})};
 vm.runInNewContext(source,context);await window.PRAuthReady;
 return {elements,calls,local,email};
}
const verified={id:'fixture-user',email:'fixture@example.invalid',email_confirmed_at:'2026-01-01T00:00:00Z',is_anonymous:false,user_metadata:{}};

test('Google starts only when the real provider is enabled',async()=>{
 const off=await boot({enabled:false});assert.equal(off.elements['#auth-google'].disabled,true);assert.equal(off.elements['#auth-google'].handlers.click,undefined);
 const on=await boot();assert.equal(on.elements['#auth-google'].disabled,false);await on.elements['#auth-google'].handlers.click();
 assert.equal(on.calls.oauth[0].provider,'google');assert.equal(on.calls.oauth[0].options.redirectTo,'https://promptreels.vercel.app/signin/');
 assert.equal(on.elements['#auth-email'].hidden,true);
});
test('Google consent works without asking for an email first',async()=>{
 const page=await boot({consent:true});await page.elements['#auth-google'].handlers.click();
 assert.equal(page.email.value,'');assert.equal(JSON.parse(page.local.getItem('pr-newsletter-consent-v1')).provider,'google');
 assert.equal(page.calls.subscribe,0);
 const returned=await boot({user:verified,local:page.local});assert.equal(returned.calls.subscribe,1);
 assert.equal(page.local.getItem('pr-newsletter-consent-v1'),null);
});
test('sign-in without newsletter consent never subscribes',async()=>{
 const page=await boot();await page.elements['#auth-google'].handlers.click();
 const returned=await boot({user:verified,local:page.local});assert.equal(returned.calls.subscribe,0);
});
test('expired consent is not applied after sign-in',async()=>{
 const local=storage();local.setItem('pr-newsletter-consent-v1',JSON.stringify({provider:'google',expires:Date.now()-1}));
 assert.equal((await boot({user:verified,local})).calls.subscribe,0);
});
test('continue links reject external destinations',async()=>{
 const external=await boot({user:verified,back:'//example.invalid/steal'});assert.equal(external.elements['#auth-continue'].href,'/library/');
 const own=await boot({user:verified,back:'/sections/?tag=hero'});assert.equal(own.elements['#auth-continue'].href,'/sections/?tag=hero');
});
