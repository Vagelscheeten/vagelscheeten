'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Trash2, Edit2, Save, X, Crown,
  ChevronDown, ChevronRight, Calendar, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Event = {
  id: string;
  name: string;
  jahr: number;
  ist_aktiv: boolean;
};

type KindInfo = {
  vorname: string;
  nachname: string;
  geschlecht: string;
  klasse: string | null;
};

type ErgebnisRaw = {
  kind_id: string;
  spielgruppe_id: string;
  spiel_id: string;
  wert_numeric: number;
  kind: KindInfo | null;
  spiel: { wertungstyp: string } | null;
};

type Koenigspaar = {
  klasse: string;
  koenig: { name: string; punkte: number } | null;
  koenigin: { name: string; punkte: number } | null;
};

type HistorieEintrag = {
  id: string;
  jahr: number;
  klasse: string;
  koenig: string | null;
  koenigin: string | null;
  anmerkung: string | null;
};

// ─── Königspaar-Berechnung ────────────────────────────────────────────────────
// Identische Logik wie ladeGesamtauswertung in app/admin/auswertung/page.tsx:
//
// 1. berechneRaenge: Gruppierung nach spiel_id + spielgruppe_id
//    Sortierung: nur ZEIT_MIN_STRAFE aufsteigend, alle anderen absteigend.
//    Gleichstand → gleicher Rang (letzterRang / letzterWert-Logik).
//
// 2. Punkte = 11 − rang für rang 1–10, sonst 0.
//
// 3. Gesamtpunkte pro Kind = Summe aller Rang-Punkte über alle Spiele.
//
// 4. Pro Klasse: Junge mit höchsten Gesamtpunkten = König,
//    Mädchen mit höchsten Gesamtpunkten = Königin.

function calculateKoenigspaare(ergebnisse: ErgebnisRaw[]): Koenigspaar[] {
  // Schritt 1: Rang-Berechnung pro Spiel + Spielgruppe (wie berechneRaenge)
  const byGroup = new Map<string, ErgebnisRaw[]>();
  for (const e of ergebnisse) {
    const key = `${e.spiel_id}_${e.spielgruppe_id}`;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(e);
  }

  // kind_id → akkumulierte Rangpunkte
  const kindPoints = new Map<string, { info: KindInfo; punkte: number }>();

  for (const [, gruppe] of byGroup) {
    const wertungstyp = gruppe[0]?.spiel?.wertungstyp ?? '';

    // Nur ZEIT_MIN_STRAFE ist aufsteigend — alle anderen absteigend
    // (identisch mit berechneRaenge in auswertung/page.tsx, Zeile 1017-1024)
    const sorted = [...gruppe].sort((a, b) =>
      wertungstyp === 'ZEIT_MIN_STRAFE'
        ? a.wert_numeric - b.wert_numeric
        : b.wert_numeric - a.wert_numeric
    );

    // Gleichstand: gleicher Rang für gleiche Werte (letzterRang/letzterWert-Logik)
    let letzterRang = 1;
    let letzterWert = sorted.length > 0 ? sorted[0].wert_numeric : 0;

    sorted.forEach((e, index) => {
      if (!e.kind) return;

      if (index > 0) {
        const anderesErgebnis =
          wertungstyp === 'ZEIT_MIN_STRAFE'
            ? e.wert_numeric > letzterWert   // größer = schlechter bei Zeit
            : e.wert_numeric < letzterWert;  // kleiner = schlechter sonst
        if (anderesErgebnis) {
          letzterRang = index + 1;
          letzterWert = e.wert_numeric;
        }
      }

      const pts = letzterRang <= 10 ? (11 - letzterRang) : 0;
      const prev = kindPoints.get(e.kind_id) ?? { info: e.kind, punkte: 0 };
      kindPoints.set(e.kind_id, { info: e.kind, punkte: prev.punkte + pts });
    });
  }

  // Schritt 2: Pro Klasse besten Jungen (König) und bestes Mädchen (Königin) finden
  const byKlasse = new Map<string, {
    koenig: { name: string; punkte: number } | null;
    koenigin: { name: string; punkte: number } | null;
  }>();

  for (const [, data] of kindPoints) {
    if (!data.info.klasse) continue;
    const klasse = data.info.klasse;
    if (!byKlasse.has(klasse)) byKlasse.set(klasse, { koenig: null, koenigin: null });
    const cur = byKlasse.get(klasse)!;
    const name = `${data.info.vorname} ${data.info.nachname}`;
    const isMale = data.info.geschlecht === 'Junge' || data.info.geschlecht === 'männlich';
    const isFemale = data.info.geschlecht === 'Mädchen' || data.info.geschlecht === 'weiblich';

    if (isMale && (!cur.koenig || data.punkte > cur.koenig.punkte))
      cur.koenig = { name, punkte: data.punkte };
    if (isFemale && (!cur.koenigin || data.punkte > cur.koenigin.punkte))
      cur.koenigin = { name, punkte: data.punkte };
  }

  return [...byKlasse.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'de'))
    .map(([klasse, pair]) => ({ klasse, ...pair }));
}

