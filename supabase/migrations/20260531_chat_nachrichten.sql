-- Öffentlicher Event-Chat zwischen Spielgruppen-Leitern und Admins.
-- Leiter-Zugriff läuft über /api/leiter/chat (Service-Role); Admins direkt via authenticated RLS.
-- Bewusst KEINE anon-Policy (Spam-/Scraping-Schutz).

CREATE TABLE IF NOT EXISTS chat_nachrichten (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  absender_typ  text NOT NULL CHECK (absender_typ IN ('leiter','admin')),
  absender_name text NOT NULL,
  inhalt        text NOT NULL CHECK (char_length(inhalt) BETWEEN 1 AND 2000),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_nachrichten_event_created
  ON chat_nachrichten (event_id, created_at);

ALTER TABLE chat_nachrichten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full" ON chat_nachrichten;
CREATE POLICY "authenticated_full" ON chat_nachrichten
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
