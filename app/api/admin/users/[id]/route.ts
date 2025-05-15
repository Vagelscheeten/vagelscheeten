// Next.js 13+ Route Handler für User-Änderungen und -Löschung (Service-Role-Key, nur auf dem Server!)
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const userId = params.id;
  try {
    const body = await req.json();
    const updates: any = {};
    if (body.email) updates.email = body.email;
    if (body.password) updates.password = body.password;
    if (body.user_metadata) updates.user_metadata = body.user_metadata;

    // Nur Felder übergeben, die gesetzt sind
    const { data, error } = await supabase.auth.admin.updateUserById(userId, updates);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Ein Fehler ist aufgetreten' }), { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const userId = params.id;
  try {
    const { data, error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Ein Fehler ist aufgetreten' }), { status: 500 });
  }
}
