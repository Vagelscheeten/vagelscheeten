-- Aktiviere RLS für die spiele Tabelle
alter table spiele enable row level security;

-- Alte Policy löschen falls sie existiert
drop policy if exists "Leiter können Spiele ihrer Klassenstufe aktualisieren" on spiele;

-- Neue Policy erstellen
create policy "Leiter können Spiele ihrer Klassenstufe aktualisieren"
  on spiele for update
  using (
    exists (
      select 1 from spielgruppen sg
      join klassenstufe_spiele ks on ks.klassenstufe_id = sg.klassenstufe_id
      where ks.spiel_id = spiele.id
      and sg.name = (auth.jwt() ->> 'gruppenname')::text
    )
  )
  with check (
    exists (
      select 1 from spielgruppen sg
      join klassenstufe_spiele ks on ks.klassenstufe_id = sg.klassenstufe_id
      where ks.spiel_id = spiele.id
      and sg.name = (auth.jwt() ->> 'gruppenname')::text
    )
  );
