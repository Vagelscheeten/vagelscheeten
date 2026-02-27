'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Search, X, Edit2, Check, Plus } from 'lucide-react';
import { formatZeitfenster, formatDate } from '@/lib/helfer-utils';

interface Phase5NachpflegenProps {
  eventId: string;
  onRefresh: () => void;
}

interface Aufgabe {
  id: string;
  titel: string;
  zeitfenster: string;
}

interface Essensspende {
  id: string;
  titel: string;
}

interface KindMitZuteilung {
  kindId: string;
  name: string;
  klasse?: string;
  kindIdentifier: string;
  zuteilungen: {
    id: string;
    aufgabe_id: string;
    aufgabeTitel: string;
    zeitfenster: string;
    manuell: boolean;
    via_springer: boolean;
    zugewiesen_am: string;
  }[];
  essensspenden: {
    id: string;
    spende_id: string;
    spendeTitel: string;
  }[];
}

export function Phase5Nachpflegen({ eventId, onRefresh }: Phase5NachpflegenProps) {
  const [suchtext, setSuchtext] = useState('');
  const [ergebnisse, setErgebnisse] = useState<KindMitZuteilung[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [alleSpenden, setAlleSpenden] = useState<Essensspende[]>([]);

  const [editingZuteilungId, setEditingZuteilungId] = useState<string | null>(null);
  const [neueAufgabeId, setNeueAufgabeId] = useState<string>('');
  const [addingZuteilungForKind, setAddingZuteilungForKind] = useState<string | null>(null);
  const [neueZuteilungAufgabeId, setNeueZuteilungAufgabeId] = useState<string>('');
  const [addingSpendeForKind, setAddingSpendeForKind] = useState<string | null>(null);
  const [neueSpendeId, setNeueSpendeId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const [letzteAenderungen, setLetzteAenderungen] = useState<{
    name: string; von: string; nach: string; am: string;
  }[]>([]);

  // Stammdaten einmalig laden
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [aufgabenRes, spendenRes] = await Promise.all([
        supabase.from('helferaufgaben').select('id, titel, zeitfenster').eq('event_id', eventId).order('titel'),
        supabase.from('essensspenden_bedarf').select('id, titel').eq('event_id', eventId).order('titel'),
      ]);
      if (!aufgabenRes.error) setAufgaben(aufgabenRes.data || []);
      if (!spendenRes.error) setAlleSpenden(spendenRes.data || []);
    };
    load();
  }, [eventId]);

  const suche = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setErgebnisse([]);
      return;
    }
    setIsSearching(true);
    const supabase = createClient();

    const { data: kinder } = await supabase
      .from('kinder')
      .select('id, vorname, nachname, klasse')
      .eq('event_id', eventId)
      .or(`vorname.ilike.%${text}%,nachname.ilike.%${text}%`)
      .limit(20);

    if (!kinder || kinder.length === 0) {
      setErgebnisse([]);
      setIsSearching(false);
      return;
    }

    const kinderIds = kinder.map(k => k.id);
    const kindIdentifiers = kinder.map(k =>
      `${k.nachname}, ${k.vorname}${k.klasse ? ` (${k.klasse})` : ''}`
    );

    const [zuteilungenRes, spendenRueckRes] = await Promise.all([
      supabase
        .from('helfer_zuteilungen')
        .select('id, kind_id, aufgabe_id, zeitfenster, manuell, via_springer, zugewiesen_am, aufgabe:helferaufgaben(id, titel)')
        .eq('event_id', eventId)
        .in('kind_id', kinderIds),
      supabase
        .from('essensspenden_rueckmeldungen')
        .select('id, spende_id, kind_identifier, spende:essensspenden_bedarf(titel)')
        .eq('event_id', eventId)
        .in('kind_identifier', kindIdentifiers),
    ]);

    const result: KindMitZuteilung[] = kinder.map(k => {
      const kindIdentifier = `${k.nachname}, ${k.vorname}${k.klasse ? ` (${k.klasse})` : ''}`;

      const zuteilungen = (zuteilungenRes.data || [])
        .filter(z => z.kind_id === k.id)
        .map(z => {
          const a = Array.isArray(z.aufgabe) ? z.aufgabe[0] : z.aufgabe;
          return {
            id: z.id,
            aufgabe_id: z.aufgabe_id,
            aufgabeTitel: a?.titel || '—',
            zeitfenster: z.zeitfenster,
            manuell: z.manuell,
            via_springer: z.via_springer,
            zugewiesen_am: z.zugewiesen_am,
          };
        });

      const essensspenden = (spendenRueckRes.data || [])
        .filter(s => s.kind_identifier === kindIdentifier)
        .map(s => {
          const spende = Array.isArray(s.spende) ? s.spende[0] : s.spende;
          return { id: s.id, spende_id: s.spende_id, spendeTitel: spende?.titel || '—' };
        });

      return { kindId: k.id, name: `${k.nachname}, ${k.vorname}`, klasse: k.klasse, kindIdentifier, zuteilungen, essensspenden };
    });

    setErgebnisse(result);
    setIsSearching(false);
  }, [eventId]);

  // Live-Suche mit Debounce
  useEffect(() => {
    const timer = setTimeout(() => suche(suchtext), 300);
    return () => clearTimeout(timer);
  }, [suchtext, suche]);

  const logAenderung = (name: string, von: string, nach: string) =>
    setLetzteAenderungen(prev => [{ name, von, nach, am: new Date().toLocaleString('de-DE') }, ...prev.slice(0, 9)]);

  const handleAufgabeAendern = async (zuteilungId: string, neueAufgabe: Aufgabe, alterTitel: string, kindName: string) => {
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('helfer_zuteilungen')
      .update({ aufgabe_id: neueAufgabe.id, zeitfenster: neueAufgabe.zeitfenster, manuell: true })
      .eq('id', zuteilungId);
    if (error) { toast.error('Fehler beim Ändern'); }
    else {
      toast.success('Aufgabe geändert');
      logAenderung(kindName, alterTitel, neueAufgabe.titel);
      setEditingZuteilungId(null);
      suche(suchtext);
      onRefresh();
    }
    setIsSaving(false);
  };

  const handleZuteilungLoeschen = async (zuteilungId: string, aufgabeTitel: string, kindName: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('helfer_zuteilungen').delete().eq('id', zuteilungId);
    if (error) { toast.error('Fehler beim Löschen'); }
    else {
      toast.success('Zuteilung entfernt');
      logAenderung(kindName, aufgabeTitel, '(entfernt)');
      suche(suchtext);
      onRefresh();
    }
  };

  const handleZuteilungHinzufuegen = async (kind: KindMitZuteilung) => {
    if (!neueZuteilungAufgabeId) return;
    const aufgabe = aufgaben.find(a => a.id === neueZuteilungAufgabeId);
    if (!aufgabe) return;
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('helfer_zuteilungen').insert({
      kind_id: kind.kindId,
      aufgabe_id: aufgabe.id,
      event_id: eventId,
      zeitfenster: aufgabe.zeitfenster,
      manuell: true,
      via_springer: false,
    });
    if (error) { toast.error('Fehler beim Zuteilen'); }
    else {
      toast.success(`${kind.name} → ${aufgabe.titel}`);
      logAenderung(kind.name, '(keine)', aufgabe.titel);
      setAddingZuteilungForKind(null);
      setNeueZuteilungAufgabeId('');
      suche(suchtext);
      onRefresh();
    }
    setIsSaving(false);
  };

  const handleSpendeHinzufuegen = async (kind: KindMitZuteilung) => {
    if (!neueSpendeId) return;
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('essensspenden_rueckmeldungen').insert({
      spende_id: neueSpendeId,
      kind_identifier: kind.kindIdentifier,
      menge: 1,
      event_id: eventId,
    });
    if (error) { toast.error('Fehler beim Hinzufügen'); }
    else {
      const spende = alleSpenden.find(s => s.id === neueSpendeId);
      toast.success(`Essensspende hinzugefügt: ${spende?.titel}`);
      setAddingSpendeForKind(null);
      setNeueSpendeId('');
      suche(suchtext);
    }
    setIsSaving(false);
  };

  const handleSpendeEntfernen = async (spendeRueckmeldungId: string, spendeTitel: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('essensspenden_rueckmeldungen').delete().eq('id', spendeRueckmeldungId);
    if (error) { toast.error('Fehler beim Entfernen'); }
    else {
      toast.success(`Essensspende entfernt: ${spendeTitel}`);
      suche(suchtext);
    }
  };

  return (
    <div className="space-y-6">
      {/* Suchfeld — live */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Kind suchen</h3>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Vor- oder Nachname… (ab 2 Zeichen)"
            value={suchtext}
            onChange={e => setSuchtext(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            autoFocus
          />
          {isSearching && (
            <Loader2 size={14} className="absolute right-3 top-2.5 text-slate-400 animate-spin" />
          )}
          {suchtext && !isSearching && (
            <button
              onClick={() => { setSuchtext(''); setErgebnisse([]); }}
              className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Kein Ergebnis */}
      {ergebnisse.length === 0 && suchtext.trim().length >= 2 && !isSearching && (
        <p className="text-sm text-slate-400 text-center py-4">Keine Kinder gefunden für „{suchtext}"</p>
      )}

      {/* Suchergebnisse */}
      {ergebnisse.length > 0 && (
        <div className="space-y-3">
          {ergebnisse.map(k => (
            <div key={k.kindId} className="bg-white border rounded-xl p-4 space-y-4">
              {/* Name */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{k.name}</span>
                {k.klasse && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{k.klasse}</span>}
              </div>

              {/* Zuteilungen */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Helfer-Zuteilung</span>
                  {addingZuteilungForKind !== k.kindId && (
                    <button
                      onClick={() => { setAddingZuteilungForKind(k.kindId); setNeueZuteilungAufgabeId(''); }}
                      className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800"
                    >
                      <Plus size={12} /> Hinzufügen
                    </button>
                  )}
                </div>

                {k.zuteilungen.length === 0 && addingZuteilungForKind !== k.kindId && (
                  <p className="text-sm text-slate-400 italic">Keine Zuteilung</p>
                )}

                {k.zuteilungen.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {k.zuteilungen.map(z => (
                      <div key={z.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg p-2.5">
                        {editingZuteilungId === z.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <select
                              value={neueAufgabeId}
                              onChange={e => setNeueAufgabeId(e.target.value)}
                              className="flex-1 text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
                            >
                              <option value="">Aufgabe wählen…</option>
                              {aufgaben.map(a => <option key={a.id} value={a.id}>{a.titel}</option>)}
                            </select>
                            <button
                              onClick={() => { const a = aufgaben.find(a => a.id === neueAufgabeId); if (a) handleAufgabeAendern(z.id, a, z.aufgabeTitel, k.name); }}
                              disabled={!neueAufgabeId || isSaving}
                              className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                            >
                              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button onClick={() => setEditingZuteilungId(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div>
                              <div className="text-sm font-medium text-slate-800">{z.aufgabeTitel}</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {formatZeitfenster(z.zeitfenster as any)}
                                {z.manuell && ' · Manuell'}
                                {z.via_springer && ' · Springer'}
                                {' · '}{formatDate(z.zugewiesen_am)}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => { setEditingZuteilungId(z.id); setNeueAufgabeId(z.aufgabe_id); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                title="Aufgabe ändern"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleZuteilungLoeschen(z.id, z.aufgabeTitel, k.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Zuteilung entfernen"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {addingZuteilungForKind === k.kindId && (
                  <div className="flex items-center gap-2">
                    <select
                      value={neueZuteilungAufgabeId}
                      onChange={e => setNeueZuteilungAufgabeId(e.target.value)}
                      className="flex-1 text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
                      autoFocus
                    >
                      <option value="">Aufgabe wählen…</option>
                      {aufgaben.map(a => (
                        <option key={a.id} value={a.id}>{a.titel} ({formatZeitfenster(a.zeitfenster as any)})</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleZuteilungHinzufuegen(k)}
                      disabled={!neueZuteilungAufgabeId || isSaving}
                      className="p-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button onClick={() => setAddingZuteilungForKind(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Essensspenden */}
              {alleSpenden.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Essensspenden</span>
                    {addingSpendeForKind !== k.kindId && (
                      <button
                        onClick={() => { setAddingSpendeForKind(k.kindId); setNeueSpendeId(''); }}
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
                      >
                        <Plus size={12} /> Hinzufügen
                      </button>
                    )}
                  </div>

                  {k.essensspenden.length === 0 && addingSpendeForKind !== k.kindId && (
                    <p className="text-sm text-slate-400 italic">Keine Essensspende</p>
                  )}

                  {k.essensspenden.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {k.essensspenden.map(s => (
                        <div key={s.id} className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1 text-sm">
                          <span className="text-green-800 font-medium">{s.spendeTitel}</span>
                          <button
                            onClick={() => handleSpendeEntfernen(s.id, s.spendeTitel)}
                            className="text-green-400 hover:text-red-500 transition-colors"
                            title="Entfernen"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {addingSpendeForKind === k.kindId && (
                    <div className="flex items-center gap-2">
                      <select
                        value={neueSpendeId}
                        onChange={e => setNeueSpendeId(e.target.value)}
                        className="flex-1 text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-300"
                        autoFocus
                      >
                        <option value="">Spende wählen…</option>
                        {alleSpenden.map(s => <option key={s.id} value={s.id}>{s.titel}</option>)}
                      </select>
                      <button
                        onClick={() => handleSpendeHinzufuegen(k)}
                        disabled={!neueSpendeId || isSaving}
                        className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button onClick={() => setAddingSpendeForKind(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Änderungs-Log */}
      {letzteAenderungen.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Letzte Änderungen (diese Sitzung)</h3>
          <div className="bg-white border rounded-xl divide-y">
            {letzteAenderungen.map((a, i) => (
              <div key={i} className="px-4 py-2.5 text-sm">
                <span className="font-medium text-slate-800">{a.name}</span>
                <span className="text-slate-400 mx-1.5">·</span>
                <span className="text-slate-500">{a.von}</span>
                <span className="text-slate-400 mx-1.5">→</span>
                <span className={a.nach === '(entfernt)' ? 'text-red-500' : 'text-green-700 font-medium'}>{a.nach}</span>
                <span className="text-slate-400 text-xs ml-2">{a.am}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
