-- Migration: Postfach (Admin-Inbox für orgateam@vagelscheeten.de)
-- Tabellen: email_threads, emails, email_attachments,
--           postfach_notification_recipients, postfach_webhook_events
-- Storage: postfach-attachments bucket (private)
-- RLS: authenticated-only für alle vier Tabellen

-- =====================================================================
-- 1. email_threads — Gruppiert zusammengehörige Messages
-- =====================================================================
CREATE TABLE IF NOT EXISTS email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_normalized text NOT NULL DEFAULT '',
  participants text[] NOT NULL DEFAULT '{}',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  message_count int NOT NULL DEFAULT 0,
  has_unread boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_threads_last_message
  ON email_threads (last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_threads_subject
  ON email_threads (subject_normalized);

ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_threads_authenticated_all"
  ON email_threads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- 2. emails — Eine Row pro Message (inbound + outbound)
-- =====================================================================
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_id text UNIQUE,
  in_reply_to text,
  "references" text[],
  from_address text NOT NULL,
  from_name text,
  to_addresses text[] NOT NULL DEFAULT '{}',
  cc_addresses text[],
  bcc_addresses text[],
  subject text NOT NULL DEFAULT '',
  body_text text,
  body_html text,
  received_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  spam_score numeric,
  raw_payload jsonb,
  resend_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_thread_received
  ON emails (thread_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_emails_inbound_unread
  ON emails (is_read) WHERE direction = 'inbound';

CREATE INDEX IF NOT EXISTS idx_emails_from_address
  ON emails (from_address);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emails_authenticated_all"
  ON emails FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- 3. email_attachments
-- =====================================================================
CREATE TABLE IF NOT EXISTS email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  filename text NOT NULL,
  content_type text,
  size_bytes bigint,
  storage_path text NOT NULL,
  is_inline boolean NOT NULL DEFAULT false,
  content_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id
  ON email_attachments (email_id);

ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_attachments_authenticated_all"
  ON email_attachments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- 4. postfach_notification_recipients — wer wird bei neuer Mail benachrichtigt
-- =====================================================================
CREATE TABLE IF NOT EXISTS postfach_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  label text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_postfach_recipients_active
  ON postfach_notification_recipients (is_active) WHERE is_active = true;

ALTER TABLE postfach_notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "postfach_recipients_authenticated_all"
  ON postfach_notification_recipients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- 5. postfach_webhook_events — Idempotenz-Ledger gegen Resend-Retries
-- =====================================================================
CREATE TABLE IF NOT EXISTS postfach_webhook_events (
  event_id text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE postfach_webhook_events ENABLE ROW LEVEL SECURITY;

-- kein authenticated-Zugriff, nur Service-Role (RLS default = deny)

-- =====================================================================
-- 6. Storage-Bucket für Anhänge
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('postfach-attachments', 'postfach-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage-Policies: authenticated darf lesen, Service-Role schreibt
CREATE POLICY "postfach_attachments_authenticated_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'postfach-attachments');
