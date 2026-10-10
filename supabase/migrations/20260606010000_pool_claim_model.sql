-- Pool sahiplenme (claim) modeli.
-- ESP cihazlari sabit bir pool_id ile gelir; havuz DB'de sahipsiz (user_id NULL)
-- durabilir. Kullanici site uzerinden pool_id girince havuz onun hesabina baglanir.

-- 1) pools.user_id artik NULL olabilir (sahipsiz cihaz havuzu)
alter table public.pools
  alter column user_id drop not null;

-- 2) Yeni kullaniciya otomatik havuz ACMA. Sadece tercih kaydi olusturulur;
--    kullanici kendi cihazini pool_id ile ekler.
create or replace function public.ensure_user_workspace(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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

-- 3) claim_pool: var olan (sahipsiz) bir havuzu cagiran kullaniciya baglar.
create or replace function public.claim_pool(
  target_pool_id uuid,
  pool_name text default null,
  pool_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_owner uuid;
  next_sort integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select user_id into existing_owner
  from public.pools
  where id = target_pool_id;

  if not found then
    raise exception 'pool not found';
  end if;

  if existing_owner is not null and existing_owner <> auth.uid() then
    raise exception 'pool already claimed';
  end if;

  select coalesce(max(sort_order), 0) + 1
  into next_sort
  from public.pools
  where user_id = auth.uid();

  update public.pools
  set
    user_id = auth.uid(),
    sort_order = case when existing_owner is null then next_sort else sort_order end,
    name = coalesce(nullif(btrim(pool_name), ''), name),
    location = coalesce(nullif(btrim(pool_location), ''), location)
  where id = target_pool_id;

  insert into public.pool_system_status (pool_id)
  values (target_pool_id)
  on conflict (pool_id) do nothing;

  return target_pool_id;
end;
$$;

revoke all on function public.claim_pool(uuid, text, text) from public;
grant execute on function public.claim_pool(uuid, text, text) to authenticated;
