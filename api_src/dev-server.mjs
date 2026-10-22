import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain; charset=utf-8','.xml':'application/xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(/^\/api\/[a-z-]+$/.test(url.pathname)){
   req.query=Object.fromEntries(url.searchParams);const name=url.pathname.slice(5);
   const {default:handler}=await import('./api/'+name+'.js');
   res.status=n=>{res.statusCode=n;return res};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))};res.send=value=>res.end(value);
   return await handler(req,res);
  }
  let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(8000,'127.0.0.1',()=>console.log('PromptReel local preview: http://127.0.0.1:8000'));