// ─── Komponente ───────────────────────────────────────────────────────────────

export default function HistorieAdmin() {
  // Auto-Bereich
  const [events, setEvents] = useState<Event[]>([]);
  const [ergebnisseByEvent, setErgebnisseByEvent] = useState<Record<string, ErgebnisRaw[]>>({});
  const [loadingEvent, setLoadingEvent] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Manueller Bereich
  const [eintraege, setEintraege] = useState<HistorieEintrag[]>([]);
  const [loadingManual, setLoadingManual] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newEintrag, setNewEintrag] = useState({ jahr: new Date().getFullYear(), klasse: '', koenig: '', koenigin: '', anmerkung: '' });

  const supabase = createClient();

  useEffect(() => {
    loadEvents();
    loadManual();
  }, []);

  // ── Events laden ──────────────────────────────────────────────────────────

  const loadEvents = async () => {
    setLoadingEvents(true);
    const { data } = await supabase.from('events').select('*').order('jahr', { ascending: false });
    if (data) {
      setEvents(data);
      // Neuestes Event direkt aufklappen
      if (data.length > 0) {
        const first = data[0];
        setExpandedEvents(new Set([first.id]));
        loadErgebnisseForEvent(first.id);
      }
    }
    setLoadingEvents(false);
  };

  const loadErgebnisseForEvent = async (eventId: string) => {
    if (ergebnisseByEvent[eventId] !== undefined) return;
    setLoadingEvent(eventId);
    const { data } = await supabase
      .from('ergebnisse')
      .select('kind_id, spielgruppe_id, spiel_id, wert_numeric, kind:kinder(vorname, nachname, geschlecht, klasse), spiel:spiele(wertungstyp)')
      .eq('event_id', eventId);
    setErgebnisseByEvent(prev => ({ ...prev, [eventId]: (data ?? []) as unknown as ErgebnisRaw[] }));
    setLoadingEvent(null);
  };

  const toggleEvent = (eventId: string) => {
    const next = new Set(expandedEvents);
    if (next.has(eventId)) {
      next.delete(eventId);
    } else {
      next.add(eventId);
      loadErgebnisseForEvent(eventId);
    }
    setExpandedEvents(next);
  };

  // ── Manuelle Einträge ─────────────────────────────────────────────────────

  const loadManual = async () => {
    setLoadingManual(true);
    const { data } = await supabase
      .from('historie_eintraege')
      .select('*')
      .order('jahr', { ascending: false })
      .order('klasse');
    if (data) setEintraege(data);
    setLoadingManual(false);
  };

  const handleCreate = async () => {
    if (!newEintrag.klasse.trim()) return;
    const { error } = await supabase.from('historie_eintraege').insert({
      ...newEintrag,
      koenig: newEintrag.koenig || null,
      koenigin: newEintrag.koenigin || null,
      anmerkung: newEintrag.anmerkung || null,
    });
    if (error) { toast.error('Fehler: ' + error.message); return; }
    setShowNew(false);
    setNewEintrag({ jahr: new Date().getFullYear(), klasse: '', koenig: '', koenigin: '', anmerkung: '' });
    loadManual();
    toast.success('Eintrag gespeichert');
  };

  const handleUpdate = async (eintrag: HistorieEintrag) => {
    const { error } = await supabase.from('historie_eintraege').update({
      jahr: eintrag.jahr, klasse: eintrag.klasse,
      koenig: eintrag.koenig, koenigin: eintrag.koenigin,
      anmerkung: eintrag.anmerkung,
    }).eq('id', eintrag.id);
    if (error) { toast.error('Fehler: ' + error.message); return; }
    setEditingId(null);
    loadManual();
    toast.success('Eintrag aktualisiert');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Diesen Eintrag wirklich löschen?')) return;
    await supabase.from('historie_eintraege').delete().eq('id', id);
    loadManual();
    toast.success('Eintrag gelöscht');
  };

  const manualYears = [...new Set(eintraege.map(e => e.jahr))].sort((a, b) => b - a);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Historie</h1>
        <p className="text-sm text-slate-500 mt-1">Königspaare vergangener Vagelscheeten-Events</p>
      </div>

      <Tabs defaultValue="auto">
        <TabsList className="mb-6">
          <TabsTrigger value="auto">Aus Events (automatisch)</TabsTrigger>
          <TabsTrigger value="manual">Historische Einträge</TabsTrigger>
        </TabsList>

        {/* ── Auto-Tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="auto">
          <p className="text-sm text-gray-500 mb-4">
            Die Königspaare werden automatisch aus den erfassten Spielergebnissen berechnet
            (bester Junge / bestes Mädchen pro Klasse nach Gesamtpunkten).
          </p>

          {loadingEvents ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Lade Events…
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <Crown className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Noch keine Events vorhanden.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(event => {
                const isExpanded = expandedEvents.has(event.id);
                const isLoading = loadingEvent === event.id;
                const ergebnisse = ergebnisseByEvent[event.id];
                const koenigspaare = ergebnisse ? calculateKoenigspaare(ergebnisse) : null;
                const hasData = koenigspaare && koenigspaare.length > 0;

                return (
                  <Card
                    key={event.id}
                    className={`overflow-hidden transition-shadow ${event.ist_aktiv ? 'border-[#F2A03D]/40' : 'border-slate-100'}`}
                  >
                    {/* Event-Header (klickbar) */}
                    <button
                      className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      onClick={() => toggleEvent(event.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{event.name}</span>
                        {event.ist_aktiv && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#F2A03D]/15 text-[#F2A03D] rounded-full">
                            Aktiv
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
                        {ergebnisse && (
                          <span className="text-xs">
                            {hasData ? `${koenigspaare.length} Klasse${koenigspaare.length !== 1 ? 'n' : ''}` : 'Keine Ergebnisse'}
                          </span>
                        )}
                        {isLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : isExpanded
                            ? <ChevronDown className="w-4 h-4" />
                            : <ChevronRight className="w-4 h-4" />
                        }
                      </div>
                    </button>

                    {/* Aufgeklappter Inhalt */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/40">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-8 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Berechne…
                          </div>
                        ) : !hasData ? (
                          <p className="text-center py-8 text-slate-400 text-sm">
                            Noch keine Spielergebnisse für dieses Event erfasst.
                          </p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {koenigspaare!.map(pair => (
                              <div
                                key={pair.klasse}
                                className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm"
                              >
                                <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">
                                  Klasse {pair.klasse}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-start gap-2">
                                    <span className="text-yellow-500 mt-0.5 text-sm shrink-0">♚</span>
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-slate-800 leading-snug">
                                        {pair.koenig?.name ?? <span className="text-slate-300 font-normal">—</span>}
                                      </div>
                                      {pair.koenig && (
                                        <div className="text-xs text-slate-400">{pair.koenig.punkte} Pkt.</div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-pink-400 mt-0.5 text-sm shrink-0">♛</span>
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-slate-800 leading-snug">
                                        {pair.koenigin?.name ?? <span className="text-slate-300 font-normal">—</span>}
                                      </div>
                                      {pair.koenigin && (
                                        <div className="text-xs text-slate-400">{pair.koenigin.punkte} Pkt.</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Manueller Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="manual">
          <p className="text-sm text-gray-500 mb-4">
            Hier können Königspaare aus der Zeit vor dem digitalen System manuell erfasst werden.
          </p>

          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Neuer Eintrag
            </button>
          </div>

          {showNew && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="py-4">
                <h3 className="font-semibold mb-3">Neues Königspaar</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Jahr *</label>
                    <input type="number" value={newEintrag.jahr} onChange={(e) => setNewEintrag(p => ({ ...p, jahr: parseInt(e.target.value) || 0 }))} className="w-full p-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Klasse *</label>
                    <input value={newEintrag.klasse} onChange={(e) => setNewEintrag(p => ({ ...p, klasse: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" placeholder="z.B. 3a" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">König</label>
                    <input value={newEintrag.koenig} onChange={(e) => setNewEintrag(p => ({ ...p, koenig: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" placeholder="Name" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Königin</label>
                    <input value={newEintrag.koenigin} onChange={(e) => setNewEintrag(p => ({ ...p, koenigin: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" placeholder="Name" />
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <label className="block text-xs font-medium mb-1">Anmerkung</label>
                    <input value={newEintrag.anmerkung} onChange={(e) => setNewEintrag(p => ({ ...p, anmerkung: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" placeholder="Optionale Anmerkung" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleCreate} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm"><Save className="w-3.5 h-3.5 inline mr-1" /> Speichern</button>
                  <button onClick={() => setShowNew(false)} className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm"><X className="w-3.5 h-3.5 inline mr-1" /> Abbrechen</button>
                </div>
              </CardContent>
            </Card>
          )}

          {loadingManual ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Laden…
            </div>
          ) : manualYears.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <Crown className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Noch keine historischen Einträge vorhanden.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {manualYears.map(jahr => {
                const jahrEintraege = eintraege.filter(e => e.jahr === jahr);
                return (
                  <div key={jahr}>
                    <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      {jahr}
                      <span className="text-sm font-normal text-slate-400">({jahrEintraege.length} Klassen)</span>
                    </h2>
                    <div className="grid gap-2">
                      {jahrEintraege.map(eintrag => (
                        <Card key={eintrag.id}>
                          <CardContent className="py-3">
                            {editingId === eintrag.id ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <input type="number" value={eintrag.jahr} onChange={(e) => setEintraege(prev => prev.map(ei => ei.id === eintrag.id ? { ...ei, jahr: parseInt(e.target.value) || 0 } : ei))} className="p-2 border rounded-lg text-sm" />
                                <input value={eintrag.klasse} onChange={(e) => setEintraege(prev => prev.map(ei => ei.id === eintrag.id ? { ...ei, klasse: e.target.value } : ei))} className="p-2 border rounded-lg text-sm" />
                                <input value={eintrag.koenig || ''} onChange={(e) => setEintraege(prev => prev.map(ei => ei.id === eintrag.id ? { ...ei, koenig: e.target.value } : ei))} className="p-2 border rounded-lg text-sm" placeholder="König" />
                                <input value={eintrag.koenigin || ''} onChange={(e) => setEintraege(prev => prev.map(ei => ei.id === eintrag.id ? { ...ei, koenigin: e.target.value } : ei))} className="p-2 border rounded-lg text-sm" placeholder="Königin" />
                                <div className="col-span-2 md:col-span-4 flex gap-2">
                                  <button onClick={() => handleUpdate(eintrag)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm"><Save className="w-3.5 h-3.5 inline mr-1" /> Speichern</button>
                                  <button onClick={() => { setEditingId(null); loadManual(); }} className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm"><X className="w-3.5 h-3.5 inline mr-1" /> Abbrechen</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6 min-w-0">
                                  <span className="font-bold text-slate-700 w-12 shrink-0">{eintrag.klasse}</span>
                                  <div className="flex gap-6">
                                    <div className="flex items-center gap-1.5 text-sm">
                                      <span className="text-yellow-500">♚</span>
                                      <span className="text-slate-700">{eintrag.koenig || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm">
                                      <span className="text-pink-400">♛</span>
                                      <span className="text-slate-700">{eintrag.koenigin || '—'}</span>
                                    </div>
                                  </div>
                                  {eintrag.anmerkung && (
                                    <span className="text-slate-400 text-xs italic truncate">{eintrag.anmerkung}</span>
                                  )}
                                </div>
                                <div className="flex gap-0.5 shrink-0">
                                  <button onClick={() => setEditingId(eintrag.id)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDelete(eintrag.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
