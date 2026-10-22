import { db,checked,safe } from '../lib/supabase.js';
const valid=t=>/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(t);
export default safe(async(req,res)=>{
 const token=new URL(req.url,'https://promptreels.vercel.app').searchParams.get('t')||'';
 if(!valid(token))return res.status(400).send('Invalid unsubscribe link. Contact kurmaritish017@gmail.com.');
 res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Referrer-Policy','no-referrer');
 if(req.method==='GET')return res.status(200).send('<main style="font:18px system-ui;max-width:480px;margin:80px auto;padding:20px"><h1>Unsubscribe from PromptReel Weekly?</h1><form method="post"><button>Confirm unsubscribe</button></form><p>Your account and saved items stay available.</p></main>');
 if(req.method!=='POST')return res.status(405).end();
 checked(await db().rpc('pr_unsubscribe',{token}));res.status(200).send('<main style="font:18px system-ui;padding:40px"><h1>You are unsubscribed.</h1><a href="/">Back to PromptReel</a></main>');
});
