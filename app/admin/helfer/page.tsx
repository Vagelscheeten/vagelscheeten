'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { WorkflowDashboard, WorkflowStats } from './_components/WorkflowDashboard';
import { ElternInfoPDFDownload } from './_components/ElternInfoPDFDownload';
import { PageShell, EmptyState } from '@/components/admin';
import type { AnmeldungLite, KindLite } from '@/lib/helfer-utils';

export default function HelferPage() {
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ladeStats = useCallback(async () => {
    const supabase = createClient();

    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('ist_aktiv', true)
      .single();

    if (!event) {
      toast.error('Kein aktives Event gefunden');
      setIsLoading(false);
      return;
    }

    const eventId = event.id;

    const [rueckRes, zuteilRes, aufgabenRes, benachrichtigtRes, zuBenachrichtigenRes, essensspendenRes, eventRes, kinderRes, anmeldungenRes] = await Promise.all([
      supabase
        .from('helfer_rueckmeldungen')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId),
      supabase
        .from('helfer_zuteilungen')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId),
      supabase
        .from('helferaufgaben')
        .select('id, titel, bedarf, zeitfenster')
        .eq('event_id', eventId)
        .order('titel'),
      supabase
        .from('anmeldungen')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('verifiziert', true)
        .not('benachrichtigt_am', 'is', null),
      supabase
        .from('anmeldungen')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('verifiziert', true)
        .not('eltern_email', 'is', null),
      supabase
        .from('essensspenden_rueckmeldungen')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('bestaetigt', true),
      supabase
        .from('events')
        .select('essensspenden_verteilt_am')
        .eq('id', eventId)
        .single(),
      supabase
        .from('kinder')
        .select('id, vorname, nachname, klasse, geschlecht')
        .eq('event_id', eventId)
        .neq('klasse', 'Schulis') // Schulis sind Kindergarten-Kinder, deren Eltern keine Aufgaben übernehmen
        .order('klasse')
        .order('nachname'),
      supabase
        .from('anmeldungen')
        .select('id, eltern_email, kind_vorname, kind_nachname, kind_klasse, weitere_kinder_json, helfer_aufgaben_json, essensspenden_json, ist_springer, springer_zeitfenster, kommentar, verifiziert, verifiziert_am, erstellt_am')
        .eq('event_id', eventId),
    ]);

    setStats({
      eventId,
      anzahlRueckmeldungen: rueckRes.count || 0,
      anzahlZuteilungen: zuteilRes.count || 0,
      anzahlBenachrichtigt: benachrichtigtRes.count || 0,
      anzahlZuBenachrichtigen: zuBenachrichtigenRes.count || 0,
      aufgaben: aufgabenRes.data || [],
      anzahlEssensspendenRueckmeldungen: essensspendenRes.count || 0,
      essensspendenVerteilt: !!(eventRes.data?.essensspenden_verteilt_am),
      kinder: (kinderRes.data || []) as KindLite[],
      anmeldungen: (anmeldungenRes.data || []) as AnmeldungLite[],
    });

    setIsLoading(false);
  }, []);

  useEffect(() => { ladeStats(); }, [ladeStats]);

  if (isLoading) {
    return (
      <PageShell title="Helfer-Workflow">
        <div className="flex justify-center items-center py-16">
          <Loader2 className="animate-spin text-admin-ink-muted" size={24} />
        </div>
      </PageShell>
    );
  }

  if (!stats) {
    return (
      <PageShell
        title="Helfer-Workflow"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Helfer' }]}
      >
        <EmptyState
          title="Kein aktives Event"
          description="Es ist derzeit kein Event aktiv. Bitte zuerst ein Event aktivieren."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Helfer-Workflow"
      description="Geführter 5-Schritte-Prozess: Von der Rückmeldungs-Übersicht bis zur Eltern-Kommunikation."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Helfer' }]}
      actions={
        <>
          <ElternInfoPDFDownload />
          <Link
            href="/admin/helfer/detail"
            className="inline-flex items-center gap-1.5 text-sm text-admin-ink-soft hover:text-admin-ink border border-admin-border bg-admin-surface rounded-md px-3 h-9 hover:bg-admin-surface-hover transition-colors whitespace-nowrap"
          >
            <ExternalLink size={14} />
            Detail-Zuteilung
          </Link>
        </>
      }
    >
      <WorkflowDashboard stats={stats} onRefresh={ladeStats} />
    </PageShell>
  );
}
