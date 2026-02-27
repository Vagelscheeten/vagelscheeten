'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Loader2, Sparkles, AlertTriangle, CheckCircle,
  Eye, Trash2, X, MessageSquare, Link2, UserX, Search,
  PlusCircle, EyeOff, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatZeitfenster, formatDate } from '@/lib/helfer-utils';

interface Rueckmeldung {
  id: string;
  kind_id: string | null;
  aufgabe_id: string | null;
  prioritaet: number;
  freitext: string | null;
  kommentar: string | null;
  kind_name_extern: string | null;
  ist_springer: boolean;
  zeitfenster: string | null;
  erstellt_am: string;
  kind?: { id: string; vorname: string; nachname: string; klasse?: string } | null;
  aufgabe?: { id: string; titel: string; bedarf: number } | null;
  zuteilungen?: { id: string; aufgabe_titel: string }[];
}

interface Aufgabe {
  id: string;
  titel: string;
  bedarf: number;
  zeitfenster: string;
}

interface Essensspende {
  id: string;
  titel: string;
  beschreibung: string | null;
}

interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  klasse: string | null;
}

interface KiHinweis {
  id: string;
  aktion: 'ignorieren' | 'hinweis' | 'zeitfenster_anpassen' | 'aufgabe_wechseln' | 'springer_erkennen';
  hinweis: string;
  begruendung: string;
  empfohlenes_zeitfenster: 'vormittag' | 'nachmittag' | 'beides' | null;
  empfohlene_aufgabe_id: string | null;
  empfohlene_aufgabe_titel: string | null;
  kind_name?: string;
  freitext_original?: string;
  aufgabe_id_aktuell?: string;
  aufgabe_titel_aktuell?: string;
  zeitfenster_aktuell?: string | null;
  uebernommen?: boolean;
}

interface Phase1SichtenProps {
  eventId: string;
  onRefresh: () => void;
}

type TabId = 'rueckmeldungen' | 'nichtZugeordnet' | 'ausstehend';

/** Parses "Nachname, Vorname (Klasse)" or "Nachname, Vorname (Klasse) + ..." → { vorname, nachname, klasse } (primary child only) */
function parseKindNameExtern(name: string): { vorname: string; nachname: string; klasse: string | null } | null {
  // Handle combined identifier: only parse the first child (before " + ")
  const plusIdx = name.indexOf(' + ');
  const primary = plusIdx !== -1 ? name.substring(0, plusIdx) : name;
  const commaIdx = primary.indexOf(', ');
  if (commaIdx === -1) return null;
  const nachname = primary.substring(0, commaIdx).trim();
  const rest = primary.substring(commaIdx + 2);
  const parenIdx = rest.indexOf(' (');
  const vorname = parenIdx !== -1 ? rest.substring(0, parenIdx).trim() : rest.trim();
  const klasse = parenIdx !== -1 ? rest.substring(parenIdx + 2, rest.length - 1).trim() : null;
  if (!vorname || !nachname) return null;
  return { vorname, nachname, klasse };
}

// ─── Manuelle Rückmeldung Modal ───────────────────────────────────────────────

interface ManuelleRueckmeldungModalProps {
  kind: Kind;
  aufgaben: Aufgabe[];
  essensspenden: Essensspende[];
  eventId: string;
  onClose: () => void;
  onSaved: () => void;
}

