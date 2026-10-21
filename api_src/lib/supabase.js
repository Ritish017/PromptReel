import { createClient } from '@supabase/supabase-js';
import config from './public-config.js';
export class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
export function db(token) {
 return createClient(process.env.SUPABASE_URL||config.url,process.env.SUPABASE_PUBLISHABLE_KEY||config.publishableKey,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
 global:{headers:token?{Authorization:'Bearer '+token}:{},fetch:(url,options={})=>fetch(url,{...options,signal:options.signal||AbortSignal.timeout(12000)})}
 });
}
export function serviceDb(){
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new HttpError(503,'Server integration is not configured');
 return createClient(process.env.SUPABASE_URL||config.url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function identity(req){
 const token=(req.headers.authorization||'').match(/^Bearer (\S+)$/)?.[1];
 if(!token)throw new HttpError(401,'Sign in to continue');
 const client=db(token);const {data,error}=await client.auth.getUser(token);
 if(error||!data.user?.email_confirmed_at||data.user.is_anonymous)throw new HttpError(401,'Confirm your email and sign in again');
 return {client,user:data.user};
}
export async function body(req){
 let value=req.body;
 if(value===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16000)throw new HttpError(413,'Request too large');}value=raw;}
 if(Buffer.isBuffer(value))value=value.toString('utf8');
 if(typeof value==='string'){if(Buffer.byteLength(value)>16000)throw new HttpError(413,'Request too large');try{value=JSON.parse(value||'{}')}catch{throw new HttpError(400,'Invalid JSON')}}
 if(!value||Array.isArray(value)||typeof value!=='object'||Buffer.byteLength(JSON.stringify(value))>16000)throw new HttpError(400,'Invalid request');
 return value;
}
export function checked(result){if(result.error)throw new HttpError(result.error.code==='42501'?403:503,'Could not save. Please try again.');return result.data;}
export function method(req,expected){if(req.method!==expected)throw new HttpError(405,'Method not allowed');}
export const validId=id=>typeof id==='string'&&/^[\w:-]{1,80}$/.test(id);
export function safe(handler){return async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');try{return await handler(req,res)}catch(e){if(!e.status)console.error('PromptReel API error',e.code||e.name);return res.status(e.status||500).json({error:e.status?e.message:'Service unavailable. Please try again.'});}}}
