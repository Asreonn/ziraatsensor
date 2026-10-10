create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  use_mock_data boolean not null default true,
  refresh_interval_ms integer not null default 3000 check (refresh_interval_ms between 1000 and 60000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text not null default '',
  sort_order integer not null default 0,
  sensor_offsets jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create table if not exists public.pool_system_status (
  pool_id uuid primary key references public.pools(id) on delete cascade,
  uptime_seconds integer not null default 0,
  rssi integer not null default -60,
  voltage numeric(4, 2) not null default 3.70,
  last_sync timestamptz not null default timezone('utc', now()),
  sensor_connections jsonb not null default jsonb_build_object(
    'ph', true,
    'ec', true,
    'do', true,
    'waterTemp', true,
    'airTemp', true,
    'humidity', true
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sensor_readings (
  id bigint generated always as identity primary key,
  pool_id uuid not null references public.pools(id) on delete cascade,
  sensor_id text not null check (sensor_id in ('ph', 'ec', 'do', 'waterTemp', 'airTemp', 'humidity')),
  value numeric(10, 2) not null,
  recorded_at timestamptz not null default timezone('utc', now())
);

create index if not exists sensor_readings_pool_sensor_time_idx
  on public.sensor_readings (pool_id, sensor_id, recorded_at desc);

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.touch_updated_at();

drop trigger if exists set_pool_system_status_updated_at on public.pool_system_status;
create trigger set_pool_system_status_updated_at
before update on public.pool_system_status
for each row
execute function public.touch_updated_at();

alter table public.user_preferences enable row level security;
alter table public.pools enable row level security;
alter table public.pool_system_status enable row level security;
alter table public.sensor_readings enable row level security;

create policy "user_preferences_select_own"
on public.user_preferences
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_preferences_insert_own"
on public.user_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_preferences_update_own"
on public.user_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "pools_select_own"
on public.pools
for select
to authenticated
using (auth.uid() = user_id);

create policy "pools_insert_own"
on public.pools
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "pools_update_own"
on public.pools
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "pool_system_status_select_own"
on public.pool_system_status
for select
to authenticated
using (
  exists (
    select 1
    from public.pools
    where pools.id = pool_system_status.pool_id
      and pools.user_id = auth.uid()
  )
);

create policy "pool_system_status_insert_own"
on public.pool_system_status
for insert
to authenticated
with check (
  exists (
    select 1
    from public.pools
    where pools.id = pool_system_status.pool_id
      and pools.user_id = auth.uid()
  )
);

create policy "pool_system_status_update_own"
on public.pool_system_status
for update
to authenticated
using (
  exists (
    select 1
    from public.pools
    where pools.id = pool_system_status.pool_id
      and pools.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.pools
    where pools.id = pool_system_status.pool_id
      and pools.user_id = auth.uid()
  )
);

create policy "sensor_readings_select_own"
on public.sensor_readings
for select
to authenticated
using (
  exists (
    select 1
    from public.pools
    where pools.id = sensor_readings.pool_id
      and pools.user_id = auth.uid()
  )
);

create policy "sensor_readings_insert_own"
on public.sensor_readings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.pools
    where pools.id = sensor_readings.pool_id
      and pools.user_id = auth.uid()
  )
);

create policy "sensor_readings_update_own"
on public.sensor_readings
for update
to authenticated
using (
  exists (
    select 1
    from public.pools
    where pools.id = sensor_readings.pool_id
      and pools.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.pools
    where pools.id = sensor_readings.pool_id
      and pools.user_id = auth.uid()
  )
);

create or replace function public.bootstrap_user_workspace()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_preferences (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  if not exists (
    select 1
    from public.pools
    where user_id = auth.uid()
  ) then
    insert into public.pools (user_id, name, location, sort_order, sensor_offsets)
    values
      (
        auth.uid(),
        'Alpha-1',
        'Lab B, Rack 3',
        1,
        jsonb_build_object('ph', 0, 'ec', 0, 'do', 0, 'waterTemp', 0, 'airTemp', 0, 'humidity', 0)
      ),
      (
        auth.uid(),
        'Beta-2',
        'Lab A, Rack 1',
        2,
        jsonb_build_object('ph', 0.3, 'ec', -0.2, 'do', 1.5, 'waterTemp', 2, 'airTemp', -1, 'humidity', -5)
      ),
      (
        auth.uid(),
        'Gamma-3',
        'Greenhouse, Section C',
        3,
        jsonb_build_object('ph', -0.5, 'ec', 0.4, 'do', -0.8, 'waterTemp', 3.5, 'airTemp', 4, 'humidity', 10)
      );
  end if;

  insert into public.pool_system_status (pool_id)
  select pools.id
  from public.pools
  where pools.user_id = auth.uid()
  on conflict (pool_id) do nothing;
end;
$$;

grant execute on function public.bootstrap_user_workspace() to authenticated;
