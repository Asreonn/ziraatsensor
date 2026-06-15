create or replace function public.default_alarm_settings()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'buzzerEnabled', true,
    'buzzerMuted', false,
    'readingIntervalMs', 3000,
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

notify pgrst, 'reload schema';
