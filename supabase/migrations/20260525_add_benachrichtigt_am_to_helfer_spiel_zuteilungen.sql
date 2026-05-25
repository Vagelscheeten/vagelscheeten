ALTER TABLE helfer_spiel_zuteilungen
ADD COLUMN IF NOT EXISTS benachrichtigt_am TIMESTAMPTZ;

COMMENT ON COLUMN helfer_spiel_zuteilungen.benachrichtigt_am IS
'Zeitpunkt, an dem dem Helfer per E-Mail mitgeteilt wurde, welches Spiel er betreut. NULL bedeutet noch nicht benachrichtigt.';
