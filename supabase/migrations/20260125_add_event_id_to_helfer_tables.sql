-- Migration: Add event_id to helfer and essensspenden tables
-- This migration enables multi-event support by adding event_id foreign keys

-- Step 1: Ensure we have a 2025 event to assign existing data to
INSERT INTO events (name, jahr, ist_aktiv)
SELECT 'Vogelschießen 2025', 2025, true
WHERE NOT EXISTS (SELECT 1 FROM events WHERE jahr = 2025);

-- Step 2: Add event_id columns to helfer tables

-- helferaufgaben
ALTER TABLE helferaufgaben 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- helfer_rueckmeldungen
ALTER TABLE helfer_rueckmeldungen 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- helfer_zuteilungen
ALTER TABLE helfer_zuteilungen 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- helfer_slots
ALTER TABLE helfer_slots 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- helfer_slot_zuteilungen
ALTER TABLE helfer_slot_zuteilungen 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- helfer_spiel_zuteilungen
ALTER TABLE helfer_spiel_zuteilungen 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- essensspenden_bedarf
ALTER TABLE essensspenden_bedarf 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- essensspenden_rueckmeldungen
ALTER TABLE essensspenden_rueckmeldungen 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- ansprechpartner
ALTER TABLE ansprechpartner 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Step 3: Assign all existing data to the 2025 event
UPDATE helferaufgaben SET event_id = (SELECT id FROM events WHERE jahr = 2025) WHERE event_id IS NULL;
UPDATE helfer_rueckmeldungen SET event_id = (SELECT id FROM events WHERE jahr = 2025) WHERE event_id IS NULL;
UPDATE helfer_zuteilungen SET event_id = (SELECT id FROM events WHERE jahr = 2025) WHERE event_id IS NULL;
UPDATE helfer_slots SET event_id = (SELECT id FROM events WHERE jahr = 2025) WHERE event_id IS NULL;
UPDATE helfer_slot_zuteilungen SET event_id = (SELECT id FROM events WHERE jahr = 2025) WHERE event_id IS NULL;
UPDATE helfer_spiel_zuteilungen SET event_id = (SELECT id FROM events WHERE jahr = 2025) WHERE event_id IS NULL;
UPDATE essensspenden_bedarf SET event_id = (SELECT id FROM events WHERE jahr = 2025) WHERE event_id IS NULL;
UPDATE essensspenden_rueckmeldungen SET event_id = (SELECT id FROM events WHERE jahr = 2025) WHERE event_id IS NULL;
UPDATE ansprechpartner SET event_id = (SELECT id FROM events WHERE jahr = 2025) WHERE event_id IS NULL;

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_helferaufgaben_event_id ON helferaufgaben(event_id);
CREATE INDEX IF NOT EXISTS idx_helfer_rueckmeldungen_event_id ON helfer_rueckmeldungen(event_id);
CREATE INDEX IF NOT EXISTS idx_helfer_zuteilungen_event_id ON helfer_zuteilungen(event_id);
CREATE INDEX IF NOT EXISTS idx_helfer_slots_event_id ON helfer_slots(event_id);
CREATE INDEX IF NOT EXISTS idx_essensspenden_bedarf_event_id ON essensspenden_bedarf(event_id);
