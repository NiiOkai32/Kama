create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event text not null check (
    event in (
      'session_start',
      'card_drawn',
      'outcome_completed',
      'outcome_failed',
      'outcome_skipped',
      'mode_cards',
      'mode_td',
      'mode_dice',
      'mode_ev',
      'mode_duet'
    )
  ),
  created_at timestamptz not null default now()
);

alter table public.usage_events enable row level security;
revoke all on table public.usage_events from anon, authenticated;
grant select on table public.usage_events to authenticated;
grant insert (user_id, event) on table public.usage_events to authenticated;

drop policy if exists "Users can read their own usage events" on public.usage_events;
create policy "Users can read their own usage events"
  on public.usage_events for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own usage events" on public.usage_events;
create policy "Users can insert their own usage events"
  on public.usage_events for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select auth.jwt() -> 'user_metadata' ->> 'usage_tracking') = 'true'
  );
