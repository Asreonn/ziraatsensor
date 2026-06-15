-- =====================================================================
-- TUM MIGRATION'LARI TEK SEFERDE UYGULA
-- Supabase Dashboard > SQL Editor'e yapistir, RUN.
-- (Migration dosyalarinin birlesimi + sema cache reload. Idempotent.)
-- =====================================================================

-- ---------- 000000: TDS + LDR sensorleri ----------
alter table public.sensor_readings
  drop constraint if exists sensor_readings_sensor_id_check;
alter table public.sensor_readings
  add constraint sensor_readings_sensor_id_check
  check (sensor_id in ('ph', 'ec', 'tds', 'do', 'ldr', 'waterTemp', 'airTemp', 'humidity'));

alter table public.pool_system_status
  alter column sensor_connections set default jsonb_build_object(
    'ph', true, 'ec', true, 'tds', true, 'do', true, 'ldr', true,
    'waterTemp', true, 'airTemp', true, 'humidity', true
  );
update public.pool_system_status
set sensor_connections = jsonb_build_object('tds', true, 'ldr', true) || sensor_connections;

create or replace function public.default_sensor_offsets()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'ph', 0, 'ec', 0, 'tds', 0, 'do', 0, 'ldr', 0,
    'waterTemp', 0, 'airTemp', 0, 'humidity', 0
  );
$$;
update public.pools
set sensor_offsets = jsonb_build_object('tds', 0, 'ldr', 0) || sensor_offsets;

-- ---------- 010000: Pool claim modeli ----------
alter table public.pools
  alter column user_id drop not null;

create or replace function public.ensure_user_workspace(target_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;
  insert into public.user_preferences (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;
  return null;
end;
$$;

create or replace function public.claim_pool(
  target_pool_id uuid,
  pool_name text default null,
  pool_location text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  existing_owner uuid;
  next_sort integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  select user_id into existing_owner from public.pools where id = target_pool_id;
  if not found then
    raise exception 'pool not found';
  end if;
  if existing_owner is not null and existing_owner <> auth.uid() then
    raise exception 'pool already claimed';
  end if;
  select coalesce(max(sort_order), 0) + 1 into next_sort
  from public.pools where user_id = auth.uid();
  update public.pools
  set user_id = auth.uid(),
      sort_order = case when existing_owner is null then next_sort else sort_order end,
      name = coalesce(nullif(btrim(pool_name), ''), name),
      location = coalesce(nullif(btrim(pool_location), ''), location)
  where id = target_pool_id;
  insert into public.pool_system_status (pool_id)
  values (target_pool_id) on conflict (pool_id) do nothing;
  return target_pool_id;
end;
$$;
revoke all on function public.claim_pool(uuid, text, text) from public;
grant execute on function public.claim_pool(uuid, text, text) to authenticated;

-- ---------- 020000: last_sync otomatik tazele ----------
create or replace function public.touch_pool_status()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  new.last_sync = timezone('utc', now());
  return new;
end;
$$;
drop trigger if exists set_pool_system_status_updated_at on public.pool_system_status;
create trigger set_pool_system_status_updated_at
before update on public.pool_system_status
for each row execute function public.touch_pool_status();

-- ---------- 030000: dev_mode + diagnostics ----------
alter table public.user_preferences
  add column if not exists dev_mode boolean not null default false;
alter table public.pool_system_status
  add column if not exists diagnostics jsonb not null default '{}'::jsonb;

-- ---------- 040000: Havuz alarm ayarlari + sensor esikleri ----------
create or replace function public.default_sensor_thresholds()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'ph', jsonb_build_object('warningMin', 6.5, 'warningMax', 8.5, 'criticalMin', 5.5, 'criticalMax', 9.5),
    'ec', jsonb_build_object('warningMin', 1.0, 'warningMax', 3.0, 'criticalMin', 0.5, 'criticalMax', 4.0),
    'tds', jsonb_build_object('warningMin', 150, 'warningMax', 1200, 'criticalMin', 50, 'criticalMax', 1800),
    'do', jsonb_build_object('warningMin', 5.0, 'warningMax', 12.0, 'criticalMin', 3.0, 'criticalMax', 15.0),
    'ldr', jsonb_build_object('warningMin', 20, 'warningMax', 90, 'criticalMin', 5, 'criticalMax', 98),
    'waterTemp', jsonb_build_object('warningMin', 20, 'warningMax', 30, 'criticalMin', 15, 'criticalMax', 35),
    'airTemp', jsonb_build_object('warningMin', 18, 'warningMax', 35, 'criticalMin', 10, 'criticalMax', 40),
    'humidity', jsonb_build_object('warningMin', 40, 'warningMax', 80, 'criticalMin', 20, 'criticalMax', 95)
  );
$$;

create or replace function public.default_alarm_settings()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'buzzerEnabled', true,
    'buzzerMuted', false,
    'readingIntervalMs', 3000,
    'mutedAlarmKey', null,
    'mutedAt', null,
    'alarmSensors', jsonb_build_object(
      'ph', true, 'ec', true, 'tds', true, 'do', true, 'ldr', true,
      'waterTemp', true, 'airTemp', true, 'humidity', true
    )
  );
$$;

alter table public.pools
  add column if not exists sensor_thresholds jsonb not null default public.default_sensor_thresholds();
alter table public.pools
  add column if not exists alarm_settings jsonb not null default public.default_alarm_settings();

update public.pools p
set sensor_thresholds = (
  select jsonb_object_agg(defaults.key, defaults.value || coalesce(p.sensor_thresholds -> defaults.key, '{}'::jsonb))
  from jsonb_each(public.default_sensor_thresholds()) as defaults(key, value)
);

update public.pools p
set alarm_settings =
  (public.default_alarm_settings() || coalesce(p.alarm_settings, '{}'::jsonb))
  || jsonb_build_object(
    'readingIntervalMs',
    coalesce(
      (
        select up.refresh_interval_ms
        from public.user_preferences up
        where up.user_id = p.user_id
      ),
      case
        when coalesce(p.alarm_settings ->> 'readingIntervalMs', '') ~ '^[0-9]+$'
          then (p.alarm_settings ->> 'readingIntervalMs')::integer
        else 3000
      end
    ),
    'alarmSensors',
    (public.default_alarm_settings() -> 'alarmSensors') || coalesce(p.alarm_settings -> 'alarmSensors', '{}'::jsonb)
  );

-- ---------- 050000: Sensor / alarm olay gunlugu ----------
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

-- ---------- Sema cache'ini yenile (PostgREST) ----------
notify pgrst, 'reload schema';
