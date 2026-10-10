-- ESP her PATCH'te last_sync gondermiyor (cihazda NTP saat yok).
-- Bu yuzden pool_system_status guncellendiginde last_sync sunucu saatiyle
-- otomatik tazelensin. Site "Son Veri" zamanini ve tazelik/missed-cycle
-- mantigini bu alandan okuyor.

create or replace function public.touch_pool_status()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  new.last_sync = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_pool_system_status_updated_at on public.pool_system_status;
create trigger set_pool_system_status_updated_at
before update on public.pool_system_status
for each row
execute function public.touch_pool_status();
