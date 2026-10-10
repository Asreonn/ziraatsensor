create table if not exists public.sensor_event_logs (
  id bigint generated always as identity primary key,
  pool_id uuid not null references public.pools(id) on delete cascade,
  event_type text not null,
  sensor_id text,
  alarm_key text,
  severity text not null default 'info',
  value numeric(10, 2),
  threshold_min numeric(10, 2),
  threshold_max numeric(10, 2),
  message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists sensor_event_logs_pool_time_idx
  on public.sensor_event_logs (pool_id, created_at desc);

alter table public.sensor_event_logs enable row level security;

drop policy if exists "sensor_event_logs_select_own" on public.sensor_event_logs;
create policy "sensor_event_logs_select_own"
on public.sensor_event_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.pools
    where pools.id = sensor_event_logs.pool_id
      and pools.user_id = auth.uid()
  )
);

drop policy if exists "sensor_event_logs_insert_own" on public.sensor_event_logs;
create policy "sensor_event_logs_insert_own"
on public.sensor_event_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.pools
    where pools.id = sensor_event_logs.pool_id
      and pools.user_id = auth.uid()
  )
);

create or replace function public.default_alarm_settings()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'buzzerEnabled', true,
    'buzzerMuted', false,
    'mutedAlarmKey', null,
    'mutedAt', null,
    'alarmSensors', jsonb_build_object(
      'ph', true,
      'ec', true,
      'tds', true,
      'do', true,
      'ldr', true,
      'waterTemp', true,
      'airTemp', true,
      'humidity', true
    )
  );
$$;

alter table public.pools
  alter column alarm_settings set default public.default_alarm_settings();

update public.pools p
set alarm_settings =
  (public.default_alarm_settings() || coalesce(p.alarm_settings, '{}'::jsonb))
  || jsonb_build_object(
    'alarmSensors',
    (public.default_alarm_settings() -> 'alarmSensors') || coalesce(p.alarm_settings -> 'alarmSensors', '{}'::jsonb)
  );

notify pgrst, 'reload schema';
