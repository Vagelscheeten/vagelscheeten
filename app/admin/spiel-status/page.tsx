'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Unlock, CheckCircle2 } from 'lucide-react';
import { PageShell, EmptyState } from '@/components/admin';

interface Spiel {
  id: string;
  name: string;
}

interface Spielgruppe {
  id: string;
  name: string;
  klasse: string | null;
}

interface StatusZeile {
  spielgruppe_id: string;
  spiel_id: string;
  abgeschlossen_am: string;
}

export default function SpielStatusPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [gruppen, setGruppen] = useState<Spielgruppe[]>([]);
  const [status, setStatus] = useState<StatusZeile[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reopeningKey, setReopeningKey] = useState<string | null>(null);

  const lade = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('ist_aktiv', true)
      .single();
    if (!event) {
      setIsLoading(false);
      return;
    }
    setEventId(event.id);

    const [{ data: spieleData }, { data: gruppenData }, { data: statusData }, { data: ergebnisseData }] = await Promise.all([
      supabase.from('spiele').select('id, name').order('name'),
      supabase.from('spielgruppen').select('id, name, klasse').eq('event_id', event.id).order('klasse').order('name'),
      supabase.from('spielgruppe_spiel_status').select('*').eq('event_id', event.id),
      supabase.from('ergebnisse').select('spielgruppe_id, spiel_id').eq('event_id', event.id),
    ]);

    setSpiele(spieleData || []);
    setGruppen(gruppenData || []);
    setStatus(statusData || []);

    // Ergebnisanzahl pro (spielgruppe_id, spiel_id)
    const c: Record<string, number> = {};
    (ergebnisseData || []).forEach((e: any) => {
      const key = `${e.spielgruppe_id}::${e.spiel_id}`;
      c[key] = (c[key] || 0) + 1;
    });
    setCounts(c);

    setIsLoading(false);
  }, []);

  useEffect(() => {
    lade();
  }, [lade]);

  const statusMap = useMemo(() => {
    const m = new Map<string, StatusZeile>();
    status.forEach((s) => m.set(`${s.spielgruppe_id}::${s.spiel_id}`, s));
    return m;
  }, [status]);

  const wiederOeffnen = async (spielId: string, spielgruppeId: string, beschreibung: string) => {
    const ok = window.confirm(`„${beschreibung}" wirklich wieder öffnen? Die Gruppe kann dann erneut Ergebnisse erfassen oder bearbeiten.`);
    if (!ok) return;
    const key = `${spielgruppeId}::${spielId}`;
    setReopeningKey(key);
    try {
      const res = await fetch('/api/leiter/spiel-status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spielId, spielgruppeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success('Spiel wieder geöffnet');
      setStatus((prev) => prev.filter((s) => !(s.spiel_id === spielId && s.spielgruppe_id === spielgruppeId)));
    } catch (e: any) {
      toast.error('Fehler: ' + (e.message || e));
    } finally {
      setReopeningKey(null);
    }
  };

  if (isLoading) {
    return (
      <PageShell title="Spielstatus" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Spielstatus' }]}>
        <div className="flex justify-center items-center py-16">
          <Loader2 className="animate-spin text-admin-ink-muted" size={24} />
        </div>
      </PageShell>
    );
  }

  if (!eventId) {
    return (
      <PageShell title="Spielstatus" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Spielstatus' }]}>
        <EmptyState title="Kein aktives Event" description="Es ist derzeit kein Event aktiv." />
      </PageShell>
    );
  }

  const abgeschlossen = status.length;
  const moeglich = gruppen.length * spiele.length;

  return (
    <PageShell
      title="Spielstatus"
      description="Live-Übersicht: Welche Gruppe hat welches Spiel abgeschlossen. Bei Bedarf kann eine Abschluss-Markierung hier rückgängig gemacht werden."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Spielstatus' }]}
      meta={
        <span>
          {abgeschlossen} / {moeglich} Spiele abgeschlossen · {gruppen.length} Gruppen · {spiele.length} Spiele
        </span>
      }
    >
      {gruppen.length === 0 ? (
        <EmptyState title="Keine Spielgruppen" description="Für das aktive Event sind noch keine Spielgruppen angelegt." />
      ) : (
        <div className="overflow-x-auto -mx-3 md:mx-0">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                <th className="text-left font-semibold text-admin-ink-soft px-3 py-2 border-b border-admin-border">Gruppe</th>
                {spiele.map((s) => (
                  <th key={s.id} className="text-left font-semibold text-admin-ink-soft px-3 py-2 border-b border-admin-border whitespace-nowrap">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gruppen.map((g) => (
                <tr key={g.id} className="hover:bg-admin-surface-hover">
                  <td className="px-3 py-2 border-b border-admin-border font-medium whitespace-nowrap">
                    {g.name}
                    {g.klasse && <span className="text-xs text-slate-400 ml-1">({g.klasse})</span>}
                  </td>
                  {spiele.map((s) => {
                    const key = `${g.id}::${s.id}`;
                    const cell = statusMap.get(key);
                    const count = counts[key] || 0;
                    if (cell) {
                      return (
                        <td key={s.id} className="px-3 py-2 border-b border-admin-border">
                          <div className="inline-flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                            <span className="text-xs text-slate-500">{count} Erg.</span>
                            <button
                              onClick={() => wiederOeffnen(s.id, g.id, `${s.name} (Gruppe ${g.name})`)}
                              disabled={reopeningKey === key}
                              className="ml-1 inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 underline underline-offset-2 disabled:opacity-50"
                            >
                              {reopeningKey === key ? <Loader2 size={11} className="animate-spin" /> : <Unlock size={11} />}
                              Öffnen
                            </button>
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={s.id} className="px-3 py-2 border-b border-admin-border text-slate-400">
                        {count > 0 ? <span>{count} Erg.</span> : <span className="opacity-50">–</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
