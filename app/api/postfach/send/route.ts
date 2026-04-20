import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildReferencesHeader } from '@/lib/email-utils';
import { uploadAttachment } from '@/lib/postfach/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'resend-not-configured' }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid-form' }, { status: 400 });
  }

  const threadId = String(form.get('thread_id') ?? '');
  const to = String(form.get('to') ?? '').trim();
  const subject = String(form.get('subject') ?? '').trim();
  const bodyText = String(form.get('body_text') ?? '');
  const replyToEmailId = form.get('reply_to_email_id');
  const files = form.getAll('attachments').filter((f): f is File => f instanceof File && f.size > 0);

  if (!threadId || !to || !subject) {
    return NextResponse.json({ error: 'missing-fields' }, { status: 400 });
  }

  const oversized = files.find((f) => f.size > MAX_ATTACHMENT_BYTES);
  if (oversized) {
    return NextResponse.json({ error: 'attachment-too-large', filename: oversized.name }, { status: 413 });
  }

  const admin = createAdminClient();

  // Elternmail für Threading-Header laden
  let inReplyTo: string | null = null;
  let references: string[] = [];
  if (replyToEmailId) {
    const { data: parent } = await admin
      .from('emails')
      .select('message_id, in_reply_to, "references"')
      .eq('id', String(replyToEmailId))
      .maybeSingle();
    if (parent) {
      inReplyTo = parent.message_id ?? null;
      references = buildReferencesHeader(parent.references ?? [], parent.in_reply_to);
      if (parent.message_id && !references.includes(parent.message_id)) {
        references.push(parent.message_id);
      }
    }
  }

  const from = process.env.POSTFACH_NOTIFICATION_FROM ?? 'Orgateam Vagelscheeten <orgateam@vagelscheeten.de>';
  const fromAddressMatch = from.match(/<([^>]+)>/);
  const fromAddress = (fromAddressMatch?.[1] ?? from).trim();

  // Attachments als base64 für Resend vorbereiten
  const resendAttachments: { filename: string; content: string }[] = [];
  const fileBuffers: { file: File; buffer: Buffer }[] = [];
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    fileBuffers.push({ file: f, buffer: buf });
    resendAttachments.push({ filename: f.name, content: buf.toString('base64') });
  }

  const headers: Record<string, string> = {};
  if (inReplyTo) headers['In-Reply-To'] = inReplyTo;
  if (references.length > 0) headers['References'] = references.join(' ');

  // Senden
  let resendId: string | null = null;
  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to,
      subject,
      text: bodyText,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      attachments: resendAttachments.length > 0 ? resendAttachments : undefined,
    });
    resendId = result.data?.id ?? null;
    if (result.error) {
      console.error('[postfach/send] Resend-Fehler:', result.error);
      return NextResponse.json({ error: 'send-failed', detail: result.error.message }, { status: 502 });
    }
  } catch (err) {
    console.error('[postfach/send] Resend-Exception:', err);
    return NextResponse.json({ error: 'send-exception' }, { status: 502 });
  }

  // Nachricht persistieren
  const messageId = resendId ? `<${resendId}@resend>` : null;
  const { data: emailRow, error: emailError } = await admin
    .from('emails')
    .insert({
      thread_id: threadId,
      direction: 'outbound',
      message_id: messageId,
      in_reply_to: inReplyTo,
      references,
      from_address: fromAddress,
      from_name: null,
      to_addresses: [to],
      cc_addresses: null,
      subject,
      body_text: bodyText,
      body_html: null,
      received_at: new Date().toISOString(),
      is_read: true,
      resend_id: resendId,
    })
    .select('id')
    .single();

  if (emailError || !emailRow) {
    console.error('[postfach/send] DB-Persist-Fehler:', emailError);
    return NextResponse.json({ error: 'persist-failed' }, { status: 500 });
  }

  // Attachments hochladen + Rows anlegen
  for (const { file, buffer } of fileBuffers) {
    try {
      const storagePath = await uploadAttachment(admin, emailRow.id, file.name, file.type, buffer);
      await admin.from('email_attachments').insert({
        email_id: emailRow.id,
        filename: file.name,
        content_type: file.type || null,
        size_bytes: buffer.length,
        storage_path: storagePath,
        is_inline: false,
      });
    } catch (err) {
      console.error(`[postfach/send] Attachment-Upload-Fehler (${file.name}):`, err);
    }
  }

  // Thread-Meta updaten
  const { data: threadRow } = await admin
    .from('email_threads')
    .select('message_count, participants')
    .eq('id', threadId)
    .maybeSingle();
  const participants = threadRow?.participants ?? [];
  const mergedParticipants = Array.from(
    new Set([...participants.map((p: string) => p.toLowerCase()), fromAddress.toLowerCase(), to.toLowerCase()])
  );

  await admin
    .from('email_threads')
    .update({
      last_message_at: new Date().toISOString(),
      message_count: (threadRow?.message_count ?? 0) + 1,
      participants: mergedParticipants,
    })
    .eq('id', threadId);

  return NextResponse.json({ ok: true, email_id: emailRow.id, resend_id: resendId });
}
