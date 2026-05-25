'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, AlertCircle, Clock, HelpCircle, MessageSquare,
  Search, ChevronDown, ChevronRight, Download, Sparkles, Loader2, X,
  Utensils, Wrench, Link2, ClipboardCopy,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  buildAnmeldungsIndex,
  buildKinderIndex,
  deriveStatus,
  findAllAnmeldungenForKind,
  findAnmeldungForKind,
  listAnmeldungsKinder,
  normalizeName,
  STATUS_LABELS,
  type AnmeldungLite,
  type AnmeldungsKindEintrag,
  type KindLite,
  type KindMitStatus,
  type RueckmeldungsStatus,
  type WeiteresKind,
} from '@/lib/helfer-utils';
import { createClient } from '@/lib/supabase/client';

interface AufgabeLite { id: string; titel: string }
interface SpendeLite { id: string; titel: string }

interface Props {
  kinder: KindLite[];
  anmeldungen: AnmeldungLite[];
  aufgaben: AufgabeLite[];
  spendenBedarf: SpendeLite[];
  onRefresh: () => void;
}

interface KiThema {
  titel: string;
  anzahl: number;
  kernpunkte: string[];
  betroffene_familien: string[];
}

const STATUS_FILTER_REIHENFOLGE: RueckmeldungsStatus[] = [
  'komplett', 'nur_helfer', 'nur_essen', 'leer', 'unverifiziert', 'fehlt',
];

const STATUS_STYLE: Record<RueckmeldungsStatus, { bg: string; text: string; icon: React.ElementType; emoji: string }> = {
  komplett:      { bg: 'bg-green-100',   text: 'text-green-700',   icon: CheckCircle2, emoji: '✅' },
  nur_helfer:    { bg: 'bg-amber-100',   text: 'text-amber-800',   icon: Wrench,       emoji: '🟡' },
  nur_essen:     { bg: 'bg-amber-100',   text: 'text-amber-800',   icon: Utensils,     emoji: '🟡' },
  leer:          { bg: 'bg-slate-100',   text: 'text-slate-600',   icon: HelpCircle,   emoji: '⚪' },
  unverifiziert: { bg: 'bg-blue-100',    text: 'text-blue-700',    icon: Clock,        emoji: '⏳' },
  fehlt:         { bg: 'bg-red-100',     text: 'text-red-700',     icon: AlertCircle,  emoji: '❌' },
};

