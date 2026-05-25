import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { buildEmailFuerAnmeldung, loadEmailKontext, type AnmeldungMail } from '@/lib/helfer-email';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

const ABSENDER = process.env.HELFER_EMAIL_FROM || 'Orgateam Vagelscheeten <orgateam@vagelscheeten.de>';

export async function POST(req: NextRequest) {
  try {
    // Auth-Check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { eventId } = await req.json();

    if (!eventId) {
      return NextResponse.json({ error: 'eventId fehlt' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'E-Mail-Versand nicht konfiguriert (RESEND_API_KEY fehlt)' },
        { status: 503 }
      );
    }

    // Anmeldungen laden (verifiziert, mit E-Mail, noch nicht benachrichtigt)
    const { data: anmeldungen, error: anmeldungenError } = await supabaseAdmin
      .from('anmeldungen')
      .select('id, kind_vorname, kind_nachname, kind_klasse, eltern_email, weitere_kinder_json')
      .eq('event_id', eventId)
      .eq('verifiziert', true)
      .not('eltern_email', 'is', null)
      .is('benachrichtigt_am', null);

    if (anmeldungenError) {
      return NextResponse.json({ error: anmeldungenError.message }, { status: 500 });
    }

    if (!anmeldungen || anmeldungen.length === 0) {
      return NextResponse.json({ erfolg: true, gesendet: 0, fehler: 0 });
    }

    const kontext = await loadEmailKontext(supabaseAdmin, eventId);

    let gesendet = 0;
    let fehler = 0;
    const fehlerDetails: { email: string; grund: string }[] = [];

    // Rate-Limit-Schutz: Resend erlaubt 10 req/s. Wir bleiben mit ~250ms Abstand sicher darunter.
    const RATE_LIMIT_MS = 250;
    let lastSendAt = 0;

    for (const anmeldung of anmeldungen as AnmeldungMail[]) {
      try {
        // Drossel: warte, falls letzter Send weniger als RATE_LIMIT_MS her ist
        const wartet = lastSendAt + RATE_LIMIT_MS - Date.now();
        if (wartet > 0) await new Promise((r) => setTimeout(r, wartet));

        const mail = buildEmailFuerAnmeldung(anmeldung, kontext);

        const { data, error: resendError } = await resend.emails.send({
          from: ABSENDER,
          to: [anmeldung.eltern_email!],
          subject: mail.subject,
          html: mail.html,
        });
        lastSendAt = Date.now();

        if (resendError || !data) {
          throw new Error(resendError?.message || 'Resend lieferte keine Mail-ID zurück');
        }

        await supabaseAdmin
          .from('anmeldungen')
          .update({ benachrichtigt_am: new Date().toISOString() })
          .eq('id', anmeldung.id);

        gesendet++;
      } catch (mailError: any) {
        const grund = mailError?.message || String(mailError);
        console.error(`Fehler beim Senden an ${anmeldung.eltern_email}:`, grund);
        fehler++;
        fehlerDetails.push({ email: anmeldung.eltern_email!, grund });
      }
    }

    return NextResponse.json({ erfolg: true, gesendet, fehler, fehlerDetails });
  } catch (error: any) {
    console.error('Fehler bei Benachrichtigung:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
