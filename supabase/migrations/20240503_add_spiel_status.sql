-- Füge Status-Spalte zur spiele Tabelle hinzu
ALTER TABLE spiele
ADD COLUMN status text NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'abgeschlossen'));

-- Füge Spalte für die Gruppe hinzu, die das Spiel abgeschlossen hat
ALTER TABLE spiele
ADD COLUMN abgeschlossen_von_gruppe_id uuid REFERENCES spielgruppen(id);

-- Füge Spalte für den Zeitpunkt des Abschließens hinzu
ALTER TABLE spiele
ADD COLUMN abgeschlossen_am timestamp with time zone;
