-- Erlaube anonymen Zugriff auf die RPC-Funktion
grant execute on function set_leiter_gruppe(text) to anon;

-- Erlaube anonymen Zugriff auf die Tabellen (nur mit RLS)
grant select, insert, update on ergebnisse to anon;
grant select on kinder to anon;
grant select on spiele to anon;
grant select on spielgruppen to anon;
