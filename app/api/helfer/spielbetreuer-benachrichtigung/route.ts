import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { buildSpielbetreuerEmail, loadSpielbetreuerMails } from '@/lib/spielbetreuer-email';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY);
const ABSENDER = process.env.HELFER_EMAIL_FROM || 'Orgateam Vagelscheeten <orgateam@vagelscheeten.de>';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = (body?.action as string) || 'vorschau';
    const eventId = body?.eventId as string | undefined;
    if (!eventId) {
      return NextResponse.json({ error: 'eventId fehlt' }, { status: 400 });
    }

    const alleMails = await loadSpielbetreuerMails(supabaseAdmin, eventId);

    if (action === 'vorschau') {
      // Nur ungesendete Mails zurückgeben + gerendertes HTML pro Mail
      const pending = alleMails.filter((m) => m.hatUnbenachrichtigt);
      const rendered = pending.map((m) => {
        const { subject, html } = buildSpielbetreuerEmail(m);
        return {
          anmeldungId: m.anmeldungId,
          empfaenger: m.elternEmail,
          subject,
          html,
          zuteilungen: m.zuteilungen.map((z) => ({
            kindName: `${z.kindVorname} ${z.kindNachname}`,
            kindKlasse: z.kindKlasse,
            spielName: z.spielName,
            schonBenachrichtigt: !!z.benachrichtigtAm,
          })),
        };
      });

      return NextResponse.json({
        erfolg: true,
        ungesendet: pending.length,
        gesamtFamilien: alleMails.length,
        mails: rendered,
      });
    }

    if (action === 'send') {
      if (!process.env.RESEND_API_KEY) {
        return NextResponse.json(
          { error: 'E-Mail-Versand nicht konfiguriert (RESEND_API_KEY fehlt)' },
          { status: 503 },
        );
      }

      const pending = alleMails.filter((m) => m.hatUnbenachrichtigt);
      let gesendet = 0;
      let fehler = 0;
      const fehlerDetails: { email: string; grund: string }[] = [];

      const RATE_LIMIT_MS = 250;
      let lastSendAt = 0;

      for (const mail of pending) {
        try {
          const wartet = lastSendAt + RATE_LIMIT_MS - Date.now();
          if (wartet > 0) await new Promise((r) => setTimeout(r, wartet));

          const { subject, html } = buildSpielbetreuerEmail(mail);
          const { data, error: resendError } = await resend.emails.send({
            from: ABSENDER,
            to: [mail.elternEmail],
            subject,
            html,
          });
          lastSendAt = Date.now();

          if (resendError || !data) {
            throw new Error(resendError?.message || 'Resend lieferte keine Mail-ID zurück');
          }

          // Markiere ALLE Zuteilungen dieser Mail als benachrichtigt
          const zuteilungIds = mail.zuteilungen.map((z) => z.zuteilungId);
          const { error: updateError } = await supabaseAdmin
            .from('helfer_spiel_zuteilungen')
            .update({ benachrichtigt_am: new Date().toISOString() })
            .in('id', zuteilungIds);
          if (updateError) throw updateError;

          gesendet++;
        } catch (e: any) {
          const grund = e?.message || String(e);
          console.error(`Fehler beim Senden an ${mail.elternEmail}:`, grund);
          fehler++;
          fehlerDetails.push({ email: mail.elternEmail, grund });
        }
      }

      return NextResponse.json({ erfolg: true, gesendet, fehler, fehlerDetails });
    }

    return NextResponse.json({ error: 'Unbekannte action' }, { status: 400 });
  } catch (error: any) {
    console.error('Fehler bei spielbetreuer-benachrichtigung:', error);
    return NextResponse.json({ error: error?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}
