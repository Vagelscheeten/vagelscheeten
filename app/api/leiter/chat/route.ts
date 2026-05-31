import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { verifyLeiterSession } from '@/lib/leiter-auth';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MAX_LEN = 2000;
const RATE_LIMIT = 5; // max. Nachrichten
const RATE_FENSTER_MS = 10_000; // pro 10 Sekunden

// Event-ID der Gruppe des Leiters ermitteln (so sieht ein Leiter nur seinen Event-Chat)
async function ladeEventId(gruppeId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('spielgruppen')
    .select('event_id')
    .eq('id', gruppeId)
    .single();
  return data?.event_id ?? null;
}

export async function GET(req: NextRequest) {
  const session = await verifyLeiterSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const eventId = await ladeEventId(session.gruppeId);
  if (!eventId) {
    return NextResponse.json({ error: 'Event nicht gefunden' }, { status: 404 });
  }

  const since = req.nextUrl.searchParams.get('since');

  let query = supabaseAdmin
    .from('chat_nachrichten')
    .select('id, absender_typ, absender_name, inhalt, created_at')
    .eq('event_id', eventId);

  if (since) {
    // Inkrementell: nur neuere Nachrichten, aufsteigend
    const { data, error } = await query.gt('created_at', since).order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ nachrichten: data ?? [] });
  }

  // Initial: neueste 200, dann aufsteigend sortieren
  const { data, error } = await query.order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const nachrichten = (data ?? []).slice().reverse();
  return NextResponse.json({ nachrichten });
}

export async function POST(req: NextRequest) {
  const session = await verifyLeiterSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  let body: { inhalt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  const inhalt = typeof body.inhalt === 'string' ? body.inhalt.trim() : '';
  if (inhalt.length === 0) {
    return NextResponse.json({ error: 'Nachricht darf nicht leer sein.' }, { status: 400 });
  }
  if (inhalt.length > MAX_LEN) {
    return NextResponse.json({ error: `Nachricht ist zu lang (max. ${MAX_LEN} Zeichen).` }, { status: 400 });
  }

  const eventId = await ladeEventId(session.gruppeId);
  if (!eventId) {
    return NextResponse.json({ error: 'Event nicht gefunden' }, { status: 404 });
  }

  // Einfaches Rate-Limit: max. RATE_LIMIT Nachrichten dieser Gruppe pro Zeitfenster
  const seit = new Date(Date.now() - RATE_FENSTER_MS).toISOString();
  const { count } = await supabaseAdmin
    .from('chat_nachrichten')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('absender_typ', 'leiter')
    .eq('absender_name', session.gruppenname)
    .gt('created_at', seit);
  if ((count ?? 0) >= RATE_LIMIT) {
    return NextResponse.json(
      { error: 'Zu viele Nachrichten in kurzer Zeit. Bitte kurz warten.' },
      { status: 429 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from('chat_nachrichten')
    .insert({
      event_id: eventId,
      absender_typ: 'leiter',
      absender_name: session.gruppenname, // immer aus dem JWT, nie aus dem Body
      inhalt,
    })
    .select('id, absender_typ, absender_name, inhalt, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ nachricht: data });
}

export async function DELETE(req: NextRequest) {
  const session = await verifyLeiterSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) {
    return NextResponse.json({ error: 'id erforderlich' }, { status: 400 });
  }

  // Nur eigene Leiter-Nachricht darf gelöscht werden
  const { data: msg } = await supabaseAdmin
    .from('chat_nachrichten')
    .select('id, absender_typ, absender_name')
    .eq('id', id)
    .single();
  if (!msg) {
    return NextResponse.json({ error: 'Nachricht nicht gefunden' }, { status: 404 });
  }
  if (msg.absender_typ !== 'leiter' || msg.absender_name !== session.gruppenname) {
    return NextResponse.json({ error: 'Nur eigene Nachrichten können gelöscht werden.' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from('chat_nachrichten').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
