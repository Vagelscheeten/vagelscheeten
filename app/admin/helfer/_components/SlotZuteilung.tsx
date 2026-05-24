'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, MapPin, Clock, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Zeitslot {
  id: string;
  aufgabe_id: string;
  titel: string;
  standort: string | null;
  start_zeit: string;
  end_zeit: string;
  bedarf: number;
  sortierung: number;
}

interface Aufgabe {
  id: string;
  titel: string;
}

interface Zuteilung {
  id: string;
  kind_id: string | null;
  externer_helfer_id: string | null;
  aufgabe_id: string;
  zeitslot_id: string | null;
}

interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  klasse: string | null;
}

interface ExternerHelfer {
  id: string;
  name: string;
}

interface Props {
  eventId: string;
}

function normalizeTime(t: string): string {
  return t.substring(0, 5);
}

function nameFor(z: Zuteilung, kinderMap: Map<string, Kind>, externeMap: Map<string, ExternerHelfer>): string {
  if (z.kind_id) {
    const k = kinderMap.get(z.kind_id);
    return k ? `${k.nachname}, ${k.vorname} (${k.klasse || '–'})` : 'Unbekanntes Kind';
  }
  if (z.externer_helfer_id) {
    const e = externeMap.get(z.externer_helfer_id);
    return e ? `${e.name} (extern)` : 'Externer Helfer';
  }
  return '?';
}

