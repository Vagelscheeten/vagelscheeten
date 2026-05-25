-- Härtet die Tabellen rund um den Leiter-Flow.
-- Anon (öffentliche Visitors + Login-Server-Action mit anon-Key): SELECT erlaubt.
-- Authenticated (Admin-Login): volle Berechtigung.
-- Service-Role: bypassed RLS sowieso → wird von /api/leiter/* genutzt.

-- spielgruppe_spiel_status — vorher 0 Policies
DROP POLICY IF EXISTS "anon_can_read" ON spielgruppe_spiel_status;
DROP POLICY IF EXISTS "authenticated_full" ON spielgruppe_spiel_status;
CREATE POLICY "anon_can_read" ON spielgruppe_spiel_status FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_full" ON spielgruppe_spiel_status FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE spielgruppe_spiel_status ENABLE ROW LEVEL SECURITY;

-- ergebnisse — admin-policy existiert; anon-Read für public Auswertung ergänzen
DROP POLICY IF EXISTS "anon_can_read" ON ergebnisse;
CREATE POLICY "anon_can_read" ON ergebnisse FOR SELECT TO anon USING (true);
ALTER TABLE ergebnisse ENABLE ROW LEVEL SECURITY;

-- spielgruppen — admin-policy existiert; anon-Read für Login-Server-Action
DROP POLICY IF EXISTS "anon_can_read" ON spielgruppen;
CREATE POLICY "anon_can_read" ON spielgruppen FOR SELECT TO anon USING (true);
ALTER TABLE spielgruppen ENABLE ROW LEVEL SECURITY;

-- spiele — admin-policy existiert; anon-Read für public Spiele-Seite + Leiter-Erfassung
DROP POLICY IF EXISTS "anon_can_read" ON spiele;
CREATE POLICY "anon_can_read" ON spiele FOR SELECT TO anon USING (true);
ALTER TABLE spiele ENABLE ROW LEVEL SECURITY;

-- kinder — admin-policy existiert; anon-Read für Auswertung + Leiter
DROP POLICY IF EXISTS "anon_can_read" ON kinder;
CREATE POLICY "anon_can_read" ON kinder FOR SELECT TO anon USING (true);
ALTER TABLE kinder ENABLE ROW LEVEL SECURITY;

-- events
DROP POLICY IF EXISTS "anon_can_read" ON events;
DROP POLICY IF EXISTS "authenticated_full" ON events;
CREATE POLICY "anon_can_read" ON events FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_full" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- klassen
DROP POLICY IF EXISTS "anon_can_read" ON klassen;
DROP POLICY IF EXISTS "authenticated_full" ON klassen;
CREATE POLICY "anon_can_read" ON klassen FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_full" ON klassen FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE klassen ENABLE ROW LEVEL SECURITY;

-- klasse_spiele
DROP POLICY IF EXISTS "anon_can_read" ON klasse_spiele;
DROP POLICY IF EXISTS "authenticated_full" ON klasse_spiele;
CREATE POLICY "anon_can_read" ON klasse_spiele FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_full" ON klasse_spiele FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE klasse_spiele ENABLE ROW LEVEL SECURITY;

-- kind_spielgruppe_zuordnung
DROP POLICY IF EXISTS "anon_can_read" ON kind_spielgruppe_zuordnung;
DROP POLICY IF EXISTS "authenticated_full" ON kind_spielgruppe_zuordnung;
CREATE POLICY "anon_can_read" ON kind_spielgruppe_zuordnung FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_full" ON kind_spielgruppe_zuordnung FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE kind_spielgruppe_zuordnung ENABLE ROW LEVEL SECURITY;
