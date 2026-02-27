import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Parses "Nachname, Vorname (Klasse)" → { vorname, nachname }
 * Returns null if format doesn't match.
 */
function parseKindNameExtern(name: string): { vorname: string; nachname: string } | null {
  // Format: "Nachname, Vorname (Klasse)" or "Nachname, Vorname"
  const commaIdx = name.indexOf(', ');
  if (commaIdx === -1) return null;

  const nachname = name.substring(0, commaIdx).trim();
  const rest = name.substring(commaIdx + 2);

  // Strip "(Klasse)" suffix if present
  const parenIdx = rest.indexOf(' (');
  const vorname = parenIdx !== -1 ? rest.substring(0, parenIdx).trim() : rest.trim();

  if (!vorname || !nachname) return null;
  return { vorname, nachname };
}

export async function POST(request: Request) {
  try {
    // Auth-Check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json({ error: 'eventId fehlt' }, { status: 400 });
    }

    // Load all unmatched rueckmeldungen for this event
    const { data: rueckmeldungen, error: loadError } = await supabaseAdmin
      .from('helfer_rueckmeldungen')
      .select('id, kind_name_extern')
      .eq('event_id', eventId)
      .is('kind_id', null)
      .not('kind_name_extern', 'is', null);

    if (loadError) {
      return NextResponse.json({ error: 'Fehler beim Laden der Rückmeldungen' }, { status: 500 });
    }

    let zugeordnet = 0;
    let nichtZugeordnet = 0;

    for (const rueck of rueckmeldungen || []) {
      const parsed = parseKindNameExtern(rueck.kind_name_extern || '');
      if (!parsed) {
        nichtZugeordnet++;
        continue;
      }

      const { data: matches } = await supabaseAdmin
        .from('kinder')
        .select('id')
        .eq('event_id', eventId)
        .ilike('vorname', parsed.vorname)
        .ilike('nachname', parsed.nachname);

      // Only auto-match if exactly one result — ambiguous names require manual assignment
      if (matches && matches.length === 1) {
        const { error: updateError } = await supabaseAdmin
          .from('helfer_rueckmeldungen')
          .update({ kind_id: matches[0].id })
          .eq('id', rueck.id);

        if (!updateError) {
          zugeordnet++;
        } else {
          nichtZugeordnet++;
        }
      } else {
        nichtZugeordnet++;
      }
    }

    return NextResponse.json({ zugeordnet, nichtZugeordnet });
  } catch (error: any) {
    console.error('Fehler in rueckmeldungen-zuordnen:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