export function Schritt1Rueckmeldungen({ kinder, anmeldungen, aufgaben, spendenBedarf, onRefresh }: Props) {
  const [filter, setFilter] = useState<RueckmeldungsStatus | 'alle'>('alle');
  const [aufgabeFilter, setAufgabeFilter] = useState<string>('');
  const [spendeFilter, setSpendeFilter] = useState<string>('');
  const [suche, setSuche] = useState('');
  const [offeneKlassen, setOffeneKlassen] = useState<Set<string>>(new Set());
  const [detailKind, setDetailKind] = useState<KindMitStatus | null>(null);
  const [kommentarKind, setKommentarKind] = useState<KindMitStatus | null>(null);
  const [verknuepfenKind, setVerknuepfenKind] = useState<KindMitStatus | null>(null);
  const [kiOffen, setKiOffen] = useState(false);
  const [kiLoading, setKiLoading] = useState(false);
  const [kiThemen, setKiThemen] = useState<KiThema[] | null>(null);
  const [kiNichtVerfuegbar, setKiNichtVerfuegbar] = useState(false);

  const alleMitStatus = useMemo<KindMitStatus[]>(() => {
    const idx = buildAnmeldungsIndex(anmeldungen);
    return kinder.map((k) => deriveStatus(k, idx));
  }, [kinder, anmeldungen]);

  const aufgabenMap = useMemo(() => new Map(aufgaben.map((a) => [a.id, a.titel])), [aufgaben]);
  const spendenMap = useMemo(() => new Map(spendenBedarf.map((s) => [s.id, s.titel])), [spendenBedarf]);

  // Anmeldungen, deren Kind-Einträge nicht (alle) auf die aktuelle Klassenliste matchen.
  const kinderIdx = useMemo(() => buildKinderIndex(kinder), [kinder]);

  // Kinder mit mehreren Anmeldungen (Doppel-Anmeldungen, ggf. mit Tippfehler-E-Mails).
  const mehrfachAnmeldungen = useMemo(() => {
    return kinder
      .map((k) => ({
        kind: k,
        anmeldungen: findAllAnmeldungenForKind(k, anmeldungen)
          .slice()
          .sort((a, b) => (a.erstellt_am || '').localeCompare(b.erstellt_am || '')),
      }))
      .filter((row) => row.anmeldungen.length > 1)
      .sort((a, b) => {
        if (a.kind.klasse !== b.kind.klasse) {
          return (a.kind.klasse || '').localeCompare(b.kind.klasse || '', 'de');
        }
        return a.kind.nachname.localeCompare(b.kind.nachname, 'de');
      });
  }, [kinder, anmeldungen]);

  // Map kind.id → andere Geschwister-Kinder (gleiche Anmeldung, müssen aber selbst in der Klassenliste sein).
  const geschwisterMap = useMemo(() => {
    const map = new Map<string, KindLite[]>();
    const anmeldungsIdx = buildAnmeldungsIndex(anmeldungen);
    for (const k of kinder) {
      const a = findAnmeldungForKind(k, anmeldungsIdx);
      if (!a) continue;
      const others = listAnmeldungsKinder(a, kinderIdx)
        .filter((e) => e.matched && e.matched.id !== k.id)
        .map((e) => e.matched!);
      if (others.length > 0) map.set(k.id, others);
    }
    return map;
  }, [kinder, anmeldungen, kinderIdx]);

  const problemAnmeldungen = useMemo(() => {
    return anmeldungen
      .map((a) => {
        const eintraege = listAnmeldungsKinder(a, kinderIdx);
        const anzahlUngematcht = eintraege.filter((e) => !e.matched).length;
        return { a, eintraege, anzahlUngematcht };
      })
      .filter((row) => row.anzahlUngematcht > 0)
      .sort((a, b) => {
        if (a.anzahlUngematcht !== b.anzahlUngematcht) return b.anzahlUngematcht - a.anzahlUngematcht;
        return a.a.kind_nachname.localeCompare(b.a.kind_nachname, 'de');
      });
  }, [anmeldungen, kinderIdx]);

  const zaehler = useMemo(() => {
    const z: Record<RueckmeldungsStatus | 'alle', number> = {
      alle: alleMitStatus.length, komplett: 0, nur_helfer: 0, nur_essen: 0, leer: 0, unverifiziert: 0, fehlt: 0,
    };
    for (const k of alleMitStatus) z[k.status]++;
    return z;
  }, [alleMitStatus]);

  const sucheNorm = suche.trim().toLowerCase();
  const gefiltert = useMemo(() => {
    return alleMitStatus.filter((k) => {
      if (filter !== 'alle' && k.status !== filter) return false;
      if (sucheNorm) {
        const name = `${k.kind.vorname} ${k.kind.nachname}`.toLowerCase();
        if (!name.includes(sucheNorm)) return false;
      }
      // Aufgaben-Filter: Familie muss diese Aufgabe gewünscht haben (oder Springer wenn 'springer')
      if (aufgabeFilter) {
        const a = k.anmeldung;
        if (!a) return false;
        if (aufgabeFilter === 'springer') {
          if (!a.ist_springer) return false;
        } else {
          const helfer = Array.isArray(a.helfer_aufgaben_json) ? (a.helfer_aufgaben_json as any[]) : [];
          if (!helfer.some((h) => h?.aufgabe_id === aufgabeFilter)) return false;
        }
      }
      // Essensspende-Filter
      if (spendeFilter) {
        const a = k.anmeldung;
        if (!a) return false;
        const essen = Array.isArray(a.essensspenden_json) ? (a.essensspenden_json as any[]) : [];
        if (!essen.some((e) => e?.spende_id === spendeFilter)) return false;
      }
      return true;
    });
  }, [alleMitStatus, filter, sucheNorm, aufgabeFilter, spendeFilter]);

  const gruppiert = useMemo(() => {
    const map = new Map<string, KindMitStatus[]>();
    for (const k of gefiltert) {
      const key = k.kind.klasse?.trim() || 'Ohne Klasse';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(k);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'de'));
  }, [gefiltert]);

  useEffect(() => {
    const auto = new Set<string>();
    const map = new Map<string, KindMitStatus[]>();
    for (const k of alleMitStatus) {
      const key = k.kind.klasse?.trim() || 'Ohne Klasse';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(k);
    }
    for (const [klasse, list] of map) {
      if (list.some((x) => x.status === 'fehlt' || x.status === 'unverifiziert')) auto.add(klasse);
    }
    setOffeneKlassen(auto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alleMitStatus.length]);

  const toggleKlasse = (klasse: string) => {
    setOffeneKlassen((prev) => {
      const next = new Set(prev);
      if (next.has(klasse)) next.delete(klasse);
      else next.add(klasse);
      return next;
    });
  };

  const kommentare = useMemo(() => {
    return alleMitStatus
      .filter((k) => k.hasKommentar && k.anmeldung?.kommentar)
      .map((k) => ({
        kind_name: `${k.kind.vorname} ${k.kind.nachname}`,
        klasse: k.kind.klasse || '',
        kommentar: k.anmeldung!.kommentar!.trim(),
      }));
  }, [alleMitStatus]);

  const starteKi = async () => {
    if (kommentare.length === 0) {
      toast.info('Keine Kommentare zum Analysieren vorhanden.');
      return;
    }
    setKiLoading(true);
    setKiNichtVerfuegbar(false);
    try {
      const res = await fetch('/api/helfer/rueckmeldungs-zusammenfassung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kommentare }),
      });
      const data = await res.json();
      if (data?.verfuegbar === false) {
        setKiNichtVerfuegbar(true);
        return;
      }
      if (!res.ok) {
        toast.error(data?.error || 'KI-Analyse fehlgeschlagen');
        return;
      }
      setKiThemen(Array.isArray(data.themen) ? data.themen : []);
    } catch {
      toast.error('KI-Analyse fehlgeschlagen');
    } finally {
      setKiLoading(false);
    }
  };

  // Liefert die zu exportierenden Einträge — respektiert den aktiven Status-Filter.
  // Bei filter='alle' wird nur Status 'fehlt' genommen (deckt sich mit "X fehlen" im Klassen-Header).
  // Für andere Stati (leer, unverifiziert, …) muss der User die entsprechende Status-Kachel klicken.
  const fehlendeFür = (klasse: string | null): KindMitStatus[] => {
    const quelle = klasse
      ? alleMitStatus.filter((k) => (k.kind.klasse?.trim() || 'Ohne Klasse') === klasse)
      : alleMitStatus;
    if (filter === 'alle') {
      return quelle.filter((k) => k.status === 'fehlt');
    }
    return quelle.filter((k) => k.status === filter);
  };

  const exportCsv = (klasse: string | null) => {
    const fehlend = fehlendeFür(klasse);
    if (fehlend.length === 0) {
      toast.info('Keine fehlenden Rückmeldungen in dieser Auswahl.');
      return;
    }
    const header = 'Klasse;Vorname;Nachname;Status';
    const rows = fehlend.map((k) =>
      [k.kind.klasse || '', k.kind.vorname, k.kind.nachname, STATUS_LABELS[k.status]]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(';')
    );
    const csv = '﻿' + [header, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = klasse
      ? `fehlende-rueckmeldungen_${klasse.replace(/[^a-zA-Z0-9-]/g, '_')}.csv`
      : 'fehlende-rueckmeldungen_alle-klassen.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${fehlend.length} Einträge exportiert`);
  };

  const copyForChat = async (klasse: string | null) => {
    const fehlend = fehlendeFür(klasse);
    if (fehlend.length === 0) {
      toast.info('Keine passenden Einträge in dieser Auswahl.');
      return;
    }
    const ueberschrift = filter === 'alle' ? 'Fehlende Rückmeldungen' : STATUS_LABELS[filter];
    const geschwisterSuffix = (kindId: string) => {
      const others = geschwisterMap.get(kindId) || [];
      if (others.length === 0) return '';
      const klassen = Array.from(new Set(others.map((g) => g.klasse || '–'))).sort((a, b) => a.localeCompare(b, 'de'));
      return ` (Geschwister in ${klassen.join(', ')})`;
    };
    let text: string;
    if (klasse) {
      const namen = fehlend.map((k) => `- ${k.kind.vorname} ${k.kind.nachname}${geschwisterSuffix(k.kind.id)}`).join('\n');
      text = `${ueberschrift} – Klasse ${klasse}\n${namen}`;
    } else {
      const gruppen = new Map<string, KindMitStatus[]>();
      for (const k of fehlend) {
        const key = k.kind.klasse?.trim() || 'Ohne Klasse';
        if (!gruppen.has(key)) gruppen.set(key, []);
        gruppen.get(key)!.push(k);
      }
      const klassenSort = Array.from(gruppen.keys()).sort((a, b) => a.localeCompare(b, 'de'));
      const blocks = klassenSort.map((klName) => {
        const eintraege = gruppen.get(klName)!;
        const namen = eintraege.map((k) => `- ${k.kind.vorname} ${k.kind.nachname}${geschwisterSuffix(k.kind.id)}`).join('\n');
        return `Klasse ${klName} (${eintraege.length})\n${namen}`;
      });
      text = `${ueberschrift} – Vogelschießen\n\n${blocks.join('\n\n')}`;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${fehlend.length} Einträge in Zwischenablage kopiert`);
    } catch {
      toast.error('Kopieren fehlgeschlagen — Browser blockiert den Zugriff.');
    }
  };

  return (
    <div className="px-5 py-5 space-y-5">
      {/* Status-Kacheln */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        <StatKachel label="Gesamt" wert={zaehler.alle} aktiv={filter === 'alle'} onClick={() => setFilter('alle')} />
        {STATUS_FILTER_REIHENFOLGE.map((s) => (
          <StatKachel
            key={s}
            label={STATUS_LABELS[s]}
            wert={zaehler[s]}
            aktiv={filter === s}
            onClick={() => setFilter(s)}
            emoji={STATUS_STYLE[s].emoji}
            tone={s}
          />
        ))}
      </div>

      {/* Sektion: Anmeldungen mit unbekannten Kindern */}
      <AnmeldungenMitUnbekannten
        eintraege={problemAnmeldungen}
        kinder={kinder}
        onRefresh={onRefresh}
      />

      {/* Sektion: Kinder mit Mehrfach-Anmeldungen */}
      <KinderMitMehrfachAnmeldungen
        eintraege={mehrfachAnmeldungen}
        aufgaben={aufgaben}
        spendenBedarf={spendenBedarf}
        onRefresh={onRefresh}
      />


      {/* KI-Panel */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          onClick={() => setKiOffen((v) => !v)}
          className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-slate-50"
        >
          <Sparkles size={16} className="text-purple-500" />
          <span className="font-medium text-sm text-slate-800">KI-Analyse der Eltern-Kommentare</span>
          <span className="text-xs text-slate-400 ml-1">({kommentare.length} Kommentare)</span>
          <span className="ml-auto text-slate-400">{kiOffen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
        </button>
        {kiOffen && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
            {kiNichtVerfuegbar ? (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                KI-Analyse nicht verfügbar — ANTHROPIC_API_KEY ist nicht konfiguriert.
              </div>
            ) : !kiThemen ? (
              <div>
                <p className="text-sm text-slate-600 mb-3">
                  Lass alle Eltern-Kommentare durch Claude analysieren und nach Themen gruppieren.
                </p>
                <button
                  onClick={starteKi}
                  disabled={kiLoading || kommentare.length === 0}
                  className="inline-flex items-center gap-2 text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {kiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  KI-Analyse starten
                </button>
              </div>
            ) : kiThemen.length === 0 ? (
              <p className="text-sm text-slate-500">Keine relevanten Themen erkannt.</p>
            ) : (
              <div className="space-y-3">
                {kiThemen.map((t, i) => (
                  <div key={i} className="rounded-md border border-purple-100 bg-purple-50/40 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-slate-800">{t.titel}</span>
                      <span className="text-xs text-purple-700 bg-white border border-purple-100 rounded-full px-2 py-0.5">
                        {t.anzahl}
                      </span>
                    </div>
                    {t.kernpunkte?.length > 0 && (
                      <ul className="list-disc pl-5 space-y-0.5 text-sm text-slate-700">
                        {t.kernpunkte.map((p, j) => <li key={j}>{p}</li>)}
                      </ul>
                    )}
                    {t.betroffene_familien?.length > 0 && (
                      <p className="text-xs text-slate-500 mt-2">
                        Familien: {t.betroffene_familien.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => { setKiThemen(null); }}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Neu analysieren
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suche + Filter + Gesamt-Export */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Nach Name suchen…"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-orange-300"
          />
        </div>
        <select
          value={aufgabeFilter}
          onChange={(e) => setAufgabeFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-md px-2 py-2 bg-white focus:outline-none focus:border-orange-300"
          title="Familien filtern, die diese Aufgabe gewünscht haben"
        >
          <option value="">Alle Helfer-Wünsche</option>
          {aufgaben.map((a) => (
            <option key={a.id} value={a.id}>Wunsch: {a.titel}</option>
          ))}
          <option value="springer">Wunsch: Springer</option>
        </select>
        <select
          value={spendeFilter}
          onChange={(e) => setSpendeFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-md px-2 py-2 bg-white focus:outline-none focus:border-orange-300"
          title="Familien filtern, die diese Essensspende angeboten haben"
        >
          <option value="">Alle Essensspenden</option>
          {spendenBedarf.map((s) => (
            <option key={s.id} value={s.id}>Spende: {s.titel}</option>
          ))}
        </select>
        {(aufgabeFilter || spendeFilter) && (
          <button
            onClick={() => { setAufgabeFilter(''); setSpendeFilter(''); }}
            className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
          >
            Filter zurücksetzen
          </button>
        )}
        <button
          onClick={() => copyForChat(null)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 rounded-md"
          title="Fehlende Rückmeldungen aller Klassen für WhatsApp kopieren"
        >
          <ClipboardCopy size={14} />
          Fehlende kopieren (alle Klassen)
        </button>
        <button
          onClick={() => exportCsv(null)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 rounded-md"
          title="Als CSV-Datei herunterladen"
        >
          <Download size={14} />
          CSV
        </button>
      </div>

      {/* Klassen-Akkordeon */}
      <div className="space-y-2">
        {gruppiert.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">Keine Einträge für die aktuelle Auswahl.</p>
        ) : (
          gruppiert.map(([klasse, liste]) => {
            const offen = offeneKlassen.has(klasse);
            const komplett = liste.filter((k) => k.status === 'komplett').length;
            const fehlend = liste.filter((k) => k.status === 'fehlt').length;
            return (
              <div key={klasse} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <button
                    onClick={() => toggleKlasse(klasse)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {offen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                    <span className="font-semibold text-sm text-slate-800">Klasse {klasse}</span>
                    <span className="text-xs text-slate-500">
                      {komplett}/{liste.length} komplett{fehlend > 0 ? ` · ${fehlend} fehlen` : ''}
                    </span>
                  </button>
                  <button
                    onClick={() => copyForChat(klasse)}
                    className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 border border-slate-200 bg-white px-2 py-1 rounded"
                    title="Fehlende Rückmeldungen dieser Klasse für WhatsApp kopieren"
                  >
                    <ClipboardCopy size={12} />
                    Kopieren
                  </button>
                  <button
                    onClick={() => exportCsv(klasse)}
                    className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 border border-slate-200 bg-white px-2 py-1 rounded"
                    title="Als CSV-Datei herunterladen"
                  >
                    <Download size={12} />
                    CSV
                  </button>
                </div>
                {offen && (
                  <div className="divide-y divide-slate-50">
                    {liste.map((k) => (
                      <KindZeile
                        key={k.kind.id}
                        eintrag={k}
                        geschwister={geschwisterMap.get(k.kind.id) || []}
                        aufgabenMap={aufgabenMap}
                        spendenMap={spendenMap}
                        onDetails={() => setDetailKind(k)}
                        onKommentar={() => setKommentarKind(k)}
                        onVerknuepfen={() => setVerknuepfenKind(k)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Detail-Modal */}
      {detailKind && (
        <DetailModal
          eintrag={detailKind}
          aufgaben={aufgaben}
          spendenBedarf={spendenBedarf}
          geschwister={geschwisterMap.get(detailKind.kind.id) || []}
          onClose={() => setDetailKind(null)}
        />
      )}
      {kommentarKind && (
        <KommentarModal eintrag={kommentarKind} onClose={() => setKommentarKind(null)} />
      )}
      {verknuepfenKind && (
        <VerknuepfenModal
          eintrag={verknuepfenKind}
          anmeldungen={anmeldungen}
          kinder={kinder}
          onClose={() => setVerknuepfenKind(null)}
          onSuccess={() => {
            setVerknuepfenKind(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function StatKachel({
  label, wert, aktiv, onClick, emoji, tone,
}: {
  label: string;
  wert: number;
  aktiv: boolean;
  onClick: () => void;
  emoji?: string;
  tone?: RueckmeldungsStatus;
}) {
  const style = tone ? STATUS_STYLE[tone] : null;
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border p-3 transition-all ${
        aktiv
          ? 'border-orange-400 ring-2 ring-orange-200 bg-white'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
        {emoji && <span>{emoji}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-xl font-bold ${style?.text ?? 'text-slate-800'}`}>{wert}</div>
    </button>
  );
}

