import type { SupabaseClient } from '@supabase/supabase-js';

export const POSTFACH_BUCKET = 'postfach-attachments';
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB Cap
const SIGNED_URL_TTL_SECONDS = 60 * 5;

/**
 * Erzeugt einen Storage-Pfad für einen Anhang einer Email.
 */
export function buildAttachmentPath(emailId: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const uid = crypto.randomUUID();
  return `${emailId}/${uid}-${safeName}`;
}

/**
 * Lädt einen Puffer in den Postfach-Storage und gibt den Pfad zurück.
 * Service-Role-Client erforderlich.
 */
export async function uploadAttachment(
  supabaseAdmin: SupabaseClient,
  emailId: string,
  filename: string,
  contentType: string | null,
  buffer: Buffer
): Promise<string> {
  const path = buildAttachmentPath(emailId, filename);
  const { error } = await supabaseAdmin.storage
    .from(POSTFACH_BUCKET)
    .upload(path, buffer, {
      contentType: contentType ?? 'application/octet-stream',
      upsert: false,
    });
  if (error) {
    throw new Error(`Upload fehlgeschlagen (${filename}): ${error.message}`);
  }
  return path;
}

/**
 * Holt Attachment-Content aus base64 oder URL. Gibt null zurück, wenn Cap überschritten.
 */
export async function resolveAttachmentBuffer(
  base64: string | null,
  url: string | null
): Promise<{ buffer: Buffer; size: number } | null> {
  if (base64) {
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_ATTACHMENT_BYTES) return null;
    return { buffer, size: buffer.length };
  }
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Attachment-Download fehlgeschlagen: ${res.status}`);
    const lengthHeader = res.headers.get('content-length');
    if (lengthHeader && Number(lengthHeader) > MAX_ATTACHMENT_BYTES) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length > MAX_ATTACHMENT_BYTES) return null;
    return { buffer, size: buffer.length };
  }
  return null;
}

/**
 * Signierte Download-URL (5 min TTL).
 */
export async function createAttachmentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(POSTFACH_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL konnte nicht erzeugt werden: ${error?.message ?? 'unknown'}`);
  }
  return data.signedUrl;
}

/**
 * Verschiebt eine Draft-Datei (outbox/...) unter das fertige Email-ID-Prefix.
 */
export async function moveDraftToEmail(
  supabaseAdmin: SupabaseClient,
  draftPath: string,
  emailId: string
): Promise<{ storage_path: string } | null> {
  const filename = draftPath.split('/').pop() ?? 'attachment';
  const newPath = buildAttachmentPath(emailId, filename);
  const { error } = await supabaseAdmin.storage
    .from(POSTFACH_BUCKET)
    .move(draftPath, newPath);
  if (error) return null;
  return { storage_path: newPath };
}
