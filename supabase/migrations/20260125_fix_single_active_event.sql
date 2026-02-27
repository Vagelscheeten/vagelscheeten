-- Migration: Ensure only one event can be active at a time

-- Step 1: First, make sure only one event is active (keep only the most recent one active)
WITH latest_active AS (
  SELECT id FROM events 
  WHERE ist_aktiv = true 
  ORDER BY jahr DESC 
  LIMIT 1
)
UPDATE events 
SET ist_aktiv = false 
WHERE ist_aktiv = true 
AND id NOT IN (SELECT id FROM latest_active);

-- Step 2: Create a partial unique index that ensures only one event can have ist_aktiv = true
-- This is the PostgreSQL way to enforce "at most one true" constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_single_active 
ON events (ist_aktiv) 
WHERE ist_aktiv = true;

-- Note: This index allows:
-- - One row with ist_aktiv = true
-- - Multiple rows with ist_aktiv = false
-- If you try to set a second event to active, the database will reject it with a unique constraint error.
