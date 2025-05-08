-- Hinzufügen der Springer-Felder zur helfer_rueckmeldungen-Tabelle
ALTER TABLE public.helfer_rueckmeldungen
ADD COLUMN ist_springer BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN zeitfenster TEXT CHECK (zeitfenster IN ('vormittag', 'nachmittag', 'beides'));

-- Index für schnellere Abfragen nach Springer-Rückmeldungen
CREATE INDEX IF NOT EXISTS helfer_rueckmeldungen_ist_springer_idx ON public.helfer_rueckmeldungen(ist_springer);
CREATE INDEX IF NOT EXISTS helfer_rueckmeldungen_zeitfenster_idx ON public.helfer_rueckmeldungen(zeitfenster);

-- Kommentare zur Dokumentation
COMMENT ON COLUMN public.helfer_rueckmeldungen.ist_springer IS 'Gibt an, ob diese Rückmeldung für einen Springer ist';
COMMENT ON COLUMN public.helfer_rueckmeldungen.zeitfenster IS 'Zeitfenster für die Rückmeldung (vormittag, nachmittag, beides)';

-- Entfernen der Springer-Aufgaben aus helferaufgaben
DELETE FROM public.helferaufgaben 
WHERE titel = 'Springer vormittag' OR titel = 'Springer nachmittag';
