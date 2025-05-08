-- RLS für alle relevanten Tabellen deaktivieren
alter table spiele disable row level security;
alter table ergebnisse disable row level security;
alter table kinder disable row level security;
alter table spielgruppen disable row level security;
alter table klassenstufe_spiele disable row level security;
