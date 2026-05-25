import React from 'react';
import { redirect } from 'next/navigation';
import { leiterLogout } from '../actions';
import { createClient } from '@/lib/supabase/server';
import ClientErfassung from './ClientErfassung';
import { verifyLeiterSession } from '@/lib/leiter-auth';

export default async function ErgebnisErfassenPage() {
  const supabase = await createClient();
  const leiterSession = await verifyLeiterSession();

  if (!leiterSession) {
    redirect('/leiter/login');
  }

  const gruppeId = leiterSession.gruppeId;

  const { data: spielgruppe, error: spielgruppeError } = await supabase
    .from('spielgruppen')
    .select('*')
    .eq('id', gruppeId)
    .single();

  if (spielgruppeError || !spielgruppe) {
    redirect('/leiter/login');
  }

  const { data: kinderZuordnungen } = await supabase
    .from('kind_spielgruppe_zuordnung')
    .select('kind_id')
    .eq('spielgruppe_id', gruppeId)
    .eq('event_id', spielgruppe.event_id);

  const kindIds = kinderZuordnungen?.map((z) => z.kind_id) || [];

  const { data: kinder } = await supabase
    .from('kinder')
    .select('*')
    .in('id', kindIds.length > 0 ? kindIds : ['0'])
    .order('vorname');

  async function handleLogout() {
    'use server';
    await leiterLogout();
  }

  return (
    <ClientErfassung
      spielgruppe={spielgruppe}
      kinder={kinder || []}
      logoutAction={handleLogout}
    />
  );
}
