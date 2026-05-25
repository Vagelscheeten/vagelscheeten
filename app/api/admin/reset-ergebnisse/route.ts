import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// DELETE: löscht alle Ergebnisse und Spielabschluss-Markierungen für das aktive Event.
// Nach erfolgreichem Test kann damit der Stand vor dem echten Veranstaltungstag zurückgesetzt werden.
export async function DELETE() {
  const supabaseUser = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, name')
    .eq('ist_aktiv', true)
    .single();
  if (eventError || !event) {
    return NextResponse.json({ error: 'Kein aktives Event gefunden' }, { status: 404 });
  }

  // Vorab zählen
  const { count: ergebnisseCount } = await supabaseAdmin
    .from('ergebnisse')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id);

  const { count: statusCount } = await supabaseAdmin
    .from('spielgruppe_spiel_status')
    .select('spielgruppe_id', { count: 'exact', head: true })
    .eq('event_id', event.id);

  // Reihenfolge: zuerst Status (kein FK auf ergebnisse), dann Ergebnisse
  const { error: statusDelError } = await supabaseAdmin
    .from('spielgruppe_spiel_status')
    .delete()
    .eq('event_id', event.id);
  if (statusDelError) {
    console.error('reset-ergebnisse: Fehler beim Löschen der Status:', statusDelError);
    return NextResponse.json({ error: statusDelError.message }, { status: 500 });
  }

  const { error: ergDelError } = await supabaseAdmin
    .from('ergebnisse')
    .delete()
    .eq('event_id', event.id);
  if (ergDelError) {
    console.error('reset-ergebnisse: Fehler beim Löschen der Ergebnisse:', ergDelError);
    return NextResponse.json({ error: ergDelError.message }, { status: 500 });
  }

  console.log(
    `reset-ergebnisse: Event ${event.name}: ${ergebnisseCount ?? 0} Ergebnisse + ${statusCount ?? 0} Status-Einträge gelöscht (von ${user.email})`,
  );

  return NextResponse.json({
    erfolg: true,
    eventName: event.name,
    ergebnisseGeloescht: ergebnisseCount ?? 0,
    statusGeloescht: statusCount ?? 0,
  });
}
