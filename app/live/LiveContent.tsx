'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ChevronLeft, RefreshCw, Trophy, Crown, Target } from 'lucide-react';
import {
  berechneRangePunkteProBucket,
  istKleinerBesser,
} from '@/lib/points';

interface Kind {
  id: string;
  klasse: string;
  geschlecht: string;
}

interface Spiel {
  id: string;
  name: string;
  wertungstyp: string;
  einheit: string | null;
}

interface Spielgruppe {
  id: string;
  klasse: string;
}

interface Ergebnis {
  id: string;
  kind_id: string;
  spiel_id: string;
  spielgruppe_id: string;
  wert_numeric: number;
}

interface StatusRow {
  spielgruppe_id: string;
  spiel_id: string;
}

interface SpielBest {
  spiel: Spiel;
  bestWert: number;
  klasse: string;
  geschlecht: string;
  durchschnitt: number;
  anzahl: number;
}

interface KlassenStat {
  klasse: string;
  abgeschlossen: number;
  gesamt: number;
  prozent: number;
  bestPunkteJunge: number | null;
  bestPunkteMaedchen: number | null;
}

const istJunge = (g: string) => g === 'Junge' || g === 'männlich';
const istMaedchen = (g: string) => g === 'Mädchen' || g === 'weiblich';
const geschlechtLabel = (g: string) =>
  istJunge(g) ? 'Junge' : istMaedchen(g) ? 'Mädchen' : g;

function formatZahl(n: number, max: number = 2): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toLocaleString('de-DE', { maximumFractionDigits: max });
}