export function SlotZuteilung({ eventId }: Props) {
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [slots, setSlots] = useState<Zeitslot[]>([]);
  const [zuteilungen, setZuteilungen] = useState<Zuteilung[]>([]);
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [externe, setExterne] = useState<ExternerHelfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const supabase = createClient();

  const lade = useCallback(async () => {
    setLoading(true);
    const [slotsRes, kinderRes, externeRes] = await Promise.all([
      supabase
        .from('helferaufgabe_zeitslots')
        .select('id, aufgabe_id, titel, standort, start_zeit, end_zeit, bedarf, sortierung, aufgabe:helferaufgaben(id, titel)')
        .order('sortierung')
        .order('start_zeit'),
      supabase.from('kinder').select('id, vorname, nachname, klasse').eq('event_id', eventId),
      supabase.from('externe_helfer').select('id, name'),
    ]);

    const slotRows = (slotsRes.data || []) as any[];
    setSlots(slotRows.map((s) => ({
      id: s.id, aufgabe_id: s.aufgabe_id, titel: s.titel, standort: s.standort,
      start_zeit: s.start_zeit, end_zeit: s.end_zeit, bedarf: s.bedarf, sortierung: s.sortierung,
    })));
    const aufgabenMap = new Map<string, string>();
    for (const s of slotRows) {
      const a = Array.isArray(s.aufgabe) ? s.aufgabe[0] : s.aufgabe;
      if (a?.id && a.titel) aufgabenMap.set(a.id, a.titel);
    }
    setAufgaben(Array.from(aufgabenMap, ([id, titel]) => ({ id, titel })));

    setKinder((kinderRes.data || []) as Kind[]);
    setExterne((externeRes.data || []) as ExternerHelfer[]);

    // Zuteilungen nur für die betroffenen Aufgaben laden
    const aufgabeIds = Array.from(aufgabenMap.keys());
    if (aufgabeIds.length > 0) {
      const { data: zRows } = await supabase
        .from('helfer_zuteilungen')
        .select('id, kind_id, externer_helfer_id, aufgabe_id, zeitslot_id')
        .eq('event_id', eventId)
        .in('aufgabe_id', aufgabeIds);
      setZuteilungen((zRows || []) as Zuteilung[]);
    } else {
      setZuteilungen([]);
    }
    setLoading(false);
  }, [supabase, eventId]);

  useEffect(() => { lade(); }, [lade]);

  const kinderMap = useMemo(() => {
    const m = new Map<string, Kind>();
    for (const k of kinder) m.set(k.id, k);
    return m;
  }, [kinder]);
  const externeMap = useMemo(() => {
    const m = new Map<string, ExternerHelfer>();
    for (const e of externe) m.set(e.id, e);
    return m;
  }, [externe]);

  // Gruppen: pro Aufgabe → ihre Slots + zuordnete Helfer
  const gruppen = useMemo(() => {
    return aufgaben.map((a) => {
      const ihreSlots = slots.filter((s) => s.aufgabe_id === a.id);
      const ihreZuteilungen = zuteilungen.filter((z) => z.aufgabe_id === a.id);
      return { aufgabe: a, slots: ihreSlots, zuteilungen: ihreZuteilungen };
    });
  }, [aufgaben, slots, zuteilungen]);

  const setSlot = async (zuteilungId: string, neuerSlotId: string | null) => {
    setBusyId(zuteilungId);
    try {
      const { error } = await supabase
        .from('helfer_zuteilungen')
        .update({ zeitslot_id: neuerSlotId })
        .eq('id', zuteilungId);
      if (error) throw error;
      setZuteilungen((prev) => prev.map((z) => z.id === zuteilungId ? { ...z, zeitslot_id: neuerSlotId } : z));
    } catch (e: any) {
      toast.error(e?.message || 'Fehler beim Speichern');
    } finally {
      setBusyId(null);
    }
  };

  const autoVerteilen = async (aufgabeId: string) => {
    const ihreSlots = slots.filter((s) => s.aufgabe_id === aufgabeId).sort((a, b) => a.sortierung - b.sortierung);
    const ihreZuteilungen = zuteilungen.filter((z) => z.aufgabe_id === aufgabeId);
    const unverteilt = ihreZuteilungen.filter((z) => !z.zeitslot_id);
    if (unverteilt.length === 0) {
      toast.info('Alle Helfer sind bereits einem Slot zugeordnet.');
      return;
    }
    if (ihreSlots.length === 0) {
      toast.error('Keine Slots definiert.');
      return;
    }

    // Aktuelle Belegung pro Slot
    const belegung = new Map<string, number>();
    for (const z of ihreZuteilungen) {
      if (z.zeitslot_id) belegung.set(z.zeitslot_id, (belegung.get(z.zeitslot_id) || 0) + 1);
    }

    const zuweisungen: { zuteilungId: string; slotId: string }[] = [];
    for (const z of unverteilt) {
      // Wähle Slot mit niedrigster (belegung / bedarf)-Quote → gleichmäßig auffüllen, Bedarf respektieren
      let best: { slot: Zeitslot; score: number } | null = null;
      for (const s of ihreSlots) {
        const cur = belegung.get(s.id) || 0;
        const score = s.bedarf > 0 ? cur / s.bedarf : cur;
        if (best === null || score < best.score) best = { slot: s, score };
      }
      if (!best) break;
      zuweisungen.push({ zuteilungId: z.id, slotId: best.slot.id });
      belegung.set(best.slot.id, (belegung.get(best.slot.id) || 0) + 1);
    }

    setBusyId('auto-' + aufgabeId);
    try {
      for (const { zuteilungId, slotId } of zuweisungen) {
        const { error } = await supabase
          .from('helfer_zuteilungen')
          .update({ zeitslot_id: slotId })
          .eq('id', zuteilungId);
        if (error) throw error;
      }
      toast.success(`${zuweisungen.length} Helfer auf Slots verteilt.`);
      lade();
    } catch (e: any) {
      toast.error(e?.message || 'Fehler bei Auto-Verteilung');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={20} /></div>;
  }

  if (gruppen.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
        Aktuell hat keine Aufgabe Zeitslots definiert. Lege Slots unter{' '}
        <a href="/admin/helfer/aufgaben" className="text-blue-700 underline">Aufgaben verwalten</a>{' '}
        an, indem du in der Aktions-Spalte „Zeitslots verwalten" wählst.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
        Verteile die zugeteilten Helfer auf konkrete Zeitslots. Die Auto-Verteilung füllt unverteilte Helfer
        gleichmäßig auf die Slots auf (respektiert Bedarf pro Slot). Manuell anpassen ist jederzeit möglich.
      </div>

      {gruppen.map(({ aufgabe, slots: ihreSlots, zuteilungen: ihreZuteilungen }) => {
        if (ihreSlots.length === 0) return null;
        const unverteilt = ihreZuteilungen.filter((z) => !z.zeitslot_id);
        const auto = busyId === 'auto-' + aufgabe.id;
        return (
          <div key={aufgabe.id} className="rounded-xl border border-slate-200 bg-white">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-semibold text-slate-800">{aufgabe.titel}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {ihreSlots.length} Slot{ihreSlots.length !== 1 ? 's' : ''} · {ihreZuteilungen.length} Helfer gesamt · {unverteilt.length} unverteilt
                </p>
              </div>
              <button
                onClick={() => autoVerteilen(aufgabe.id)}
                disabled={auto || unverteilt.length === 0}
                className="text-sm inline-flex items-center gap-1.5 border border-slate-200 rounded-md px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                {auto ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Auto-Verteilung
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {ihreSlots.map((s) => {
                const belegt = ihreZuteilungen.filter((z) => z.zeitslot_id === s.id);
                const istVoll = belegt.length >= s.bedarf;
                const istLeer = belegt.length === 0;
                return (
                  <div key={s.id} className={`px-4 py-3 ${istLeer && s.bedarf > 0 ? 'bg-amber-50/30' : ''}`}>
                    <div className="flex items-start gap-2 flex-wrap mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-800 flex items-center gap-2 flex-wrap">
                          {s.titel}
                          {s.standort && (
                            <span className="text-xs text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                              <MapPin size={10} />{s.standort}
                            </span>
                          )}
                          <span className="text-xs text-slate-600 tabular-nums inline-flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" />
                            {normalizeTime(s.start_zeit)} – {normalizeTime(s.end_zeit)}
                          </span>
                          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            istVoll
                              ? 'bg-green-100 text-green-700'
                              : belegt.length > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                          }`}>
                            {belegt.length} / {s.bedarf}
                          </span>
                        </div>
                      </div>
                    </div>
                    {belegt.length > 0 && (
                      <ul className="space-y-1 mb-2">
                        {belegt.map((z) => (
                          <li key={z.id} className="flex items-center gap-2 text-sm">
                            <span className="text-slate-700 flex-1 truncate">{nameFor(z, kinderMap, externeMap)}</span>
                            <SlotDropdown
                              currentSlotId={z.zeitslot_id}
                              ihreSlots={ihreSlots}
                              disabled={busyId === z.id}
                              busy={busyId === z.id}
                              onChange={(neuerSlotId) => setSlot(z.id, neuerSlotId)}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}

              {unverteilt.length > 0 && (
                <div className="px-4 py-3 bg-amber-50/40">
                  <div className="font-medium text-sm text-amber-900 mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    Unverteilte Helfer ({unverteilt.length})
                  </div>
                  <ul className="space-y-1">
                    {unverteilt.map((z) => (
                      <li key={z.id} className="flex items-center gap-2 text-sm">
                        <span className="text-slate-700 flex-1 truncate">{nameFor(z, kinderMap, externeMap)}</span>
                        <SlotDropdown
                          currentSlotId={null}
                          ihreSlots={ihreSlots}
                          disabled={busyId === z.id}
                          busy={busyId === z.id}
                          onChange={(neuerSlotId) => setSlot(z.id, neuerSlotId)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {ihreZuteilungen.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-slate-400">
                  Noch keine Helfer für diese Aufgabe zugeteilt. Auto-Zuteilung in Schritt 2 ausführen.
                </div>
              )}

              {unverteilt.length === 0 && ihreZuteilungen.length > 0 && (
                <div className="px-4 py-2 text-xs text-green-700 inline-flex items-center gap-1.5">
                  <CheckCircle2 size={12} />
                  Alle Helfer sind einem Slot zugeordnet.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SlotDropdown({
  currentSlotId, ihreSlots, disabled, busy, onChange,
}: {
  currentSlotId: string | null;
  ihreSlots: Zeitslot[];
  disabled: boolean;
  busy: boolean;
  onChange: (slotId: string | null) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      {busy && <Loader2 size={11} className="animate-spin text-slate-400" />}
      <select
        value={currentSlotId || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white text-slate-700"
      >
        <option value="">— Slot wählen —</option>
        {ihreSlots.map((s) => (
          <option key={s.id} value={s.id}>
            {normalizeTime(s.start_zeit)}–{normalizeTime(s.end_zeit)}
            {s.standort ? ` · ${s.standort}` : ''}
            {' · '}{s.titel}
          </option>
        ))}
      </select>
    </div>
  );
}
