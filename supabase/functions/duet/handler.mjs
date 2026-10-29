// No payment provider is enabled by this handler. Entitlements are server-owned.
const ACTIONS = new Set(['membership','create','join','resume','status','invite','leave','draw','ready','timer_start','timer_pause','complete','swap','reveal','checkout']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROOM_ACTIONS = new Set(['status','invite','leave','draw','ready','timer_start','timer_pause','complete','swap','reveal']);
const CARD_ACTIONS = new Set(['ready','timer_start','timer_pause','complete','swap','reveal']);
export class DuetError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
function text(value, maximum) { return typeof value === 'string' ? value.trim().slice(0, maximum) : ''; }
export function validateAction(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !ACTIONS.has(body.action)) throw new DuetError('Choose a valid Duet action.');
  const action = body.action;
  const payload = {};
  if (ROOM_ACTIONS.has(action) && !UUID.test(body.room_id || '')) throw new DuetError('Choose a room first.');
  if (CARD_ACTIONS.has(action)) {
    if (!UUID.test(body.card_id || '')) throw new DuetError('Choose the current card.');
    payload.card_id = body.card_id;
  }
  if (action === 'create' || action === 'join') {
    payload.display_name = text(body.display_name, 30);
    if (!payload.display_name) throw new DuetError('Enter your name first.');
  }
  if (action === 'join' && !/^[0-9a-f]{32}$/i.test(body.code || '')) throw new DuetError('Paste a valid invitation link or code.');
  if (action === 'draw') {
    const c = body.card;
    if (!c || typeof c !== 'object' || !Number.isInteger(c.l) || c.l < 0 || c.l > 3 ||
        !Number.isInteger(c.s) || c.s < 1 || c.s > 3600 || !text(c.n,160) || !text(c.t,1200) ||
        typeof c.n !== 'string' || c.n.length>160 || typeof c.t !== 'string' || c.t.length>1200) {
      throw new DuetError('Choose a valid shared card.');
    }
    if (!Number.isSafeInteger(body.revision) || body.revision < 0 || body.revision>2147483647) throw new DuetError('Reconnect to the current room.');
    payload.revision=body.revision;
    payload.card={l:c.l,n:c.n.trim(),t:c.t.trim(),s:c.s,k:text(c.k,40),q:c.q===true};
  }
  if (action === 'reveal') {
    if (typeof body.text !== 'string' || body.text.length>1200 || !body.text.trim()) throw new DuetError('Choose a private prompt first.');
    payload.text=body.text.trim();
  }
  return { action, room: ROOM_ACTIONS.has(action)?body.room_id:null, payload };
}
function namedKey(env, plural, legacy) {
  try { const parsed=JSON.parse(env(plural)||'{}'); if(typeof parsed.default==='string')return parsed.default; } catch {}
  return env(legacy)||'';
}
export function createDuetHandler({ env, fetcher=fetch, cryptoImpl=globalThis.crypto }) {
  const site=env('KAMA_SITE_URL')||'https://niiokai32.github.io/Kama/';
  let siteOrigin;try{siteOrigin=new URL(site).origin}catch{siteOrigin='https://niiokai32.github.io'}
  const origins=new Set([siteOrigin,...(env('DUET_ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean)]);
  return async function handle(request) {
    const origin=request.headers.get('Origin');
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
    if(origin&&origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
    const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
    try {
      if(origin&&!origins.has(origin))throw new DuetError('This site is not allowed to open Duet.',403);
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-api-version','Access-Control-Max-Age':'600'}});
      if(request.method!=='POST')throw new DuetError('Use a Duet action.',405);
      const authorization=request.headers.get('Authorization')||'';
      if(!/^Bearer\s+\S{20,8192}$/i.test(authorization))throw new DuetError('Sign in to use Duet.',401);
      if(Number(request.headers.get('Content-Length')||0)>20000)throw new DuetError('This request is too large.',413);
      const raw=await request.text();if(raw.length>20000)throw new DuetError('This request is too large.',413);
      let body;try{body=JSON.parse(raw)}catch{throw new DuetError('Choose a valid Duet action.')}
      const command=validateAction(body);
      const url=env('SUPABASE_URL')||'';
      const publicKey=namedKey(env,'SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
      const serverKey=namedKey(env,'SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
      if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url)||!publicKey||!serverKey)throw new DuetError('Duet setup is still being finished.',503);
      const userResponse=await fetcher(url+'/auth/v1/user',{headers:{apikey:publicKey,Authorization:authorization},signal:AbortSignal.timeout(10000)});
      if(!userResponse.ok)throw new DuetError('Sign in again to use Duet.',401);
      const user=await userResponse.json();if(!UUID.test(user.id||''))throw new DuetError('Sign in again to use Duet.',401);
      if(command.action==='checkout')throw new DuetError('Membership purchases are not available yet. No payment has been taken.',503);
      let inviteToken;
      if(command.action==='create'||command.action==='invite'||command.action==='join'){
        inviteToken=command.action==='join'?body.code.toLowerCase():Array.from(cryptoImpl.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
        const bytes=await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(inviteToken));
        command.payload.invite_hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
      }
      const rpcHeaders={apikey:serverKey,'Content-Type':'application/json'};
      if(!serverKey.startsWith('sb_secret_'))rpcHeaders.Authorization='Bearer '+serverKey;
      const response=await fetcher(url+'/rest/v1/rpc/duet_command',{method:'POST',headers:rpcHeaders,body:JSON.stringify({p_actor:user.id,p_action:command.action,p_room:command.room,p_payload:command.payload}),signal:AbortSignal.timeout(10000)});
      const data=await response.json();
      if(!response.ok){
        const status={'42501':403,'23505':409,'40001':409,'22023':400}[data.code];
        if(status)throw new DuetError(data.message,status);
        throw new DuetError('Duet is temporarily unavailable. Please try again.',503);
      }
      if(command.action==='membership')data.offer={currency:'USD',amount_minor:199,interval:'month',host_covers_partner:true,checkout_enabled:false};
      if(inviteToken&&command.action!=='join')data.invite_token=inviteToken;
      return reply(data);
    }catch(error){
      return reply({error:error instanceof DuetError?error.message:'Could not connect to Duet. Please try again.'},error instanceof DuetError?error.status:503);
    }
  };
}
