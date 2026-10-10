alter table public.user_preferences
alter column use_mock_data set default false;

update public.user_preferences
set
  use_mock_data = false,
  updated_at = timezone('utc', now())
where use_mock_data = true;
