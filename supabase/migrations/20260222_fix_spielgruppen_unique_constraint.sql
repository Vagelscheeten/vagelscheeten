-- Fix: spielgruppen.name soll nur pro Event eindeutig sein, nicht global.
-- Der alte Constraint "spielgruppen_name_key" verhinderte, dass zwei Events
-- gleich benannte Gruppen haben können (z.B. "1a-1" im Event 2024 und 2025).

ALTER TABLE spielgruppen
  DROP CONSTRAINT IF EXISTS spielgruppen_name_key;

ALTER TABLE spielgruppen
  ADD CONSTRAINT spielgruppen_name_event_id_key UNIQUE (name, event_id);
