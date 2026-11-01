// The only account that may be deleted is the verified, freshly reauthenticated caller.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function key(env,plural,legacy){try{const k=JSON.parse(env(plural)||'{}').default;if(typeof k==='string')return k}catch{}return env(legacy)||''}
export function createAccountDelete({env,fetcher=fetch}){
  const origin=new URL(env('KAMA_SITE_URL')||'https://niiokai32.github.io/Kama/').origin;
  const origins=new Set([origin,...(env('DUET_ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean)]);
  return async request=>{
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
    const from=request.headers.get('Origin');if(origins.has(from))headers['Access-Control-Allow-Origin']=from;
    const reply=(error,status)=>new Response(JSON.stringify(typeof error==='string'?{error}:error),{status,headers});
    try{
      if(from&&!origins.has(from))return reply('This site is not allowed.',403);
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-api-version'}});
      if(request.method!=='POST')return reply('Use the account deletion form.',405);
      const authorization=request.headers.get('Authorization')||'';
      if(!/^Bearer\s+\S{20,8192}$/i.test(authorization))return reply('Sign in again.',401);
      if(Number(request.headers.get('Content-Length')||0)>2048)return reply('Request too large.',413);
      const raw=await request.text();if(raw.length>2048)return reply('Request too large.',413);
      let body;try{body=JSON.parse(raw)}catch{return reply('Use the account deletion form.',400)}
      if(body?.confirmation!=='DELETE'||typeof body.password!=='string'||!body.password||body.password.length>256)return reply('Enter your password and type DELETE.',400);
      const url=env('SUPABASE_URL'),publicKey=key(env,'SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY'),serverKey=key(env,'SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
      if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url||'')||!publicKey||!serverKey)return reply('Account service is unavailable.',503);
      const call=(path,options={})=>fetcher(url+path,{...options,signal:AbortSignal.timeout(15000)});
      const verified=await call('/auth/v1/user',{headers:{apikey:publicKey,Authorization:authorization}});
      if(!verified.ok)return reply('Sign in again.',401);
      const user=await verified.json();if(!UUID.test(user.id||'')||typeof user.email!=='string')return reply('Sign in again.',401);
      // Never accept a target user ID or email from the request body.
      const fresh=await call('/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:publicKey,'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:body.password})});
      if(!fresh.ok)return reply(fresh.status===429?'Please wait before trying again.':'Your password could not be verified.',fresh.status===429?429:403);
      const session=await fresh.json();if(session.user?.id!==user.id||!session.access_token)return reply('Your password could not be verified.',403);
      const service={apikey:serverKey,'Content-Type':'application/json'};if(!serverKey.startsWith('sb_secret_'))service.Authorization='Bearer '+serverKey;
      // Global sign-out revokes refresh tokens before deletion. Existing access JWTs
      // expire normally; user lookups and room commands also verify the user exists.
      const logout=await call('/auth/v1/logout?scope=global',{method:'POST',headers:{apikey:serverKey,Authorization:'Bearer '+session.access_token}});
      if(!logout.ok)return reply('Could not revoke sessions. Sign in again and retry.',503);
      const clean=await call('/rest/v1/duet_rooms?or=(host_id.eq.'+user.id+',guest_id.eq.'+user.id+')',{method:'PATCH',headers:service,body:JSON.stringify({status:'closed',guest_id:null,guest_name:null,guest_seen_at:null,card:null,card_id:null,host_reveal:null,guest_reveal:null,timer_ends_at:null})});
      if(!clean.ok)return reply('Could not close shared rooms. Sign in again and retry.',503);
      const deleted=await call('/auth/v1/admin/users/'+user.id,{method:'DELETE',headers:service,body:JSON.stringify({should_soft_delete:false})});
      if(!deleted.ok)return reply('Account deletion failed. Sign in again and retry.',503);
      return reply({deleted:true},200);
    }catch{return reply('Account service is temporarily unavailable. Please try again.',503)}
  };
}
