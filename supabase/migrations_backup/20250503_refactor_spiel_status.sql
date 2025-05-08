-- 1. Neue Tabelle für gruppenspezifischen Spielstatus erstellen
CREATE TABLE public.spielgruppe_spiel_status (
    spielgruppe_id uuid NOT NULL REFERENCES public.spielgruppen(id) ON DELETE CASCADE,
    spiel_id uuid NOT NULL REFERENCES public.spiele(id) ON DELETE CASCADE,
    abgeschlossen_am timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT spielgruppe_spiel_status_pkey PRIMARY KEY (spielgruppe_id, spiel_id)
);

-- Optional: Kommentar zur Tabelle hinzufügen
COMMENT ON TABLE public.spielgruppe_spiel_status IS 'Speichert, wann welche Spielgruppe welches Spiel abgeschlossen hat.';

-- 2. Alte Status-Spalten aus der 'spiele' Tabelle entfernen
ALTER TABLE public.spiele
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS abgeschlossen_von_gruppe_id,
DROP COLUMN IF EXISTS abgeschlossen_am;

-- Optional: Indizes für Performance hinzufügen (nützlich bei vielen Gruppen/Spielen)
CREATE INDEX idx_spielgruppe_spiel_status_spielgruppe ON public.spielgruppe_spiel_status(spielgruppe_id);
CREATE INDEX idx_spielgruppe_spiel_status_spiel ON public.spielgruppe_spiel_status(spiel_id);

-- Berechtigungen für die neue Tabelle (falls RLS verwendet wird/wurde)
-- Beispiel: Erlaube Lesezugriff für alle authentifizierten Benutzer
-- Ggf. spezifischere Regeln notwendig!
-- ALTER TABLE public.spielgruppe_spiel_status ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow read access to all authenticated users" ON public.spielgruppe_spiel_status FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY "Allow insert access for the specific group leader" ON public.spielgruppe_spiel_status FOR INSERT WITH CHECK (true); -- Needs refinement based on actual auth logic

-- WICHTIG: Da wir RLS aktuell nicht aktiv nutzen (gemäß Memory), sind die RLS-Befehle auskommentiert.
-- Wenn RLS später aktiviert wird, müssen hier passende Policies definiert werden.

-- Gib den Service-Rollen volle Rechte, damit Supabase interne Operationen funktionieren
grant select, insert, update, delete on table public.spielgruppe_spiel_status to service_role;

