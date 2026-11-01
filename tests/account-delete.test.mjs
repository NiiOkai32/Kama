import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountDelete} from '../supabase/functions/account-delete/handler.mjs';
const ID='11111111-1111-4111-8111-111111111111';
const vars={SUPABASE_URL:'https://eqvzzfivcujfwdfdvodm.supabase.co',SUPABASE_PUBLISHABLE_KEYS:'{"default":"sb_publishable_fixture"}',SUPABASE_SECRET_KEYS:'{"default":"sb_secret_fixture"}'};
const request=(body={confirmation:'DELETE',password:'fixture-password'},headers={})=>new Request('https://edge.example',{method:'POST',headers:{Origin:'https://niiokai32.github.io',Authorization:'Bearer user-session-fixture-token',...headers},body:JSON.stringify(body)});
function fixture({userStatus=200,passwordStatus=200,freshId=ID,logoutStatus=204,cleanStatus=204,deleteStatus=200}={}){
  const calls=[];
  const handle=createAccountDelete({env:k=>vars[k],fetcher:async(url,options)=>{
    calls.push({url,options});
    if(url.endsWith('/auth/v1/user'))return Response.json({id:ID,email:'fixture@example.invalid'},{status:userStatus});
    if(url.includes('/token?'))return Response.json({user:{id:freshId},access_token:'fresh-session-fixture-token'},{status:passwordStatus});
    if(url.includes('/logout?'))return new Response(null,{status:logoutStatus});
    if(url.includes('/rest/v1/'))return new Response(null,{status:cleanStatus});
    return Response.json({id:ID},{status:deleteStatus});
  }});return {calls,handle};
}
test('missing or invalid user session cannot attempt reauthentication or deletion',async()=>{
  const a=fixture();assert.equal((await a.handle(request(undefined,{Authorization:''}))).status,401);assert.equal(a.calls.length,0);
  const b=fixture({userStatus:401});assert.equal((await b.handle(request())).status,401);assert.equal(b.calls.length,1);
});
test('typed confirmation and current password are mandatory',async()=>{
  for(const body of [{confirmation:'delete',password:'x'},{confirmation:'DELETE'},{confirmation:'DELETE',password:''}]){
    const f=fixture();assert.equal((await f.handle(request(body))).status,400);assert.equal(f.calls.length,0);
  }
});
test('a failed password cannot revoke sessions, alter rooms or delete users',async()=>{
  const f=fixture({passwordStatus:400});assert.equal((await f.handle(request())).status,403);assert.equal(f.calls.length,2);
  const limited=fixture({passwordStatus:429});assert.equal((await limited.handle(request())).status,429);
});
test('reauthentication must match the original verified caller',async()=>{
  const f=fixture({freshId:'22222222-2222-4222-8222-222222222222'});assert.equal((await f.handle(request())).status,403);assert.equal(f.calls.length,2);
});
test('forged target IDs and emails are ignored; only the authenticated caller is deleted',async()=>{
  const f=fixture();const result=await f.handle(request({confirmation:'DELETE',password:'fixture-password',user_id:'attacker-target',email:'other@example.invalid'}));
  assert.equal(result.status,200);assert.deepEqual(await result.json(),{deleted:true});
  assert.equal(JSON.parse(f.calls[1].options.body).email,'fixture@example.invalid');
  assert.match(f.calls[2].url,/logout\?scope=global$/);assert.match(f.calls[3].url,new RegExp(ID));
  assert.deepEqual(JSON.parse(f.calls[3].options.body),{status:'closed',guest_id:null,guest_name:null,guest_seen_at:null,card:null,card_id:null,host_reveal:null,guest_reveal:null,timer_ends_at:null});
  assert.equal(f.calls[4].url,vars.SUPABASE_URL+'/auth/v1/admin/users/'+ID);assert.equal(f.calls[4].options.method,'DELETE');
  assert.equal(f.calls[4].options.headers.Authorization,undefined);assert.equal(f.calls[4].options.headers.apikey,'sb_secret_fixture');
});
test('session revocation or room-cleanup failure prevents deletion',async()=>{
  const a=fixture({logoutStatus:500});assert.equal((await a.handle(request())).status,503);assert.equal(a.calls.length,3);
  const b=fixture({cleanStatus:500});assert.equal((await b.handle(request())).status,503);assert.equal(b.calls.length,4);
});
test('CORS, request-size and method guards reject before privileged work',async()=>{
  const f=fixture();assert.equal((await f.handle(request(undefined,{Origin:'https://other.example'}))).status,403);
  assert.equal((await f.handle(request({confirmation:'DELETE',password:'x'.repeat(3000)}))).status,413);
  assert.equal((await f.handle(new Request('https://edge.example'))).status,405);assert.equal(f.calls.length,0);
});
test('provider errors never leak credentials or claim successful deletion',async()=>{
  const f=fixture({deleteStatus:500});const r=await f.handle(request());assert.equal(r.status,503);const text=await r.text();assert(!text.includes('fixture-password'));assert(!text.includes('sb_secret'));assert(!text.includes('"deleted":true'));
});
