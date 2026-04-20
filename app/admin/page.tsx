import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from './DashboardClient';

export const revalidate = 60;

async function fetchDashboardData() {
  const supabase = await createClient();

  const { data: activeEvent } = await supabase
    .from('events')
    .select('*')
    .eq('ist_aktiv', true)
    .single();

  if (!activeEvent) {
    return { activeEvent: null, counts: null };
  }

  const eventId = activeEvent.id;

  const [
    kinderResult,
    gruppenResult,
    rueckmeldungenResult,
    aufgabenResult,
  ] = await Promise.all([
    supabase.from('kinder').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('spielgruppen').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('helfer_rueckmeldungen').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('helferaufgaben').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
  ]);

  return {
    activeEvent,
    counts: {
      kinder: kinderResult.count ?? 0,
      gruppen: gruppenResult.count ?? 0,
      rueckmeldungen: rueckmeldungenResult.count ?? 0,
      aufgaben: aufgabenResult.count ?? 0,
    },
  };
}

export default async function AdminHome() {
  const data = await fetchDashboardData();
  return <DashboardClient activeEvent={data.activeEvent} counts={data.counts} />;
}
