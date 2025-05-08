-- Fügt einen Unique Constraint zur ergebnisse Tabelle hinzu
-- um sicherzustellen, dass jedes Kind pro Spiel nur ein Ergebnis hat.
ALTER TABLE public.ergebnisse
ADD CONSTRAINT ergebnisse_kind_id_spiel_id_key UNIQUE (kind_id, spiel_id);
