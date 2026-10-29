const {test}=require('node:test');const assert=require('node:assert/strict');const {DuetClient}=require('../duet-client.js');
const HOST='host',GUEST='guest';
const room=(revision=1,more={})=>({id:'room',host_id:HOST,guest_id:GUEST,revision,card_id:'card',host_seen_at:'2026-10-29T00:00:00Z',guest_seen_at:'2026-10-29T00:00:00Z',...more});
function client(options={}){return new DuetClient({userId:HOST,api:async()=>({room:room()}),subscribe:()=>()=>{},...options})}
test('subscribers cannot replace the room with an older revision or another room',()=>{
 const c=client();c.apply({room:room(5)});c.apply({room:room(4,{card_id:'stale'})});assert.equal(c.room.revision,5);assert.equal(c.room.card_id,'card');c.apply({room:room(9,{id:'other'})});assert.equal(c.room.id,'room');c.stop();
});
test('a nonmember snapshot is ignored',()=>{const c=client({userId:'stranger'});c.apply({room:room()});assert.equal(c.room,null)});
test('readiness changes arrive on both clients',()=>{
 const a=client(),b=client({userId:GUEST});a.attach({room:room()});b.attach({room:room()});const state=room(2,{host_ready:true,guest_ready:true});a.apply({room:state});b.apply({room:state});assert.equal(a.room.guest_ready,true);assert.equal(b.room.host_ready,true);a.stop();b.stop();
});
test('leaving cancels subscriptions and polling',async()=>{
 let stopped=0;const c=client({subscribe:()=>()=>{stopped++},api:async()=>({room:room(2,{status:'closed'})})});c.attach({room:room()});await c.command('leave');assert.equal(stopped,1);assert.equal(c.room,null);assert.equal(c.poll,null);
});
test('a stale create response cannot resurrect a stopped session',async()=>{
 let resolve;const c=client({api:()=>new Promise(r=>resolve=r)});const pending=c.create('Alex');c.stop();resolve({room:room()});assert.equal(await pending,null);assert.equal(c.room,null);assert.equal(c.poll,null);
});
test('late command responses cannot overwrite a new connection generation',async()=>{
 let resolve;const c=client({api:()=>new Promise(r=>resolve=r)});c.attach({room:room()});const pending=c.command('ready');c.stop();resolve({room:room(9)});await pending;assert.equal(c.room,null);
});
test('duplicate in-flight commands are rejected',async()=>{
 let resolve;const c=client({api:()=>new Promise(r=>resolve=r)});c.attach({room:room()});const pending=c.command('ready');await assert.rejects(c.command('draw'),/previous action/);resolve({room:room(2)});await pending;c.stop();
});
test('expired membership removes local room state',async()=>{
 const error=Object.assign(new Error('Membership expired'),{status:403});const c=client({api:async()=>{throw error}});c.attach({room:room()});await c.refresh();assert.equal(c.room,null);assert.equal(c.poll,null);
});