function ManuelleRueckmeldungModal({ kind, aufgaben, essensspenden, eventId, onClose, onSaved }: ManuelleRueckmeldungModalProps) {
  const [istSpringer, setIstSpringer] = useState(false);
  const [selectedAufgabenIds, setSelectedAufgabenIds] = useState<string[]>([]);
  const [springerZeitfenster, setSpringerZeitfenster] = useState<'vormittag' | 'nachmittag' | 'beides'>('beides');
  const [selectedSpendenIds, setSelectedSpendenIds] = useState<string[]>([]);
  const [kommentar, setKommentar] = useState('');
  const [saving, setSaving] = useState(false);

  const vormittagAufgaben = aufgaben.filter(a => a.zeitfenster === 'vormittag');
  const nachmittagAufgaben = aufgaben.filter(a => a.zeitfenster === 'nachmittag');
  const beidesAufgaben = aufgaben.filter(a => a.zeitfenster === 'beides' || !a.zeitfenster);

  const toggleAufgabe = (id: string) => {
    setSelectedAufgabenIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const toggleSpende = (id: string) => {
    setSelectedSpendenIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const canSave = istSpringer || selectedAufgabenIds.length > 0;

  const handleSpeichern = async () => {
    if (!canSave) return;
    setSaving(true);
    const supabase = createClient();
    const kindIdentifier = `${kind.nachname}, ${kind.vorname}${kind.klasse ? ` (${kind.klasse})` : ''}`;

    if (istSpringer) {
      const { error } = await supabase.from('helfer_rueckmeldungen').insert({
        kind_id: kind.id,
        aufgabe_id: null,
        prioritaet: 1,
        ist_springer: true,
        zeitfenster: springerZeitfenster,
        event_id: eventId,
        kind_name_extern: kindIdentifier,
        kommentar: kommentar.trim() || null,
        freitext: null,
      });
      if (error) { toast.error('Fehler beim Speichern'); setSaving(false); return; }
    } else {
      for (const aufgabeId of selectedAufgabenIds) {
        const { error } = await supabase.from('helfer_rueckmeldungen').insert({
          kind_id: kind.id,
          aufgabe_id: aufgabeId,
          prioritaet: 1,
          ist_springer: false,
          zeitfenster: null,
          event_id: eventId,
          kind_name_extern: kindIdentifier,
          kommentar: kommentar.trim() || null,
          freitext: null,
        });
        if (error) { toast.error('Fehler beim Speichern'); setSaving(false); return; }
      }
    }

    // Essensspenden speichern
    for (const spendeId of selectedSpendenIds) {
      await supabase.from('essensspenden_rueckmeldungen').insert({
        spende_id: spendeId,
        kind_identifier: kindIdentifier,
        menge: 1,
        event_id: eventId,
      });
    }

    toast.success(`Rückmeldung für ${kind.vorname} ${kind.nachname} erfasst`);
    onSaved();
    onClose();
    setSaving(false);
  };

  const AufgabenGruppe = ({ titel, gruppe }: { titel: string; gruppe: Aufgabe[] }) => {
    if (gruppe.length === 0) return null;
    return (
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{titel}</div>
        <div className="space-y-1.5">
          {gruppe.map(a => (
            <label
              key={a.id}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                selectedAufgabenIds.includes(a.id)
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedAufgabenIds.includes(a.id)}
                onChange={() => toggleAufgabe(a.id)}
                className="h-4 w-4 rounded text-orange-500 accent-orange-500"
              />
              <span className="text-sm font-medium text-slate-800">{a.titel}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold">Manuelle Rückmeldung</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {kind.nachname}, {kind.vorname}
              {kind.klasse && <span className="ml-1 text-slate-400">({kind.klasse})</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Aufgaben oder Springer */}
          {!istSpringer && (
            <div className="space-y-3">
              <AufgabenGruppe titel="Vormittag" gruppe={vormittagAufgaben} />
              <AufgabenGruppe titel="Nachmittag" gruppe={nachmittagAufgaben} />
              <AufgabenGruppe titel="Ganztags" gruppe={beidesAufgaben} />
              {aufgaben.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Keine Aufgaben verfügbar</p>
              )}
            </div>
          )}

          {/* Springer */}
          <div className={`border rounded-lg p-3 transition-colors ${istSpringer ? 'border-purple-300 bg-purple-50' : 'border-slate-200'}`}>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => { setIstSpringer(v => !v); setSelectedAufgabenIds([]); }}
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${istSpringer ? 'bg-purple-500' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${istSpringer ? 'left-5' : 'left-1'}`} />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">Als Springer eintragen</div>
                <div className="text-xs text-slate-400">Flexible Einteilung je nach Bedarf</div>
              </div>
            </label>

            {istSpringer && (
              <div className="mt-3 pt-3 border-t border-purple-200">
                <div className="text-xs font-medium text-slate-600 mb-2">Verfügbarkeit</div>
                <div className="flex gap-2">
                  {(['vormittag', 'nachmittag', 'beides'] as const).map(z => (
                    <button
                      key={z}
                      onClick={() => setSpringerZeitfenster(z)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        springerZeitfenster === z
                          ? 'bg-purple-500 text-white border-purple-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {z === 'vormittag' ? 'Vormittag' : z === 'nachmittag' ? 'Nachmittag' : 'Ganztags'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Essensspenden */}
          {essensspenden.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700">
                Essensspenden <span className="text-slate-400 font-normal">(optional)</span>
              </div>
              <div className="space-y-1.5">
                {essensspenden.map(s => {
                  const isSelected = selectedSpendenIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSpende(s.id)}
                        className="h-4 w-4 rounded text-green-600 accent-green-600"
                      />
                      <span className="text-sm font-medium text-slate-800">{s.titel}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kommentar */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Kommentar <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={kommentar}
              onChange={e => setKommentar(e.target.value)}
              placeholder="z.B. hat sich per Telefon gemeldet…"
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button
            onClick={handleSpeichern}
            disabled={saving || !canSave}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <PlusCircle size={14} className="mr-1" />}
            Rückmeldung speichern
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Zuordnungs-Modal ────────────────────────────────────────────────────────

interface ZuordnungsModalProps {
  rueckmeldung: Rueckmeldung;
  alleKinder: Kind[];
  onClose: () => void;
  onSaved: () => void;
}

function ZuordnungsModal({ rueckmeldung, alleKinder, onClose, onSaved }: ZuordnungsModalProps) {
  const [suche, setSuche] = useState(rueckmeldung.kind_name_extern || '');
  const [selected, setSelected] = useState<Kind | null>(null);
  const [saving, setSaving] = useState(false);

  const parsed = parseKindNameExtern(rueckmeldung.kind_name_extern || '');
  const searchLower = suche.toLowerCase();

  const gefiltert = alleKinder.filter(k => {
    const full = `${k.nachname}, ${k.vorname}${k.klasse ? ` (${k.klasse})` : ''}`.toLowerCase();
    return full.includes(searchLower) ||
      k.vorname.toLowerCase().includes(searchLower) ||
      k.nachname.toLowerCase().includes(searchLower);
  }).slice(0, 20);

  const handleZuordnen = async () => {
    if (!selected) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('helfer_rueckmeldungen')
      .update({ kind_id: selected.id })
      .eq('id', rueckmeldung.id);

    if (error) {
      toast.error('Fehler beim Zuordnen');
    } else {
      toast.success(`Zugeordnet: ${selected.nachname}, ${selected.vorname}`);
      onSaved();
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-bold">Kind zuordnen</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 text-sm bg-slate-50 rounded-lg px-3 py-2">
          <div className="text-slate-500 text-xs mb-0.5">Rückmeldung von:</div>
          <div className="font-medium text-slate-800">{rueckmeldung.kind_name_extern || '—'}</div>
        </div>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={suche}
            onChange={e => { setSuche(e.target.value); setSelected(null); }}
            placeholder="Name suchen…"
            autoFocus
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto mb-4">
          {gefiltert.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-4">Keine Kinder gefunden</div>
          ) : (
            gefiltert.map(k => {
              const isSelected = selected?.id === k.id;
              const isLikelyMatch = parsed &&
                k.vorname.toLowerCase() === parsed.vorname.toLowerCase() &&
                k.nachname.toLowerCase() === parsed.nachname.toLowerCase();

              return (
                <button
                  key={k.id}
                  onClick={() => setSelected(isSelected ? null : k)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? 'bg-orange-100 border border-orange-300 text-orange-800'
                      : isLikelyMatch
                      ? 'bg-green-50 border border-green-200 text-slate-800 hover:bg-green-100'
                      : 'hover:bg-slate-50 border border-transparent text-slate-700'
                  }`}
                >
                  <span className="font-medium">{k.nachname}, {k.vorname}</span>
                  {k.klasse && <span className="text-slate-400 ml-1.5 text-xs">({k.klasse})</span>}
                  {isLikelyMatch && !isSelected && (
                    <span className="ml-2 text-xs text-green-600 font-medium">↑ Wahrscheinlicher Match</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button
            onClick={handleZuordnen}
            disabled={!selected || saving}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            Zuordnen
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function Phase1Sichten({ eventId, onRefresh }: Phase1SichtenProps) {
  const [rueckmeldungen, setRueckmeldungen] = useState<Rueckmeldung[]>([]);
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [essensspenden, setEssensspenden] = useState<Essensspende[]>([]);
  const [spendenByKind, setSpendenByKind] = useState<Record<string, string[]>>({});
  const [alleKinder, setAlleKinder] = useState<Kind[]>([]);
  const [ignorierteKindIds, setIgnorierteKindIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [kiLoading, setKiLoading] = useState(false);
  const [kiHinweise, setKiHinweise] = useState<KiHinweis[]>([]);
  const [detailGroup, setDetailGroup] = useState<Rueckmeldung[] | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { aufgabe_id: string; zeitfenster: string }>>({});
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [filterAufgabe, setFilterAufgabe] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<TabId>('rueckmeldungen');
  const [zuordnenItem, setZuordnenItem] = useState<Rueckmeldung | null>(null);
  const [manuellItem, setManuellItem] = useState<Kind | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showIgnoriert, setShowIgnoriert] = useState(false);

  const ladeDaten = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    const [rueckRes, aufgabenRes, kinderRes, ignoriertRes, spendenRes, spendenRueckRes] = await Promise.all([
      supabase
        .from('helfer_rueckmeldungen')
        .select(`
          id, kind_id, aufgabe_id, prioritaet, freitext, kommentar,
          kind_name_extern, ist_springer, zeitfenster, erstellt_am,
          kind:kinder(id, vorname, nachname, klasse),
          aufgabe:helferaufgaben(id, titel, bedarf, zeitfenster)
        `)
        .eq('event_id', eventId)
        .order('erstellt_am', { ascending: false }),
      supabase
        .from('helferaufgaben')
        .select('id, titel, bedarf, zeitfenster')
        .eq('event_id', eventId)
        .order('titel'),
      supabase
        .from('kinder')
        .select('id, vorname, nachname, klasse')
        .eq('event_id', eventId)
        .order('nachname'),
      supabase
        .from('kinder_ignoriert')
        .select('kind_id')
        .eq('event_id', eventId),
      supabase
        .from('essensspenden_bedarf')
        .select('id, titel, beschreibung')
        .eq('event_id', eventId)
        .order('titel'),
      supabase
        .from('essensspenden_rueckmeldungen')
        .select('kind_identifier, spende_id, spende:essensspenden_bedarf(titel)')
        .eq('event_id', eventId),
    ]);

    if (rueckRes.error) {
      toast.error('Fehler beim Laden der Rückmeldungen');
    } else {
      const ruecks = (rueckRes.data || []) as any[];

      const { data: zuteilungenData } = await supabase
        .from('helfer_zuteilungen')
        .select(`id, kind_id, aufgabe:helferaufgaben(id, titel)`)
        .eq('event_id', eventId);

      const enriched = ruecks.map(r => {
        const kind = Array.isArray(r.kind) ? r.kind[0] : r.kind;
        const aufgabe = Array.isArray(r.aufgabe) ? r.aufgabe[0] : r.aufgabe;
        const zuteilungen = (zuteilungenData || [])
          .filter(z => z.kind_id === r.kind_id)
          .map(z => {
            const a = Array.isArray(z.aufgabe) ? z.aufgabe[0] : z.aufgabe;
            return { id: z.id, aufgabe_titel: a?.titel || '?' };
          });
        return { ...r, kind, aufgabe, zuteilungen };
      });

      setRueckmeldungen(enriched);
    }

    if (!aufgabenRes.error) setAufgaben(aufgabenRes.data || []);
    if (!kinderRes.error) setAlleKinder((kinderRes.data || []) as Kind[]);
    if (!spendenRes.error) setEssensspenden(spendenRes.data || []);
    if (!spendenRueckRes.error && spendenRueckRes.data) {
      const byKind: Record<string, string[]> = {};
      for (const row of spendenRueckRes.data as any[]) {
        const key = row.kind_identifier;
        const titel = Array.isArray(row.spende) ? row.spende[0]?.titel : row.spende?.titel;
        if (key && titel) {
          byKind[key] = byKind[key] ? [...byKind[key], titel] : [titel];
        }
      }
      setSpendenByKind(byKind);
    }
    if (!ignoriertRes.error) {
      setIgnorierteKindIds(new Set((ignoriertRes.data || []).map(r => r.kind_id)));
    }

    setIsLoading(false);
  }, [eventId]);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  // ── Derived data ─────────────────────────────────────────────────────────

  const nichtZugeordnet = rueckmeldungen.filter(r => !r.kind_id);

  const klassenInRueckmeldungen = new Set<string>();
  rueckmeldungen.forEach(r => {
    const p = parseKindNameExtern(r.kind_name_extern || '');
    if (p?.klasse) klassenInRueckmeldungen.add(p.klasse);
    if (r.kind?.klasse) klassenInRueckmeldungen.add(r.kind.klasse);
  });

  const verknuepfteKindIds = new Set(rueckmeldungen.map(r => r.kind_id).filter(Boolean));

  const ausstehendAlle = alleKinder.filter(k =>
    k.klasse && klassenInRueckmeldungen.has(k.klasse) && !verknuepfteKindIds.has(k.id)
  ).sort((a, b) => {
    const kl = (a.klasse || '').localeCompare(b.klasse || '');
    return kl !== 0 ? kl : a.nachname.localeCompare(b.nachname);
  });

  const ausstehendAktiv = ausstehendAlle.filter(k => !ignorierteKindIds.has(k.id));
  const ausstehendIgnoriert = ausstehendAlle.filter(k => ignorierteKindIds.has(k.id));

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteIds || deleteIds.length === 0) return;
    const supabase = createClient();
    const { error } = await supabase.from('helfer_rueckmeldungen').delete().in('id', deleteIds);
    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success(deleteIds.length > 1 ? `${deleteIds.length} Rückmeldungen gelöscht` : 'Rückmeldung gelöscht');
      setDeleteIds(null);
      ladeDaten();
      onRefresh();
    }
  };

  const handleIgnorieren = async (kind: Kind) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('kinder_ignoriert')
      .insert({ kind_id: kind.id, event_id: eventId });
    if (error) {
      toast.error('Fehler beim Abhaken');
    } else {
      toast.success(`${kind.nachname}, ${kind.vorname} abgehakt`);
      setIgnorierteKindIds(prev => new Set([...prev, kind.id]));
    }
  };

  const handleIgnoriertEntfernen = async (kind: Kind) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('kinder_ignoriert')
      .delete()
      .eq('kind_id', kind.id)
      .eq('event_id', eventId);
    if (error) {
      toast.error('Fehler beim Reaktivieren');
    } else {
      toast.success(`${kind.nachname}, ${kind.vorname} wieder aktiviert`);
      setIgnorierteKindIds(prev => {
        const next = new Set(prev);
        next.delete(kind.id);
        return next;
      });
    }
  };

  const handleBatchZuordnen = async () => {
    setBatchLoading(true);
    try {
      const res = await fetch('/api/helfer/rueckmeldungen-zuordnen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`${data.zugeordnet} Rückmeldung${data.zugeordnet !== 1 ? 'en' : ''} automatisch zugeordnet · ${data.nichtZugeordnet} verbleiben`);
        ladeDaten();
        onRefresh();
      }
    } catch {
      toast.error('Fehler bei der automatischen Zuordnung');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleKiAnalyse = async () => {
    const mitFreitext = rueckmeldungen.filter(r => r.freitext && r.freitext.trim().length > 0);
    if (mitFreitext.length === 0) { toast.info('Keine Freitexte vorhanden'); return; }

    setKiLoading(true);
    try {
      const res = await fetch('/api/helfer/ki-analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freitexte: mitFreitext.map(r => ({
            id: r.id,
            freitext: r.freitext,
            aufgabe_titel: r.aufgabe?.titel || 'Unbekannt',
            aufgabe_id: r.aufgabe_id || '',
            aufgabe_zeitfenster: r.aufgabe?.zeitfenster || null,
            zeitfenster: r.zeitfenster || null,
            kind_name: r.kind ? `${r.kind.vorname} ${r.kind.nachname}` : r.kind_name_extern || 'Unbekannt',
          })),
          aufgaben: aufgaben.map(a => ({ id: a.id, titel: a.titel, zeitfenster: a.zeitfenster })),
        }),
      });

      const data = await res.json();
      if (data.hinweise) {
        const angereichert = data.hinweise.map((h: KiHinweis) => {
          const original = mitFreitext.find(r => r.id === h.id);
          return {
            ...h,
            kind_name: original ? original.kind
              ? `${original.kind.nachname}, ${original.kind.vorname}`
              : original.kind_name_extern || 'Unbekannt' : undefined,
            freitext_original: original?.freitext ?? undefined,
            aufgabe_id_aktuell: original?.aufgabe_id ?? undefined,
            aufgabe_titel_aktuell: original?.aufgabe?.titel ?? undefined,
            zeitfenster_aktuell: original?.zeitfenster || original?.aufgabe?.zeitfenster || undefined,
          };
        });
        setKiHinweise(angereichert);
        const initEdit: Record<string, { aufgabe_id: string; zeitfenster: string }> = {};
        angereichert.forEach((h: KiHinweis) => {
          initEdit[h.id] = { aufgabe_id: h.aufgabe_id_aktuell || '', zeitfenster: h.zeitfenster_aktuell || 'beides' };
        });
        setEditValues(initEdit);
        const aktionierbar = angereichert.filter((h: KiHinweis) => h.aktion !== 'ignorieren').length;
        toast.success(`${angereichert.length} Freitext${angereichert.length !== 1 ? 'e' : ''} analysiert · ${aktionierbar} mit Handlungsbedarf`);
      } else {
        toast.error(data.error || 'Fehler bei der KI-Analyse');
      }
    } catch {
      toast.error('Fehler bei der KI-Analyse');
    } finally {
      setKiLoading(false);
    }
  };

  const handleKiUebernehmen = async (h: KiHinweis) => {
    const supabase = createClient();
    const updates: Record<string, any> = {};
    if (h.aktion === 'springer_erkennen') {
      updates.ist_springer = true;
      updates.aufgabe_id = null;
      if (h.empfohlenes_zeitfenster) updates.zeitfenster = h.empfohlenes_zeitfenster;
    }
    if (h.aktion === 'zeitfenster_anpassen' && h.empfohlenes_zeitfenster) updates.zeitfenster = h.empfohlenes_zeitfenster;
    if (h.aktion === 'aufgabe_wechseln' && h.empfohlene_aufgabe_id) updates.aufgabe_id = h.empfohlene_aufgabe_id;
    if (Object.keys(updates).length === 0) return;
    const { error } = await supabase.from('helfer_rueckmeldungen').update(updates).eq('id', h.id);
    if (error) { toast.error('Fehler beim Übernehmen'); }
    else {
      toast.success('KI-Vorschlag übernommen');
      setKiHinweise(prev => prev.map(k => k.id === h.id ? { ...k, uebernommen: true } : k));
      ladeDaten(); onRefresh();
    }
  };

  const handleManuellSpeichern = async (id: string) => {
    const vals = editValues[id];
    if (!vals) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('helfer_rueckmeldungen')
      .update({ aufgabe_id: vals.aufgabe_id || null, zeitfenster: vals.zeitfenster })
      .eq('id', id);
    if (error) { toast.error('Fehler beim Speichern'); }
    else {
      toast.success('Manuell gespeichert');
      setKiHinweise(prev => prev.map(k => k.id === id ? { ...k, uebernommen: true } : k));
      ladeDaten(); onRefresh();
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────

  const aufgabenStats = aufgaben.map(a => {
    const anzahl = rueckmeldungen.filter(r => !r.ist_springer && r.aufgabe_id === a.id).length;
    const diff = a.bedarf - anzahl;
    return { ...a, anzahl, diff };
  });
  const springerAnzahl = rueckmeldungen.filter(r => r.ist_springer).length;

  const gefiltert = filterAufgabe === 'all'
    ? rueckmeldungen
    : filterAufgabe === 'springer'
    ? rueckmeldungen.filter(r => r.ist_springer)
    : rueckmeldungen.filter(r => r.aufgabe_id === filterAufgabe && !r.ist_springer);

  // Gruppierung: je Kind eine Zeile (key = kind_name_extern)
  const gruppiertGefiltert: Rueckmeldung[][] = [];
  const seenKeys = new Set<string>();
  for (const r of gefiltert) {
    const key = r.kind_name_extern || r.id;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      gruppiertGefiltert.push(gefiltert.filter(x => (x.kind_name_extern || x.id) === key));
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Aufgaben-Ampel */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Bedarf vs. Rückmeldungen pro Aufgabe</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {aufgabenStats.map(a => {
            const color = a.diff > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50';
            const textColor = a.diff > 0 ? 'text-red-700' : 'text-green-700';
            return (
              <button
                key={a.id}
                onClick={() => setFilterAufgabe(filterAufgabe === a.id ? 'all' : a.id)}
                className={`text-left rounded-xl border p-3 transition-all hover:shadow-sm ${color} ${filterAufgabe === a.id ? 'ring-2 ring-offset-1 ring-orange-400' : ''}`}
              >
                <div className="text-xs text-slate-500 mb-1 truncate">{a.titel}</div>
                <div className={`text-lg font-bold ${textColor}`}>{a.anzahl} / {a.bedarf}</div>
                <div className="text-xs mt-1">
                  {a.diff > 0
                    ? <span className="text-red-600 flex items-center gap-1"><AlertTriangle size={11} /> {a.diff} fehlen</span>
                    : <span className="text-green-600 flex items-center gap-1"><CheckCircle size={11} /> Ausreichend</span>
                  }
                </div>
              </button>
            );
          })}
          {springerAnzahl > 0 && (
            <button
              onClick={() => setFilterAufgabe(filterAufgabe === 'springer' ? 'all' : 'springer')}
              className={`text-left rounded-xl border border-purple-200 bg-purple-50 p-3 transition-all hover:shadow-sm ${filterAufgabe === 'springer' ? 'ring-2 ring-offset-1 ring-orange-400' : ''}`}
            >
              <div className="text-xs text-slate-500 mb-1">Springer</div>
              <div className="text-lg font-bold text-purple-700">{springerAnzahl}</div>
              <div className="text-xs mt-1 text-purple-600">Flexibel einsetzbar</div>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0 -mb-px">
          <TabButton id="rueckmeldungen" active={activeTab === 'rueckmeldungen'} onClick={() => setActiveTab('rueckmeldungen')}
            label="Rückmeldungen" count={rueckmeldungen.length} />
          <TabButton id="nichtZugeordnet" active={activeTab === 'nichtZugeordnet'} onClick={() => setActiveTab('nichtZugeordnet')}
            label="Nicht zugeordnet" count={nichtZugeordnet.length} countColor="orange" />
          <TabButton id="ausstehend" active={activeTab === 'ausstehend'} onClick={() => setActiveTab('ausstehend')}
            label="Ausstehend" count={ausstehendAktiv.length} countColor="red" />
        </nav>
      </div>

      {/* ── Tab: Rückmeldungen ──────────────────────────────────────────── */}
      {activeTab === 'rueckmeldungen' && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Rückmeldungen
              {filterAufgabe !== 'all' && (
                <button onClick={() => setFilterAufgabe('all')} className="ml-2 text-xs text-orange-500 hover:underline">
                  Filter aufheben
                </button>
              )}
            </h3>
            <Button variant="outline" size="sm" onClick={handleKiAnalyse} disabled={kiLoading} className="gap-1.5">
              {kiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Freitexte analysieren
            </Button>
          </div>

          {/* KI-Hinweise Panel */}
          {kiHinweise.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5"><Sparkles size={14} /> KI-Analyse</h4>
                <button onClick={() => setKiHinweise([])} className="text-amber-600 hover:text-amber-800"><X size={14} /></button>
              </div>
              <div className="bg-amber-100/60 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 mb-2">
                <strong>Hinweis:</strong> Änderungen hier sind Empfehlungen an die Auto-Zuteilung — keine Garantie. Für feste, garantierte Zuteilungen: <strong>Schritt 3 (Prüfen)</strong> nutzen.
              </div>
              {kiHinweise.map(h => {
                const edit = editValues[h.id] || { aufgabe_id: h.aufgabe_id_aktuell || '', zeitfenster: h.zeitfenster_aktuell || 'beides' };
                const hatKiVorschlag = h.aktion === 'zeitfenster_anpassen' || h.aktion === 'aufgabe_wechseln' || h.aktion === 'springer_erkennen';
                const kiVorschlagLabel = h.aktion === 'springer_erkennen'
                  ? `Als Springer markieren${h.empfohlenes_zeitfenster && h.empfohlenes_zeitfenster !== 'beides' ? ` (${h.empfohlenes_zeitfenster})` : ''}`
                  : h.aktion === 'zeitfenster_anpassen'
                  ? `Zeitfenster → ${h.empfohlenes_zeitfenster}`
                  : h.aktion === 'aufgabe_wechseln' ? `Aufgabe → ${h.empfohlene_aufgabe_titel}` : null;

                return (
                  <div key={h.id} className={`bg-white rounded-lg p-3 text-sm border space-y-2.5 ${h.uebernommen ? 'border-green-200 opacity-60' : h.aktion === 'ignorieren' ? 'border-slate-100' : 'border-amber-100'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        {h.kind_name && <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{h.kind_name}</div>}
                        {h.freitext_original && <div className="text-xs text-slate-400 italic border-l-2 border-amber-200 pl-2">„{h.freitext_original}"</div>}
                        <div className="text-xs text-slate-400">
                          Aktuell: {h.aufgabe_titel_aktuell || 'keine Aufgabe'} · {h.zeitfenster_aktuell === 'vormittag' ? 'Vormittags' : h.zeitfenster_aktuell === 'nachmittag' ? 'Nachmittags' : 'Ganztags'}
                        </div>
                      </div>
                      {h.uebernommen ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">✓ Gespeichert</span>
                      ) : h.aktion === 'ignorieren' ? (
                        <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full shrink-0">Kein Handlungsbedarf</span>
                      ) : (
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full shrink-0">Handlungsbedarf</span>
                      )}
                    </div>
                    {h.aktion !== 'ignorieren' && (
                      <div className="space-y-1">
                        <div className="font-medium text-slate-800">{h.hinweis}</div>
                        <div className="text-xs text-slate-500 leading-relaxed">{h.begruendung}</div>
                        {hatKiVorschlag && !h.uebernommen && (
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">{kiVorschlagLabel}</span>
                            <button onClick={() => handleKiUebernehmen(h)} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded font-medium transition-colors">
                              KI-Vorschlag übernehmen
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {!h.uebernommen && (
                      <div className="border-t border-slate-100 pt-2 space-y-2">
                        <div className="text-xs text-slate-400 font-medium">Manuell anpassen:</div>
                        <div className="flex flex-wrap gap-2 items-end">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400">Aufgabe</label>
                            <select value={edit.aufgabe_id} onChange={e => setEditValues(prev => ({ ...prev, [h.id]: { ...edit, aufgabe_id: e.target.value } }))}
                              className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300">
                              <option value="">— keine —</option>
                              {aufgaben.map(a => <option key={a.id} value={a.id}>{a.titel}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400">Zeitfenster</label>
                            <select value={edit.zeitfenster} onChange={e => setEditValues(prev => ({ ...prev, [h.id]: { ...edit, zeitfenster: e.target.value } }))}
                              className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300">
                              <option value="vormittag">Vormittag</option>
                              <option value="nachmittag">Nachmittag</option>
                              <option value="beides">Ganztags</option>
                            </select>
                          </div>
                          <button onClick={() => handleManuellSpeichern(h.id)} className="text-xs bg-slate-700 hover:bg-slate-900 text-white px-3 py-1.5 rounded font-medium transition-colors">
                            Speichern
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Rückmeldungs-Tabelle */}
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
          ) : gruppiertGefiltert.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Keine Rückmeldungen gefunden.</div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-500 w-px whitespace-nowrap">Kind</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Aufgabe(n)</th>
                    <th className="text-center px-3 py-3 font-medium text-slate-500 w-8">✓</th>
                    <th className="px-3 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {gruppiertGefiltert.map(gruppe => {
                    const first = gruppe[0];
                    const name = first.kind ? `${first.kind.nachname}, ${first.kind.vorname}` : first.kind_name_extern || 'Unbekannt';
                    const klasse = first.kind?.klasse;
                    const hatFreitext = gruppe.some(r => r.freitext);
                    const freitexte = gruppe.filter(r => r.freitext).map(r => r.freitext).join(' | ');
                    const aufgabenTitel = gruppe
                      .map(r => r.ist_springer ? 'Springer' : (r.aufgabe?.titel || '-'))
                      .filter((t, i, arr) => arr.indexOf(t) === i);
                    const aufgabenText = aufgabenTitel.join(', ');
                    const kindId = first.kind_id;
                    const zuteilungen = first.zuteilungen || [];
                    const zuteilungTooltip = kindId
                      ? (zuteilungen.length > 0 ? zuteilungen.map(z => z.aufgabe_titel).join(' · ') : 'Keine Zuteilung')
                      : null;
                    const zuordnenEntry = gruppe.find(r => !r.kind_id) || first;
                    return (
                      <tr key={first.kind_name_extern || first.id} className="hover:bg-slate-50 group">
                        <td className="px-4 py-3 font-medium w-px whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{name}</span>
                            {klasse && <span className="text-slate-400 text-xs">({klasse})</span>}
                            {hatFreitext && <span title={freitexte} className="cursor-help text-orange-400 hover:text-orange-600 shrink-0"><MessageSquare size={13} /></span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <div className="relative group/aufgabe">
                            {aufgabenTitel.length === 1 && aufgabenTitel[0] === 'Springer' ? (
                              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Springer</Badge>
                            ) : (
                              <span className="text-slate-700 truncate block">{aufgabenText}</span>
                            )}
                            {aufgabenTitel.length > 1 && (
                              <div className="absolute bottom-full left-0 mb-2 px-2 py-1.5 bg-slate-800 text-white text-xs rounded-md pointer-events-none opacity-0 group-hover/aufgabe:opacity-100 transition-opacity z-20 shadow-lg whitespace-pre">
                                {aufgabenTitel.join('\n')}
                                <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-800" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {kindId ? (
                            <div className="relative inline-flex justify-center">
                              <CheckCircle size={15} className="text-green-500 cursor-default" />
                              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded-md whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg ${zuteilungTooltip === 'Keine Zuteilung' ? 'bg-slate-500 text-white' : 'bg-slate-800 text-white'}`}>
                                {zuteilungTooltip}
                                <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${zuteilungTooltip === 'Keine Zuteilung' ? 'border-t-slate-500' : 'border-t-slate-800'}`} />
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setZuordnenItem(zuordnenEntry)} title="Zuordnen" className="text-orange-400 hover:text-orange-600 transition-colors mx-auto block">
                              <AlertTriangle size={15} />
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setDetailGroup(gruppe)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition-colors" title="Details"><Eye size={15} /></button>
                            <button onClick={() => setDeleteIds(gruppe.map(r => r.id))} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors" title="Löschen"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Nicht zugeordnet ───────────────────────────────────────── */}
      {activeTab === 'nichtZugeordnet' && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Nicht zugeordnete Rückmeldungen</h3>
            <Button variant="outline" size="sm" onClick={handleBatchZuordnen} disabled={batchLoading || nichtZugeordnet.length === 0} className="gap-1.5">
              {batchLoading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              Automatisch zuordnen
            </Button>
          </div>

          {nichtZugeordnet.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
              Alle Rückmeldungen sind zugeordnet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Name (extern)</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Aufgabe</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Zeitfenster</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {nichtZugeordnet.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{r.kind_name_extern || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.ist_springer ? <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Springer</Badge> : r.aufgabe?.titel || '-'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{formatZeitfenster(r.zeitfenster as any)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setZuordnenItem(r)} className="inline-flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
                          <Link2 size={12} /> Zuordnen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Ausstehend ─────────────────────────────────────────────── */}
      {activeTab === 'ausstehend' && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Kinder ohne Rückmeldung</h3>
            <p className="text-xs text-slate-400">Nur Klassen aus Rückmeldungen · {ausstehendAktiv.length} offen</p>
          </div>

          {klassenInRueckmeldungen.size === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">Noch keine Rückmeldungen vorhanden.</div>
          ) : ausstehendAktiv.length === 0 && ausstehendIgnoriert.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
              Alle Kinder aus den erfassten Klassen haben eine Rückmeldung.
            </div>
          ) : (
            <>
              {ausstehendAktiv.length > 0 && (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left px-4 py-3 font-medium text-slate-500">Name</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-500">Klasse</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ausstehendAktiv.map(k => (
                        <tr key={k.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">
                            <span className="flex items-center gap-1.5">
                              <UserX size={13} className="text-slate-300 shrink-0" />
                              {k.nachname}, {k.vorname}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{k.klasse || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setManuellItem(k)}
                                className="inline-flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                              >
                                <PlusCircle size={12} /> Rückmeldung erfassen
                              </button>
                              <button
                                onClick={() => handleIgnorieren(k)}
                                className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors font-medium"
                                title="Nicht mehr warten — kein Bedarf"
                              >
                                <EyeOff size={12} /> Abhaken
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {ausstehendAktiv.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
                  Alle aktiven Kinder haben eine Rückmeldung oder wurden abgehakt.
                </div>
              )}

              {/* Ignorierte anzeigen */}
              {ausstehendIgnoriert.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowIgnoriert(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <EyeOff size={12} />
                    {showIgnoriert ? 'Abgehakte ausblenden' : `${ausstehendIgnoriert.length} abgehakt${ausstehendIgnoriert.length !== 1 ? 'e' : 'es'} Kind anzeigen`}
                  </button>

                  {showIgnoriert && (
                    <div className="mt-2 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-100">
                          {ausstehendIgnoriert.map(k => (
                            <tr key={k.id} className="opacity-50 hover:opacity-80 transition-opacity">
                              <td className="px-4 py-2.5 font-medium text-slate-600">
                                <span className="flex items-center gap-1.5">
                                  <EyeOff size={12} className="text-slate-300 shrink-0" />
                                  {k.nachname}, {k.vorname}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-400 text-xs">{k.klasse || '—'}</td>
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  onClick={() => handleIgnoriertEntfernen(k)}
                                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                                  title="Wieder aktivieren"
                                >
                                  <RotateCcw size={11} /> Reaktivieren
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Manuelle Rückmeldung Modal ───────────────────────────────────── */}
      {manuellItem && (
        <ManuelleRueckmeldungModal
          kind={manuellItem}
          aufgaben={aufgaben}
          essensspenden={essensspenden}
          eventId={eventId}
          onClose={() => setManuellItem(null)}
          onSaved={() => { ladeDaten(); onRefresh(); }}
        />
      )}

      {/* ── Zuordnungs-Modal ─────────────────────────────────────────────── */}
      {zuordnenItem && (
        <ZuordnungsModal
          rueckmeldung={zuordnenItem}
          alleKinder={alleKinder}
          onClose={() => setZuordnenItem(null)}
          onSaved={() => { ladeDaten(); onRefresh(); }}
        />
      )}

      {/* ── Detail-Modal ─────────────────────────────────────────────────── */}
      {detailGroup && (() => {
        const first = detailGroup[0];
        const name = first.kind ? `${first.kind.nachname}, ${first.kind.vorname}` : first.kind_name_extern || '-';
        const aufgabenTitel = detailGroup
          .map(r => r.ist_springer ? 'Springer' : (r.aufgabe?.titel || '-'))
          .filter((t, i, arr) => arr.indexOf(t) === i);
        const kommentare = detailGroup.filter(r => r.kommentar).map(r => r.kommentar).filter((v, i, a) => a.indexOf(v) === i).join(' | ');
        const freitexte = detailGroup.filter(r => r.freitext).map(r => r.freitext).filter((v, i, a) => a.indexOf(v) === i).join(' | ');
        const spenden = spendenByKind[first.kind_name_extern || ''];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDetailGroup(null)}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold">Rückmeldung Details</h2>
                <button onClick={() => setDetailGroup(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>
              <div className="space-y-3 text-sm">
                <InfoRow label="Name" value={name} />
                {first.kind?.klasse && <InfoRow label="Klasse" value={first.kind.klasse} />}
                <InfoRow label={aufgabenTitel.length > 1 ? 'Aufgaben' : 'Aufgabe'} value={aufgabenTitel.join(', ')} />
                {kommentare && <InfoRow label="Kommentar" value={kommentare} />}
                {freitexte && <InfoRow label="Freitext" value={freitexte} />}
                <InfoRow label="Eingegangen" value={formatDate(first.erstellt_am)} />
                <InfoRow label="Zuordnung" value={first.kind_id ? '✓ Zugeordnet' : '⚠ Nicht zugeordnet'} />
                {spenden && spenden.length > 0 && <InfoRow label="Essensspenden" value={spenden.join(', ')} />}
              </div>
              <Button className="mt-4 w-full" variant="outline" onClick={() => setDetailGroup(null)}>Schließen</Button>
            </div>
          </div>
        );
      })()}

      {/* ── Lösch-Bestätigung ────────────────────────────────────────────── */}
      {deleteIds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteIds(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold mb-2">Rückmeldung{deleteIds.length > 1 ? 'en' : ''} löschen?</h2>
            <p className="text-sm text-slate-500 mb-4">
              {deleteIds.length > 1 ? `${deleteIds.length} Einträge werden gelöscht. ` : ''}Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteIds(null)}>Abbrechen</Button>
              <Button variant="destructive" onClick={handleDelete}>Löschen</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TabButton({ id, active, onClick, label, count, countColor = 'slate' }: {
  id: TabId; active: boolean; onClick: () => void; label: string; count: number; countColor?: 'slate' | 'orange' | 'red';
}) {
  const badgeColors = {
    slate: 'bg-slate-100 text-slate-600',
    orange: count > 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400',
    red: count > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
    >
      {label}
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${badgeColors[countColor]}`}>{count}</span>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 min-w-[100px]">{label}:</span>
      <span className="text-slate-900 font-medium">{value}</span>
    </div>
  );
}
