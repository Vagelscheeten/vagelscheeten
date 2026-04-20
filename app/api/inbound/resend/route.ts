import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  parseInboundPayload,
  fetchReceivedEmailContent,
  fetchAttachmentDownloadUrl,
} from '@/lib/postfach/resend-inbound';
import { resolveThread } from '@/lib/postfach/threading';
import { resolveAttachmentBuffer, uploadAttachment } from '@/lib/postfach/storage';
import { sendInboundNotification } from '@/lib/postfach/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // ── 1. Signatur verifizieren ──────────────────────────────────────
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[inbound/resend] RESEND_WEBHOOK_SECRET fehlt');
    return NextResponse.json({ error: 'server-misconfigured' }, { status: 500 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'missing-signature' }, { status: 401 });
  }

  let verified: unknown;
  try {
    const wh = new Webhook(secret);
    verified = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (err) {
    console.warn('[inbound/resend] Signaturprüfung fehlgeschlagen:', err);
    return NextResponse.json({ error: 'invalid-signature' }, { status: 401 });
  }

  // ── 2. Payload parsen ─────────────────────────────────────────────
  const fallbackEventId = svixId;
  let parsed;
  try {
    parsed = parseInboundPayload(verified, fallbackEventId);
  } catch (err) {
    console.error('[inbound/resend] Payload-Parse-Fehler:', err);
    return NextResponse.json({ error: 'invalid-payload' }, { status: 400 });
  }

  // ── Loop-Schutz: keine Mails verarbeiten, die wir selbst versendet haben ──
  const inboxAddress = (process.env.POSTFACH_INBOX_ADDRESS ?? 'orgateam@vagelscheeten.de').toLowerCase();
  if (parsed.from_address.toLowerCase() === inboxAddress) {
    console.warn('[inbound/resend] Self-Mail ignoriert, from === inbox-address');
    return NextResponse.json({ ok: true, ignored: 'self-mail' });
  }

  // ── Body + Attachment-Metadaten über Resend-Content-API laden ──────
  // Der Webhook-Payload enthält nur Metadaten, der eigentliche Inhalt
  // muss separat abgerufen werden.
  const apiKey = process.env.RESEND_API_KEY;
  let attachmentMetadata: Array<{
    id: string;
    filename: string;
    content_type: string | null;
    content_disposition: string | null;
  }> = [];
  if (apiKey && parsed.event_id) {
    const content = await fetchReceivedEmailContent(parsed.event_id, apiKey);
    if (content) {
      parsed.body_text = content.text ?? parsed.body_text;
      parsed.body_html = content.html ?? parsed.body_html;
      attachmentMetadata = content.attachments;
    }
  }

  const supabase = createAdminClient();

  // ── 3. Idempotenz-Check ───────────────────────────────────────────
  const { error: idemError } = await supabase
    .from('postfach_webhook_events')
    .insert({ event_id: parsed.event_id });

  if (idemError) {
    // Unique-Violation → bereits verarbeitet
    if ((idemError as { code?: string }).code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error('[inbound/resend] Idempotenz-Insert fehlgeschlagen:', idemError);
    return NextResponse.json({ error: 'idempotency-failed' }, { status: 500 });
  }

  // ── 4. Thread auflösen ────────────────────────────────────────────
  const participants = [parsed.from_address, ...parsed.to_addresses, ...parsed.cc_addresses].filter(
    Boolean
  );

  let threadId: string;
  try {
    const res = await resolveThread(supabase, {
      inReplyTo: parsed.in_reply_to,
      references: parsed.references,
      subject: parsed.subject,
      participants,
    });
    threadId = res.threadId;
  } catch (err) {
    console.error('[inbound/resend] Thread-Resolve-Fehler:', err);
    return NextResponse.json({ error: 'thread-failed' }, { status: 500 });
  }

  // ── 5. Email-Row anlegen ──────────────────────────────────────────
  const { data: emailRow, error: emailError } = await supabase
    .from('emails')
    .insert({
      thread_id: threadId,
      direction: 'inbound',
      message_id: parsed.message_id,
      in_reply_to: parsed.in_reply_to,
      references: parsed.references,
      from_address: parsed.from_address,
      from_name: parsed.from_name,
      to_addresses: parsed.to_addresses,
      cc_addresses: parsed.cc_addresses.length > 0 ? parsed.cc_addresses : null,
      subject: parsed.subject,
      body_text: parsed.body_text,
      body_html: parsed.body_html,
      received_at: parsed.received_at,
      is_read: false,
      spam_score: parsed.spam_score,
      raw_payload: parsed.raw as never,
      resend_id: parsed.event_id,
    })
    .select('id')
    .single();

  if (emailError || !emailRow) {
    console.error('[inbound/resend] Email-Insert-Fehler:', emailError);
    return NextResponse.json({ error: 'persist-failed' }, { status: 500 });
  }

  // ── 6. Attachments persistieren ───────────────────────────────────
  // Download-URLs per Resend-API holen und dann Binary laden.
  if (apiKey) {
    for (const meta of attachmentMetadata) {
      try {
        const downloadUrl = await fetchAttachmentDownloadUrl(parsed.event_id, meta.id, apiKey);
        if (!downloadUrl) continue;
        const resolved = await resolveAttachmentBuffer(null, downloadUrl);
        if (!resolved) {
          console.warn(`[inbound/resend] Attachment übersprungen (Cap überschritten): ${meta.filename}`);
          continue;
        }
        const storagePath = await uploadAttachment(
          supabase,
          emailRow.id,
          meta.filename,
          meta.content_type,
          resolved.buffer
        );
        await supabase.from('email_attachments').insert({
          email_id: emailRow.id,
          filename: meta.filename,
          content_type: meta.content_type,
          size_bytes: resolved.size,
          storage_path: storagePath,
          is_inline: (meta.content_disposition ?? '').toLowerCase() === 'inline',
        });
      } catch (err) {
        console.error(`[inbound/resend] Attachment-Fehler (${meta.filename}):`, err);
      }
    }
  }

  // ── 7. Thread updaten ─────────────────────────────────────────────
  const { data: threadRow } = await supabase
    .from('email_threads')
    .select('message_count')
    .eq('id', threadId)
    .maybeSingle();

  await supabase
    .from('email_threads')
    .update({
      last_message_at: parsed.received_at,
      message_count: (threadRow?.message_count ?? 0) + 1,
      has_unread: true,
    })
    .eq('id', threadId);

  // ── 8. Benachrichtigung (non-blocking) ────────────────────────────
  try {
    await sendInboundNotification(supabase, {
      threadId,
      fromAddress: parsed.from_address,
      fromName: parsed.from_name,
      subject: parsed.subject,
      bodySnippet: parsed.body_text ?? '',
    });
  } catch (err) {
    console.error('[inbound/resend] Notification-Fehler:', err);
  }

  return NextResponse.json({ ok: true, thread_id: threadId, email_id: emailRow.id });
}
