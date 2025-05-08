-- Erweiterung der helfer_zuteilungen-Tabelle um das via_springer-Feld
ALTER TABLE public.helfer_zuteilungen
ADD COLUMN via_springer BOOLEAN NOT NULL DEFAULT false;

-- Index für schnellere Abfragen nach Springer-Zuteilungen
CREATE INDEX IF NOT EXISTS helfer_zuteilungen_via_springer_idx ON public.helfer_zuteilungen(via_springer);

-- Kommentar zur Dokumentation
COMMENT ON COLUMN public.helfer_zuteilungen.via_springer IS 'Gibt an, ob diese Zuteilung über die Springer-Funktion erfolgt ist';
