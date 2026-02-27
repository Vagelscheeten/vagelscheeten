import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // 1. Lade alle Bedarfe für dieses Event
    const { data: bedarfe, error: bedarfeError } = await supabaseAdmin
      .from('essensspenden_bedarf')
      .select('id, titel, anzahl_benoetigt')
      .eq('event_id', eventId)
      .order('titel');

    if (bedarfeError) {
      return NextResponse.json({ error: bedarfeError.message }, { status: 500 });
    }

    if (!bedarfe || bedarfe.length === 0) {
      return NextResponse.json({ error: 'Keine Bedarfe für dieses Event gefunden' }, { status: 404 });
    }

    // 2. Lade alle bestätigten Rückmeldungen, sortiert nach erstellt_am ASC (älteste zuerst)
    const { data: rueckmeldungen, error: rueckError } = await supabaseAdmin
      .from('essensspenden_rueckmeldungen')
      .select('id, spende_id, menge, kind_identifier, erstellt_am, anmerkung')
      .eq('event_id', eventId)
      .eq('bestaetigt', true)
      .order('erstellt_am', { ascending: true });

    if (rueckError) {
      return NextResponse.json({ error: rueckError.message }, { status: 500 });
    }

    const alleRueckmeldungen = rueckmeldungen || [];

    // 3. Für jeden Bedarf: Kapazität berechnen und Überschuss trimmen
    const overflowPool: { id: string; spende_id: string; titel: string; menge: number }[] = [];
    let umgeteilt = 0;

    for (const bedarf of bedarfe) {
      const zugehoerige = alleRueckmeldungen
        .filter(r => r.spende_id === bedarf.id);

      const summe = zugehoerige.reduce((s, r) => s + r.menge, 0);
      let kapazitaet = bedarf.anzahl_benoetigt - summe;

      // 4. Überschuss trimmen: letzte Records auf bestaetigt = false setzen
      if (kapazitaet < 0) {
        // Rückmeldungen von hinten (neueste zuerst) ausschleusen bis Kapazität = 0
        const sortedDesc = [...zugehoerige].sort(
          (a, b) => new Date(b.erstellt_am).getTime() - new Date(a.erstellt_am).getTime()
        );

        let überschuss = Math.abs(kapazitaet);
        for (const r of sortedDesc) {
          if (überschuss <= 0) break;

          await supabaseAdmin
            .from('essensspenden_rueckmeldungen')
            .update({ bestaetigt: false, anmerkung: 'Überschuss — automatisch ausgeschlossen' })
            .eq('id', r.id);

          overflowPool.push({
            id: r.id,
            spende_id: r.spende_id,
            titel: bedarf.titel,
            menge: r.menge,
          });

          überschuss -= r.menge;
        }
      }
    }

    // 5. Lücken füllen: Für jeden Bedarf mit Kapazität > 0 aus Pool umbuchen
    // Bedarfe neu laden nach Überschuss-Trimming
    const { data: aktualisiertRueckmeldungen } = await supabaseAdmin
      .from('essensspenden_rueckmeldungen')
      .select('id, spende_id, menge')
      .eq('event_id', eventId)
      .eq('bestaetigt', true);

    const luecken: { titel: string; fehlend: number }[] = [];

    for (const bedarf of bedarfe) {
      const aktuelleZugesagt = (aktualisiertRueckmeldungen || [])
        .filter(r => r.spende_id === bedarf.id)
        .reduce((s, r) => s + r.menge, 0);

      let fehlend = bedarf.anzahl_benoetigt - aktuelleZugesagt;

      if (fehlend > 0 && overflowPool.length > 0) {
        // Aus Pool nehmen und umbuchen
        while (fehlend > 0 && overflowPool.length > 0) {
          const poolItem = overflowPool.shift()!;

          await supabaseAdmin
            .from('essensspenden_rueckmeldungen')
            .update({
              spende_id: bedarf.id,
              bestaetigt: true,
              anmerkung: `Automatisch umgeteilt von "${poolItem.titel}"`,
            })
            .eq('id', poolItem.id);

          umgeteilt++;
          fehlend -= poolItem.menge;
        }
      }

      // Finale Lücke berechnen nach Umteilung
      const finaleZugesagt = aktuelleZugesagt + (fehlend < 0 ? bedarf.anzahl_benoetigt - aktuelleZugesagt : bedarf.anzahl_benoetigt - aktuelleZugesagt - fehlend);
      const finaleLuecke = bedarf.anzahl_benoetigt - finaleZugesagt;
      if (finaleLuecke > 0) {
        luecken.push({ titel: bedarf.titel, fehlend: finaleLuecke });
      }
    }

    // 6. Event-Timestamp setzen
    await supabaseAdmin
      .from('events')
      .update({ essensspenden_verteilt_am: new Date().toISOString() })
      .eq('id', eventId);

    // Finale Zählung der bestätigten Rückmeldungen
    const { count: bestaetigt } = await supabaseAdmin
      .from('essensspenden_rueckmeldungen')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('bestaetigt', true);

    return NextResponse.json({
      erfolg: true,
      bestaetigt: bestaetigt || 0,
      umgeteilt,
      luecken,
    });
  } catch (error: any) {
    console.error('Fehler bei Essensspenden-Auto-Verteilung:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
