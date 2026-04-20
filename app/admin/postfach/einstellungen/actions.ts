'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AuthUserBrief {
  id: string;
  email: string;
  name: string | null;
}

async function requireAdminUser(): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data?.user ? { id: data.user.id } : null;
}

export async function listAuthUsers(): Promise<AuthUserBrief[]> {
  const user = await requireAdminUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error || !data) return [];

  const users: AuthUserBrief[] = [];
  for (const u of data.users) {
    const email = u.email;
    if (typeof email !== 'string' || email.length === 0) continue;
    const meta = u.user_metadata as { name?: string; full_name?: string } | null;
    users.push({
      id: u.id,
      email,
      name: meta?.name ?? meta?.full_name ?? null,
    });
  }
  users.sort((a, b) => a.email.localeCompare(b.email));
  return users;
}

export async function createRecipient(input: {
  email: string;
  label?: string | null;
  user_id?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const user = await requireAdminUser();
  if (!user) return { error: 'unauthorized' };

  const email = input.email.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: 'invalid-email' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from('postfach_notification_recipients').insert({
    email,
    label: input.label ?? null,
    user_id: input.user_id ?? null,
    is_active: true,
    created_by: user.id,
  });

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return { error: 'already-exists' };
    }
    return { error: error.message };
  }

  revalidatePath('/admin/postfach/einstellungen');
  return { ok: true };
}

export async function setRecipientActive(
  id: string,
  isActive: boolean
): Promise<{ ok: true } | { error: string }> {
  const user = await requireAdminUser();
  if (!user) return { error: 'unauthorized' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('postfach_notification_recipients')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/admin/postfach/einstellungen');
  return { ok: true };
}

export async function deleteRecipient(id: string): Promise<{ ok: true } | { error: string }> {
  const user = await requireAdminUser();
  if (!user) return { error: 'unauthorized' };

  const admin = createAdminClient();
  const { error } = await admin.from('postfach_notification_recipients').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/postfach/einstellungen');
  return { ok: true };
}
