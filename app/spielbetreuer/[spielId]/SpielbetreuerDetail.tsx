'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronLeft,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Clock3,
  Hourglass,
} from 'lucide-react';

interface Spiel {
  id: string;
  name: string;
  ort: string | null;
}

interface Spielgruppe {
  id: string;
  name: string;
  klasse: string | null;
}

interface StatusRow {
  spielgruppe_id: string;
  abgeschlossen_am: string;
}

interface ErgebnisCount {
  spielgruppe_id: string;
  count: number;
}

export default function SpielbetreuerDetail({ spiel }: { spiel: Spiel }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [gruppen, setGruppen] = useState<Spielgruppe[]>([]);
  const [statusRows, setStatusRows] = useState<StatusRow[]>([]);
  const [ergebnisCounts, setErgebnisCounts] = useState<Map<string, number>>(new Map());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const lade = useCallback(async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoading(true);
    else setRefreshing(true);

    const supabase = createClient();

    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('ist_aktiv', true)
      .single();
    if (!event) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setEventId(event.id);

    const [{ data: gruppenData }, { data: statusData }, { data: ergebnisseData }, { data: klassenData }] = await Promise.all([
      supabase
        .from('spielgruppen')
        .select('id, name, klasse')
        .eq('event_id', event.id)
        .order('klasse', { nullsFirst: true })
        .order('name'),
      supabase
        .from('spielgruppe_spiel_status')
        .select('spielgruppe_id, abgeschlossen_am')
        .eq('event_id', event.id)
        .eq('spiel_id', spiel.id),
      supabase
        .from('ergebnisse')
        .select('spielgruppe_id')
        .eq('event_id', event.id)
        .eq('spiel_id', spiel.id),
      // Klassen, denen dieses Spiel zugeordnet ist (nur aktives Event)
      supabase
        .from('klasse_spiele')
        .select('klassen!inner(name, event_id)')
        .eq('spiel_id', spiel.id)
        .eq('klassen.event_id', event.id),
    ]);

    // Nur Gruppen anzeigen, deren Klasse dem Spiel zugeordnet ist
    const erlaubteKlassen = new Set<string>(
      (klassenData || []).map((r: any) => r.klassen?.name).filter(Boolean),
    );
    const gefilterteGruppen = (gruppenData || []).filter(
      (g) => g.klasse != null && erlaubteKlassen.has(g.klasse),
    );

    setGruppen(gefilterteGruppen);
    setStatusRows(statusData || []);

    const counts = new Map<string, number>();
    for (const e of ergebnisseData || []) {
      counts.set(e.spielgruppe_id, (counts.get(e.spielgruppe_id) || 0) + 1);
    }
    setErgebnisCounts(counts);

    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [spiel.id]);

  useEffect(() => {
    lade(true);
    // Auto-Refresh alle 15 s
    const interval = setInterval(() => lade(false), 15_000);
    // Bei Tab-Fokus sofort aktualisieren
    const onFocus = () => lade(false);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [lade]);

  const { erledigte, aktuelle, offene } = useMemo(() => {
    const erledigtIds = new Set(statusRows.map((s) => s.spielgruppe_id));
    const erledigte: Spielgruppe[] = [];
    const aktuelle: Spielgruppe[] = [];
    const offene: Spielgruppe[] = [];
    for (const g of gruppen) {
      if (erledigtIds.has(g.id)) {
        erledigte.push(g);
      } else if ((ergebnisCounts.get(g.id) || 0) > 0) {
        aktuelle.push(g);
      } else {
        offene.push(g);
      }
    }
    return { erledigte, aktuelle, offene };
  }, [gruppen, statusRows, ergebnisCounts]);

  const erledigtCount = erledigte.length;
  const totalCount = gruppen.length;
  const prozent = totalCount > 0 ? Math.round((erledigtCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-pastel-yellow/30">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-3 h-14 flex items-center gap-2 max-w-2xl mx-auto">
          <Link
            href="/spielbetreuer"
            className="-ml-1 p-2 text-slate-700 hover:text-slate-900 active:scale-95 transition-transform"
            aria-label="Zurück zur Spielauswahl"
          >
            <ChevronLeft size={22} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-sans font-semibold text-slate-900 truncate leading-tight">
              {spiel.name}
            </div>
            {spiel.ort && (
              <div className="text-[13px] text-slate-500 leading-tight mt-0.5 inline-flex items-center gap-1">
                <MapPin size={11} className="shrink-0" />
                {spiel.ort}
              </div>
            )}
          </div>
          <button
            onClick={() => lade(false)}
            disabled={refreshing || loading}
            className="p-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform disabled:opacity-50"
            aria-label="Aktualisieren"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="px-3 py-4 max-w-2xl mx-auto pb-12 space-y-5">
        {loading ? (
          <div className="text-center py-16 text-slate-500">Lade Status…</div>
        ) : (
          <>
            {/* Progress-Übersicht */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-2xl font-bold text-slate-900 tabular-nums">
                    {erledigtCount} <span className="text-base font-medium text-slate-500">von {totalCount}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Gruppen abgeschlossen</div>
                </div>
                <div className="text-2xl font-bold text-melsdorf-orange tabular-nums">
                  {prozent}%
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-melsdorf-orange transition-all"
                  style={{ width: `${prozent}%` }}
                />
              </div>
              {lastUpdated && (
                <div className="text-[11px] text-slate-400 mt-2 text-right">
                  Aktualisiert {lastUpdated.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              )}
            </div>

            {/* Aktuell in Bearbeitung */}
            {aktuelle.length > 0 && (
              <Section
                titel="Aktuell in Bearbeitung"
                icon={<Clock3 size={14} className="text-blue-600" />}
                count={aktuelle.length}
              >
                <div className="flex flex-wrap gap-2">
                  {aktuelle.map((g) => (
                    <span
                      key={g.id}
                      className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                      {g.name}
                      <span className="text-[11px] text-blue-600 font-normal">
                        {ergebnisCounts.get(g.id) || 0} Erg.
                      </span>
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Erledigt */}
            {erledigte.length > 0 && (
              <Section
                titel="Erledigt"
                icon={<CheckCircle2 size={14} className="text-green-600" />}
                count={erledigte.length}
              >
                <div className="flex flex-wrap gap-2">
                  {erledigte.map((g) => (
                    <span
                      key={g.id}
                      className="inline-flex items-center bg-green-50 border border-green-200 text-green-800 px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Noch offen */}
            {offene.length > 0 && (
              <Section
                titel="Noch offen"
                icon={<Hourglass size={14} className="text-slate-500" />}
                count={offene.length}
              >
                <div className="flex flex-wrap gap-2">
                  {offene.map((g) => (
                    <span
                      key={g.id}
                      className="inline-flex items-center bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {totalCount === 0 && (
              <p className="text-center text-sm text-slate-500 italic py-8">
                Keine Spielgruppen für das aktive Event.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  titel,
  icon,
  count,
  children,
}: {
  titel: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-2 px-1 leading-none">
        <span className="inline-flex">{icon}</span>
        <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">
          {titel} ({count})
        </span>
      </div>
      {children}
    </section>
  );
}