function KindZeile({
  eintrag,
  geschwister,
  aufgabenMap,
  spendenMap,
  onDetails,
  onKommentar,
  onVerknuepfen,
}: {
  eintrag: KindMitStatus;
  geschwister: KindLite[];
  aufgabenMap: Map<string, string>;
  spendenMap: Map<string, string>;
  onDetails: () => void;
  onKommentar: () => void;
  onVerknuepfen: () => void;
}) {
  const style = STATUS_STYLE[eintrag.status];
  const isFehlt = eintrag.status === 'fehlt';
  const geschwisterTitle = geschwister.length > 0
    ? `Geschwister (gleiche Anmeldung): ${geschwister.map((g) => `${g.vorname} ${g.nachname} (Klasse ${g.klasse || '–'})`).join(', ')}`
    : '';

  // Helfer-Wünsche + Spenden für Inline-Anzeige
  const a = eintrag.anmeldung;
  const helferJson = Array.isArray(a?.helfer_aufgaben_json) ? (a!.helfer_aufgaben_json as any[]) : [];
  const essenJson = Array.isArray(a?.essensspenden_json) ? (a!.essensspenden_json as any[]) : [];
  const helferTitel = helferJson
    .map((h) => aufgabenMap.get(h?.aufgabe_id))
    .filter(Boolean) as string[];
  if (a?.ist_springer) helferTitel.push(`Springer${a.springer_zeitfenster ? ` (${a.springer_zeitfenster})` : ''}`);
  const spendenTitel = essenJson
    .map((e) => {
      const t = spendenMap.get(e?.spende_id);
      if (!t) return null;
      const menge = e?.menge ?? 1;
      return menge > 1 ? `${menge}× ${t}` : t;
    })
    .filter(Boolean) as string[];

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
      onClick={() => {
        if (isFehlt) {
          onVerknuepfen();
        } else {
          onDetails();
        }
      }}
    >
      <span className="text-sm text-slate-800 whitespace-nowrap">
        {eintrag.kind.vorname} {eintrag.kind.nachname}
      </span>
      <span className="text-xs text-slate-500 flex-1 truncate min-w-0">
        {helferTitel.length > 0 && (
          <span title={`Helfer-Wünsche: ${helferTitel.join(', ')}`}>
            <Wrench size={10} className="inline -mt-0.5 mr-1 text-slate-400" />
            {helferTitel.join(', ')}
          </span>
        )}
        {helferTitel.length > 0 && spendenTitel.length > 0 && <span className="mx-2 text-slate-300">·</span>}
        {spendenTitel.length > 0 && (
          <span title={`Essensspenden: ${spendenTitel.join(', ')}`}>
            <Utensils size={10} className="inline -mt-0.5 mr-1 text-slate-400" />
            {spendenTitel.join(', ')}
          </span>
        )}
      </span>
      {geschwister.length > 0 && (
        <span
          className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1 cursor-help"
          title={geschwisterTitle}
        >
          👥 {geschwister.length === 1 ? '+1 Geschwister' : `+${geschwister.length} Geschwister`}
        </span>
      )}
      {eintrag.hasKommentar && (
        <button
          onClick={(e) => { e.stopPropagation(); onKommentar(); }}
          className="text-slate-400 hover:text-slate-700"
          title="Kommentar ansehen"
        >
          <MessageSquare size={14} />
        </button>
      )}
      {isFehlt && (
        <button
          onClick={(e) => { e.stopPropagation(); onVerknuepfen(); }}
          className="text-xs text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 border border-blue-200 bg-blue-50 px-2 py-0.5 rounded"
          title="Manuell mit Anmeldung verknüpfen"
        >
          <Link2 size={12} />
          Verknüpfen
        </button>
      )}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
        {STATUS_LABELS[eintrag.status]}
      </span>
    </div>
  );
}

