import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { escapeHtml } from '@/lib/email-utils';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

const ABSENDER = process.env.HELFER_EMAIL_FROM || 'Orgateam Vagelscheeten <orgateam@vagelscheeten.de>';
const FEST_DATUM = process.env.FEST_DATUM || 'beim Melsdörper Vagelscheeten';

function formatZeitfenster(z: string): string {
  if (z === 'vormittag') return 'Vormittags';
  if (z === 'nachmittag') return 'Nachmittags';
  if (z === 'beides') return 'Ganztägig';
  return z;
}

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

    // Alle Zuteilungen für dieses Event laden
    const { data: zuteilungen } = await supabaseAdmin
      .from('helfer_zuteilungen')
      .select(`
        kind_id, zeitfenster,
        aufgabe:helferaufgaben(titel, beschreibung)
      `)
      .eq('event_id', eventId);

    // Alle bestätigten Essensspenden-Zuteilungen laden
    const { data: alleEssensspenden } = await supabaseAdmin
      .from('essensspenden_rueckmeldungen')
      .select('kind_identifier, menge, anmerkung, spende:spende_id(titel)')
      .eq('event_id', eventId)
      .eq('bestaetigt', true);

    // Kinder laden um kind_id → name Mapping zu bauen (nur aktuelles Event!)
    const { data: kinder } = await supabaseAdmin
      .from('kinder')
      .select('id, vorname, nachname, klasse')
      .eq('event_id', eventId);

    const kinderMap: Record<string, { id: string; vorname: string; nachname: string; klasse?: string }> = {};
    (kinder || []).forEach(k => {
      kinderMap[`${k.vorname}_${k.nachname}`] = k;
    });

    let gesendet = 0;
    let fehler = 0;

    for (const anmeldung of anmeldungen) {
      try {
        // Kind-ID finden
        const kind = (kinder || []).find(
          k => k.vorname.toLowerCase() === anmeldung.kind_vorname.toLowerCase()
            && k.nachname.toLowerCase() === anmeldung.kind_nachname.toLowerCase()
        );

        let aufgabeTitel = 'Helfer';
        let aufgabeBeschreibung: string | null = null;
        let zeitfensterText = '';

        if (kind) {
          const zuteilung = (zuteilungen || []).find(z => z.kind_id === kind.id);
          if (zuteilung) {
            const aufgabe = Array.isArray(zuteilung.aufgabe)
              ? zuteilung.aufgabe[0]
              : zuteilung.aufgabe;
            aufgabeTitel = aufgabe?.titel || 'Helfer';
            aufgabeBeschreibung = aufgabe?.beschreibung || null;
            zeitfensterText = formatZeitfenster(zuteilung.zeitfenster);
          }
        }

        const kindName = `${escapeHtml(anmeldung.kind_vorname)} ${escapeHtml(anmeldung.kind_nachname)}`;
        const weitereKinder: { vorname: string; nachname: string; klasse: string }[] = anmeldung.weitere_kinder_json || [];

        // Essensspenden: build combined identifier matching what was stored on confirmation
        let kindIdentifier = `${anmeldung.kind_nachname}, ${anmeldung.kind_vorname} (${anmeldung.kind_klasse})`;
        if (weitereKinder.length > 0) {
          kindIdentifier += weitereKinder
            .map(k => ` + ${k.nachname}, ${k.vorname} (${k.klasse})`)
            .join('');
        }
        const kindEssensspenden = (alleEssensspenden || []).filter(
          e => e.kind_identifier === kindIdentifier
        );

        const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
    <h2 style="color: #F2A03D;">Helfer-Zuteilung ${FEST_DATUM}</h2>

    <p>Hallo!</p>

    <p>Vielen Dank für die Anmeldung als Helfer zum ${FEST_DATUM} (${weitereKinder.length > 0 ? 'Kinder' : 'Kind'}: <strong>${kindName}</strong>, Klasse ${escapeHtml(anmeldung.kind_klasse)}${weitereKinder.map(k => `; <strong>${escapeHtml(k.vorname)} ${escapeHtml(k.nachname)}</strong>, Klasse ${escapeHtml(k.klasse)}`).join('')}).</p>

    <p>Folgende Aufgabe wurde zugeteilt:</p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Aufgabe:</td>
          <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(aufgabeTitel)}</td>
        </tr>
        ${aufgabeBeschreibung ? `
        <tr>
          <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Details:</td>
          <td style="padding: 8px 0;">${escapeHtml(aufgabeBeschreibung)}</td>
        </tr>` : ''}
        ${zeitfensterText ? `
        <tr>
          <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Zeitfenster:</td>
          <td style="padding: 8px 0; font-weight: 600;">${zeitfensterText}</td>
        </tr>` : ''}
        ${kindEssensspenden.length > 0 ? `
        <tr>
          <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Essensspende:</td>
          <td style="padding: 8px 0;">${kindEssensspenden.map(e => {
            const spende = Array.isArray(e.spende) ? e.spende[0] : e.spende;
            return `${e.menge}&times; ${escapeHtml(spende?.titel || 'Essensspende')}`;
          }).join(', ')}</td>
        </tr>` : ''}
      </table>
    </div>

    <p>Vielen Dank für die Unterstützung!</p>

    <p style="font-size: 14px;">Bei Fragen: <a href="mailto:orgateam@vagelscheeten.de" style="color: #2563eb;">orgateam@vagelscheeten.de</a></p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">
      Diese E-Mail wurde automatisch versendet.
    </p>
  </div>
</body>
</html>`;

        await resend.emails.send({
          from: ABSENDER,
          to: [anmeldung.eltern_email],
          subject: `Helfer-Zuteilung ${FEST_DATUM} (${weitereKinder.length > 0 ? `Familie ${anmeldung.kind_nachname}` : kindName})`,
          html: htmlBody,
        });

        // benachrichtigt_am setzen
        await supabaseAdmin
          .from('anmeldungen')
          .update({ benachrichtigt_am: new Date().toISOString() })
          .eq('id', anmeldung.id);

        gesendet++;
      } catch (mailError) {
        console.error(`Fehler beim Senden an ${anmeldung.eltern_email}:`, mailError);
        fehler++;
      }
    }

    return NextResponse.json({ erfolg: true, gesendet, fehler });
  } catch (error: any) {
    console.error('Fehler bei Benachrichtigung:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
