'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, ExternalLink, FlaskConical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { WorkflowDashboard, WorkflowStats } from './_components/WorkflowDashboard';
import { ElternInfoPDFDownload } from './_components/ElternInfoPDFDownload';

export default function HelferPage() {
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testLoading, setTestLoading] = useState<'reset' | 'seed' | null>(null);

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

    const [rueckRes, zuteilRes, aufgabenRes, benachrichtigtRes, zuBenachrichtigenRes, essensspendenRes, eventRes] = await Promise.all([
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
    });

    setIsLoading(false);
  }, []);

  useEffect(() => { ladeStats(); }, [ladeStats]);

  const handleTest = async (action: 'reset' | 'seed') => {
    if (!stats?.eventId) return;
    setTestLoading(action);
    try {
      const res = await fetch('/api/helfer/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, eventId: stats.eventId }),
      });
      const data = await res.json();
      if (data.erfolg) {
        toast.success(action === 'reset'
          ? 'Testdaten gelöscht'
          : `${data.rueckmeldungen} Rückmeldungen (${data.davonSpringer || 0} Springer, ${data.davonFreitext || 0} Freitext)`
        );
        await ladeStats();
      } else {
        toast.error(data.error || 'Fehler');
      }
    } catch {
      toast.error('Fehler');
    } finally {
      setTestLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center text-slate-500">
        Kein aktives Event gefunden.
      </div>
    );
  }

  return (
    <main className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Helfer-Workflow</h1>
          <p className="text-sm text-slate-500 mt-1">
            Geführter 4-Schritte-Prozess: Von den Rückmeldungen bis zur Eltern-Kommunikation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ElternInfoPDFDownload />
          <Link
            href="/admin/helfer/detail"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 border rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <ExternalLink size={14} />
            Detail-Zuteilung
          </Link>
        </div>
      </div>

      <WorkflowDashboard stats={stats} onRefresh={ladeStats} />

      {/* ── TEST-BEREICH — vor echtem Einsatz entfernen ───────────────── */}
      <div className="mt-10 border-2 border-dashed border-amber-300 rounded-xl p-4 bg-amber-50">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical size={16} className="text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">Testbereich — vor echtem Einsatz entfernen</span>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => handleTest('seed')}
            disabled={testLoading !== null}
            className="flex items-center gap-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {testLoading === 'seed' ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
            Test-Rückmeldungen erstellen
          </button>
          <button
            onClick={() => handleTest('reset')}
            disabled={testLoading !== null}
            className="flex items-center gap-2 text-sm font-medium bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-400 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {testLoading === 'reset' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Test-Einträge löschen
          </button>
        </div>
        <p className="text-xs text-amber-700 mt-2">
          "Erstellen" fügt ~100 Rückmeldungen + Essensspenden hinzu. "Löschen" entfernt alle Rückmeldungen, Zuteilungen und Essensspenden (Kinder &amp; Klassen bleiben).
        </p>
      </div>
    </main>
  );
}
