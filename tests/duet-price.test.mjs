import test from 'node:test';
import assert from 'node:assert/strict';
import {createPriceHandler} from '../supabase/functions/duet-price/handler.mjs';
import {USD_AMOUNT_MINOR,FX_SOURCE,validateRate,ghsAmountMinor} from '../supabase/functions/_shared/duet-pricing.mjs';
const START=Date.parse('2026-11-06T12:00:00Z');
const data=(now=START,rate=10.9)=>({result:'success',base_code:'USD',time_last_update_unix:Math.floor((now-3600000)/1000),time_next_update_unix:Math.floor((now+23*3600000)/1000),rates:{USD:1,GHS:rate,EUR:0.9}});
const request=(query='',origin='https://niiokai32.github.io')=>new Request('https://edge.example/functions/v1/duet-price'+query,{headers:{Origin:origin}});
test('US$2.99 converts to pesewas with nearest-cent rounding and no markup',()=>{
  assert.equal(USD_AMOUNT_MINOR,299);assert.equal(ghsAmountMinor(10.9),3259);assert.equal(ghsAmountMinor(7.5),2243);assert.equal(ghsAmountMinor(13),3887);
  for(const invalid of [0,-1,Infinity,NaN,'10.9',1000001])assert.throws(()=>ghsAmountMinor(invalid));
});
test('the public product quote cannot accept a caller-supplied price or currency',async()=>{
  const calls=[];const handler=createPriceHandler({now:()=>START,fetcher:async(url,options)=>{calls.push({url,options});return Response.json(data())}});
  assert.equal((await handler(request('?amount_minor=1&currency=USD'))).status,400);assert.equal(calls.length,0);
  const response=await handler(request());const value=await response.json();assert.equal(response.status,200);assert.equal(value.offer.amount_minor,299);assert.equal(value.local_price.amount_minor,3259);assert.equal(value.local_price.currency,'GHS');assert.equal(value.checkout_enabled,false);
  assert.equal(calls[0].url,FX_SOURCE);assert.deepEqual(calls[0].options.headers,{Accept:'application/json'});
  assert.equal(value.purpose,'price_display_only');assert.equal(value.rates,undefined);assert.equal(value.exchange_rate,undefined);assert.equal(value.user_id,undefined);
  assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(Date.parse(value.display_valid_until)-START,15*60*1000);
});
test('expired, future, missing and invalid upstream rates fail closed',async()=>{
  const invalid=[{...data(),base_code:'GHS'},{...data(),rates:{USD:1}}, {...data(),rates:{USD:1,GHS:-2}}, {...data(),time_last_update_unix:START/1000+3600},{...data(),time_next_update_unix:START/1000-1},{...data(),time_last_update_unix:START/1000-28*3600}];
  for(const value of invalid){assert.throws(()=>validateRate(value,START));const handler=createPriceHandler({now:()=>START,fetcher:async()=>Response.json(value)});const response=await handler(request());assert.equal(response.status,503);const body=await response.json();assert.equal(body.local_price,null);assert.equal(body.offer.amount_minor,299);assert.equal(body.checkout_enabled,false)}
});
test('concurrent requests share a rate fetch; the daily source is cached for an hour',async()=>{
  let time=START,calls=0;const handler=createPriceHandler({now:()=>time,fetcher:async()=>{calls++;await Promise.resolve();return Response.json(data(time,calls===1?10.9:13))}});
  const results=await Promise.all(Array.from({length:5},()=>handler(request())));assert(results.every(r=>r.status===200));assert.equal(calls,1);
  time+=59*60*1000;assert.equal((await (await handler(request())).json()).local_price.amount_minor,3259);assert.equal(calls,1);
  time+=2*60*1000;assert.equal((await (await handler(request())).json()).local_price.amount_minor,3887);assert.equal(calls,2);
});
test('a quote expires at the announced daily update and is never served after it',async()=>{
  let time=START;let calls=0;const old={...data(),time_next_update_unix:(START+30000)/1000};
  const handler=createPriceHandler({now:()=>time,fetcher:async()=>{calls++;return Response.json(old)}});
  const first=await (await handler(request())).json();assert.equal(Date.parse(first.display_valid_until),START+30000);
  time+=31000;const later=await handler(request());assert.equal(later.status,503);assert.equal((await later.json()).local_price,null);assert.equal(calls,2);
});
test('an outage has a short retry cooldown and no stale or hardcoded GHS fallback',async()=>{
  let time=START,calls=0;const handler=createPriceHandler({now:()=>time,fetcher:()=>{calls++;if(calls===1)throw new Error('private upstream error');return Promise.resolve(Response.json(data(time)))}});
  const failed=await handler(request());assert.equal(failed.status,503);assert(!(await failed.text()).includes('private upstream'));
  assert.equal((await handler(request())).status,503);assert.equal(calls,1);
  time+=61000;assert.equal((await handler(request())).status,200);assert.equal(calls,2);
});
test('CORS and methods reject before external work; the endpoint has no payment operation',async()=>{
  let calls=0;const handler=createPriceHandler({now:()=>START,fetcher:async()=>{calls++;return Response.json(data())}});
  assert.equal((await handler(request('','https://untrusted.example'))).status,403);
  assert.equal((await handler(new Request('https://edge.example',{method:'POST',body:'{"action":"checkout","paid":true}'}))).status,405);
  const preflight=await handler(new Request('https://edge.example',{method:'OPTIONS',headers:{Origin:'https://niiokai32.github.io'}}));assert.equal(preflight.status,204);assert.equal(calls,0);
});
test('provider errors and oversized responses do not produce a GHS amount',async()=>{
  for(const response of [new Response('blocked',{status:429}),new Response('{broken'),new Response('x'.repeat(200001))]){
    const handler=createPriceHandler({now:()=>START,fetcher:async()=>response});const result=await handler(request());assert.equal(result.status,503);assert.equal((await result.json()).local_price,null);
  }
});
