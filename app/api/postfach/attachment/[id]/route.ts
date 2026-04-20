import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAttachmentSignedUrl } from '@/lib/postfach/storage';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: attachment, error } = await supabase
    .from('email_attachments')
    .select('storage_path, filename')
    .eq('id', id)
    .maybeSingle();

  if (error || !attachment) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  try {
    const signedUrl = await createAttachmentSignedUrl(supabase, attachment.storage_path);
    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (err) {
    console.error('[postfach/attachment] Signed URL fehlgeschlagen:', err);
    return NextResponse.json({ error: 'signing-failed' }, { status: 500 });
  }
}
