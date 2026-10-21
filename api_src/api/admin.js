import { identity,checked,method,safe,HttpError } from '../lib/supabase.js';
export default safe(async(req,res)=>{method(req,'GET');const {client,user}=await identity(req);
 if(user.email?.toLowerCase()!=='kurmaritish017@gmail.com')throw new HttpError(403,'Admin only');
 const rows=checked(await client.from('pr_subscriptions').select('email,state,consent_at,source,updated_at').order('consent_at',{ascending:false}).limit(1000));
 res.status(200).json({total:rows.length,active:rows.filter(r=>r.state==='active').length,rows});});
