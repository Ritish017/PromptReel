import { identity,checked,method,safe } from '../lib/supabase.js';
export default safe(async(req,res)=>{method(req,'POST');const {client,user}=await identity(req);const name=String(user.user_metadata?.full_name||user.user_metadata?.name||'Member').replace(/[<>]/g,'').slice(0,80);
 checked(await client.from('pr_profiles').upsert({user_id:user.id,display_name:name},{onConflict:'user_id'}));res.status(200).json({ok:true,name});});
