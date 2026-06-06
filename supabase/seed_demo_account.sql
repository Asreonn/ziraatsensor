-- =====================================================================
-- DEMO HESAP + ESP CIHAZ HAVUZU
-- Bunu Supabase Dashboard > SQL Editor'de, DIGER MIGRATION'LARDAN SONRA calistir.
-- (auth kullanicisi olusturdugu icin normal migration degil; elle calisir.)
--
-- Hesap : deneme@gmail.com
-- Sifre : CHANGE_ME_DEMO_PASSWORD
-- Havuz : 8668a7bf-9c21-4e46-940b-4cd81f3a7f6a  (ESP firmware'deki POOL_ID)
-- =====================================================================

do $$
declare
  v_user_id uuid;
  v_pool_id uuid := '8668a7bf-9c21-4e46-940b-4cd81f3a7f6a';
begin
  -- 1) Kullanici yoksa olustur (email login icin auth.users + auth.identities)
  select id into v_user_id from auth.users where email = 'deneme@gmail.com';

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      'deneme@gmail.com', crypt('CHANGE_ME_DEMO_PASSWORD', gen_salt('bf')),
      now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id, v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', 'deneme@gmail.com', 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;

  -- 2) Tercihler: canli (live) mod -- ESP verisi dogrudan gorunsun
  insert into public.user_preferences (user_id, use_mock_data)
  values (v_user_id, false)
  on conflict (user_id) do update set use_mock_data = false;

  -- 3) ESP cihaz havuzu (sabit id) -- bu hesaba tanimli
  insert into public.pools (id, user_id, name, location, sort_order, sensor_offsets)
  values (v_pool_id, v_user_id, 'ESP Havuzu', '', 1, public.default_sensor_offsets())
  on conflict (id) do update
    set user_id = excluded.user_id,
        name = excluded.name;

  -- 4) Sistem durumu satiri (ESP PATCH'leyebilsin)
  insert into public.pool_system_status (pool_id)
  values (v_pool_id)
  on conflict (pool_id) do nothing;
end $$;
