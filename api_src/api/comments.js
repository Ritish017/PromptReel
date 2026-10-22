import { db,identity,body,checked,safe,validId,HttpError } from '../lib/supabase.js';
const render=rows=>rows.map(x=>({id:x.id,n:x.author_name,p:'',t:x.body,ts:Date.parse(x.created_at)}));
export default safe(async(req,res)=>{
 const input=req.method==='POST'?await body(req):{};const id=req.method==='GET'?req.query.id:input.id;if(!validId(id))throw new HttpError(400,'Invalid entry');
 if(req.method==='GET'){const rows=checked(await db().from('pr_comments').select('id,entry_id,author_name,body,created_at').eq('entry_id',id).order('created_at',{ascending:false}).limit(100));return res.status(200).json(render(rows.reverse()));}
 if(req.method!=='POST')throw new HttpError(405,'Method not allowed');
 const {client,user}=await identity(req);const text=String(input.text||'').trim();if(text.length<2||text.length>600)throw new HttpError(400,'Use 2 to 600 characters');
 const name=String(user.user_metadata?.full_name||user.user_metadata?.name||'Member').replace(/[<>]/g,'').slice(0,80);
 checked(await client.from('pr_comments').insert({user_id:user.id,entry_id:id,author_name:name,body:text}));
 const rows=checked(await client.from('pr_comments').select('id,entry_id,author_name,body,created_at').eq('entry_id',id).order('created_at',{ascending:false}).limit(100));
 res.status(200).json(render(rows.reverse()));
});
