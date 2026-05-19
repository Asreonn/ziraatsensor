-- Clean placeholder "Yeni kayit havuzu" location from existing rows and from bootstrap function.
update public.pools
   set location = ''
 where location = 'Yeni kayit havuzu';

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
      '',
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
