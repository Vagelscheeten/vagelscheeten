-- 1. Create the 'events' table
CREATE TABLE public.events (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    jahr integer NOT NULL UNIQUE,
    name text NOT NULL,
    ist_aktiv boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add comment for clarity
COMMENT ON COLUMN public.events.ist_aktiv IS 'Indicates the currently active event for the Leiter interface';

-- 2. Create the 'event_spiele' linking table
CREATE TABLE public.event_spiele (
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    spiel_id uuid NOT NULL REFERENCES public.spiele(id) ON DELETE RESTRICT,
    PRIMARY KEY (event_id, spiel_id)
);

-- 3. Add 'event_id' to 'spielgruppen'
ALTER TABLE public.spielgruppen
ADD COLUMN event_id uuid; -- Initially allow NULL for migration

-- Add Foreign Key Constraint after potential data migration
-- For now, we'll add it directly assuming a reset or manual data handling
ALTER TABLE public.spielgruppen
ADD CONSTRAINT fk_spielgruppen_event
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE RESTRICT;

-- Make event_id NOT NULL after ensuring data integrity
-- (We might need to handle existing data before making this NOT NULL in production,
-- but for local reset, it's fine to set it directly or after seeding)
-- ALTER TABLE public.spielgruppen
-- ALTER COLUMN event_id SET NOT NULL; 
-- Commented out for now, as reset will clear data anyway. Add NOT NULL constraint later if needed via seeding or another migration.


-- 4. Add 'event_id' to 'ergebnisse'
ALTER TABLE public.ergebnisse
ADD COLUMN event_id uuid; -- Initially allow NULL for migration

-- Add Foreign Key Constraint
ALTER TABLE public.ergebnisse
ADD CONSTRAINT fk_ergebnisse_event
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE; -- Cascade delete results if event is deleted

-- Make event_id NOT NULL
-- ALTER TABLE public.ergebnisse
-- ALTER COLUMN event_id SET NOT NULL;
-- Commented out for now.


-- 5. Add 'event_id' to 'spielgruppe_spiel_status'
ALTER TABLE public.spielgruppe_spiel_status
ADD COLUMN event_id uuid; -- Initially allow NULL for migration

-- Add Foreign Key Constraint
ALTER TABLE public.spielgruppe_spiel_status
ADD CONSTRAINT fk_spielgruppe_spiel_status_event
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE; -- Cascade delete status if event is deleted

-- Make event_id NOT NULL
-- ALTER TABLE public.spielgruppe_spiel_status
-- ALTER COLUMN event_id SET NOT NULL;
-- Commented out for now.


-- 6. Create the 'kind_spielgruppe_zuordnung' table
CREATE TABLE public.kind_spielgruppe_zuordnung (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    kind_id uuid NOT NULL REFERENCES public.kinder(id) ON DELETE RESTRICT,
    spielgruppe_id uuid NOT NULL REFERENCES public.spielgruppen(id) ON DELETE RESTRICT,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (kind_id, event_id) -- Ensure a child is only in one group per event
);

-- Add comment
COMMENT ON CONSTRAINT kind_spielgruppe_zuordnung_kind_id_event_id_key ON public.kind_spielgruppe_zuordnung IS 'Ensures a child belongs to only one Spielgruppe per Event';


-- 7. Drop the now redundant 'spielgruppe_id' column from 'kinder'
-- Check if the column exists before dropping
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'kinder'
        AND column_name = 'spielgruppe_id'
    ) THEN
        -- Abhängige Policy löschen, bevor die Spalte gelöscht wird
        DROP POLICY IF EXISTS "Leiter können Kinder ihrer Gruppe sehen" ON public.kinder;
        
        ALTER TABLE public.kinder DROP COLUMN spielgruppe_id;
    END IF;
END $$;

-- Note: After this migration, you will likely need to:
-- 1. Reset your local database (`supabase db reset`) because existing data won't have `event_id`.
-- 2. Create at least one event in the `events` table and mark it as active.
-- 3. Update seeding logic (if any) to include `event_id`.
-- 4. Update application code (fetching logic, inserts, updates) to use `event_id`.
