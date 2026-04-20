import { z } from 'zod';
import type { ParsedAttachment, ParsedInboundEmail } from './types';

const addressField = z.union([z.string(), z.array(z.string()), z.null(), z.undefined()]);

const headerEntrySchema = z.union([
  z.object({ name: z.string(), value: z.string() }),
  z.tuple([z.string(), z.string()]),
]);

const attachmentSchema = z
  .object({
    filename: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    content_type: z.string().optional().nullable(),
    contentType: z.string().optional().nullable(),
    content: z.string().optional().nullable(),
    content_base64: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    size: z.number().optional().nullable(),
    size_bytes: z.number().optional().nullable(),
    content_id: z.string().optional().nullable(),
    contentId: z.string().optional().nullable(),
    disposition: z.string().optional().nullable(),
  })
  .passthrough();

const dataSchema = z
  .object({
    email_id: z.string().optional().nullable(),
    id: z.string().optional().nullable(),
    from: addressField,
    to: addressField,
    cc: addressField,
    subject: z.string().optional().nullable(),
    text: z.string().optional().nullable(),
    html: z.string().optional().nullable(),
    headers: z.array(headerEntrySchema).optional().nullable(),
    attachments: z.array(attachmentSchema).optional().nullable(),
    spam_score: z.number().optional().nullable(),
    created_at: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    message_id: z.string().optional().nullable(),
    messageId: z.string().optional().nullable(),
    in_reply_to: z.string().optional().nullable(),
    inReplyTo: z.string().optional().nullable(),
    references: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  })
  .passthrough();

const envelopeSchema = z
  .object({
    type: z.string().optional(),
    created_at: z.string().optional(),
    data: dataSchema.optional(),
  })
  .passthrough();

type DataShape = z.infer<typeof dataSchema>;

export function parseInboundPayload(raw: unknown, fallbackEventId: string): ParsedInboundEmail {
  let data: DataShape;
  let envelopeCreatedAt: string | null = null;

  const envelope = envelopeSchema.safeParse(raw);
  if (envelope.success && envelope.data.data) {
    data = envelope.data.data;
    envelopeCreatedAt = envelope.data.created_at ?? null;
  } else {
    data = dataSchema.parse(raw);
  }

  const headers = normalizeHeaders(data.headers);
  const header = (key: string) => headers.get(key.toLowerCase());

  const messageId = pickString(data.message_id, data.messageId, header('message-id')) ?? null;
  const inReplyTo = pickString(data.in_reply_to, data.inReplyTo, header('in-reply-to')) ?? null;
  const referencesRaw = data.references ?? header('references') ?? null;

  const fromRaw = firstOf(data.from);
  const { address: fromAddress, name: fromName } = parseAddress(fromRaw);

  const toAddresses = toArray(data.to).map((a) => parseAddress(a).address).filter(Boolean) as string[];
  const ccAddresses = toArray(data.cc).map((a) => parseAddress(a).address).filter(Boolean) as string[];

  const receivedAt =
    pickString(data.date, data.created_at, envelopeCreatedAt) ?? new Date().toISOString();

  const attachments: ParsedAttachment[] = (data.attachments ?? []).map((att) => ({
    filename: att.filename ?? att.name ?? 'unnamed',
    content_type: att.content_type ?? att.contentType ?? null,
    size_bytes: att.size_bytes ?? att.size ?? null,
    content_base64: att.content_base64 ?? att.content ?? null,
    url: att.url ?? null,
    content_id: att.content_id ?? att.contentId ?? null,
    is_inline: (att.disposition ?? '').toLowerCase() === 'inline',
  }));

  return {
    event_id: pickString(data.email_id, data.id) ?? messageId ?? fallbackEventId,
    message_id: messageId,
    in_reply_to: inReplyTo,
    references: parseReferences(referencesRaw),
    from_address: fromAddress ?? '',
    from_name: fromName,
    to_addresses: toAddresses,
    cc_addresses: ccAddresses,
    subject: data.subject ?? '',
    body_text: data.text ?? null,
    body_html: data.html ?? null,
    received_at: receivedAt,
    spam_score: data.spam_score ?? null,
    attachments,
    raw,
  };
}

// ─── helpers ────────────────────────────────────────────────────────

function normalizeHeaders(
  input: z.infer<typeof headerEntrySchema>[] | null | undefined
): Map<string, string> {
  const map = new Map<string, string>();
  if (!input) return map;
  for (const entry of input) {
    if (Array.isArray(entry)) {
      map.set(entry[0].toLowerCase(), entry[1]);
    } else {
      map.set(entry.name.toLowerCase(), entry.value);
    }
  }
  return map;
}

function toArray(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function firstOf(value: string | string[] | null | undefined): string | null {
  const arr = toArray(value);
  return arr[0] ?? null;
}

function pickString(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c;
  }
  return null;
}

function parseReferences(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Ruft den vollständigen Inhalt einer empfangenen Mail (text, html, attachments)
 * über die Resend-Receiving-API ab. Der Webhook-Payload selbst enthält nur
 * Metadaten, der Body muss separat geladen werden.
 */
export async function fetchReceivedEmailContent(
  emailId: string,
  apiKey: string
): Promise<{
  text: string | null;
  html: string | null;
  attachments: Array<{
    id: string;
    filename: string;
    content_type: string | null;
    content_disposition: string | null;
  }>;
} | null> {
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(`[resend-inbound] Content-Fetch fehlgeschlagen: ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      text?: string | null;
      html?: string | null;
      attachments?: Array<{
        id: string;
        filename?: string | null;
        content_type?: string | null;
        content_disposition?: string | null;
      }>;
    };
    return {
      text: data.text ?? null,
      html: data.html ?? null,
      attachments: (data.attachments ?? []).map((a) => ({
        id: a.id,
        filename: a.filename ?? 'attachment',
        content_type: a.content_type ?? null,
        content_disposition: a.content_disposition ?? null,
      })),
    };
  } catch (err) {
    console.error('[resend-inbound] Content-Fetch-Exception:', err);
    return null;
  }
}

/**
 * Holt eine signierte Download-URL für einen Anhang einer empfangenen Mail.
 * Die URL ist ca. 1 Stunde gültig.
 */
export async function fetchAttachmentDownloadUrl(
  emailId: string,
  attachmentId: string,
  apiKey: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.resend.com/emails/receiving/${emailId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) {
      console.error(`[resend-inbound] Attachment-URL-Fetch fehlgeschlagen: ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { download_url?: string };
    return data.download_url ?? null;
  } catch (err) {
    console.error('[resend-inbound] Attachment-URL-Exception:', err);
    return null;
  }
}

/**
 * Parst "Max Müller <max@example.com>" oder "max@example.com" in strukturierte Form.
 */
export function parseAddress(raw: string | null | undefined): {
  address: string | null;
  name: string | null;
} {
  if (!raw) return { address: null, name: null };
  const match = raw.match(/^\s*(?:"?([^"<]+?)"?)?\s*<([^>]+)>\s*$/);
  if (match) {
    return {
      name: (match[1] ?? '').trim() || null,
      address: match[2].trim().toLowerCase(),
    };
  }
  return { address: raw.trim().toLowerCase(), name: null };
}
