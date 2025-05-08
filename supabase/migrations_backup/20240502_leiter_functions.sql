-- Funktion zum Setzen der Leiter-Gruppe in der Session
create or replace function set_leiter_gruppe(gruppe text)
returns void
language plpgsql
security definer
as $$
begin
  perform set_config('app.current_leiter_gruppe', gruppe, false);
end;
$$;
