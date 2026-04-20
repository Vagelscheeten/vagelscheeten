import type { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { escapeHtml } from '@/lib/email-utils';

interface NotifyInput {
  threadId: string;
  fromAddress: string;
  fromName: string | null;
  subject: string;
  bodySnippet: string;
}

/**
 * Benachrichtigt alle aktiven Empfänger per BCC über eine neu eingegangene Mail.
 * Fehler werden geloggt, aber nicht geworfen (darf den Webhook nicht kippen).
 */
export async function sendInboundNotification(
  supabaseAdmin: SupabaseClient,
  input: NotifyInput
): Promise<void> {
  const { data: recipients, error } = await supabaseAdmin
    .from('postfach_notification_recipients')
    .select('email')
    .eq('is_active', true);

  if (error) {
    console.error('[postfach/notify] Empfängerliste konnte nicht geladen werden:', error);
    return;
  }
  if (!recipients || recipients.length === 0) return;

  const bcc = recipients.map((r) => r.email).filter(Boolean);
  if (bcc.length === 0) return;

  const from =
    process.env.POSTFACH_NOTIFICATION_FROM ?? 'Orgateam Vagelscheeten <orgateam@vagelscheeten.de>';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vagelscheeten.vercel.app';
  const link = `${baseUrl}/admin/postfach/${input.threadId}`;
  const senderDisplay = input.fromName ? `${input.fromName} <${input.fromAddress}>` : input.fromAddress;
  const snippet = (input.bodySnippet ?? '').slice(0, 200).trim();

  const text = [
    'Neue E-Mail im Postfach',
    '',
    `Von:     ${senderDisplay}`,
    `Betreff: ${input.subject || '(kein Betreff)'}`,
    snippet ? `Auszug:  ${snippet}` : '',
    '',
    `Öffnen: ${link}`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family: system-ui, sans-serif; font-size: 14px; color: #222; line-height: 1.5;">
      <p style="margin:0 0 12px 0;"><strong>Neue E-Mail im Postfach</strong></p>
      <table style="border-collapse: collapse;">
        <tr><td style="padding: 2px 8px 2px 0; color:#666;">Von:</td><td>${escapeHtml(senderDisplay)}</td></tr>
        <tr><td style="padding: 2px 8px 2px 0; color:#666;">Betreff:</td><td>${escapeHtml(input.subject || '(kein Betreff)')}</td></tr>
        ${snippet ? `<tr><td style="padding: 2px 8px 2px 0; color:#666; vertical-align: top;">Auszug:</td><td>${escapeHtml(snippet)}</td></tr>` : ''}
      </table>
      <p style="margin: 16px 0 0 0;"><a href="${escapeHtml(link)}" style="background:#33665B; color:#fff; padding:8px 14px; border-radius:6px; text-decoration:none;">Im Postfach öffnen</a></p>
    </div>
  `;

  const subject = `[Postfach] Neue Mail: ${input.subject || '(kein Betreff)'}`;

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('[postfach/notify] RESEND_API_KEY fehlt, Benachrichtigung wird übersprungen.');
      return;
    }
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: from, // primäres To = Absender selbst (BCC sieht nur jeder für sich)
      bcc,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error('[postfach/notify] Versand fehlgeschlagen:', err);
  }
}
