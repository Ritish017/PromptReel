import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=name=>readFileSync(new URL('../../static/'+name,import.meta.url),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup({elements={},buttons=[],saved=[],entries=Promise.resolve([])}={}){
 const window={addEventListener(){}};
 const context={window,document:{addEventListener(){},getElementById:id=>elements['#'+id]||null,querySelector:s=>elements[s]||null,querySelectorAll:s=>s==='[data-lib]'?buttons:[]},
  localStorage:{getItem:k=>k==='pr-saved'?JSON.stringify(saved):null,setItem(){}},
  location:{pathname:'/library/',search:'',host:'fixture.invalid'},navigator:{},matchMedia:()=>({matches:false}),
  fetch:async url=>({ok:true,json:()=>url==='/entries.json'?entries:Promise.resolve(url==='/sections.json'?[{id:'fixture',name:'Saved section fixture',cat:'Hero',html:'<p>Preview</p>'}]:{})}),
  setTimeout,clearTimeout,URLSearchParams,Date};
 return vm.createContext(context);
}

test('public classic scripts share a browser scope without declaration collisions',async()=>{
 const context=setup();
 for(const name of ['app.js','engagement.js','issues.js'])assert.doesNotThrow(()=>vm.runInContext(script(name),context),name);
 await tick();
});

test('a slow video response cannot hide the selected saved-sections tab',async()=>{
 let finishEntries;const entries=new Promise(resolve=>finishEntries=resolve);
 const element=()=>({hidden:false,innerHTML:'',className:'',classList:{toggle(){}}});
 const elements={'#saved':element(),'#saved-sec':element(),'#empty':element()};
 const buttons=['videos','sections'].map(tab=>({dataset:{lib:tab},classList:{toggle(){}}}));
 const context=setup({elements,buttons,saved:['sec:fixture'],entries});
 vm.runInContext(script('app.js'),context);
 buttons[1].onclick();await tick();
 assert.equal(elements['#saved-sec'].hidden,false);
 assert.match(elements['#saved-sec'].innerHTML,/Saved section fixture/);
 finishEntries([]);await tick();
 assert.equal(elements['#saved-sec'].hidden,false);
 assert.equal(elements['#saved'].hidden,true);
});
