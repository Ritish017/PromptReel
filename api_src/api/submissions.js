import { identity,body,checked,method,safe,HttpError } from '../lib/supabase.js';
export default safe(async(req,res)=>{method(req,'POST');const {client,user}=await identity(req);const data=await body(req);let url;try{url=new URL(data.url)}catch{throw new HttpError(400,'Enter a valid source URL')}
 if(url.protocol!=='https:'||!['x.com','github.com','www.youtube.com','youtube.com','youtu.be'].includes(url.hostname))throw new HttpError(400,'Use an HTTPS X, GitHub or YouTube source');
 const prompt=String(data.prompt||'').trim();if(data.permission!==true||prompt.length<2||prompt.length>12000)throw new HttpError(400,'Include your prompt and confirm permission');
 checked(await client.from('pr_submissions').insert({user_id:user.id,post_url:url.href,prompt_text:prompt,permission_confirmed:true}));
 res.status(201).json({ok:true,state:'pending'});});
