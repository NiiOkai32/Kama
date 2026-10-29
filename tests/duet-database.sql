-- Run in a transaction and roll back; these fixtures are never committed.
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','duet-host-fixture@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','duet-guest-fixture@example.invalid'),
 ('10000000-0000-4000-8000-000000000003','duet-outsider-fixture@example.invalid');
do $test$
declare
 h uuid:='10000000-0000-4000-8000-000000000001';
 g uuid:='10000000-0000-4000-8000-000000000002';
 outsider uuid:='10000000-0000-4000-8000-000000000003';
 snapshot jsonb; rid uuid; cid uuid; v integer; blocked boolean;
begin
 blocked:=false;
 begin perform public.duet_command(h,'create',null,jsonb_build_object('display_name','Host','invite_hash',repeat('a',64)));exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Unpaid hosts cannot create a room';
 insert into public.duet_memberships(user_id,access_until,billing_provider,billing_reference) values(h,now()+interval '1 month','fixture','rollback-only');
 snapshot:=public.duet_command(h,'create',null,jsonb_build_object('display_name','Host','invite_hash',repeat('a',64)));
 rid:=(snapshot->'room'->>'id')::uuid;
 assert snapshot->'room'->>'invite_hash' is null,'Invite hashes do not appear in API snapshots';
 snapshot:=public.duet_command(g,'join',null,jsonb_build_object('display_name','Guest','invite_hash',repeat('a',64)));
 assert (snapshot->'room'->>'guest_id')::uuid=g,'An unpaid invited guest can join';
 blocked:=false;
 begin perform public.duet_command(outsider,'join',null,jsonb_build_object('display_name','Other','invite_hash',repeat('a',64)));exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'A third account cannot join';
 select revision into v from public.duet_rooms where id=rid;
 snapshot:=public.duet_command(h,'draw',rid,jsonb_build_object('revision',v,'card',jsonb_build_object('l',1,'k','Truth','n','Truth','t','Share a kind thought.','s',60)));
 cid:=(snapshot->'room'->>'card_id')::uuid;
 assert snapshot->'room'->>'host_reveal' is null,'No private prompt is stored before reveal';
 blocked:=false;
 begin perform public.duet_command(h,'timer_start',rid,jsonb_build_object('card_id',cid));exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'The shared timer requires readiness from both players';
 perform public.duet_command(h,'ready',rid,jsonb_build_object('card_id',cid));
 perform public.duet_command(g,'ready',rid,jsonb_build_object('card_id',cid));
 snapshot:=public.duet_command(g,'timer_start',rid,jsonb_build_object('card_id',cid));
 assert snapshot->'room'->>'timer_ends_at' is not null,'Either ready participant may start the shared timer';
 snapshot:=public.duet_command(h,'timer_pause',rid,jsonb_build_object('card_id',cid));
 assert snapshot->'room'->>'timer_ends_at' is null,'Pausing stops the shared deadline';
 snapshot:=public.duet_command(g,'reveal',rid,jsonb_build_object('card_id',cid,'text','A deliberately revealed fixture prompt.'));
 assert snapshot->'room'->>'guest_reveal'='A deliberately revealed fixture prompt.','A reveal is assigned to the authenticated actor only';
 blocked:=false;
 begin perform public.duet_command(h,'draw',rid,jsonb_build_object('revision',0,'card',jsonb_build_object('l',1,'n','Truth','t','Stale card','s',60)));exception when serialization_failure then blocked:=true;end;
 assert blocked,'Stale draws cannot overwrite a newer room revision';
 snapshot:=public.duet_command(g,'complete',rid,jsonb_build_object('card_id',cid));
 assert snapshot->'room'->>'outcome'='completed','Completion is shared';
 assert not has_function_privilege('authenticated','public.duet_command(uuid,text,uuid,jsonb)','EXECUTE'),'Browsers cannot impersonate actors through the service-only RPC';
 assert not has_table_privilege('authenticated','public.duet_memberships','INSERT'),'Clients cannot grant themselves membership';
 assert not has_table_privilege('authenticated','public.duet_rooms','UPDATE'),'Clients cannot forge room state';
end;
$test$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $test$ begin assert (select count(*) from public.duet_rooms)=1,'Host may read only their room'; end; $test$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $test$ begin assert (select count(*) from public.duet_rooms)=1,'Guest may read the invited room'; end; $test$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","user_metadata":{"premium":true}}',true);
do $test$ begin assert (select count(*) from public.duet_rooms)=0,'Outsiders cannot read rooms even with premium user metadata'; end; $test$;
reset role;
update public.duet_memberships set access_until=now()-interval '1 second' where user_id='10000000-0000-4000-8000-000000000001';
do $test$ begin
 assert (select status from public.duet_rooms where host_id='10000000-0000-4000-8000-000000000001')='closed','Membership expiry closes the room';
 assert (select card is null and host_reveal is null and guest_reveal is null from public.duet_rooms where host_id='10000000-0000-4000-8000-000000000001'),'Revocation clears shared content';
end; $test$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $test$ begin assert (select count(*) from public.duet_rooms)=0,'Membership expiry removes guest read access'; end; $test$;
reset role;