export default function LiveContent({
  eventId,
  eventName,
  istEventTag,
}: {
  eventId: string;
  eventName: string;
  istEventTag: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [kinder, setKinder] = useState<Kind[]>([]);
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [spielgruppen, setSpielgruppen] = useState<Spielgruppe[]>([]);
  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([]);
  const [status, setStatus] = useState<StatusRow[]>([]);
  const [spielIdsProKlasse, setSpielIdsProKlasse] = useState<Map<string, Set<string>>>(new Map());

  const lade = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);

    const supabase = createClient();

    const [
      { data: kinderData },
      { data: spieleData },
      { data: gruppenData },
      { data: ergebnisseData },
      { data: statusData },
      { data: klasseSpieleData },
    ] = await Promise.all([
      supabase.from('kinder').select('id, klasse, geschlecht').eq('event_id', eventId),
      supabase.from('spiele').select('id, name, wertungstyp, einheit').order('name'),
      supabase.from('spielgruppen').select('id, klasse').eq('event_id', eventId),
      supabase
        .from('ergebnisse')
        .select('id, kind_id, spiel_id, spielgruppe_id, wert_numeric')
        .eq('event_id', eventId),
      supabase
        .from('spielgruppe_spiel_status')
        .select('spielgruppe_id, spiel_id')
        .eq('event_id', eventId),
      supabase.from('klasse_spiele').select('spiel_id, klasse:klassen!inner(name)'),
    ]);

    setKinder((kinderData ?? []) as Kind[]);
    setSpiele((spieleData ?? []) as Spiel[]);
    setSpielgruppen((gruppenData ?? []) as Spielgruppe[]);
    setErgebnisse((ergebnisseData ?? []) as Ergebnis[]);
    setStatus((statusData ?? []) as StatusRow[]);

    const spielMap = new Map<string, Set<string>>();
    for (const row of klasseSpieleData ?? []) {
      const klasseName = (row as any).klasse?.name as string | undefined;
      if (!klasseName) continue;
      if (!spielMap.has(klasseName)) spielMap.set(klasseName, new Set());
      spielMap.get(klasseName)!.add(row.spiel_id);
    }
    setSpielIdsProKlasse(spielMap);

    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [eventId]);

  useEffect(() => {
    lade(true);
    const interval = setInterval(() => lade(false), 30_000);
    const onFocus = () => lade(false);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [lade]);

  // ── Daten verdichten ──────────────────────────────────────────────────────

  const statusSet = useMemo(
    () => new Set(status.map((s) => `${s.spielgruppe_id}|${s.spiel_id}`)),
    [status],
  );

  // Ergebnisse aus abgeschlossenen (Gruppe×Spiel)-Paaren
  const stableErgebnisse = useMemo(
    () => ergebnisse.filter((e) => statusSet.has(`${e.spielgruppe_id}|${e.spiel_id}`)),
    [ergebnisse, statusSet],
  );

  // Globale Stats
  const globalStats = useMemo(() => {
    const erfassteErgebnisse = ergebnisse.length;

    // Gesamt mögliche (Gruppe×Spiel)-Kombinationen = Summe über Gruppen × (Anzahl Spiele der jeweiligen Klasse)
    let gesamtKombis = 0;
    for (const g of spielgruppen) {
      gesamtKombis += spielIdsProKlasse.get(g.klasse)?.size ?? 0;
    }
    const abgeschlossen = statusSet.size;
    const prozent = gesamtKombis > 0 ? Math.round((abgeschlossen / gesamtKombis) * 100) : 0;

    // Aktive Gruppen = Gruppen mit mindestens einem Eintrag (Ergebnis oder Abschluss)
    const aktiveGruppen = new Set([
      ...ergebnisse.map((e) => e.spielgruppe_id),
      ...status.map((s) => s.spielgruppe_id),
    ]).size;

    return { erfassteErgebnisse, abgeschlossen, gesamtKombis, prozent, aktiveGruppen };
  }, [ergebnisse, status, spielgruppen, spielIdsProKlasse, statusSet]);

  // Bestleistung + Durchschnitt pro Spiel (nur aus abgeschlossenen Spielen)
  const bestleistungen = useMemo<SpielBest[]>(() => {
    const kindMap = new Map(kinder.map((k) => [k.id, k]));
    const result: SpielBest[] = [];
    for (const spiel of spiele) {
      const eintraege = stableErgebnisse.filter((e) => e.spiel_id === spiel.id);
      if (eintraege.length === 0) continue;
      const klein = istKleinerBesser(spiel.wertungstyp);
      const best = eintraege.reduce((b, e) =>
        klein
          ? e.wert_numeric < b.wert_numeric ? e : b
          : e.wert_numeric > b.wert_numeric ? e : b,
        eintraege[0],
      );
      const kind = kindMap.get(best.kind_id);
      const summe = eintraege.reduce((s, e) => s + e.wert_numeric, 0);
      result.push({
        spiel,
        bestWert: best.wert_numeric,
        klasse: kind?.klasse ?? '?',
        geschlecht: kind?.geschlecht ?? '?',
        durchschnitt: summe / eintraege.length,
        anzahl: eintraege.length,
      });
    }
    // Spiele mit den meisten Ergebnissen zuerst
    return result.sort((a, b) => b.anzahl - a.anzahl);
  }, [spiele, stableErgebnisse, kinder]);

  // Pro Klasse: Fortschritt + Top-Punkte Junge/Mädchen
  const klassenStats = useMemo<KlassenStat[]>(() => {
    const klassen = Array.from(new Set(spielgruppen.map((g) => g.klasse))).sort();

    // Rang+Punkte vorberechnen (klassenweit, getrennt nach Geschlecht)
    const kindBucketMap = new Map(kinder.map((k) => [k.id, `${k.klasse}|${k.geschlecht}`]));
    const spielWertungstypMap = new Map(spiele.map((s) => [s.id, s.wertungstyp]));
    const rangMap = berechneRangePunkteProBucket(
      stableErgebnisse,
      (e) => kindBucketMap.get(e.kind_id),
      (e) => spielWertungstypMap.get(e.spiel_id),
    );

    // Punkte pro Kind
    const kindPunkte = new Map<string, number>();
    for (const e of stableErgebnisse) {
      const p = rangMap.get(e.id)?.punkte ?? 0;
      kindPunkte.set(e.kind_id, (kindPunkte.get(e.kind_id) ?? 0) + p);
    }
    const kindMap = new Map(kinder.map((k) => [k.id, k]));

    return klassen.map((klasse) => {
      const gruppenIds = new Set(spielgruppen.filter((g) => g.klasse === klasse).map((g) => g.id));
      const klasseSpielIds = spielIdsProKlasse.get(klasse) ?? new Set();
      const gesamt = gruppenIds.size * klasseSpielIds.size;
      let abgeschlossen = 0;
      for (const s of status) {
        if (gruppenIds.has(s.spielgruppe_id) && klasseSpielIds.has(s.spiel_id)) abgeschlossen++;
      }
      const prozent = gesamt > 0 ? Math.round((abgeschlossen / gesamt) * 100) : 0;

      let bestJunge: number | null = null;
      let bestMaedchen: number | null = null;
      for (const [kindId, punkte] of kindPunkte) {
        const kind = kindMap.get(kindId);
        if (!kind || kind.klasse !== klasse) continue;
        if (istJunge(kind.geschlecht)) {
          if (bestJunge === null || punkte > bestJunge) bestJunge = punkte;
        } else if (istMaedchen(kind.geschlecht)) {
          if (bestMaedchen === null || punkte > bestMaedchen) bestMaedchen = punkte;
        }
      }
      return {
        klasse,
        abgeschlossen,
        gesamt,
        prozent,
        bestPunkteJunge: bestJunge,
        bestPunkteMaedchen: bestMaedchen,
      };
    });
  }, [spielgruppen, kinder, spiele, stableErgebnisse, status, spielIdsProKlasse]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-pastel-yellow/30">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-3 h-14 flex items-center gap-2 max-w-2xl mx-auto">
          <Link
            href="/startseite"
            className="-ml-1 p-2 text-slate-700 hover:text-slate-900 active:scale-95 transition-transform"
            aria-label="Zurück zur Startseite"
          >
            <ChevronLeft size={22} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-sans font-semibold text-slate-900 truncate leading-tight">
              Live-Stand
            </div>
            <div className="text-[13px] text-slate-500 leading-tight mt-0.5">{eventName}</div>
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

      <div className="px-3 py-4 max-w-2xl mx-auto pb-16 space-y-6">
        {loading ? (
          <div className="text-center py-16 text-slate-500">Lade Live-Stand…</div>
        ) : (
          <>
            {!istEventTag && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <strong className="font-semibold">Admin-Vorschau:</strong> Diese Seite ist
                öffentlich nur am Tag des Events sichtbar.
              </div>
            )}

            {/* HERO */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-melsdorf-orange font-medium mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-melsdorf-orange opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-melsdorf-orange"></span>
                </span>
                Live
              </div>
              <div className="text-7xl font-bold text-melsdorf-orange tabular-nums leading-none">
                {globalStats.prozent}%
              </div>
              <div className="text-sm text-slate-600 mt-2">der Spiele beim Vagelscheeten erledigt</div>
              <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-melsdorf-orange transition-all duration-500"
                  style={{ width: `${globalStats.prozent}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-5 text-center">
                <Stat label="Ergebnisse" value={globalStats.erfassteErgebnisse} />
                <Stat
                  label="Spiele fertig"
                  value={`${globalStats.abgeschlossen}/${globalStats.gesamtKombis}`}
                />
                <Stat label="Aktive Gruppen" value={globalStats.aktiveGruppen} />
              </div>
              {lastUpdated && (
                <div className="text-[11px] text-slate-400 mt-3 text-right">
                  Aktualisiert{' '}
                  {lastUpdated.toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              )}
            </section>

            {/* BESTLEISTUNGEN */}
            <section>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Trophy size={16} className="text-melsdorf-orange" />
                <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Bestleistungen
                </h2>
              </div>
              {bestleistungen.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
                  Noch keine Spiele abgeschlossen.
                </div>
              ) : (
                <div className="space-y-2">
                  {bestleistungen.map((b) => (
                    <div
                      key={b.spiel.id}
                      className="bg-white border border-slate-200 rounded-xl p-4"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {b.spiel.name}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {istKleinerBesser(b.spiel.wertungstyp)
                              ? 'weniger ist besser'
                              : 'mehr ist besser'}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-bold text-melsdorf-orange tabular-nums leading-none">
                            {formatZahl(b.bestWert)}
                            {b.spiel.einheit ? (
                              <span className="text-sm font-medium text-slate-500 ml-1">
                                {b.spiel.einheit}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {geschlechtLabel(b.geschlecht)} · Klasse {b.klasse}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                        <span>Ø {formatZahl(b.durchschnitt, 1)} {b.spiel.einheit ?? ''}</span>
                        <span>{b.anzahl} Ergebnisse</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* KLASSEN */}
            <section>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Target size={16} className="text-melsdorf-orange" />
                <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Klassen
                </h2>
              </div>
              <div className="space-y-2">
                {klassenStats.map((k) => (
                  <div
                    key={k.klasse}
                    className="bg-white border border-slate-200 rounded-xl p-4"
                  >
                    <div className="flex items-baseline justify-between mb-2">
                      <div className="font-semibold text-slate-900">Klasse {k.klasse}</div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {k.abgeschlossen}/{k.gesamt}
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-melsdorf-orange transition-all"
                        style={{ width: `${k.prozent}%` }}
                      />
                    </div>
                    <div className="mt-3 flex gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Crown size={14} className="text-yellow-500 shrink-0" />
                        <span className="text-slate-500">Junge:</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {k.bestPunkteJunge ?? '—'}
                          {k.bestPunkteJunge !== null && (
                            <span className="text-xs font-normal text-slate-400 ml-0.5">Pkt</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Crown size={14} className="text-pink-500 shrink-0" />
                        <span className="text-slate-500">Mädchen:</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {k.bestPunkteMaedchen ?? '—'}
                          {k.bestPunkteMaedchen !== null && (
                            <span className="text-xs font-normal text-slate-400 ml-0.5">Pkt</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <p className="text-[11px] text-center text-slate-400 pt-2">
              Die Seite aktualisiert sich automatisch alle 30 Sekunden.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-lg font-bold text-slate-900 tabular-nums leading-none">{value}</div>
      <div className="text-[11px] text-slate-500 mt-1">{label}</div>
    </div>
  );
}
