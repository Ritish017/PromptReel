import { trending } from './api/repos.js';
import fs from 'node:fs';
for(const [view,name] of [['daily','repo_daily'],['weekly','repo_week']]){
 const items=(await trending(view,'')).sort((a,b)=>b.gain-a.gain);
 if(!items.length)throw Error('Source returned no repositories');
 fs.writeFileSync(new URL('../data/newsletter/'+name+'.json',import.meta.url),JSON.stringify({retrieved_at:new Date().toISOString(),source:'GitHub Trending '+view+' subset',items},null,2));
 console.log(view,items.length,'repositories');
}
