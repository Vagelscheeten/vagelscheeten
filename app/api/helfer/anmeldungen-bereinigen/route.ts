import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { loescheAnmeldungenMitBereinigung, regeneriereFuerIdentifier } from '@/lib/anmeldungen-bereinigen';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await req.json();

    // Modus A: { ids: string[] } — Anmeldungen löschen + Recompute
    if (Array.isArray(body?.ids) && body.ids.length > 0) {
      const result = await loescheAnmeldungenMitBereinigung(supabaseAdmin, body.ids);
      return NextResponse.json({ erfolg: true, ...result });
    }

    // Modus B: { rebuild: { eventId, identifier }[] } — nur recompute
    if (Array.isArray(body?.rebuild) && body.rebuild.length > 0) {
      const ergebnisse = [];
      for (const r of body.rebuild as { eventId: string; identifier: string }[]) {
        if (!r?.eventId || !r?.identifier) continue;
        const res = await regeneriereFuerIdentifier(supabaseAdmin, r.eventId, r.identifier);
        ergebnisse.push({ eventId: r.eventId, identifier: r.identifier, ...res });
      }
      return NextResponse.json({ erfolg: true, ergebnisse });
    }

    return NextResponse.json({ error: 'Keine Aktion angegeben (ids oder rebuild fehlt)' }, { status: 400 });
  } catch (error: any) {
    console.error('Fehler bei anmeldungen-bereinigen:', error);
    return NextResponse.json({ error: error?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}
