import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { verifyLeiterSession } from '@/lib/leiter-auth';
import { istWertPlausibel } from '@/lib/ergebnis-limits';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const session = await verifyLeiterSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  let body: { spielId?: string; kindId?: string; wert?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  const { spielId, kindId, wert } = body;
  if (!spielId || !kindId || typeof wert !== 'number') {
    return NextResponse.json({ error: 'spielId, kindId und wert (Zahl) erforderlich' }, { status: 400 });
  }

  // Spiel laden für Wertungstyp-Check + Event-Validierung
  const { data: spiel, error: spielError } = await supabaseAdmin
    .from('spiele')
    .select('id, wertungstyp')
    .eq('id', spielId)
    .single();
  if (spielError || !spiel) {
    return NextResponse.json({ error: 'Spiel nicht gefunden' }, { status: 404 });
  }

  const plaus = istWertPlausibel(wert, spiel.wertungstyp);
  if (!plaus.ok) {
    return NextResponse.json({ error: plaus.grund }, { status: 400 });
  }

  // Gruppe + Event verifizieren
  const { data: gruppe } = await supabaseAdmin
    .from('spielgruppen')
    .select('id, event_id')
    .eq('id', session.gruppeId)
    .single();
  if (!gruppe) {
    return NextResponse.json({ error: 'Gruppe nicht gefunden' }, { status: 404 });
  }

  // Kind gehört zur Gruppe?
  const { data: zuordnung } = await supabaseAdmin
    .from('kind_spielgruppe_zuordnung')
    .select('kind_id')
    .eq('kind_id', kindId)
    .eq('spielgruppe_id', session.gruppeId)
    .maybeSingle();
  if (!zuordnung) {
    return NextResponse.json({ error: 'Dieses Kind gehört nicht zur Gruppe' }, { status: 403 });
  }

  // Spiel nicht bereits abgeschlossen?
  const { data: abgeschlossen } = await supabaseAdmin
    .from('spielgruppe_spiel_status')
    .select('spiel_id')
    .eq('spiel_id', spielId)
    .eq('spielgruppe_id', session.gruppeId)
    .eq('event_id', gruppe.event_id)
    .maybeSingle();
  if (abgeschlossen) {
    return NextResponse.json(
      { error: 'Dieses Spiel ist für die Gruppe bereits abgeschlossen' },
      { status: 409 },
    );
  }

  const { error: upsertError } = await supabaseAdmin
    .from('ergebnisse')
    .upsert(
      {
        kind_id: kindId,
        spiel_id: spielId,
        spielgruppe_id: session.gruppeId,
        event_id: gruppe.event_id,
        wert_numeric: wert,
        erfasst_am: new Date().toISOString(),
      },
      { onConflict: 'kind_id, spiel_id' },
    );

  if (upsertError) {
    console.error('Ergebnis-Upsert fehlgeschlagen:', upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ erfolg: true });
}
