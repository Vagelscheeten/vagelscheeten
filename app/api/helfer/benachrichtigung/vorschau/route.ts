import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { buildEmailFuerAnmeldung, essensspendenForFamilie, kindIdsForFamilie, loadEmailKontext, type AnmeldungMail } from '@/lib/helfer-email';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/helfer/benachrichtigung/vorschau?eventId=&index=&klasse=&aufgabe=&spende=
 *
 * Liefert die echte HTML-Mail für eine konkrete Anmeldung aus einem gefilterten Pool.
 * Filter:
 *  - klasse: '' (alle) | konkrete Klasse (matched gegen kind_klasse + weitere_kinder)
 *  - aufgabe: '' (alle) | aufgabe_id | 'keine' (Familien ohne Helfer-Zuteilung)
 *  - spende: '' (alle) | spende_id | 'keine' (Familien ohne Essensspende)
 *  - index: 0-basierter Index innerhalb des gefilterten Pools (wrapt)
 *
 * Zusätzlich werden die verfügbaren Filter-Optionen (Klassen, Aufgaben, Spenden)
 * mitgeliefert.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const klasseFilter = searchParams.get('klasse') || '';
    const aufgabeFilter = searchParams.get('aufgabe') || '';
    const spendeFilter = searchParams.get('spende') || '';
    const requestedIndex = Math.max(0, Number(searchParams.get('index') || '0'));

    if (!eventId) {
      return NextResponse.json({ error: 'eventId fehlt' }, { status: 400 });
    }

    const kontext = await loadEmailKontext(supabaseAdmin, eventId);

    // Anmeldungen + Filter-Optionen laden
    const [anmeldungenRes, aufgabenRes, spendenRes] = await Promise.all([
      supabaseAdmin
        .from('anmeldungen')
        .select('id, kind_vorname, kind_nachname, kind_klasse, eltern_email, weitere_kinder_json, helfer_aufgaben_json, essensspenden_json, ist_springer, springer_zeitfenster, kommentar, verifiziert, verifiziert_am, erstellt_am, benachrichtigt_am')
        .eq('event_id', eventId)
        .eq('verifiziert', true)
        .not('eltern_email', 'is', null)
        .order('kind_nachname'),
      supabaseAdmin
        .from('helferaufgaben')
        .select('id, titel')
        .eq('event_id', eventId)
        .order('titel'),
      supabaseAdmin
        .from('essensspenden_bedarf')
        .select('id, titel')
        .eq('event_id', eventId)
        .order('titel'),
    ]);

    const alleAnmeldungen = (anmeldungenRes.data || []) as AnmeldungMail[];

    // Filter anwenden
    const gefiltert = alleAnmeldungen.filter((a) => {
      // Klasse: kind_klasse oder weitere_kinder.klasse
      if (klasseFilter) {
        const familieKlassen = new Set<string>();
        if (a.kind_klasse) familieKlassen.add(a.kind_klasse);
        for (const w of a.weitere_kinder_json || []) {
          if (w?.klasse) familieKlassen.add(w.klasse);
        }
        if (!familieKlassen.has(klasseFilter)) return false;
      }

      // Aufgabe: Familie hat zuteilung zu dieser aufgabe (oder zu IRGENDEINER, wenn 'keine'=invertiert)
      // Gleicher Helper wie Mail-Rendering: matcht auch 'Emmi' ↔ 'Emmi Helena' via firstWord.
      const familienKindIds = kindIdsForFamilie(a, kontext);
      const familienZuteilungen = kontext.zuteilungen.filter((z) => familienKindIds.includes(z.kind_id));

      if (aufgabeFilter === 'keine') {
        if (familienZuteilungen.length > 0) return false;
      } else if (aufgabeFilter) {
        const hat = familienZuteilungen.some((z) => {
          const aufg = Array.isArray(z.aufgabe) ? z.aufgabe[0] : z.aufgabe;
          // Manche Daten haben aufgabe_id direkt am z, andere nur über join — versuche beides
          return (z as any).aufgabe_id === aufgabeFilter || aufg?.id === aufgabeFilter;
        });
        if (!hat) return false;
      }

      // Spende: Familie hat eine Essensspende (mit oder ohne spezifische spende_id)
      // Wichtig: gleiche Match-Logik wie Mail-Rendering — sonst zeigen Filter
      // 'Keine Essensspende' fälschlich Familien, die doch eine Spende haben.
      const familienSpenden = essensspendenForFamilie(a, kontext);

      if (spendeFilter === 'keine') {
        if (familienSpenden.length > 0) return false;
      } else if (spendeFilter) {
        const hat = familienSpenden.some((e: any) => e.spende_id === spendeFilter);
        if (!hat) return false;
      }

      return true;
    });

    // Filter-Optionen
    const klassenSet = new Set<string>();
    for (const a of alleAnmeldungen) {
      if (a.kind_klasse) klassenSet.add(a.kind_klasse);
      for (const w of a.weitere_kinder_json || []) {
        if (w?.klasse) klassenSet.add(w.klasse);
      }
    }
    const klassenList = [...klassenSet].sort((x, y) => x.localeCompare(y, 'de'));

    const filterOptions = {
      klassen: klassenList,
      aufgaben: (aufgabenRes.data || []).map((a) => ({ id: a.id, titel: a.titel })),
      spenden: (spendenRes.data || []).map((s) => ({ id: s.id, titel: s.titel })),
    };

    const poolSize = gefiltert.length;
    if (poolSize === 0) {
      return NextResponse.json({
        poolSize: 0,
        currentIndex: 0,
        filterOptions,
        error: 'Keine Anmeldung passt zum Filter',
      });
    }

    const currentIndex = ((requestedIndex % poolSize) + poolSize) % poolSize;
    const anmeldung = gefiltert[currentIndex] as any;
    const mail = buildEmailFuerAnmeldung(anmeldung, kontext);

    // Detail-Daten für Modal: Anmeldung + Essensspenden mit Spende-Titel
    const familienSpenden = (kontext.alleEssensspenden as any[])
      .filter((e) => e.anmeldung_id === anmeldung.id)
      .map((e) => {
        const spende = Array.isArray(e.spende) ? e.spende[0] : e.spende;
        return { menge: e.menge ?? 1, titel: spende?.titel || 'Spende' };
      });

    return NextResponse.json({
      anmeldungId: anmeldung.id,
      kindName: mail.kindName,
      kindKlasse: anmeldung.kind_klasse,
      elternEmail: mail.to,
      subject: mail.subject,
      html: mail.html,
      hatZuteilung: mail.hatZuteilung,
      poolSize,
      currentIndex,
      filterOptions,
      // Volle Anmeldungs-Daten für Detail-Modal
      details: {
        kindVorname: anmeldung.kind_vorname,
        kindNachname: anmeldung.kind_nachname,
        kindKlasse: anmeldung.kind_klasse,
        elternEmail: anmeldung.eltern_email,
        weitereKinder: anmeldung.weitere_kinder_json || [],
        helferWuensche: (anmeldung.helfer_aufgaben_json || []).map((h: any) => ({
          aufgabe_id: h?.aufgabe_id,
          titel: (aufgabenRes.data || []).find((a) => a.id === h?.aufgabe_id)?.titel || 'Unbekannt',
        })),
        istSpringer: !!anmeldung.ist_springer,
        springerZeitfenster: anmeldung.springer_zeitfenster,
        essensspendenAusJson: (anmeldung.essensspenden_json || []).map((e: any) => ({
          spende_id: e?.spende_id,
          menge: e?.menge ?? 1,
          titel: (spendenRes.data || []).find((s) => s.id === e?.spende_id)?.titel || 'Unbekannt',
        })),
        essensspendenBestaetigt: familienSpenden,
        kommentar: anmeldung.kommentar,
        verifiziertAm: anmeldung.verifiziert_am,
        erstelltAm: anmeldung.erstellt_am,
        benachrichtigtAm: anmeldung.benachrichtigt_am,
      },
    });
  } catch (error: any) {
    console.error('Vorschau-Fehler:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
