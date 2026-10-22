import { db,checked,method,safe } from '../lib/supabase.js';
export default safe(async(req,res)=>{method(req,'GET');const data=checked(await db().rpc('pr_public_stats'));res.setHeader('Cache-Control','s-maxage=15, stale-while-revalidate=30');res.status(200).json(data);});
