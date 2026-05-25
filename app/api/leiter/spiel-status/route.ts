import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { verifyLeiterSession } from '@/lib/leiter-auth';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// POST: Leiter schließt ein Spiel für seine Gruppe ab
export async function POST(req: NextRequest) {
  const session = await verifyLeiterSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  let body: { spielId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }
  const { spielId } = body;
  if (!spielId) {
    return NextResponse.json({ error: 'spielId erforderlich' }, { status: 400 });
  }

  const { data: gruppe } = await supabaseAdmin
    .from('spielgruppen')
    .select('id, event_id')
    .eq('id', session.gruppeId)
    .single();
  if (!gruppe) {
    return NextResponse.json({ error: 'Gruppe nicht gefunden' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('spielgruppe_spiel_status')
    .insert({
      spiel_id: spielId,
      spielgruppe_id: session.gruppeId,
      event_id: gruppe.event_id,
    });

  if (error) {
    // 23505 = unique_violation → bereits abgeschlossen, behandeln wir idempotent
    if (error.code === '23505') {
      return NextResponse.json({ erfolg: true, bereitsAbgeschlossen: true });
    }
    console.error('Spiel-abschließen fehlgeschlagen:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ erfolg: true });
}

// DELETE: Admin öffnet ein bereits abgeschlossenes Spiel wieder
export async function DELETE(req: NextRequest) {
  const supabaseUser = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht autorisiert (Admin-Login erforderlich)' }, { status: 401 });
  }

  let body: { spielId?: string; spielgruppeId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }
  const { spielId, spielgruppeId } = body;
  if (!spielId || !spielgruppeId) {
    return NextResponse.json({ error: 'spielId und spielgruppeId erforderlich' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('spielgruppe_spiel_status')
    .delete()
    .eq('spiel_id', spielId)
    .eq('spielgruppe_id', spielgruppeId);

  if (error) {
    console.error('Spiel-wieder-öffnen fehlgeschlagen:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ erfolg: true });
}
