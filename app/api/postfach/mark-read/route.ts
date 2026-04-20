import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { threadId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  if (!body.threadId || typeof body.threadId !== 'string') {
    return NextResponse.json({ error: 'missing-thread-id' }, { status: 400 });
  }

  await supabase
    .from('emails')
    .update({ is_read: true })
    .eq('thread_id', body.threadId)
    .eq('direction', 'inbound')
    .eq('is_read', false);

  await supabase
    .from('email_threads')
    .update({ has_unread: false })
    .eq('id', body.threadId);

  return NextResponse.json({ ok: true });
}
