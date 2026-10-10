create or replace function public.default_sensor_thresholds()
returns jsonb
language sql
immutable
as $$
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
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'buzzerEnabled', true,
    'buzzerMuted', false,
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
    'alarmSensors',
    (public.default_alarm_settings() -> 'alarmSensors') || coalesce(p.alarm_settings -> 'alarmSensors', '{}'::jsonb)
  );

notify pgrst, 'reload schema';
