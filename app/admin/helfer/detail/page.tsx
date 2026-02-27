'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Users, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// ── Types ───────────────────────────────────────────────────────────────────

interface Spiel {
  id: string;
  name: string;
}

interface Gruppe {
  id: string;
  name: string;
  teamleiter_id: string | null;
}

interface Helfer {
  id: string;
  name: string;
  klasse?: string;
  istExtern: boolean;
  freitext?: string | null;
}

type Tab = 'spielbetreuer' | 'teamleiter';

// ── Main Page ────────────────────────────────────────────────────────────────

export default function DetailZuteilungPage() {
  const [aktuellerTab, setAktuellerTab] = useState<Tab>('spielbetreuer');

  return (
    <main className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Detail-Zuteilung</h1>
          <p className="text-sm text-slate-500 mt-1">
            Spielbetreuer und Teamleiter den Spielen und Gruppen zuweisen
          </p>
        </div>
        <Link
          href="/admin/helfer"
          className="text-sm text-slate-500 hover:text-slate-900 border rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
        >
          ← Zurück zum Workflow
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        <TabButton
          active={aktuellerTab === 'spielbetreuer'}
          onClick={() => setAktuellerTab('spielbetreuer')}
          label="Spielbetreuer"
        />
        <TabButton
          active={aktuellerTab === 'teamleiter'}
          onClick={() => setAktuellerTab('teamleiter')}
          label="Teamleiter"
        />
      </div>

      {aktuellerTab === 'spielbetreuer' && <SpielbetreuerTab />}
      {aktuellerTab === 'teamleiter' && <TeamleiterTab />}
    </main>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
      }`}
    >
      {label}
    </button>
  );
}

// ── Spielbetreuer Tab ────────────────────────────────────────────────────────

function SpielbetreuerTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [helfer, setHelfer] = useState<Helfer[]>([]);
  const [zuteilungen, setZuteilungen] = useState<Record<string, string[]>>({});
  const [springer, setSpringer] = useState<string[]>([]);
  const [filter, setFilter] = useState('');

  const ladeDaten = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { data: event } = await supabase.from('events').select('id').eq('ist_aktiv', true).single();
    if (!event) { setIsLoading(false); return; }

    const { data: aufgabe } = await supabase
      .from('helferaufgaben')
      .select('id')
      .eq('event_id', event.id)
      .ilike('titel', '%betreuer%spiel%')
      .limit(1)
      .single();

    const [spieleRes, helferRes, zuteilRes, freitextRes] = await Promise.all([
      supabase.from('spiele').select('id, name').order('name'),
      aufgabe
        ? supabase
            .from('helfer_zuteilungen')
            .select('id, kind_id, kind:kinder(id, vorname, nachname, klasse), externer_helfer_id, externe_helfer(id, name)')
            .eq('event_id', event.id)
            .eq('aufgabe_id', aufgabe.id)
        : Promise.resolve({ data: [] }),
      supabase.from('helfer_spiel_zuteilungen').select('helfer_id, spiel_id'),
      supabase
        .from('helfer_rueckmeldungen')
        .select('kind_id, freitext')
        .eq('event_id', event.id)
        .not('freitext', 'is', null),
    ]);

    setSpiele(spieleRes.data || []);

    // Freitext-Map: kind_id → freitext
    const freitextByKind: Record<string, string> = {};
    (freitextRes.data || []).forEach((r: any) => {
      if (r.kind_id && r.freitext) freitextByKind[r.kind_id] = r.freitext;
    });

    const transformedHelfer: Helfer[] = (helferRes.data || []).map((h: any) => {
      const kind = Array.isArray(h.kind) ? h.kind[0] : h.kind;
      const ext = Array.isArray(h.externe_helfer) ? h.externe_helfer[0] : h.externe_helfer;
      if (kind) {
        return { id: h.id, name: `${kind.vorname} ${kind.nachname}`, klasse: kind.klasse, istExtern: false, freitext: freitextByKind[kind.id] || null };
      }
      return { id: h.id, name: ext?.name || 'Externer Helfer', istExtern: true };
    });

    setHelfer(transformedHelfer);

    const initZuteilungen: Record<string, string[]> = {};
    const initSpringer: string[] = [];

    (zuteilRes.data || []).forEach((z: any) => {
      if (z.spiel_id === 'springer') {
        initSpringer.push(z.helfer_id);
      } else {
        if (!initZuteilungen[z.spiel_id]) initZuteilungen[z.spiel_id] = [];
        initZuteilungen[z.spiel_id].push(z.helfer_id);
      }
    });

    setZuteilungen(initZuteilungen);
    setSpringer(initSpringer);
    setIsLoading(false);
  }, []);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  const getHelferStatus = (id: string): 'frei' | 'springer' | 'zugewiesen' => {
    if (springer.includes(id)) return 'springer';
    for (const spielId in zuteilungen) {
      if (zuteilungen[spielId]?.includes(id)) return 'zugewiesen';
    }
    return 'frei';
  };

  const getSpielName = (helferId: string): string | undefined => {
    for (const spielId in zuteilungen) {
      if (zuteilungen[spielId]?.includes(helferId)) {
        return spiele.find(s => s.id === spielId)?.name;
      }
    }
    return undefined;
  };

  const assignToSpiel = (helferId: string, spielId: string) => {
    setZuteilungen(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => { next[id] = next[id].filter(h => h !== helferId); });
      if (!next[spielId]) next[spielId] = [];
      next[spielId].push(helferId);
      return next;
    });
    setSpringer(prev => prev.filter(h => h !== helferId));
    toast.success('Helfer zugewiesen');
  };

  const assignAsSpringer = (helferId: string) => {
    setZuteilungen(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => { next[id] = next[id].filter(h => h !== helferId); });
      return next;
    });
    setSpringer(prev => [...prev.filter(h => h !== helferId), helferId]);
    toast.success('Als Springer markiert');
  };

  const removeFromAll = (helferId: string) => {
    setZuteilungen(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => { next[id] = next[id].filter(h => h !== helferId); });
      return next;
    });
    setSpringer(prev => prev.filter(h => h !== helferId));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const supabase = createClient();
    try {
      await supabase.from('helfer_spiel_zuteilungen').delete().gte('helfer_id', '0');
      const rows: { helfer_id: string; spiel_id: string }[] = [];
      Object.entries(zuteilungen).forEach(([spielId, ids]) => {
        ids.forEach(id => rows.push({ helfer_id: id, spiel_id: spielId }));
      });
      springer.forEach(id => rows.push({ helfer_id: id, spiel_id: 'springer' }));
      if (rows.length > 0) await supabase.from('helfer_spiel_zuteilungen').insert(rows);
      toast.success('Gespeichert');
    } catch (e: any) {
      toast.error('Fehler: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState />;

  const gefiltert = helfer.filter(h =>
    h.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">Weise Helfer einem Spiel oder als Springer zu.</p>
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-1.5">
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Speichern
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Linke Spalte: Helfer */}
        <div className="lg:w-1/2">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-slate-700 text-sm">Helfer ({helfer.length})</h3>
            <div className="relative flex-1">
              <Filter size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Suchen..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-300"
              />
            </div>
          </div>
          <div className="space-y-2">
            {gefiltert.map(h => {
              const status = getHelferStatus(h.id);
              const spielName = getSpielName(h.id);

              return (
                <div key={h.id} className="bg-white border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-sm text-slate-800">{h.name}</span>
                      {h.klasse && <span className="text-xs text-slate-400 ml-1">({h.klasse})</span>}
                    </div>
                    <StatusBadge status={status} spielName={spielName} />
                  </div>
                  {h.freitext && (
                    <div className="text-xs text-slate-400 italic border-l-2 border-amber-200 pl-2 mb-2">„{h.freitext}"</div>
                  )}
                  {status !== 'frei' && (
                    <button
                      onClick={() => removeFromAll(h.id)}
                      className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
                    >
                      <X size={11} /> Freigeben
                    </button>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <button
                      onClick={() => assignAsSpringer(h.id)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        status === 'springer'
                          ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : 'hover:bg-purple-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      Springer
                    </button>
                    {spiele.slice(0, 6).map(s => (
                      <button
                        key={s.id}
                        onClick={() => assignToSpiel(h.id, s.id)}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                          zuteilungen[s.id]?.includes(h.id)
                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : 'hover:bg-blue-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                    {spiele.length > 6 && (
                      <select
                        className="text-xs px-2 py-1 rounded-full border text-slate-500 bg-white"
                        onChange={e => e.target.value && assignToSpiel(h.id, e.target.value)}
                        value=""
                      >
                        <option value="">Mehr Spiele...</option>
                        {spiele.slice(6).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rechte Spalte: Spiele-Übersicht */}
        <div className="lg:w-1/2">
          <h3 className="font-semibold text-slate-700 text-sm mb-3">Spiele ({spiele.length})</h3>
          <div className="space-y-2">
            {spiele.map(spiel => {
              const zugewieseneIds = zuteilungen[spiel.id] || [];
              const zugewieseneHelfer = helfer.filter(h => zugewieseneIds.includes(h.id));

              return (
                <div key={spiel.id} className="bg-white border rounded-xl p-3">
                  <div className="font-medium text-sm text-slate-800 mb-1.5">{spiel.name}</div>
                  {zugewieseneHelfer.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Kein Betreuer</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {zugewieseneHelfer.map(h => (
                        <span key={h.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {h.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Springer */}
            {springer.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                <div className="font-medium text-sm text-purple-800 mb-1.5">Springer</div>
                <div className="flex flex-wrap gap-1">
                  {helfer.filter(h => springer.includes(h.id)).map(h => (
                    <span key={h.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      {h.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Teamleiter Tab ───────────────────────────────────────────────────────────

function TeamleiterTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [helfer, setHelfer] = useState<Helfer[]>([]);
  const [zuteilungen, setZuteilungen] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('');

  const ladeDaten = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { data: aufgabe } = await supabase
      .from('helferaufgaben')
      .select('id')
      .ilike('titel', '%teamleiter%')
      .limit(1)
      .single();

    const { data: event } = await supabase.from('events').select('id').eq('ist_aktiv', true).single();

    const [gruppenRes, helferRes, freitextRes] = await Promise.all([
      supabase.from('spielgruppen').select('id, name, teamleiter_id').order('name'),
      aufgabe && event
        ? supabase
            .from('helfer_zuteilungen')
            .select('id, kind_id, kind:kinder(id, vorname, nachname, klasse), externer_helfer_id, externe_helfer(id, name)')
            .eq('aufgabe_id', aufgabe.id)
            .eq('event_id', event.id)
        : Promise.resolve({ data: [] }),
      event
        ? supabase
            .from('helfer_rueckmeldungen')
            .select('kind_id, freitext')
            .eq('event_id', event.id)
            .not('freitext', 'is', null)
        : Promise.resolve({ data: [] }),
    ]);

    setGruppen(gruppenRes.data || []);

    const freitextByKind: Record<string, string> = {};
    (freitextRes.data || []).forEach((r: any) => {
      if (r.kind_id && r.freitext) freitextByKind[r.kind_id] = r.freitext;
    });

    const transformedHelfer: Helfer[] = (helferRes.data || []).map((h: any) => {
      const kind = Array.isArray(h.kind) ? h.kind[0] : h.kind;
      const ext = Array.isArray(h.externe_helfer) ? h.externe_helfer[0] : h.externe_helfer;
      if (kind) return { id: h.id, name: `${kind.vorname} ${kind.nachname}`, klasse: kind.klasse, istExtern: false, freitext: freitextByKind[kind.id] || null };
      return { id: h.id, name: ext?.name || 'Ext.', istExtern: true };
    });

    setHelfer(transformedHelfer);

    const initZ: Record<string, string> = {};
    (gruppenRes.data || []).forEach(g => {
      if (g.teamleiter_id) initZ[g.id] = g.teamleiter_id;
    });
    setZuteilungen(initZ);
    setIsLoading(false);
  }, []);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  const assign = (gruppeId: string, helferId: string) => {
    setZuteilungen(prev => {
      const next = { ...prev };
      // Entferne eventuelle alte Zuweisung dieses Helfers
      Object.keys(next).forEach(id => { if (next[id] === helferId) next[id] = ''; });
      next[gruppeId] = helferId;
      return next;
    });
  };

  const remove = (gruppeId: string) => {
    setZuteilungen(prev => ({ ...prev, [gruppeId]: '' }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const supabase = createClient();
    try {
      const updates = Object.entries(zuteilungen).map(([gruppeId, helferId]) =>
        supabase
          .from('spielgruppen')
          .update({ teamleiter_id: helferId || null })
          .eq('id', gruppeId)
      );
      await Promise.all(updates);
      toast.success('Teamleiter gespeichert');
    } catch (e: any) {
      toast.error('Fehler: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState />;

  const gefiltert = helfer.filter(h =>
    h.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">Weise jedem Teamleiter genau eine Gruppe zu.</p>
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-1.5">
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Speichern
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Linke Spalte: Gruppen */}
        <div className="lg:w-1/2">
          <h3 className="font-semibold text-slate-700 text-sm mb-3">Gruppen ({gruppen.length})</h3>
          <div className="space-y-2">
            {gruppen.map(gruppe => {
              const zugewiesenerHelfer = helfer.find(h => h.id === zuteilungen[gruppe.id]);

              return (
                <div key={gruppe.id} className="bg-white border rounded-xl p-3">
                  <div className="font-medium text-sm text-slate-800 mb-2">{gruppe.name}</div>
                  {zugewiesenerHelfer ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        {zugewiesenerHelfer.name}
                      </span>
                      <button
                        onClick={() => remove(gruppe.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <select
                        className="text-xs w-full px-2 py-1.5 border rounded-lg text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-orange-300"
                        value=""
                        onChange={e => e.target.value && assign(gruppe.id, e.target.value)}
                      >
                        <option value="">Teamleiter wählen...</option>
                        {helfer.map(h => (
                          <option key={h.id} value={h.id} disabled={Object.values(zuteilungen).includes(h.id)}>
                            {h.name}{h.klasse ? ` (${h.klasse})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rechte Spalte: Teamleiter */}
        <div className="lg:w-1/2">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-slate-700 text-sm">Teamleiter ({helfer.length})</h3>
            <div className="relative flex-1">
              <Filter size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Suchen..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-lg"
              />
            </div>
          </div>
          <div className="space-y-2">
            {gefiltert.map(h => {
              const gruppeId = Object.entries(zuteilungen).find(([_, hid]) => hid === h.id)?.[0];
              const gruppe = gruppeId ? gruppen.find(g => g.id === gruppeId) : undefined;

              return (
                <div key={h.id} className="bg-white border rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm text-slate-800">{h.name}</span>
                      {h.klasse && <span className="text-xs text-slate-400 ml-1">({h.klasse})</span>}
                    </div>
                    {gruppe ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {gruppe.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Unzugewiesen</span>
                    )}
                  </div>
                  {h.freitext && (
                    <div className="text-xs text-slate-400 italic border-l-2 border-amber-200 pl-2 mt-1.5">„{h.freitext}"</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hilfsfunktionen & Komponenten ────────────────────────────────────────────

function StatusBadge({ status, spielName }: { status: string; spielName?: string }) {
  if (status === 'springer') return (
    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Springer</span>
  );
  if (status === 'zugewiesen') return (
    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{spielName}</span>
  );
  return <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Frei</span>;
}

function LoadingState() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="animate-spin text-gray-400" size={24} />
    </div>
  );
}
