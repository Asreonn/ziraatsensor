create or replace function public.default_sensor_offsets()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'ph', 0,
    'ec', 0,
    'do', 0,
    'waterTemp', 0,
    'airTemp', 0,
    'humidity', 0
  );
$$;

create or replace function public.ensure_user_workspace(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  initial_pool_id uuid;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  insert into public.user_preferences (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  select pools.id
  into initial_pool_id
  from public.pools
  where pools.user_id = target_user_id
  order by pools.sort_order asc, pools.created_at asc
  limit 1;

  if initial_pool_id is null then
    insert into public.pools (user_id, name, location, sort_order, sensor_offsets)
    values (
      target_user_id,
      'Pool-1',
      'Yeni kayit havuzu',
      1,
      public.default_sensor_offsets()
    )
    returning id into initial_pool_id;
  end if;

  insert into public.pool_system_status (pool_id)
  select pools.id
  from public.pools
  where pools.user_id = target_user_id
  on conflict (pool_id) do nothing;

  return initial_pool_id;
end;
$$;

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

  perform public.ensure_user_workspace(auth.uid());
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_user_workspace(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

create or replace function public.create_pool(pool_name text, pool_location text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed_name text;
  next_sort integer;
  new_pool_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  trimmed_name := nullif(btrim(pool_name), '');
  if trimmed_name is null then
    raise exception 'Pool name is required';
  end if;

  select coalesce(max(pools.sort_order), 0) + 1
  into next_sort
  from public.pools
  where pools.user_id = auth.uid();

  insert into public.pools (user_id, name, location, sort_order, sensor_offsets)
  values (
    auth.uid(),
    trimmed_name,
    coalesce(nullif(btrim(pool_location), ''), ''),
    next_sort,
    public.default_sensor_offsets()
  )
  returning id into new_pool_id;

  insert into public.pool_system_status (pool_id)
  values (new_pool_id)
  on conflict (pool_id) do nothing;

  return new_pool_id;
end;
$$;

revoke all on function public.create_pool(text, text) from public;
grant execute on function public.create_pool(text, text) to authenticated;
