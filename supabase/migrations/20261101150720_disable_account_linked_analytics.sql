-- Disable account-linked gameplay collection without deleting existing records.
revoke insert, update on public.usage_events from anon, authenticated;
drop policy if exists "Users can insert their own usage events" on public.usage_events;
create index if not exists usage_events_user_id_idx on public.usage_events(user_id);
