import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { buildEmailFuerAnmeldung, loadEmailKontext, type AnmeldungMail } from '@/lib/helfer-email';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/helfer/benachrichtigung/vorschau?eventId=...&anmeldungId=...
 *
 * Rendert die echte HTML-Mail für eine konkrete Anmeldung.
 * Ohne anmeldungId: wählt eine verifizierte Anmeldung mit aktiver Helfer-Zuteilung
 * (deterministisch über alphabetische Nachnamen-Sortierung).
 * Bevorzugt noch nicht benachrichtigte Anmeldungen, damit die Vorschau dem Versand-Sample entspricht.
 */
export async function GET(req: NextRequest) {
  try {
    // Auth-Check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const anmeldungId = searchParams.get('anmeldungId');
    const skip = Number(searchParams.get('skip') || '0');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId fehlt' }, { status: 400 });
    }

    const kontext = await loadEmailKontext(supabaseAdmin, eventId);

    let anmeldung: AnmeldungMail | null = null;

    if (anmeldungId) {
      const { data } = await supabaseAdmin
        .from('anmeldungen')
        .select('id, kind_vorname, kind_nachname, kind_klasse, eltern_email, weitere_kinder_json')
        .eq('id', anmeldungId)
        .single();
      anmeldung = data as AnmeldungMail | null;
    } else {
      const { data: anmeldungen } = await supabaseAdmin
        .from('anmeldungen')
        .select('id, kind_vorname, kind_nachname, kind_klasse, eltern_email, weitere_kinder_json, benachrichtigt_am')
        .eq('event_id', eventId)
        .eq('verifiziert', true)
        .not('eltern_email', 'is', null)
        .order('kind_nachname');

      const list = (anmeldungen || []) as (AnmeldungMail & { benachrichtigt_am: string | null })[];

      // Bevorzugt: Anmeldungen mit Helfer-Zuteilung, die noch nicht benachrichtigt wurden
      const mitZuteilung = list.filter((a) =>
        kontext.kinder.some(
          (k) =>
            k.vorname.toLowerCase() === a.kind_vorname.toLowerCase() &&
            k.nachname.toLowerCase() === a.kind_nachname.toLowerCase() &&
            kontext.zuteilungen.some((z) => z.kind_id === k.id),
        ),
      );

      const offen = mitZuteilung.filter((a) => !a.benachrichtigt_am);
      const pool = offen.length > 0 ? offen : mitZuteilung.length > 0 ? mitZuteilung : list;

      if (pool.length > 0) {
        anmeldung = pool[skip % pool.length] as AnmeldungMail;
      }

      return _buildResponse(anmeldung, pool.length, kontext);
    }

    if (!anmeldung) {
      return NextResponse.json({ error: 'Keine Anmeldung gefunden' }, { status: 404 });
    }

    return _buildResponse(anmeldung, 1, kontext);
  } catch (error: any) {
    console.error('Vorschau-Fehler:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function _buildResponse(
  anmeldung: AnmeldungMail | null,
  poolSize: number,
  kontext: Awaited<ReturnType<typeof loadEmailKontext>>,
) {
  if (!anmeldung) {
    return NextResponse.json({ error: 'Keine geeignete Anmeldung gefunden' }, { status: 404 });
  }
  const mail = buildEmailFuerAnmeldung(anmeldung, kontext);
  return NextResponse.json({
    anmeldungId: anmeldung.id,
    kindName: mail.kindName,
    kindKlasse: anmeldung.kind_klasse,
    elternEmail: mail.to,
    subject: mail.subject,
    html: mail.html,
    hatZuteilung: mail.hatZuteilung,
    poolSize,
  });
}
