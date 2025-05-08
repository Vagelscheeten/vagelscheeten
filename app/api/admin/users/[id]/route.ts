import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteParams = { params: { id: string } };

export async function PATCH(req: NextRequest, context: RouteParams) {
  const supabase = createAdminClient();
  const updates = await req.json();
  
  const { data, error } = await supabase.auth.admin.updateUserById(
    context.params.id,
    updates
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 200 });
}
