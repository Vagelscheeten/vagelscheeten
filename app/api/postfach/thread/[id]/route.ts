import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { POSTFACH_BUCKET } from '@/lib/postfach/storage';

export const runtime = 'nodejs';

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: threadId } = await context.params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Storage-Dateien pro Email im Thread aufräumen
  const { data: emails } = await admin
    .from('emails')
    .select('id')
    .eq('thread_id', threadId);

  for (const e of emails ?? []) {
    const { data: files } = await admin.storage.from(POSTFACH_BUCKET).list(e.id);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${e.id}/${f.name}`);
      await admin.storage.from(POSTFACH_BUCKET).remove(paths);
    }
  }

  // Thread löschen — CASCADE entfernt emails und email_attachments
  const { error } = await admin.from('email_threads').delete().eq('id', threadId);
  if (error) {
    console.error('[postfach/thread] Delete-Fehler:', error);
    return NextResponse.json({ error: 'delete-failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
