export type EmailDirection = 'inbound' | 'outbound';

export interface EmailThread {
  id: string;
  subject_normalized: string;
  participants: string[];
  last_message_at: string;
  message_count: number;
  has_unread: boolean;
  created_at: string;
}

export interface EmailRow {
  id: string;
  thread_id: string;
  direction: EmailDirection;
  message_id: string | null;
  in_reply_to: string | null;
  references: string[] | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[] | null;
  bcc_addresses: string[] | null;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  is_read: boolean;
  spam_score: number | null;
  raw_payload: unknown;
  resend_id: string | null;
  created_at: string;
}

export interface EmailAttachmentRow {
  id: string;
  email_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  is_inline: boolean;
  content_id: string | null;
  created_at: string;
}

export interface NotificationRecipient {
  id: string;
  email: string;
  label: string | null;
  user_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ParsedInboundEmail {
  event_id: string;
  message_id: string | null;
  in_reply_to: string | null;
  references: string[];
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  spam_score: number | null;
  attachments: ParsedAttachment[];
  raw: unknown;
}

export interface ParsedAttachment {
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  content_base64: string | null;
  url: string | null;
  content_id: string | null;
  is_inline: boolean;
}
