'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, X, AlertTriangle, CheckCircle2, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatZeitfenster } from '@/lib/helfer-utils';

interface AufgabeMitZuteilungen {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
  zeitfenster: string;
  zuteilungen: Zuteilung[];
}

interface Zuteilung {
  id: string;
  kind_id: string | null;
  externer_helfer_id: string | null;
  zeitfenster: string;
  manuell: boolean;
  via_springer: boolean;
  zugewiesen_am: string;
  kind?: { id: string; vorname: string; nachname: string; klasse?: string } | null;
  externe_helfer?: { id: string; name: string } | null;
}

interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  klasse?: string;
}

interface NichtZugewiesenerWunsch {
  id: string;
  kind_id: string | null;
  aufgabe_id: string | null;
  aufgabe_titel: string;
  zeitfenster: string | null;
  prioritaet: number | null;
  ist_springer: boolean;
  kind?: { vorname: string; nachname: string; klasse?: string } | null;
  zugewiesen_zu?: string | null; // Aufgabe-Titel, falls anders zugeteilt
}

interface Phase3PruefenProps {
  eventId: string;
  onRefresh: () => void;
}

interface Wunsch {
  aufgabe_titel: string | null;
  ist_springer: boolean;
  zeitfenster: string | null;
}

export function Phase3Pruefen({ eventId, onRefresh }: Phase3PruefenProps) {
  const [aufgaben, setAufgaben] = useState<AufgabeMitZuteilungen[]>([]);
  const [nichtZugewiesen, setNichtZugewiesen] = useState<NichtZugewiesenerWunsch[]>([]);
  const [wuenscheByKind, setWuenscheByKind] = useState<Record<string, Wunsch[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<string | null>(null); // aufgabe_id
  const [addMode, setAddMode] = useState<'wuensche' | 'kind' | 'extern'>('wuensche');
  const [suchtext, setSuchtext] = useState('');
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [kinderLoading, setKinderLoading] = useState(false);
  const [nichtZugewiesenCollapsed, setNichtZugewiesenCollapsed] = useState(true);
  const [externerName, setExternerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pickerRueckmeldungId, setPickerRueckmeldungId] = useState<string | null>(null);
  const [pickerAufgabeId, setPickerAufgabeId] = useState<string>('');

  const ladeDaten = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    const [aufgabenRes, zuteilungenRes, rueckmeldungenRes] = await Promise.all([
      supabase
        .from('helferaufgaben')
        .select('id, titel, beschreibung, bedarf, zeitfenster')
        .eq('event_id', eventId)
        .order('titel'),
      // Zuteilungen ohne Join laden — vermeidet PostgREST-INNER-JOIN-Problem
      supabase
        .from('helfer_zuteilungen')
        .select('id, aufgabe_id, kind_id, externer_helfer_id, zeitfenster, manuell, via_springer, zugewiesen_am')
        .eq('event_id', eventId),
      supabase
        .from('helfer_rueckmeldungen')
        .select(`
          id, kind_id, aufgabe_id, zeitfenster, prioritaet, ist_springer,
          kind:kinder(vorname, nachname, klasse),
          aufgabe:helferaufgaben(titel)
        `)
        .eq('event_id', eventId),
    ]);

    if (aufgabenRes.error || zuteilungenRes.error) {
      toast.error('Fehler beim Laden');
      setIsLoading(false);
      return;
    }

    // Kinder und externe Helfer separat laden und client-seitig joinen
    const rawZuteilungen = zuteilungenRes.data || [];
    const kindIds = [...new Set(rawZuteilungen.map(z => z.kind_id).filter(Boolean))];
    const externIds = [...new Set(rawZuteilungen.map(z => z.externer_helfer_id).filter(Boolean))];

    const [kinderRes, externRes] = await Promise.all([
      kindIds.length > 0
        ? supabase.from('kinder').select('id, vorname, nachname, klasse').in('id', kindIds)
        : Promise.resolve({ data: [] }),
      externIds.length > 0
        ? supabase.from('externe_helfer').select('id, name').in('id', externIds)
        : Promise.resolve({ data: [] }),
    ]);

    const kinderById = new Map((kinderRes.data || []).map(k => [k.id, k]));
    const externById = new Map((externRes.data || []).map(e => [e.id, e]));

    const zuteilungen = rawZuteilungen.map(z => ({
      ...z,
      kind: z.kind_id ? kinderById.get(z.kind_id) || null : null,
      externe_helfer: z.externer_helfer_id ? externById.get(z.externer_helfer_id) || null : null,
    }));

    const aufgabenMitZ = (aufgabenRes.data || []).map(a => ({
      ...a,
      zuteilungen: zuteilungen.filter(z => z.aufgabe_id === a.id) as Zuteilung[],
    }));

    // Zuteilungen pro Kind: kind_id → Set<aufgabe_id>
    const zuteilungenByKind = new Map<string, Set<string>>();
    // Aufgaben-Titel-Map für Anzeige
    const aufgabenTitelById = new Map((aufgabenRes.data || []).map(a => [a.id, a.titel]));
    for (const z of zuteilungen) {
      if (!z.kind_id) continue;
      if (!zuteilungenByKind.has(z.kind_id)) zuteilungenByKind.set(z.kind_id, new Set());
      zuteilungenByKind.get(z.kind_id)!.add(z.aufgabe_id);
    }

    // Rückmeldungen pro Kind gruppieren, um zu prüfen ob IRGENDEIN Wunsch erfüllt wurde
    const rmByKind = new Map<string, any[]>();
    for (const r of (rueckmeldungenRes.data || [])) {
      if (!r.kind_id) continue;
      if (!rmByKind.has(r.kind_id)) rmByKind.set(r.kind_id, []);
      rmByKind.get(r.kind_id)!.push(r);
    }

    // Zufriedene Kinder: mindestens ein Wunsch wurde erfüllt
    const zufriedeneKinder = new Set<string>();
    for (const [kindId, rms] of rmByKind) {
      const assigned = zuteilungenByKind.get(kindId);
      if (!assigned || assigned.size === 0) continue;
      const anyFulfilled = rms.some(r =>
        r.ist_springer || (r.aufgabe_id && assigned.has(r.aufgabe_id))
      );
      if (anyFulfilled) zufriedeneKinder.add(kindId);
    }

    // Nicht erfüllte Wünsche: Kinder ohne Zuteilung ODER mit anderer Aufgabe als gewünscht
    const nichtZugew = (rueckmeldungenRes.data || [])
      .filter(r => r.kind_id && !zufriedeneKinder.has(r.kind_id))
      .map(r => {
        const assigned = zuteilungenByKind.get(r.kind_id);
        const zugewiesenAufgabeIds = assigned ? [...assigned] : [];
        const zugewiesenTitel = zugewiesenAufgabeIds.map(id => aufgabenTitelById.get(id)).filter(Boolean).join(', ');
        return {
          id: r.id,
          kind_id: r.kind_id,
          aufgabe_id: r.aufgabe_id,
          aufgabe_titel: (Array.isArray(r.aufgabe) ? r.aufgabe[0] : r.aufgabe)?.titel || '—',
          zeitfenster: r.zeitfenster,
          prioritaet: r.prioritaet,
          ist_springer: r.ist_springer,
          kind: Array.isArray(r.kind) ? r.kind[0] : r.kind,
          zugewiesen_zu: zugewiesenTitel || null,
        };
      });

    // Wünsche pro Kind aufbauen
    const byKind: Record<string, Wunsch[]> = {};
    for (const r of (rueckmeldungenRes.data || []) as any[]) {
      if (!r.kind_id) continue;
      const aufgabe_titel = (Array.isArray(r.aufgabe) ? r.aufgabe[0] : r.aufgabe)?.titel || null;
      if (!byKind[r.kind_id]) byKind[r.kind_id] = [];
      byKind[r.kind_id].push({ aufgabe_titel, ist_springer: r.ist_springer, zeitfenster: r.zeitfenster });
    }
    setWuenscheByKind(byKind);

    setAufgaben(aufgabenMitZ);
    setNichtZugewiesen(nichtZugew);
    setIsLoading(false);
  }, [eventId]);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  const handleRemoveZuteilung = async (zuteilungId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('helfer_zuteilungen')
      .delete()
      .eq('id', zuteilungId);

    if (error) {
      toast.error('Fehler beim Entfernen');
    } else {
      toast.success('Zuteilung entfernt');
      ladeDaten();
      onRefresh();
    }
  };

  const sucheKinder = useCallback(async (text: string) => {
    if (!text || text.length < 2) { setKinder([]); return; }
    setKinderLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('kinder')
      .select('id, vorname, nachname, klasse')
      .eq('event_id', eventId)
      .or(`vorname.ilike.%${text}%,nachname.ilike.%${text}%`)
      .limit(20);
    setKinder(data || []);
    setKinderLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => sucheKinder(suchtext), 300);
    return () => clearTimeout(timer);
  }, [suchtext, sucheKinder]);

  const handleAddKind = async (aufgabeId: string, kind: Kind) => {
    const aufgabe = aufgaben.find(a => a.id === aufgabeId);
    if (!aufgabe) return;

    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('helfer_zuteilungen')
      .insert({
        kind_id: kind.id,
        aufgabe_id: aufgabeId,
        event_id: eventId,
        zeitfenster: aufgabe.zeitfenster,
        manuell: true,
        via_springer: false,
      });

    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else {
      toast.success(`${kind.vorname} ${kind.nachname} hinzugefügt`);
      setAddingTo(null);
      setSuchtext('');
      setKinder([]);
      ladeDaten();
      onRefresh();
    }
    setIsSaving(false);
  };

  const handleAddExtern = async (aufgabeId: string) => {
    if (!externerName.trim()) return;
    const aufgabe = aufgaben.find(a => a.id === aufgabeId);
    if (!aufgabe) return;

    setIsSaving(true);
    const supabase = createClient();

    // Externe_helfer erstellen oder finden
    const { data: existing } = await supabase
      .from('externe_helfer')
      .select('id')
      .ilike('name', externerName.trim())
      .limit(1);

    let externerId: string;

    if (existing && existing.length > 0) {
      externerId = existing[0].id;
    } else {
      const { data: newHelfer, error: insertErr } = await supabase
        .from('externe_helfer')
        .insert({ name: externerName.trim() })
        .select('id')
        .single();

      if (insertErr || !newHelfer) {
        toast.error('Fehler beim Erstellen des externen Helfers');
        setIsSaving(false);
        return;
      }
      externerId = newHelfer.id;
    }

    const { error } = await supabase
      .from('helfer_zuteilungen')
      .insert({
        externer_helfer_id: externerId,
        aufgabe_id: aufgabeId,
        event_id: eventId,
        zeitfenster: aufgabe.zeitfenster,
        manuell: true,
        via_springer: false,
      });

    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else {
      toast.success(`${externerName} hinzugefügt`);
      setAddingTo(null);
      setExternerName('');
      ladeDaten();
      onRefresh();
    }
    setIsSaving(false);
  };

  const handleManuellZuweisen = async (r: NichtZugewiesenerWunsch, aufgabeIdOverride?: string) => {
    const targetAufgabeId = aufgabeIdOverride || r.aufgabe_id;
    if (!r.kind_id || !targetAufgabeId) return;
    const aufgabe = aufgaben.find(a => a.id === targetAufgabeId);
    if (!aufgabe) return;

    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('helfer_zuteilungen').insert({
      kind_id: r.kind_id,
      aufgabe_id: targetAufgabeId,
      event_id: eventId,
      zeitfenster: aufgabe.zeitfenster,
      manuell: true,
      via_springer: r.ist_springer,
    });

    if (error) {
      toast.error('Fehler beim Zuteilen');
    } else {
      const name = r.kind ? `${r.kind.vorname} ${r.kind.nachname}` : 'Kind';
      toast.success(`${name} → ${aufgabe.titel}`);
      setPickerRueckmeldungId(null);
      setPickerAufgabeId('');
      ladeDaten();
      onRefresh();
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" size={24} /></div>;
  }

  if (aufgaben.length === 0) {
    return <div className="text-center py-10 text-slate-400 text-sm">Keine Aufgaben gefunden.</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Überprüfe die Zuteilungen pro Aufgabe. Rote Karten haben Lücken (Bedarf nicht gedeckt).
      </p>

      {/* Unerfüllte Wünsche */}
      {nichtZugewiesen.length > 0 && (
        <div className="rounded-xl border border-orange-300 bg-orange-50 p-4">
          <button
            onClick={() => setNichtZugewiesenCollapsed(v => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <AlertTriangle size={18} className="text-orange-500 shrink-0" />
            <span className="font-semibold text-orange-800 text-sm leading-tight flex-1">
              {nichtZugewiesen.length} {nichtZugewiesen.length === 1 ? 'Wunsch' : 'Wünsche'} nicht erfüllt
            </span>
            <ChevronDown
              size={16}
              className={`text-orange-500 transition-transform ${nichtZugewiesenCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
          {!nichtZugewiesenCollapsed && (<>
          <p className="text-xs text-orange-700 mt-3 mb-3">
            Diese Kinder haben entweder keine Zuteilung erhalten oder wurden einer anderen als der gewünschten Aufgabe zugeteilt. Bitte manuell entscheiden.
          </p>
          <div className="space-y-2">
            {nichtZugewiesen.map(r => {
              const name = r.kind
                ? `${r.kind.nachname}, ${r.kind.vorname}`
                : 'Unbekannt';
              const klasse = r.kind?.klasse;

              const isPickerOpen = pickerRueckmeldungId === r.id;

              return (
                <div key={r.id} className="bg-white rounded-lg border border-orange-200 px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div>
                        <span className="font-medium text-sm text-slate-800">{name}</span>
                        {klasse && <span className="text-xs text-slate-400 ml-1.5">({klasse})</span>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          Wunsch: {r.ist_springer ? 'Springer' : r.aufgabe_titel}
                        </span>
                        {r.zeitfenster && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {formatZeitfenster(r.zeitfenster as any)}
                          </span>
                        )}
                        {r.zugewiesen_zu ? (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            → {r.zugewiesen_zu}
                          </span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            nicht zugeteilt
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (isPickerOpen) {
                          setPickerRueckmeldungId(null);
                        } else {
                          setPickerRueckmeldungId(r.id);
                          setPickerAufgabeId(r.aufgabe_id || aufgaben[0]?.id || '');
                        }
                      }}
                      className="shrink-0 text-xs font-medium text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Manuell zuteilen
                    </button>
                  </div>

                  {/* Aufgaben-Picker */}
                  {isPickerOpen && (
                    <div className="flex items-center gap-2 pt-1 border-t border-orange-100">
                      <select
                        value={pickerAufgabeId}
                        onChange={e => setPickerAufgabeId(e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-orange-300"
                      >
                        {aufgaben.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.titel} ({formatZeitfenster(a.zeitfenster as any)})
                            {a.id === r.aufgabe_id ? ' ★' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleManuellZuweisen(r, pickerAufgabeId)}
                        disabled={!pickerAufgabeId || isSaving}
                        className="text-xs font-medium text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 size={12} className="animate-spin inline" /> : 'Zuteilen'}
                      </button>
                      <button
                        onClick={() => setPickerRueckmeldungId(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </>)}
        </div>
      )}

      {aufgaben.map(aufgabe => {
        const deckungsgrad = aufgabe.zuteilungen.length;
        const lücke = aufgabe.bedarf - deckungsgrad;
        const isOk = lücke <= 0;
        const wuenscheForAufgabe = nichtZugewiesen.filter(r => r.aufgabe_id === aufgabe.id);

        return (
          <div
            key={aufgabe.id}
            className={`rounded-xl border p-4 ${isOk ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
          >
            {/* Aufgabe Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  {isOk
                    ? <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                    : <AlertTriangle size={20} className="text-red-500 shrink-0" />
                  }
                  <span className={`font-semibold text-base leading-tight ${isOk ? 'text-green-800' : 'text-red-800'}`}>{aufgabe.titel}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 ml-6">
                  {formatZeitfenster(aufgabe.zeitfenster as any)} · {deckungsgrad}/{aufgabe.bedarf} Helfer
                  {!isOk && <span className="text-red-600 font-medium"> · {lücke} Plätze offen</span>}
                </div>
              </div>
              <button
                onClick={() => {
                  if (addingTo === aufgabe.id) {
                    setAddingTo(null);
                  } else {
                    setAddingTo(aufgabe.id);
                    setAddMode(wuenscheForAufgabe.length > 0 ? 'wuensche' : 'kind');
                  }
                }}
                className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition-colors"
              >
                <Plus size={13} />
                Hinzufügen
              </button>
            </div>

            {/* Helfer-Liste */}
            {aufgabe.zuteilungen.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {aufgabe.zuteilungen.map(z => {
                  const name = z.kind
                    ? `${z.kind.vorname} ${z.kind.nachname}`
                    : z.externe_helfer?.name || 'Ext.';
                  const klasse = z.kind?.klasse;

                  const wuensche = z.kind_id ? (wuenscheByKind[z.kind_id] || []) : [];
                  const tooltipLines: string[] = [];
                  if (wuensche.length === 0 && !z.externe_helfer) {
                    tooltipLines.push('Kein Wunsch erfasst');
                  } else {
                    for (const w of wuensche) {
                      if (w.ist_springer) {
                        tooltipLines.push(`Springer (${formatZeitfenster(w.zeitfenster as any)})`);
                      } else if (w.aufgabe_titel) {
                        const istDieseAufgabe = w.aufgabe_titel === aufgabe.titel;
                        tooltipLines.push(istDieseAufgabe ? `Wunsch: ${w.aufgabe_titel} ✓` : `Wunsch: ${w.aufgabe_titel}`);
                      }
                    }
                  }
                  const tooltip = tooltipLines.join(' · ');

                  return (
                    <div key={z.id} className="relative group/chip">
                      <div
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm bg-white border ${z.manuell ? 'border-orange-200' : 'border-slate-200'}`}
                      >
                        <span className="font-medium">{name}</span>
                        {klasse && <span className="text-slate-400 text-xs">({klasse})</span>}
                        {z.via_springer && <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-1.5 py-0.5 rounded">S</span>}
                        {z.manuell && <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-1.5 py-0.5 rounded">M</span>}
                        <button
                          onClick={() => handleRemoveZuteilung(z.id)}
                          className="ml-0.5 text-slate-300 hover:text-red-500 transition-colors"
                          title="Entfernen"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      {tooltip && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap pointer-events-none opacity-0 group-hover/chip:opacity-100 transition-opacity z-20 shadow-lg">
                          {tooltip}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic mb-3">Keine Helfer zugeteilt</p>
            )}

            {/* Hinzufügen-Panel */}
            {addingTo === aufgabe.id && (
              <div className="bg-white rounded-lg border p-3 mt-2 space-y-3">
                {/* Tab-Auswahl */}
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                  {wuenscheForAufgabe.length > 0 && (
                    <button
                      onClick={() => setAddMode('wuensche')}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${addMode === 'wuensche' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                    >
                      Wünsche ({wuenscheForAufgabe.length})
                    </button>
                  )}
                  <button
                    onClick={() => setAddMode('kind')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${addMode === 'kind' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                  >
                    Kind suchen
                  </button>
                  <button
                    onClick={() => setAddMode('extern')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${addMode === 'extern' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                  >
                    Extern
                  </button>
                </div>

                {addMode === 'wuensche' ? (
                  <div className="space-y-1">
                    {wuenscheForAufgabe.length === 0 ? (
                      <p className="text-xs text-slate-400">Keine unerfüllten Wünsche für diese Aufgabe.</p>
                    ) : (
                      wuenscheForAufgabe.map(r => {
                        const name = r.kind
                          ? `${r.kind.nachname}, ${r.kind.vorname}`
                          : 'Unbekannt';
                        return (
                          <button
                            key={r.id}
                            onClick={() => handleManuellZuweisen(r)}
                            disabled={isSaving || !r.kind_id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 border border-orange-100 rounded-lg flex items-center justify-between transition-colors disabled:opacity-50"
                          >
                            <span className="font-medium">{name}</span>
                            {r.kind?.klasse && <span className="text-xs text-slate-400">{r.kind.klasse}</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : addMode === 'kind' ? (
                  <div>
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Name eingeben..."
                        value={suchtext}
                        onChange={e => setSuchtext(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                    {kinderLoading && (
                      <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" /> Suche...
                      </div>
                    )}
                    {kinder.length > 0 && (
                      <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                        {kinder.map(k => (
                          <button
                            key={k.id}
                            onClick={() => handleAddKind(aufgabe.id, k)}
                            disabled={isSaving}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span>{k.nachname}, {k.vorname}</span>
                            {k.klasse && <span className="text-xs text-slate-400">{k.klasse}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Name des externen Helfers"
                      value={externerName}
                      onChange={e => setExternerName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                      onKeyDown={e => e.key === 'Enter' && handleAddExtern(aufgabe.id)}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddExtern(aufgabe.id)}
                      disabled={!externerName.trim() || isSaving}
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    </Button>
                  </div>
                )}

                <button
                  onClick={() => { setAddingTo(null); setSuchtext(''); setKinder([]); setExternerName(''); }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>
        );
      })}

      <p className="text-xs text-slate-400 flex items-center gap-2">
        <span className="bg-purple-100 text-purple-700 font-semibold px-1.5 py-0.5 rounded">S</span> = via Springer
        <span className="bg-orange-100 text-orange-700 font-semibold px-1.5 py-0.5 rounded">M</span> = manuell hinzugefügt
      </p>
    </div>
  );
}
