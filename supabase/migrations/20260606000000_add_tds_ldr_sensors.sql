-- Yeni sensorler: TDS (ppm) ve LDR (isik %).
-- ESP firmware artik bu iki sensoru de gonderiyor.

-- 1) sensor_readings.sensor_id CHECK kisitini tds/ldr icerecek sekilde genislet
alter table public.sensor_readings
  drop constraint if exists sensor_readings_sensor_id_check;

alter table public.sensor_readings
  add constraint sensor_readings_sensor_id_check
  check (sensor_id in ('ph', 'ec', 'tds', 'do', 'ldr', 'waterTemp', 'airTemp', 'humidity'));

-- 2) pool_system_status.sensor_connections default'unu yeni sensorlerle guncelle
alter table public.pool_system_status
  alter column sensor_connections set default jsonb_build_object(
    'ph', true,
    'ec', true,
    'tds', true,
    'do', true,
    'ldr', true,
    'waterTemp', true,
    'airTemp', true,
    'humidity', true
  );

-- Mevcut satirlara eksik anahtarlari ekle (varsa degeri korunur)
update public.pool_system_status
set sensor_connections = jsonb_build_object('tds', true, 'ldr', true) || sensor_connections;

-- 3) default_sensor_offsets() fonksiyonuna tds/ldr ekle
create or replace function public.default_sensor_offsets()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'ph', 0,
    'ec', 0,
    'tds', 0,
    'do', 0,
    'ldr', 0,
    'waterTemp', 0,
    'airTemp', 0,
    'humidity', 0
  );
$$;

-- Mevcut havuzlarin offset'lerine eksik anahtarlari ekle
update public.pools
set sensor_offsets = jsonb_build_object('tds', 0, 'ldr', 0) || sensor_offsets;
