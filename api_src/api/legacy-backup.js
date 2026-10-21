// One-time, authenticated copy. This endpoint never deletes public objects.
import {list,del} from '@vercel/blob';
import {createHash,timingSafeEqual} from 'node:crypto';
import {safe,method,body,HttpError} from '../lib/supabase.js';
import config from '../lib/public-config.js';
export default safe(async(req,res)=>{
 method(req,'POST');
 const supplied=String(req.headers['x-promptreel-job']||''),expected=process.env.PR_MIGRATION_SECRET;
 if(!expected||supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))throw new HttpError(401,'Unauthorized');
 if(!process.env.BLOB_READ_WRITE_TOKEN)throw new HttpError(503,'Legacy store is not connected');
 const input=await body(req),cleanup=input.confirm==='delete-three-verified-public-originals';
 const records=[];const urls=[];let cursor;
 do{
  const page=await list({limit:100,cursor,token:process.env.BLOB_READ_WRITE_TOKEN});
  for(const blob of page.blobs){
   if(records.length>=100)throw new HttpError(413,'Legacy inventory exceeds the reviewed migration limit');
   const response=await fetch(blob.url,{signal:AbortSignal.timeout(10000),cache:'no-store'});
   if(!response.ok)throw new HttpError(503,'Could not read a legacy object');
   const body=await response.text();if(Buffer.byteLength(body)>20000)throw new HttpError(413,'Legacy object exceeds reviewed size');
   urls.push(blob.url);records.push({pathname:blob.pathname,body,sha256:createHash('sha256').update(body).digest('hex')});
  }
  cursor=page.hasMore?page.cursor:undefined;
 }while(cursor);
 if(cleanup&&(records.length!==3||records.reduce((n,r)=>n+Buffer.byteLength(r.body),0)!==420))throw new HttpError(409,'Legacy inventory changed; review required');
 const response=await fetch(config.url+'/functions/v1/promptreel-jobs',{method:'POST',headers:{'Content-Type':'application/json','x-promptreel-job':expected},body:JSON.stringify({kind:'legacy-copy',records}),signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new HttpError(503,'Private backup verification failed');
 const result=await response.json();
 if(cleanup){
  if(result.copied!==3||result.verified!==3)throw new HttpError(409,'All three private backups must verify before deletion');
  await del(urls,{token:process.env.BLOB_READ_WRITE_TOKEN});
  const remaining=await list({limit:100,token:process.env.BLOB_READ_WRITE_TOKEN});
  if(remaining.blobs.length||remaining.hasMore)throw new HttpError(503,'Public cleanup needs review');
  result.publicObjectsDeleted=3;result.publicObjectsRemaining=0;
 }res.status(200).json(result);
});
