import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MAX_PER_SPIEL = 2;

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

    const body = await req.json();
    const action = body?.action as 'assign' | 'remove' | undefined;
    const helferId = body?.helferId as string | undefined;

    if (!helferId || !action) {
      return NextResponse.json({ error: 'helferId und action sind erforderlich' }, { status: 400 });
    }

    if (action === 'remove') {
      const { error } = await supabaseAdmin
        .from('helfer_spiel_zuteilungen')
        .delete()
        .eq('helfer_id', helferId);
      if (error) throw error;
      return NextResponse.json({ erfolg: true });
    }

    if (action === 'assign') {
      const spielId = body?.spielId as string | undefined;
      if (!spielId) {
        return NextResponse.json({ error: 'spielId erforderlich' }, { status: 400 });
      }

      const { data: bestand, error: countError } = await supabaseAdmin
        .from('helfer_spiel_zuteilungen')
        .select('helfer_id')
        .eq('spiel_id', spielId);
      if (countError) throw countError;

      const aktuelleHelfer = (bestand || []).map((r: { helfer_id: string }) => r.helfer_id);
      const istSchonZugewiesen = aktuelleHelfer.includes(helferId);

      if (!istSchonZugewiesen && aktuelleHelfer.length >= MAX_PER_SPIEL) {
        return NextResponse.json(
          { error: 'Spiel hat bereits 2 Betreuer' },
          { status: 409 },
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from('helfer_spiel_zuteilungen')
        .delete()
        .eq('helfer_id', helferId);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabaseAdmin
        .from('helfer_spiel_zuteilungen')
        .insert({ helfer_id: helferId, spiel_id: spielId });
      if (insertError) throw insertError;

      return NextResponse.json({ erfolg: true });
    }

    return NextResponse.json({ error: 'Unbekannte action' }, { status: 400 });
  } catch (error: any) {
    console.error('Fehler bei spiel-zuteilungen:', error);
    return NextResponse.json({ error: error?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}
