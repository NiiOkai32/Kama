import test from 'node:test';
import assert from 'node:assert/strict';
import { createDuetHandler, validateAction } from '../supabase/functions/duet/handler.mjs';
const HOST='11111111-1111-4111-8111-111111111111',GUEST='22222222-2222-4222-8222-222222222222',ROOM='33333333-3333-4333-8333-333333333333',CARD='44444444-4444-4444-8444-444444444444';
const vars={SUPABASE_URL:'https://eqvzzfivcujfwdfdvodm.supabase.co',SUPABASE_PUBLISHABLE_KEYS:'{"default":"sb_publishable_fixture"}',SUPABASE_SECRET_KEYS:'{"default":"sb_secret_fixture"}'};
function request(body,headers={}){return new Request('https://edge.example/functions/v1/duet',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://niiokai32.github.io',Authorization:'Bearer user-session-token-fixture',...headers},body:JSON.stringify(body)})}
function fixture({rpcResult={premium:false},rpcStatus=200,authStatus=200}={}){
 const calls=[];const handle=createDuetHandler({env:key=>vars[key],fetcher:async(url,options)=>{calls.push({url,options});return url.endsWith('/auth/v1/user')?Response.json(authStatus===200?{id:HOST}:{error:'invalid'},{status:authStatus}):Response.json(rpcResult,{status:rpcStatus})}});return {handle,calls};
}
test('requests require a validated user session',async()=>{
 const {handle,calls}=fixture();const response=await handle(request({action:'membership'},{Authorization:''}));assert.equal(response.status,401);assert.equal(calls.length,0);
 const failed=fixture({authStatus:401});assert.equal((await failed.handle(request({action:'membership'}))).status,401);assert.equal(failed.calls.length,1);
});
test('actor, entitlement and price fields in request JSON are never trusted',async()=>{
 const {handle,calls}=fixture();const response=await handle(request({action:'membership',user_id:GUEST,premium:true,price:0}));assert.equal(response.status,200);
 const rpc=JSON.parse(calls[1].options.body);assert.equal(rpc.p_actor,HOST);assert.equal(rpc.p_payload.premium,undefined);assert.equal(rpc.p_payload.price,undefined);
 const data=await response.json();assert.equal(data.premium,false);assert.equal(data.offer.amount_minor,199);assert.equal(data.offer.checkout_enabled,false);
 assert.equal(calls[0].options.headers.apikey,'sb_publishable_fixture');assert.equal(calls[1].options.headers.apikey,'sb_secret_fixture');assert.equal(calls[1].options.headers.Authorization,undefined);
 assert(!JSON.stringify(data).includes('sb_secret'));
});
test('room creation generates a 128-bit token and only stores its hash',async()=>{
 const {handle,calls}=fixture({rpcResult:{room:{id:ROOM,host_id:HOST,guest_id:null}}});const response=await handle(request({action:'create',display_name:'Alex',invite_hash:'attacker-controlled'}));
 const data=await response.json();assert.match(data.invite_token,/^[0-9a-f]{32}$/);const rpc=JSON.parse(calls[1].options.body);assert.match(rpc.p_payload.invite_hash,/^[0-9a-f]{64}$/);assert.notEqual(rpc.p_payload.invite_hash,'attacker-controlled');assert.equal(rpc.p_payload.display_name,'Alex');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data.invite_token));assert.equal(rpc.p_payload.invite_hash,Buffer.from(digest).toString('hex'));
});
test('expired or absent premium access is enforced by the room transaction',async()=>{
 const {handle}=fixture({rpcStatus:403,rpcResult:{code:'42501',message:'A Duet membership is required to host.'}});const r=await handle(request({action:'create',display_name:'Alex',premium:true}));assert.equal(r.status,403);assert.match((await r.json()).error,/membership/);
});
test('draws validate and strip payloads; stale revisions are reported as conflicts',async()=>{
 const {handle,calls}=fixture({rpcStatus:409,rpcResult:{code:'40001',message:'The room changed. Try again.'}});
 const r=await handle(request({action:'draw',room_id:ROOM,revision:4,card:{l:1,n:'A shared card',t:'A kind thought.',s:60,image:'private image',answer:'private answer'}}));assert.equal(r.status,409);
 const payload=JSON.parse(calls[1].options.body).p_payload;assert.equal(payload.card.image,undefined);assert.equal(payload.card.answer,undefined);assert.equal(payload.revision,4);
 assert.throws(()=>validateAction({action:'draw',room_id:ROOM,revision:1,card:{l:99,n:'x',t:'x',s:60}}));
 assert.throws(()=>validateAction({action:'draw',room_id:ROOM,revision:1,card:{l:1,n:'x',t:'x'.repeat(1201),s:60}}));
});
test('checkout fails closed and does not call a payment provider',async()=>{
 const {handle,calls}=fixture();const response=await handle(request({action:'checkout',paid:true,amount:1}));assert.equal(response.status,503);assert.match((await response.json()).error,/No payment/);assert.equal(calls.length,1);
});
test('CORS, method and body-size boundaries are enforced',async()=>{
 const {handle,calls}=fixture();assert.equal((await handle(request({action:'membership'},{Origin:'https://untrusted.example'}))).status,403);
 assert.equal((await handle(new Request('https://edge.example',{method:'GET'}))).status,405);
 const large=request({action:'reveal',room_id:ROOM,card_id:CARD,text:'x'.repeat(21000)});assert.equal((await handle(large)).status,413);assert.equal(calls.length,0);
 const options=await handle(new Request('https://edge.example',{method:'OPTIONS',headers:{Origin:'https://niiokai32.github.io'}}));assert.equal(options.status,204);assert.equal(options.headers.get('Access-Control-Allow-Origin'),'https://niiokai32.github.io');
});
test('malformed invitations and stale-card actions cannot reach privileged RPC',()=>{
 assert.throws(()=>validateAction({action:'join',code:'1234',display_name:'Alex'}));assert.throws(()=>validateAction({action:'ready',room_id:ROOM,card_id:'old-card'}));
 assert.throws(()=>validateAction({action:'reveal',room_id:ROOM,card_id:CARD,text:''}));
});
