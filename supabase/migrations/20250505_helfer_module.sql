-- Erstellen der helferaufgaben-Tabelle
CREATE TABLE IF NOT EXISTS public.helferaufgaben (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel TEXT NOT NULL,
    beschreibung TEXT,
    bedarf INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Erstellen der helfer_rueckmeldungen-Tabelle
CREATE TABLE IF NOT EXISTS public.helfer_rueckmeldungen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind_id UUID REFERENCES public.kinder(id) ON DELETE CASCADE,
    aufgabe_id UUID REFERENCES public.helferaufgaben(id) ON DELETE CASCADE,
    prioritaet INTEGER NOT NULL CHECK (prioritaet BETWEEN 1 AND 3),
    freitext TEXT,
    erstellt_am TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Erstellen eines Indexes für schnellere Abfragen
CREATE INDEX IF NOT EXISTS helfer_rueckmeldungen_aufgabe_id_idx ON public.helfer_rueckmeldungen(aufgabe_id);

-- RLS-Policies für die Tabellen
ALTER TABLE public.helferaufgaben ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helfer_rueckmeldungen ENABLE ROW LEVEL SECURITY;

-- Policies für helferaufgaben
CREATE POLICY "Admins können helferaufgaben lesen" ON public.helferaufgaben
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins können helferaufgaben erstellen" ON public.helferaufgaben
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins können helferaufgaben aktualisieren" ON public.helferaufgaben
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins können helferaufgaben löschen" ON public.helferaufgaben
    FOR DELETE USING (auth.role() = 'authenticated');

-- Policies für helfer_rueckmeldungen
CREATE POLICY "Admins können helfer_rueckmeldungen lesen" ON public.helfer_rueckmeldungen
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins können helfer_rueckmeldungen erstellen" ON public.helfer_rueckmeldungen
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins können helfer_rueckmeldungen aktualisieren" ON public.helfer_rueckmeldungen
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins können helfer_rueckmeldungen löschen" ON public.helfer_rueckmeldungen
    FOR DELETE USING (auth.role() = 'authenticated');

-- Testdaten einfügen
INSERT INTO public.helferaufgaben (titel, beschreibung, bedarf) VALUES
    ('Kuchenverkauf', 'Verkauf von Kuchen und Getränken am Stand', 4),
    ('Auf- und Abbau', 'Hilfe beim Aufbau am Morgen und Abbau am Nachmittag', 6),
    ('Spielbetreuung', 'Betreuung der Spielstationen während des Events', 8),
    ('Erste Hilfe', 'Bereitstellung von Erste-Hilfe-Maßnahmen', 2);

-- Beispiel-Rückmeldungen (werden nur eingefügt, wenn bereits Kinder in der Datenbank vorhanden sind)
DO $$
DECLARE
    kinder_count INTEGER;
    kind_id_1 UUID;
    kind_id_2 UUID;
    kind_id_3 UUID;
    kind_id_4 UUID;
BEGIN
    -- Prüfen, ob Kinder vorhanden sind
    SELECT COUNT(*) INTO kinder_count FROM public.kinder;
    
    IF kinder_count > 3 THEN
        -- Einige Kind-IDs für Testdaten holen
        SELECT id INTO kind_id_1 FROM public.kinder LIMIT 1 OFFSET 0;
        SELECT id INTO kind_id_2 FROM public.kinder LIMIT 1 OFFSET 1;
        SELECT id INTO kind_id_3 FROM public.kinder LIMIT 1 OFFSET 2;
        SELECT id INTO kind_id_4 FROM public.kinder LIMIT 1 OFFSET 3;
        
        -- Testdaten einfügen
        INSERT INTO public.helfer_rueckmeldungen (kind_id, aufgabe_id, prioritaet, freitext) VALUES
            (kind_id_1, (SELECT id FROM public.helferaufgaben WHERE titel = 'Kuchenverkauf' LIMIT 1), 1, 'Kann von 10-14 Uhr'),
            (kind_id_2, (SELECT id FROM public.helferaufgaben WHERE titel = 'Auf- und Abbau' LIMIT 1), 2, NULL),
            (kind_id_3, (SELECT id FROM public.helferaufgaben WHERE titel = 'Spielbetreuung' LIMIT 1), 1, 'Nur Nachmittags verfügbar'),
            (kind_id_4, (SELECT id FROM public.helferaufgaben WHERE titel = 'Erste Hilfe' LIMIT 1), 3, 'Hat Erste-Hilfe-Kurs absolviert');
    END IF;
END
$$;
