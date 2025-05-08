-- Alte Policies löschen
drop policy if exists "Leiter können Ergebnisse ihrer Gruppe sehen" on ergebnisse;
drop policy if exists "Leiter können Ergebnisse ihrer Gruppe erfassen" on ergebnisse;
drop policy if exists "Leiter können Ergebnisse ihrer Gruppe aktualisieren" on ergebnisse;
drop policy if exists "Leiter können Kinder ihrer Gruppe sehen" on kinder;
drop policy if exists "Leiter können Spiele ihrer Klassenstufe sehen" on spiele;

-- Funktion nicht mehr benötigt
drop function if exists get_leiter_gruppe();
-- Funktion jwt_decode wird auch nicht mehr benötigt, wenn auth.jwt() funktioniert
-- drop function if exists jwt_decode(text); -- Optional, falls nicht anderweitig gebraucht

-- Neue Policies mit auth.jwt()
-- Leiter dürfen Ergebnisse ihrer Gruppe sehen und bearbeiten
create policy "Leiter können Ergebnisse ihrer Gruppe sehen"
  on ergebnisse for select
  using (
    exists (
      select 1 from spielgruppen sg
      where sg.id = ergebnisse.spielgruppe_id
      and sg.name = (auth.jwt() ->> 'gruppenname')::text
    )
  );

create policy "Leiter können Ergebnisse ihrer Gruppe erfassen"
  on ergebnisse for insert
  with check (
    exists (
      select 1 from spielgruppen sg
      where sg.id = ergebnisse.spielgruppe_id
      and sg.name = (auth.jwt() ->> 'gruppenname')::text
    )
  );

create policy "Leiter können Ergebnisse ihrer Gruppe aktualisieren"
  on ergebnisse for update
  using (
    exists (
      select 1 from spielgruppen sg
      where sg.id = ergebnisse.spielgruppe_id
      and sg.name = (auth.jwt() ->> 'gruppenname')::text
    )
  )
  with check (
    exists (
      select 1 from spielgruppen sg
      where sg.id = ergebnisse.spielgruppe_id
      and sg.name = (auth.jwt() ->> 'gruppenname')::text
    )
  );

-- Leiter dürfen Kinder ihrer Gruppe sehen
create policy "Leiter können Kinder ihrer Gruppe sehen"
  on kinder for select
  using (
    exists (
      select 1 from spielgruppen sg
      where sg.id = kinder.spielgruppe_id
      and sg.name = (auth.jwt() ->> 'gruppenname')::text
    )
  );

-- Leiter dürfen Spiele ihrer Klassenstufe sehen
create policy "Leiter können Spiele ihrer Klassenstufe sehen"
  on spiele for select
  using (
    exists (
      select 1 from spielgruppen sg
      join klassenstufe_spiele ks on ks.klassenstufe_id = sg.klassenstufe_id
      where ks.spiel_id = spiele.id
      and sg.name = (auth.jwt() ->> 'gruppenname')::text
    )
  );