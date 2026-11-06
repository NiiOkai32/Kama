-- Duet membership is granted by a trusted billing backend, never by browser input.
create table public.duet_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_until timestamptz not null,
  billing_provider text not null,
  billing_reference text not null,
  updated_at timestamptz not null default now()
);
alter table public.duet_memberships enable row level security;
revoke all on public.duet_memberships from public, anon, authenticated;
grant select (user_id, access_until) on public.duet_memberships to authenticated;
grant all on public.duet_memberships to service_role;
create policy "Members can read their own access" on public.duet_memberships
  for select to authenticated using (user_id = (select auth.uid()));

create table public.duet_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid references auth.users(id) on delete set null,
  host_name text not null check (char_length(host_name) between 1 and 30),
  guest_name text check (char_length(guest_name) between 1 and 30),
  invite_hash text unique not null check (invite_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'open' check (status in ('open','closed')),
  access_until timestamptz not null,
  expires_at timestamptz not null default now() + interval '24 hours',
  revision integer not null default 0,
  round integer not null default 0,
  card_id uuid,
  card jsonb,
  host_ready boolean not null default false,
  guest_ready boolean not null default false,
  leader_index integer not null default 0 check (leader_index in (0,1)),
  remaining_seconds integer not null default 0 check (remaining_seconds between 0 and 3600),
  timer_ends_at timestamptz,
  outcome text check (outcome in ('completed','skipped')),
  host_reveal text check (char_length(host_reveal) <= 1200),
  guest_reveal text check (char_length(guest_reveal) <= 1200),
  host_seen_at timestamptz not null default now(),
  guest_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (guest_id is null or guest_id <> host_id),
  check (card is null or (jsonb_typeof(card) = 'object' and octet_length(card::text) <= 8000))
);
create unique index duet_one_room_per_host on public.duet_rooms(host_id) where status = 'open';
create index duet_room_host on public.duet_rooms(host_id);
create index duet_room_guest on public.duet_rooms(guest_id);
create index duet_room_expiration on public.duet_rooms(expires_at);
alter table public.duet_rooms enable row level security;
revoke all on public.duet_rooms from public, anon, authenticated;
grant select on public.duet_rooms to authenticated;
grant all on public.duet_rooms to service_role;
create policy "Only active room participants can read rooms" on public.duet_rooms
  for select to authenticated using (
    status = 'open' and access_until > now() and expires_at > now()
    and ((select auth.uid()) = host_id or (select auth.uid()) = guest_id)
  );

-- Revoking access also revokes room reads, including existing Realtime subscribers.
create function public.duet_membership_changed() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op='DELETE' then
    update public.duet_rooms set status='closed',access_until=now(),card=null,host_reveal=null,guest_reveal=null,timer_ends_at=null,updated_at=now() where host_id=old.user_id and status='open';
    return old;
  end if;
  update public.duet_rooms set
    access_until = least(new.access_until, expires_at),
    status = case when new.access_until <= now() then 'closed' else status end,
    card = case when new.access_until <= now() then null else card end,
    host_reveal = case when new.access_until <= now() then null else host_reveal end,
    guest_reveal = case when new.access_until <= now() then null else guest_reveal end,
    updated_at = now()
  where host_id = new.user_id and status = 'open';
  return new;
end;
$$;
revoke all on function public.duet_membership_changed() from public, anon, authenticated;
create trigger duet_membership_access_changed after update of access_until on public.duet_memberships
  for each row execute function public.duet_membership_changed();
create trigger duet_membership_deleted after delete on public.duet_memberships
  for each row execute function public.duet_membership_changed();

