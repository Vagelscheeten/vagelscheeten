import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const serverSupabase = await createClient();
  const { data: { user }, error: authError } = await serverSupabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), { status: 401 });
  }

  const supabase = createAdminClient();
  const updates = await req.json();

  const { data, error } = await supabase.auth.admin.updateUserById(
    params.id,
    updates
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data), { status: 200 });
}
