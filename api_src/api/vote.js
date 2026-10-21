import { identity,body,checked,method,safe,validId,HttpError } from '../lib/supabase.js';
export default safe(async(req,res)=>{method(req,'POST');const {client,user}=await identity(req);const {id,value}=await body(req);if(!validId(id)||![1,-1,0].includes(value))throw new HttpError(400,'Invalid vote');
 if(value===0)checked(await client.from('pr_votes').delete().eq('user_id',user.id).eq('entry_id',id));else checked(await client.from('pr_votes').upsert({user_id:user.id,entry_id:id,value},{onConflict:'user_id,entry_id'}));
 const data=checked(await client.rpc('pr_public_stats'));res.status(200).json(data[id]||{u:0,d:0,c:0});});
