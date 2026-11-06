import {duetOffer,validateRate,displayPrice,FX_SOURCE} from '../_shared/duet-pricing.mjs';

// A fixed product-price preview, not a general exchange-rate proxy or checkout.
// No Auth lookup, database access, Paystack call or personal data is involved.
export function createPriceHandler({env=()=>'',fetcher=fetch,now=Date.now}) {
  let site;try{site=new URL(env('KAMA_SITE_URL')||'https://niiokai32.github.io/Kama/').origin}catch{site='https://niiokai32.github.io'}
  const origins=new Set([site,...(env('DUET_ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean)]);
  let cached=null,refreshAt=0,inflight=null,retryAt=0;
  async function rate() {
    const time=now();
    if(cached&&time<refreshAt&&time<cached.next)return cached;
    if(inflight)return inflight;
    if(time<retryAt)throw new Error('Rate service temporarily unavailable.');
    inflight=(async()=>{
      try{
        const response=await fetcher(FX_SOURCE,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(6000)});
        if(!response.ok||Number(response.headers.get('Content-Length')||0)>200000)throw new Error('Rate provider unavailable.');
        const raw=await response.text();if(raw.length>200000)throw new Error('Invalid rate response.');
        cached=validateRate(JSON.parse(raw),now());refreshAt=Math.min(now()+60*60*1000,cached.next);retryAt=0;
        return cached;
      }catch(error){cached=null;retryAt=now()+60000;throw error}
    })().finally(()=>{inflight=null});
    return inflight;
  }
  return async request=>{
    const origin=request.headers.get('Origin');
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
    if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
    const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
    if(origin&&!origins.has(origin))return reply({error:'This site is not allowed.'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'apikey, content-type, x-client-info, x-supabase-api-version','Access-Control-Max-Age':'600'}});
    if(request.method!=='GET')return reply({error:'Use a price request.'},405);
    if(new URL(request.url).search)return reply({error:'This product has a server-defined price.'},400);
    try{return reply(displayPrice(await rate(),now()))}
    catch{return reply({offer:duetOffer(),local_price:null,error:'The current GHS price is unavailable. Please try again.',code:'FX_UNAVAILABLE',checkout_enabled:false},503)}
  };
}
