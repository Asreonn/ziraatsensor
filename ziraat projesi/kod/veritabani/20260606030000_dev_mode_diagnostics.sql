-- Gelistirici modu ve ESP tanilama verisi.
-- dev_mode: kullanici tercihi; acikken sitede gelistirici bildirimleri gorunur.
-- diagnostics: ESP'nin gonderdigi ham tani verisi (voltajlar, heap, ADS durumu).

alter table public.user_preferences
  add column if not exists dev_mode boolean not null default false;

alter table public.pool_system_status
  add column if not exists diagnostics jsonb not null default '{}'::jsonb;