-- Only the authenticated Edge Function may execute this command transaction.
-- It supplies p_actor from auth.getUser(), not from request JSON.
create function public.duet_command(p_actor uuid, p_action text, p_room uuid default null, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  r public.duet_rooms%rowtype;
  m public.duet_memberships%rowtype;
  seconds integer;
  display_name text := left(btrim(coalesce(p_payload->>'display_name','Player')),30);
  is_host boolean;
begin
  if p_actor is null then raise exception 'Sign in to use Duet.' using errcode = '42501'; end if;
  if p_action = 'membership' then
    select * into m from public.duet_memberships where user_id = p_actor;
    return jsonb_build_object('premium',coalesce(m.access_until > now(),false),'access_until',m.access_until,'server_now',now());
  end if;
  if p_action = 'resume' then
    select * into r from public.duet_rooms where status='open' and expires_at>now() and access_until>now()
      and (host_id=p_actor or guest_id=p_actor) order by updated_at desc limit 1;
    if not found then return jsonb_build_object('room',null,'server_now',now()); end if;
  elsif p_action = 'create' then
    select * into m from public.duet_memberships where user_id=p_actor for update;
    if not found or m.access_until<=now() then raise exception 'A Duet membership is required to host.' using errcode='42501'; end if;
    if display_name='' or coalesce(p_payload->>'invite_hash','') !~ '^[0-9a-f]{64}$' then raise exception 'Invalid room details.' using errcode='22023'; end if;
    update public.duet_rooms set status='closed',card=null,host_reveal=null,guest_reveal=null,timer_ends_at=null
      where host_id=p_actor and status='open' and (expires_at<=now() or access_until<=now());
    if exists(select 1 from public.duet_rooms where host_id=p_actor and status='open') then
      raise exception 'You already have a room. Reconnect or leave it first.' using errcode='23505';
    end if;
    insert into public.duet_rooms(host_id,host_name,invite_hash,access_until)
      values(p_actor,display_name,p_payload->>'invite_hash',least(m.access_until,now()+interval '24 hours')) returning * into r;
  elsif p_action = 'join' then
    select * into r from public.duet_rooms where invite_hash=p_payload->>'invite_hash' for update;
    if not found or r.status<>'open' or r.expires_at<=now() or r.access_until<=now() then
      raise exception 'This invitation is unavailable or expired.' using errcode='42501';
    end if;
    if r.host_id<>p_actor then
      if r.guest_id is not null and r.guest_id<>p_actor then raise exception 'This room already has two players.' using errcode='42501'; end if;
      if display_name='' then raise exception 'Enter a display name.' using errcode='22023'; end if;
      update public.duet_rooms set guest_id=p_actor,guest_name=display_name,guest_seen_at=now(),
        card=case when guest_id is null then null else card end,
        card_id=case when guest_id is null then null else card_id end,
        host_ready=case when guest_id is null then false else host_ready end,
        guest_ready=case when guest_id is null then false else guest_ready end,
        host_reveal=case when guest_id is null then null else host_reveal end,
        guest_reveal=case when guest_id is null then null else guest_reveal end,
        timer_ends_at=case when guest_id is null then null else timer_ends_at end,
        revision=revision+1,updated_at=now() where id=r.id returning * into r;
    end if;
  else
    select * into r from public.duet_rooms where id=p_room for update;
    if not found or (r.host_id<>p_actor and (r.guest_id is null or r.guest_id<>p_actor)) then
      raise exception 'This room is unavailable.' using errcode='42501';
    end if;
  end if;
  select * into m from public.duet_memberships where user_id=r.host_id;
  if not found or m.access_until<=now() or r.status<>'open' or r.expires_at<=now() then
    raise exception 'This room has expired or its membership has ended.' using errcode='42501';
  end if;
  is_host := r.host_id=p_actor;
  if p_action in ('create','join','resume') then
    return jsonb_build_object('room',to_jsonb(r)-'invite_hash','server_now',now());
  elsif p_action='status' then
    update public.duet_rooms set
      host_seen_at=case when is_host then now() else host_seen_at end,
      guest_seen_at=case when not is_host then now() else guest_seen_at end
      where id=r.id returning * into r;
  elsif p_action='invite' then
    if not is_host or r.guest_id is not null then raise exception 'Only the host of an unfilled room can renew its invitation.' using errcode='42501'; end if;
    if coalesce(p_payload->>'invite_hash','') !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invitation.' using errcode='22023'; end if;
    update public.duet_rooms set invite_hash=p_payload->>'invite_hash',updated_at=now() where id=r.id returning * into r;
  elsif p_action='leave' then
    update public.duet_rooms set status='closed',card=null,host_reveal=null,guest_reveal=null,timer_ends_at=null,revision=revision+1,updated_at=now() where id=r.id returning * into r;
  elsif p_action='draw' then
    if r.guest_id is null then raise exception 'Wait for your partner to join.' using errcode='22023'; end if;
    if (p_payload->>'revision')::integer is distinct from r.revision then raise exception 'The room changed. Try again.' using errcode='40001'; end if;
    if coalesce(jsonb_typeof(p_payload->'card'),'null')<>'object' or octet_length((p_payload->'card')::text)>8000 then raise exception 'Invalid card.' using errcode='22023'; end if;
    seconds := (p_payload->'card'->>'s')::integer;
    if seconds is null or seconds not between 1 and 3600 then raise exception 'Invalid card timer.' using errcode='22023'; end if;
    update public.duet_rooms set card=p_payload->'card',card_id=gen_random_uuid(),round=round+1,
      host_ready=false,guest_ready=false,remaining_seconds=seconds,timer_ends_at=null,outcome=null,
      host_reveal=null,guest_reveal=null,leader_index=case when round=0 then 0 else 1-leader_index end,
      revision=revision+1,updated_at=now() where id=r.id returning * into r;
  elsif p_action in ('ready','timer_start','timer_pause','complete','swap','reveal') then
    if r.card_id is null or coalesce(p_payload->>'card_id','')<>r.card_id::text then raise exception 'This card changed. Use the current card.' using errcode='40001'; end if;
    if p_action='ready' then
      update public.duet_rooms set host_ready=host_ready or is_host,guest_ready=guest_ready or not is_host,revision=revision+1,updated_at=now() where id=r.id returning * into r;
    elsif p_action in ('timer_start','timer_pause','complete') then
      if not r.host_ready or not r.guest_ready then raise exception 'Both players must be ready.' using errcode='42501'; end if;
      if p_action='complete' then
        update public.duet_rooms set outcome='completed',timer_ends_at=null,remaining_seconds=0,revision=revision+1,updated_at=now() where id=r.id returning * into r;
      elsif p_action='timer_pause' then
        seconds:=case when r.timer_ends_at is null then r.remaining_seconds else greatest(0,ceil(extract(epoch from r.timer_ends_at-now()))::integer) end;
        update public.duet_rooms set remaining_seconds=seconds,timer_ends_at=null,revision=revision+1,updated_at=now() where id=r.id returning * into r;
      elsif r.timer_ends_at is null or r.timer_ends_at<=now() then
        seconds:=case when r.timer_ends_at is not null and r.timer_ends_at<=now() then (r.card->>'s')::integer when r.remaining_seconds>0 then r.remaining_seconds else (r.card->>'s')::integer end;
        update public.duet_rooms set timer_ends_at=now()+make_interval(secs=>seconds),outcome=null,revision=revision+1,updated_at=now() where id=r.id returning * into r;
      end if;
    elsif p_action='swap' then
      update public.duet_rooms set leader_index=1-leader_index,revision=revision+1,updated_at=now() where id=r.id returning * into r;
    elsif p_action='reveal' then
      if char_length(coalesce(p_payload->>'text','')) not between 1 and 1200 then raise exception 'Invalid prompt.' using errcode='22023'; end if;
      update public.duet_rooms set host_reveal=case when is_host then p_payload->>'text' else host_reveal end,
        guest_reveal=case when not is_host then p_payload->>'text' else guest_reveal end,
        revision=revision+1,updated_at=now() where id=r.id returning * into r;
    end if;
  else raise exception 'Unknown Duet action.' using errcode='22023';
  end if;
  return jsonb_build_object('room',to_jsonb(r)-'invite_hash','server_now',now());
end;
$$;
revoke all on function public.duet_command(uuid,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.duet_command(uuid,text,uuid,jsonb) to service_role;

-- Enable subscriptions to authorized room-row changes, with no public write grants.
alter publication supabase_realtime add table public.duet_rooms;