function DetailModal({
  eintrag,
  aufgaben,
  spendenBedarf,
  geschwister,
  onClose,
}: {
  eintrag: KindMitStatus;
  aufgaben: AufgabeLite[];
  spendenBedarf: SpendeLite[];
  geschwister: KindLite[];
  onClose: () => void;
}) {
  const a = eintrag.anmeldung;
  const aufgabeMap = new Map(aufgaben.map((x) => [x.id, x.titel]));
  const spendeMap = new Map(spendenBedarf.map((x) => [x.id, x.titel]));
  const helferJson = Array.isArray(a?.helfer_aufgaben_json) ? (a!.helfer_aufgaben_json as any[]) : [];
  const essenJson = Array.isArray(a?.essensspenden_json) ? (a!.essensspenden_json as any[]) : [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">
            {eintrag.kind.vorname} {eintrag.kind.nachname} · Klasse {eintrag.kind.klasse}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-4 text-sm">
          <Row label="Status" value={STATUS_LABELS[eintrag.status]} />
          {a ? (
            <>
              <Row label="Eltern-E-Mail" value={a.eltern_email || '–'} />
              <Row label="Verifiziert" value={a.verifiziert ? 'Ja' : 'Nein'} />
              {geschwister.length > 0 && (
                <Row
                  label="Geschwister"
                  value={geschwister.map((g) => `${g.vorname} ${g.nachname} (${g.klasse || '?'})`).join(', ')}
                />
              )}

              {/* Helfer-Wünsche konkret */}
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Helfer-Wünsche</div>
                {helferJson.length === 0 && !a.ist_springer ? (
                  <div className="text-slate-500 italic">Keine Helfer-Wünsche</div>
                ) : (
                  <ul className="space-y-1">
                    {helferJson.map((h, i) => (
                      <li key={i} className="text-slate-700 inline-flex items-center gap-1.5">
                        <Wrench size={12} className="text-slate-400 shrink-0" />
                        <span>{aufgabeMap.get(h?.aufgabe_id) || 'Unbekannte Aufgabe'}</span>
                      </li>
                    ))}
                    {a.ist_springer && (
                      <li className="text-purple-700 inline-flex items-center gap-1.5">
                        <Sparkles size={12} className="shrink-0" />
                        <span>Springer ({a.springer_zeitfenster || 'kein Zeitfenster'})</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Essensspenden konkret */}
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Essensspenden</div>
                {essenJson.length === 0 ? (
                  <div className="text-slate-500 italic">Keine Essensspenden</div>
                ) : (
                  <ul className="space-y-1">
                    {essenJson.map((e, i) => (
                      <li key={i} className="text-slate-700 inline-flex items-center gap-1.5">
                        <Utensils size={12} className="text-slate-400 shrink-0" />
                        <span>{e?.menge ?? 1}× {spendeMap.get(e?.spende_id) || 'Unbekannte Spende'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {a.kommentar && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Kommentar der Eltern</div>
                  <div className="text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded p-2">{a.kommentar}</div>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500">Keine Anmeldung gefunden.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KommentarModal({ eintrag, onClose }: { eintrag: KindMitStatus; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">
            Kommentar von {eintrag.kind.vorname} {eintrag.kind.nachname}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 text-sm text-slate-700 whitespace-pre-wrap">
          {eintrag.anmeldung?.kommentar}
        </div>
      </div>
    </div>
  );
}

function AnmeldungenMitUnbekannten({
  eintraege,
  kinder,
  onRefresh,
}: {
  eintraege: { a: AnmeldungLite; eintraege: AnmeldungsKindEintrag[]; anzahlUngematcht: number }[];
  kinder: KindLite[];
  onRefresh: () => void;
}) {
  const istLeer = eintraege.length === 0;
  const [offen, setOffen] = useState(!istLeer);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [verknuepfungsZiel, setVerknuepfungsZiel] = useState<
    | { anmeldung: AnmeldungLite; eintrag: AnmeldungsKindEintrag }
    | null
  >(null);

  const entferneEintrag = async (a: AnmeldungLite, eintrag: AnmeldungsKindEintrag) => {
    const key = `${a.id}-entf-${eintrag.vorname}-${eintrag.nachname}`;
    setLoadingKey(key);
    try {
      const supabase = createClient();
      const weitere: WeiteresKind[] = Array.isArray(a.weitere_kinder_json)
        ? (a.weitere_kinder_json as WeiteresKind[])
        : [];

      if (eintrag.istHaupt) {
        // Erstes Geschwister rückt zum Hauptkind, falls vorhanden
        if (weitere.length === 0) {
          toast.error('Anmeldung hätte kein Kind mehr — bitte stattdessen die ganze Anmeldung löschen.');
          return;
        }
        const [neuesHaupt, ...rest] = weitere;
        const { error } = await supabase
          .from('anmeldungen')
          .update({
            kind_vorname: neuesHaupt.vorname,
            kind_nachname: neuesHaupt.nachname,
            kind_klasse: neuesHaupt.klasse,
            weitere_kinder_json: rest.length > 0 ? rest : null,
          })
          .eq('id', a.id);
        if (error) throw error;
        toast.success(`${eintrag.vorname} ${eintrag.nachname} entfernt, ${neuesHaupt.vorname} ist jetzt Hauptkind.`);
      } else {
        const neueWeitere = weitere.filter(
          (w) => !(normalizeName(w?.vorname) === normalizeName(eintrag.vorname)
            && normalizeName(w?.nachname) === normalizeName(eintrag.nachname)),
        );
        const { error } = await supabase
          .from('anmeldungen')
          .update({ weitere_kinder_json: neueWeitere.length > 0 ? neueWeitere : null })
          .eq('id', a.id);
        if (error) throw error;
        toast.success(`${eintrag.vorname} ${eintrag.nachname} aus der Anmeldung entfernt.`);
      }
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || 'Entfernen fehlgeschlagen');
    } finally {
      setLoadingKey(null);
    }
  };

  const loescheAnmeldung = async (a: AnmeldungLite) => {
    const namen = [
      `${a.kind_vorname} ${a.kind_nachname}`,
      ...(Array.isArray(a.weitere_kinder_json) ? (a.weitere_kinder_json as WeiteresKind[]).map((w) => `${w.vorname} ${w.nachname}`) : []),
    ].join(', ');
    if (!confirm(`Diese Anmeldung wirklich löschen?\n\nFamilie ${a.kind_nachname} (${a.eltern_email})\nKinder: ${namen}\n\nDie Helfer-Rückmeldungen und Essensspenden werden ebenfalls bereinigt.`)) return;
    setLoadingKey(`${a.id}-del`);
    try {
      const res = await fetch('/api/helfer/anmeldungen-bereinigen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [a.id] }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || 'Unbekannter Fehler');
      toast.success('Anmeldung gelöscht.');
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || 'Löschen fehlgeschlagen');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <>
      <div className={`rounded-lg border ${istLeer ? 'border-slate-200 bg-white' : 'border-amber-300 bg-amber-50/30'}`}>
        <button
          onClick={() => setOffen((v) => !v)}
          className={`w-full px-4 py-3 flex items-center gap-2 text-left ${istLeer ? 'hover:bg-slate-50' : 'hover:bg-amber-50'}`}
        >
          {istLeer
            ? <CheckCircle2 size={16} className="text-green-500" />
            : <AlertCircle size={16} className="text-amber-600" />}
          <span className="font-semibold text-sm text-slate-800">
            Anmeldungen mit unbekannten Kindern
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${istLeer ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>
            {eintraege.length}
          </span>
          <span className="ml-auto text-slate-400">{offen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
        </button>
        {offen && (
          <div className={`px-4 pb-4 pt-1 border-t space-y-2 ${istLeer ? 'border-slate-100' : 'border-amber-200'}`}>
            {istLeer ? (
              <p className="text-sm text-slate-500 py-3">
                Alle Anmeldungen sind sauber zugeordnet — kein Kind-Eintrag steht außerhalb der aktuellen Klassenliste.
              </p>
            ) : (
            <>
            <p className="text-xs text-slate-600 mb-2">
              Diese Anmeldungen enthalten Kinder, die in der aktuellen Klassenliste nicht gefunden wurden —
              z.B. veraltete Geschwister-Einträge, Tippfehler oder Test-Anmeldungen.
              Pro Kind: <strong>Entfernen</strong> löscht nur den Eintrag, <strong>Verknüpfen</strong> ordnet
              den Eintrag einem echten Schul-Kind zu.
            </p>
            {eintraege.map(({ a, eintraege: liste, anzahlUngematcht }) => (
              <div key={a.id} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate flex items-center gap-2 flex-wrap">
                      Familie {a.kind_nachname}
                      <span className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        {anzahlUngematcht} unbekannt
                      </span>
                      {!a.verifiziert && (
                        <span className="text-[10px] uppercase tracking-wider text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                          unverifiziert
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{a.eltern_email || '—'}</div>
                    {a.erstellt_am && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Eingegangen: {new Date(a.erstellt_am).toLocaleDateString('de-DE')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => loescheAnmeldung(a)}
                    disabled={loadingKey !== null}
                    className="text-xs font-medium border border-red-200 bg-white hover:bg-red-50 text-red-600 px-2 py-1 rounded inline-flex items-center gap-1 disabled:opacity-50 shrink-0"
                  >
                    {loadingKey === `${a.id}-del` ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    Anmeldung löschen
                  </button>
                </div>
                <ul className="text-xs space-y-1.5">
                  {liste.map((e, i) => {
                    const entfKey = `${a.id}-entf-${e.vorname}-${e.nachname}`;
                    return (
                      <li key={i} className="flex items-center gap-2 flex-wrap">
                        {e.matched ? (
                          <CheckCircle2 size={11} className="text-green-500 shrink-0" />
                        ) : (
                          <AlertCircle size={11} className="text-amber-500 shrink-0" />
                        )}
                        <span className={`text-slate-700 ${e.matched ? '' : 'font-medium'}`}>
                          {e.vorname} {e.nachname} ({e.klasse || '–'})
                          {e.istHaupt && <span className="text-slate-400"> · Hauptkind</span>}
                        </span>
                        {!e.matched && (
                          <span className="ml-auto flex gap-1">
                            <button
                              onClick={() => setVerknuepfungsZiel({ anmeldung: a, eintrag: e })}
                              disabled={loadingKey !== null}
                              className="text-[11px] text-blue-700 hover:text-blue-900 border border-blue-200 bg-blue-50 px-2 py-0.5 rounded inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <Link2 size={10} />
                              Verknüpfen
                            </button>
                            <button
                              onClick={() => entferneEintrag(a, e)}
                              disabled={loadingKey !== null}
                              className="text-[11px] text-slate-700 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-2 py-0.5 rounded inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              {loadingKey === entfKey ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                              Entfernen
                            </button>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            </>
            )}
          </div>
        )}
      </div>

      {verknuepfungsZiel && (
        <EintragZuKindVerknuepfenModal
          anmeldung={verknuepfungsZiel.anmeldung}
          eintrag={verknuepfungsZiel.eintrag}
          kinder={kinder}
          onClose={() => setVerknuepfungsZiel(null)}
          onSuccess={() => {
            setVerknuepfungsZiel(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

function EintragZuKindVerknuepfenModal({
  anmeldung,
  eintrag,
  kinder,
  onClose,
  onSuccess,
}: {
  anmeldung: AnmeldungLite;
  eintrag: AnmeldungsKindEintrag;
  kinder: KindLite[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [suche, setSuche] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [zeigeAlle, setZeigeAlle] = useState(false);
  const nachnameNorm = normalizeName(eintrag.nachname);
  const klasseNorm = (eintrag.klasse || '').trim().toLowerCase().replace(/\s+/g, '');

  const passendeKinder = useMemo(() => {
    const sucheNorm = suche.trim().toLowerCase();
    const liste = kinder.map((k) => {
      const nachnameMatch = normalizeName(k.nachname) === nachnameNorm;
      const klasseMatch = (k.klasse || '').trim().toLowerCase().replace(/\s+/g, '') === klasseNorm;
      const haystack = `${k.vorname} ${k.nachname} ${k.klasse || ''}`.toLowerCase();
      return { k, nachnameMatch, klasseMatch, haystack };
    });
    const gefiltert = sucheNorm
      ? liste.filter((r) => r.haystack.includes(sucheNorm))
      : liste;
    const sortFn = (a: typeof liste[0], b: typeof liste[0]) => {
      const aScore = (a.nachnameMatch ? 2 : 0) + (a.klasseMatch ? 1 : 0);
      const bScore = (b.nachnameMatch ? 2 : 0) + (b.klasseMatch ? 1 : 0);
      if (aScore !== bScore) return bScore - aScore;
      return a.k.nachname.localeCompare(b.k.nachname, 'de');
    };
    gefiltert.sort(sortFn);
    const wahrscheinliche = gefiltert.filter((r) => r.nachnameMatch || r.klasseMatch);
    return { wahrscheinliche, alle: gefiltert };
  }, [kinder, suche, nachnameNorm, klasseNorm]);

  const sichtbar = (suche.trim() || zeigeAlle) ? passendeKinder.alle : passendeKinder.wahrscheinliche;

  const verknuepfen = async (kind: KindLite) => {
    setLoadingId(kind.id);
    try {
      const supabase = createClient();
      const weitere: WeiteresKind[] = Array.isArray(anmeldung.weitere_kinder_json)
        ? (anmeldung.weitere_kinder_json as WeiteresKind[])
        : [];

      if (eintrag.istHaupt) {
        const { error } = await supabase
          .from('anmeldungen')
          .update({
            kind_vorname: kind.vorname,
            kind_nachname: kind.nachname,
            kind_klasse: kind.klasse || '',
          })
          .eq('id', anmeldung.id);
        if (error) throw error;
      } else {
        const neueWeitere = weitere.map((w) => {
          if (
            normalizeName(w?.vorname) === normalizeName(eintrag.vorname)
            && normalizeName(w?.nachname) === normalizeName(eintrag.nachname)
          ) {
            return { vorname: kind.vorname, nachname: kind.nachname, klasse: kind.klasse || '' };
          }
          return w;
        });
        const { error } = await supabase
          .from('anmeldungen')
          .update({ weitere_kinder_json: neueWeitere })
          .eq('id', anmeldung.id);
        if (error) throw error;
      }
      toast.success(`Eintrag mit ${kind.vorname} ${kind.nachname} verknüpft.`);
      onSuccess();
    } catch (e: any) {
      toast.error(e?.message || 'Verknüpfung fehlgeschlagen');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">
            Eintrag „{eintrag.vorname} {eintrag.nachname}" mit Schul-Kind verknüpfen
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
        <div className="px-5 py-3 border-b border-slate-100 space-y-2">
          <p className="text-sm text-slate-600">
            Familie <strong>{anmeldung.kind_nachname}</strong> ({anmeldung.eltern_email}).
            Standardmäßig nur Kinder mit gleichem Nachnamen <strong>{eintrag.nachname}</strong> oder Klasse <strong>{eintrag.klasse || '–'}</strong>.
          </p>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Schul-Kind suchen (Name, Klasse)…"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-orange-300"
            />
          </div>
          {!suche.trim() && passendeKinder.alle.length > passendeKinder.wahrscheinliche.length && (
            <div className="text-xs text-slate-500 text-right">
              <button
                onClick={() => setZeigeAlle((v) => !v)}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {zeigeAlle ? 'Nur passende anzeigen' : 'Alle Kinder anzeigen'}
              </button>
            </div>
          )}
        </div>
        <div className="overflow-auto px-5 py-3 space-y-1 flex-1">
          {sichtbar.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Kein passendes Kind. Klicke „Alle Kinder anzeigen", um die ganze Klassenliste zu durchsuchen.
            </p>
          ) : (
            sichtbar.map(({ k, nachnameMatch, klasseMatch }) => (
              <button
                key={k.id}
                onClick={() => verknuepfen(k)}
                disabled={loadingId !== null}
                className={`w-full text-left rounded-md border p-2 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 ${
                  nachnameMatch ? 'border-orange-200' : 'border-slate-200'
                }`}
              >
                {loadingId === k.id && <Loader2 size={12} className="animate-spin" />}
                <span className="text-sm text-slate-800 flex-1">
                  {k.vorname} {k.nachname} <span className="text-slate-500">(Klasse {k.klasse || '–'})</span>
                </span>
                {nachnameMatch && (
                  <span className="text-[10px] uppercase tracking-wider text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
                    Nachname
                  </span>
                )}
                {klasseMatch && !nachnameMatch && (
                  <span className="text-[10px] uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    Klasse
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Erzeugt einen stabilen "Inhalts-Fingerabdruck" einer Anmeldung — nur für Gleichheits-Vergleich.
function anmeldungsFingerabdruck(a: AnmeldungLite): string {
  const helfer = Array.isArray(a.helfer_aufgaben_json)
    ? (a.helfer_aufgaben_json as any[])
        .map((h) => `${h?.aufgabe_id || ''}:${h?.prioritaet ?? ''}`)
        .sort()
        .join('|')
    : '';
  const essen = Array.isArray(a.essensspenden_json)
    ? (a.essensspenden_json as any[])
        .map((e) => `${e?.spende_id || ''}:${e?.menge ?? ''}`)
        .sort()
        .join('|')
    : '';
  const weitere = Array.isArray(a.weitere_kinder_json)
    ? a.weitere_kinder_json
        .map((w) => `${normalizeName(w?.vorname || '')}|${normalizeName(w?.nachname || '')}|${(w?.klasse || '').trim().toLowerCase()}`)
        .sort()
        .join(';')
    : '';
  return [
    helfer,
    essen,
    a.ist_springer ? `s:${a.springer_zeitfenster || ''}` : '',
    (a.kommentar || '').trim(),
    weitere,
  ].join('||');
}

function KinderMitMehrfachAnmeldungen({
  eintraege,
  aufgaben,
  spendenBedarf,
  onRefresh,
}: {
  eintraege: { kind: KindLite; anmeldungen: AnmeldungLite[] }[];
  aufgaben: AufgabeLite[];
  spendenBedarf: SpendeLite[];
  onRefresh: () => void;
}) {
  const istLeer = eintraege.length === 0;
  const [offen, setOffen] = useState(!istLeer);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [expandedAnmeldungIds, setExpandedAnmeldungIds] = useState<Set<string>>(new Set());

  const aufgabenMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of aufgaben) m.set(a.id, a.titel);
    return m;
  }, [aufgaben]);
  const spendenMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of spendenBedarf) m.set(s.id, s.titel);
    return m;
  }, [spendenBedarf]);

  const toggleExpanded = (id: string) => {
    setExpandedAnmeldungIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loescheAnmeldungen = async (ids: string[], successMsg: string) => {
    setLoadingKey(ids.join(','));
    try {
      const res = await fetch('/api/helfer/anmeldungen-bereinigen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || 'Unbekannter Fehler');
      toast.success(successMsg);
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || 'Löschen fehlgeschlagen');
    } finally {
      setLoadingKey(null);
    }
  };

  const alsGueltigSetzen = (kind: KindLite, gewinner: AnmeldungLite, alle: AnmeldungLite[]) => {
    const andere = alle.filter((a) => a.id !== gewinner.id);
    if (andere.length === 0) return;
    if (!confirm(
      `${kind.vorname} ${kind.nachname}: Anmeldung von ${gewinner.eltern_email} als gültig markieren?\n\n`
      + `Folgende ${andere.length} Anmeldung${andere.length > 1 ? 'en' : ''} werden gelöscht:\n`
      + andere.map((a) => `• ${a.eltern_email || '(ohne E-Mail)'}${a.verifiziert ? ' (verifiziert)' : ' (unverifiziert)'}`).join('\n')
      + `\n\nHelfer-Rückmeldungen und Essensspenden werden anschließend aus der verbleibenden Anmeldung neu erzeugt.`,
    )) return;
    loescheAnmeldungen(andere.map((a) => a.id), `${andere.length} andere Anmeldung${andere.length > 1 ? 'en' : ''} entfernt, abgeleitete Daten bereinigt.`);
  };

  const einzelLoeschen = (kind: KindLite, a: AnmeldungLite) => {
    if (!confirm(
      `Anmeldung von ${a.eltern_email || '(ohne E-Mail)'} für ${kind.vorname} ${kind.nachname} löschen?\n\n`
      + `Status: ${a.verifiziert ? 'verifiziert' : 'unverifiziert'}\n`
      + `Eingegangen: ${a.erstellt_am ? new Date(a.erstellt_am).toLocaleDateString('de-DE') : '–'}\n\n`
      + `Helfer-Rückmeldungen und Essensspenden werden anschließend aus den verbleibenden Anmeldungen für dieses Kind neu erzeugt.`,
    )) return;
    loescheAnmeldungen([a.id], 'Anmeldung gelöscht, abgeleitete Daten bereinigt.');
  };

  return (
    <div className={`rounded-lg border ${istLeer ? 'border-slate-200 bg-white' : 'border-amber-300 bg-amber-50/30'}`}>
      <button
        onClick={() => setOffen((v) => !v)}
        className={`w-full px-4 py-3 flex items-center gap-2 text-left ${istLeer ? 'hover:bg-slate-50' : 'hover:bg-amber-50'}`}
      >
        {istLeer
          ? <CheckCircle2 size={16} className="text-green-500" />
          : <AlertCircle size={16} className="text-amber-600" />}
        <span className="font-semibold text-sm text-slate-800">Kinder mit Mehrfach-Anmeldungen</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${istLeer ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>
          {eintraege.length}
        </span>
        <span className="ml-auto text-slate-400">{offen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
      </button>
      {offen && (
        <div className={`px-4 pb-4 pt-1 border-t space-y-2 ${istLeer ? 'border-slate-100' : 'border-amber-200'}`}>
          {istLeer ? (
            <p className="text-sm text-slate-500 py-3">
              Keine Kinder mit mehreren Anmeldungen. Alles eindeutig.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-600 mb-2">
                Diese Kinder haben mehr als eine Anmeldung — z.B. weil Eltern unabhängig voneinander
                gemeldet haben oder eine Tippfehler-Anmeldung wiederholt wurde. Mit{' '}
                <strong>„Als gültig markieren"</strong> behältst du eine Anmeldung und löschst die anderen.
                Mit <strong>„Diese löschen"</strong> entfernst du einzelne Einträge.
              </p>
              {eintraege.map(({ kind, anmeldungen }) => {
                const fingerprints = anmeldungen.map(anmeldungsFingerabdruck);
                const inhaltlichIdentisch = fingerprints.every((f) => f === fingerprints[0]);
                return (
                  <div key={kind.id} className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2 flex-wrap">
                      {kind.vorname} {kind.nachname}
                      <span className="text-xs text-slate-500 font-normal">Klasse {kind.klasse || '–'}</span>
                      <span className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        {anmeldungen.length} Anmeldungen
                      </span>
                      {inhaltlichIdentisch ? (
                        <span className="text-[10px] uppercase tracking-wider text-green-700 bg-green-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                          <CheckCircle2 size={10} /> Inhaltlich identisch
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                          <AlertCircle size={10} /> Unterschiedlicher Inhalt — Eltern fragen
                        </span>
                      )}
                    </div>
                    <ul className="divide-y divide-slate-50">
                      {anmeldungen.map((a) => {
                        const delKey = `${kind.id}-${a.id}-del`;
                        const winKey = `${kind.id}-${a.id}-win`;
                        const aktion = loadingKey?.startsWith(`${kind.id}-`);
                        const isExpanded = expandedAnmeldungIds.has(a.id);
                        return (
                          <li key={a.id} className="py-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => toggleExpanded(a.id)}
                                className="text-slate-400 hover:text-slate-700 shrink-0"
                                title={isExpanded ? 'Details ausblenden' : 'Details anzeigen'}
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-slate-800 truncate">{a.eltern_email || '(ohne E-Mail)'}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                  {a.verifiziert
                                    ? <span className="text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">verifiziert</span>
                                    : <span className="text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">unverifiziert</span>}
                                  {a.erstellt_am && (
                                    <span>eingegangen {new Date(a.erstellt_am).toLocaleDateString('de-DE')}</span>
                                  )}
                                  {a.benachrichtigt_am && (
                                    <span className="text-orange-700">bereits benachrichtigt</span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => alsGueltigSetzen(kind, a, anmeldungen)}
                                disabled={aktion}
                                className="text-[11px] font-medium bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded inline-flex items-center gap-1 disabled:opacity-50"
                                title="Diese behalten, andere löschen"
                              >
                                {loadingKey === winKey ? <Loader2 size={10} className="animate-spin" /> : null}
                                Als gültig markieren
                              </button>
                              <button
                                onClick={() => einzelLoeschen(kind, a)}
                                disabled={aktion}
                                className="text-[11px] text-red-700 hover:text-red-900 border border-red-200 bg-white hover:bg-red-50 px-2 py-1 rounded inline-flex items-center gap-1 disabled:opacity-50"
                                title="Nur diese Anmeldung löschen"
                              >
                                {loadingKey === delKey ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                                Diese löschen
                              </button>
                            </div>
                            {isExpanded && (
                              <AnmeldungDetail anmeldung={a} aufgabenMap={aufgabenMap} spendenMap={spendenMap} />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AnmeldungDetail({
  anmeldung,
  aufgabenMap,
  spendenMap,
}: {
  anmeldung: AnmeldungLite;
  aufgabenMap: Map<string, string>;
  spendenMap: Map<string, string>;
}) {
  const helfer = Array.isArray(anmeldung.helfer_aufgaben_json)
    ? (anmeldung.helfer_aufgaben_json as { aufgabe_id: string; prioritaet?: number }[])
    : [];
  const essen = Array.isArray(anmeldung.essensspenden_json)
    ? (anmeldung.essensspenden_json as { spende_id: string; menge?: number }[])
    : [];
  const weitere = Array.isArray(anmeldung.weitere_kinder_json) ? anmeldung.weitere_kinder_json : [];
  return (
    <div className="mt-2 ml-6 pl-3 border-l-2 border-slate-200 text-xs text-slate-700 space-y-2">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Helfer-Wünsche</div>
        {anmeldung.ist_springer ? (
          <div>
            Springer ({anmeldung.springer_zeitfenster || 'kein Zeitfenster'})
            {helfer.length > 0 && ` + ${helfer.length} Aufgabe(n)`}
          </div>
        ) : helfer.length === 0 ? (
          <div className="text-slate-400">—</div>
        ) : (
          <ul className="list-disc pl-5 space-y-0.5">
            {helfer.map((h, i) => (
              <li key={i}>
                {aufgabenMap.get(h.aufgabe_id) || `Aufgabe ${h.aufgabe_id.substring(0, 8)}…`}
                {h.prioritaet ? <span className="text-slate-400"> (Prio {h.prioritaet})</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Essensspenden</div>
        {essen.length === 0 ? (
          <div className="text-slate-400">—</div>
        ) : (
          <ul className="list-disc pl-5 space-y-0.5">
            {essen.map((e, i) => (
              <li key={i}>
                {e.menge ? `${e.menge}× ` : ''}{spendenMap.get(e.spende_id) || `Spende ${e.spende_id.substring(0, 8)}…`}
              </li>
            ))}
          </ul>
        )}
      </div>
      {weitere.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Weitere Kinder in dieser Anmeldung</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {weitere.map((w, i) => (
              <li key={i}>{w.vorname} {w.nachname} ({w.klasse || '–'})</li>
            ))}
          </ul>
        </div>
      )}
      {anmeldung.kommentar?.trim() && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Kommentar</div>
          <div className="whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded p-2">{anmeldung.kommentar}</div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-slate-700 text-right">{value}</span>
    </div>
  );
}

function VerknuepfenModal({
  eintrag,
  anmeldungen,
  kinder,
  onClose,
  onSuccess,
}: {
  eintrag: KindMitStatus;
  anmeldungen: AnmeldungLite[];
  kinder: KindLite[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [suche, setSuche] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [zeigeAlle, setZeigeAlle] = useState(false);
  const kindNachnameNorm = normalizeName(eintrag.kind.nachname);

  const kinderIdx = useMemo(() => buildKinderIndex(kinder), [kinder]);

  type ZeileInfo = {
    a: AnmeldungLite;
    eintraege: AnmeldungsKindEintrag[];
    nachnameMatch: boolean;
    searchHaystack: string;
  };

  const { nachnameTreffer, andereTreffer, allesGefiltert } = useMemo(() => {
    const sucheNorm = suche.trim().toLowerCase();
    const aufbereitet: ZeileInfo[] = anmeldungen.map((a) => {
      const eintraege = listAnmeldungsKinder(a, kinderIdx);
      const nachnameMatch = eintraege.some((e) => normalizeName(e.nachname) === kindNachnameNorm);
      const searchHaystack = [a.eltern_email || '', ...eintraege.map((e) => `${e.vorname} ${e.nachname} ${e.klasse}`)].join(' ').toLowerCase();
      return { a, eintraege, nachnameMatch, searchHaystack };
    });

    const gefiltert = sucheNorm
      ? aufbereitet.filter((r) => r.searchHaystack.includes(sucheNorm))
      : aufbereitet;

    const nachnameTreffer = gefiltert.filter((r) => r.nachnameMatch);
    const andereTreffer = gefiltert.filter((r) => !r.nachnameMatch);

    const sortFn = (a: ZeileInfo, b: ZeileInfo) =>
      a.a.kind_nachname.localeCompare(b.a.kind_nachname, 'de');
    nachnameTreffer.sort(sortFn);
    andereTreffer.sort(sortFn);

    return { nachnameTreffer, andereTreffer, allesGefiltert: gefiltert };
  }, [anmeldungen, suche, kindNachnameNorm, kinderIdx]);

  const sichtbar = (suche.trim() || zeigeAlle) ? [...nachnameTreffer, ...andereTreffer] : nachnameTreffer;

  const verknuepfen = async (
    anmeldung: AnmeldungLite,
    modus: 'hauptkind' | 'geschwister',
  ) => {
    setLoadingId(anmeldung.id + modus);
    try {
      const supabase = createClient();
      const klasse = eintrag.kind.klasse || '';

      if (modus === 'hauptkind') {
        // Bisheriges Hauptkind in weitere_kinder_json verschieben, sofern es ein echtes Kind ist
        const bisherigeWeitere: WeiteresKind[] = Array.isArray(anmeldung.weitere_kinder_json)
          ? (anmeldung.weitere_kinder_json as WeiteresKind[])
          : [];
        const altesHauptkind: WeiteresKind = {
          vorname: anmeldung.kind_vorname,
          nachname: anmeldung.kind_nachname,
          klasse: anmeldung.kind_klasse,
        };
        // nicht doppelt einfügen
        const istBereitsDrin = bisherigeWeitere.some(
          (w) => normalizeName(w?.vorname) === normalizeName(altesHauptkind.vorname)
            && normalizeName(w?.nachname) === normalizeName(altesHauptkind.nachname),
        );
        // nicht das neue Hauptkind als Geschwister behalten
        const istNeuesKind = normalizeName(altesHauptkind.vorname) === normalizeName(eintrag.kind.vorname)
          && normalizeName(altesHauptkind.nachname) === normalizeName(eintrag.kind.nachname);
        const neueWeitere = (istBereitsDrin || istNeuesKind)
          ? bisherigeWeitere
          : [...bisherigeWeitere, altesHauptkind];

        const { error } = await supabase
          .from('anmeldungen')
          .update({
            kind_vorname: eintrag.kind.vorname,
            kind_nachname: eintrag.kind.nachname,
            kind_klasse: klasse,
            weitere_kinder_json: neueWeitere,
          })
          .eq('id', anmeldung.id);
        if (error) throw error;
        // Junction-Tabelle anmeldungs_kinder synchronisieren
        await fetch('/api/helfer/anmeldungen-bereinigen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ syncAnmeldungIds: [anmeldung.id] }),
        });
        toast.success(`${eintrag.kind.vorname} ${eintrag.kind.nachname} ist jetzt Hauptkind der Anmeldung.`);
      } else {
        const bisherigeWeitere: WeiteresKind[] = Array.isArray(anmeldung.weitere_kinder_json)
          ? (anmeldung.weitere_kinder_json as WeiteresKind[])
          : [];
        const istBereitsDrin = bisherigeWeitere.some(
          (w) => normalizeName(w?.vorname) === normalizeName(eintrag.kind.vorname)
            && normalizeName(w?.nachname) === normalizeName(eintrag.kind.nachname),
        );
        if (istBereitsDrin) {
          toast.info('Kind ist bereits als Geschwister erfasst.');
          onSuccess();
          return;
        }
        const neueWeitere = [
          ...bisherigeWeitere,
          { vorname: eintrag.kind.vorname, nachname: eintrag.kind.nachname, klasse },
        ];
        const { error } = await supabase
          .from('anmeldungen')
          .update({ weitere_kinder_json: neueWeitere })
          .eq('id', anmeldung.id);
        if (error) throw error;
        // Junction-Tabelle anmeldungs_kinder synchronisieren
        await fetch('/api/helfer/anmeldungen-bereinigen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ syncAnmeldungIds: [anmeldung.id] }),
        });
        toast.success(`${eintrag.kind.vorname} ${eintrag.kind.nachname} als Geschwister hinzugefügt.`);
      }
      onSuccess();
    } catch (e: any) {
      toast.error(e?.message || 'Verknüpfung fehlgeschlagen');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">
            {eintrag.kind.vorname} {eintrag.kind.nachname} (Klasse {eintrag.kind.klasse}) verknüpfen
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
        <div className="px-5 py-3 border-b border-slate-100 space-y-2">
          <p className="text-sm text-slate-600">
            Standardmäßig nur Anmeldungen mit Nachname <strong>{eintrag.kind.nachname}</strong>.
            <strong> Hauptkind</strong> ersetzt das aktuelle Hauptkind (das alte rutscht zu den Geschwistern).
            <strong> Geschwister</strong> fügt das Kind nur zusätzlich hinzu.
          </p>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Andere Anmeldung suchen (Name, E-Mail)…"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-orange-300"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {sichtbar.length} sichtbar
              {!suche.trim() && !zeigeAlle && andereTreffer.length > 0 && (
                <> · {andereTreffer.length} mit anderem Nachnamen ausgeblendet</>
              )}
            </span>
            {!suche.trim() && andereTreffer.length > 0 && (
              <button
                onClick={() => setZeigeAlle((v) => !v)}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {zeigeAlle ? 'Nur Nachname-Treffer' : 'Alle Anmeldungen anzeigen'}
              </button>
            )}
          </div>
        </div>
        <div className="overflow-auto px-5 py-3 space-y-2 flex-1">
          {allesGefiltert.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Keine passende Anmeldung gefunden.</p>
          ) : sichtbar.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Keine Anmeldung mit Nachname <strong>{eintrag.kind.nachname}</strong>.
              Klicke „Alle Anmeldungen anzeigen", falls der Nachname in der Anmeldung anders geschrieben wurde.
            </p>
          ) : (
            sichtbar.map((row) => {
              const { a, eintraege, nachnameMatch } = row;
              const hauptLoading = loadingId === a.id + 'hauptkind';
              const geschwLoading = loadingId === a.id + 'geschwister';
              return (
                <div
                  key={a.id}
                  className={`rounded-md border p-3 ${nachnameMatch ? 'border-orange-300 bg-orange-50/50' : 'border-slate-200 bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 truncate">
                        Familie {a.kind_nachname}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{a.eltern_email || '—'}</div>
                      <ul className="text-xs text-slate-600 mt-1 space-y-0.5">
                        {eintraege.map((e, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            {e.matched ? (
                              <CheckCircle2 size={11} className="text-green-500 shrink-0" />
                            ) : (
                              <AlertCircle size={11} className="text-amber-500 shrink-0" />
                            )}
                            <span className={e.matched ? '' : 'font-medium'}>
                              {e.vorname} {e.nachname} ({e.klasse || '–'})
                              {e.istHaupt && <span className="text-slate-400"> · Hauptkind</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => verknuepfen(a, 'hauptkind')}
                      disabled={loadingId !== null}
                      className="text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      {hauptLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                      Als Hauptkind setzen
                    </button>
                    <button
                      onClick={() => verknuepfen(a, 'geschwister')}
                      disabled={loadingId !== null}
                      className="text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      {geschwLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                      Als Geschwister hinzufügen
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
