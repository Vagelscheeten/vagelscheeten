'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Check, X, GripVertical, ArrowLeft, AlertCircle } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import Link from 'next/link';

const MAX_PER_SPIEL = 2;

interface Spiel {
  id: string;
  name: string;
}

interface Helfer {
  id: string;
  name: string;
  klasse?: string;
  istExtern: boolean;
  freitext?: string | null;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function DetailZuteilungPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [helfer, setHelfer] = useState<Helfer[]>([]);
  const [zuteilungen, setZuteilungen] = useState<Record<string, string[]>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
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
              .select(
                'id, kind_id, kind:kinder(id, vorname, nachname, klasse), externer_helfer_id, externe_helfer(id, name)',
              )
              .eq('event_id', event.id)
              .eq('aufgabe_id', aufgabe.id)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from('helfer_spiel_zuteilungen').select('helfer_id, spiel_id'),
        supabase
          .from('helfer_rueckmeldungen')
          .select('kind_id, freitext')
          .eq('event_id', event.id)
          .not('freitext', 'is', null),
      ]);

      // Legacy: Alte 'springer'-Sondereinträge ausräumen — Pool ist jetzt der Springer-Pool.
      await supabase.from('helfer_spiel_zuteilungen').delete().eq('spiel_id', 'springer');

      setSpiele(spieleRes.data || []);

      const freitextByKind: Record<string, string> = {};
      (freitextRes.data || []).forEach((r: any) => {
        if (r.kind_id && r.freitext) freitextByKind[r.kind_id] = r.freitext;
      });

      const transformedHelfer: Helfer[] = (helferRes.data || []).map((h: any) => {
        const kind = Array.isArray(h.kind) ? h.kind[0] : h.kind;
        const ext = Array.isArray(h.externe_helfer) ? h.externe_helfer[0] : h.externe_helfer;
        if (kind) {
          return {
            id: h.id,
            name: `${kind.vorname} ${kind.nachname}`,
            klasse: kind.klasse,
            istExtern: false,
            freitext: freitextByKind[kind.id] || null,
          };
        }
        return { id: h.id, name: ext?.name || 'Externer Helfer', istExtern: true };
      });
      transformedHelfer.sort((a, b) => a.name.localeCompare(b.name, 'de'));
      setHelfer(transformedHelfer);

      const initZuteilungen: Record<string, string[]> = {};
      (zuteilRes.data || []).forEach((z: any) => {
        if (z.spiel_id === 'springer') return;
        if (!initZuteilungen[z.spiel_id]) initZuteilungen[z.spiel_id] = [];
        initZuteilungen[z.spiel_id].push(z.helfer_id);
      });
      setZuteilungen(initZuteilungen);

      setIsLoading(false);
    })();
  }, []);

  const flashSaved = useCallback(() => {
    setSaveState('saved');
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaveState('idle'), 1800);
  }, []);

  const getSpielOf = useCallback(
    (helferId: string): string | null => {
      for (const [spielId, ids] of Object.entries(zuteilungen)) {
        if (ids.includes(helferId)) return spielId;
      }
      return null;
    },
    [zuteilungen],
  );

  const assignToSpiel = useCallback(
    async (helferId: string, spielId: string) => {
      const currentSpiel = getSpielOf(helferId);
      if (currentSpiel === spielId) return;
      if ((zuteilungen[spielId]?.length ?? 0) >= MAX_PER_SPIEL) {
        toast.error('Dieses Spiel hat schon 2 Betreuer.');
        return;
      }

      setZuteilungen((prev) => {
        const next: Record<string, string[]> = {};
        Object.entries(prev).forEach(([sid, ids]) => {
          next[sid] = ids.filter((h) => h !== helferId);
        });
        next[spielId] = [...(next[spielId] || []), helferId];
        return next;
      });
      setSaveState('saving');

      const supabase = createClient();
      try {
        await supabase.from('helfer_spiel_zuteilungen').delete().eq('helfer_id', helferId);
        const { error } = await supabase
          .from('helfer_spiel_zuteilungen')
          .insert({ helfer_id: helferId, spiel_id: spielId });
        if (error) throw error;
        flashSaved();
      } catch (e: any) {
        setSaveState('error');
        toast.error('Fehler beim Speichern: ' + e.message);
        setZuteilungen((prev) => {
          const next = { ...prev };
          next[spielId] = (next[spielId] || []).filter((h) => h !== helferId);
          if (currentSpiel) next[currentSpiel] = [...(next[currentSpiel] || []), helferId];
          return next;
        });
      }
    },
    [zuteilungen, getSpielOf, flashSaved],
  );

  const removeToPool = useCallback(
    async (helferId: string) => {
      const currentSpiel = getSpielOf(helferId);
      if (!currentSpiel) return;

      setZuteilungen((prev) => {
        const next = { ...prev };
        next[currentSpiel] = (next[currentSpiel] || []).filter((h) => h !== helferId);
        return next;
      });
      setSaveState('saving');

      const supabase = createClient();
      try {
        const { error } = await supabase
          .from('helfer_spiel_zuteilungen')
          .delete()
          .eq('helfer_id', helferId);
        if (error) throw error;
        flashSaved();
      } catch (e: any) {
        setSaveState('error');
        toast.error('Fehler beim Speichern: ' + e.message);
        setZuteilungen((prev) => {
          const next = { ...prev };
          next[currentSpiel] = [...(next[currentSpiel] || []), helferId];
          return next;
        });
      }
    },
    [getSpielOf, flashSaved],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    if (!e.over) return;
    const helferId = String(e.active.id);
    const overId = String(e.over.id);
    if (overId === 'pool') {
      removeToPool(helferId);
    } else if (overId.startsWith('spiel:')) {
      assignToSpiel(helferId, overId.slice(6));
    }
  };

  const poolHelfer = useMemo(() => {
    const assigned = new Set<string>();
    Object.values(zuteilungen).forEach((ids) => ids.forEach((id) => assigned.add(id)));
    return helfer.filter((h) => !assigned.has(h.id));
  }, [helfer, zuteilungen]);

  const filteredPool = useMemo(() => {
    if (!filter) return poolHelfer;
    const q = filter.toLowerCase();
    return poolHelfer.filter((h) => h.name.toLowerCase().includes(q));
  }, [poolHelfer, filter]);

  const activeDragHelfer = activeDragId ? helfer.find((h) => h.id === activeDragId) : null;

  if (isLoading) {
    return (
      <main className="p-4 md:p-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 max-w-6xl">
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div className="min-w-0">
          <Link
            href="/admin/helfer"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-1"
          >
            <ArrowLeft size={12} /> Zurück zum Helfer-Workflow
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Spielbetreuer-Zuteilung</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Helfer per Drag &amp; Drop oder Dropdown den Spielen zuweisen. Maximal 2 Betreuer pro Spiel.
            Nicht zugewiesene Helfer bleiben automatisch als Springer im Pool.
          </p>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Spiele ({spiele.length})</h2>
            <div className="text-xs text-slate-400">
              {countComplete(spiele, zuteilungen)} / {spiele.length} komplett
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {spiele.map((spiel) => {
              const ids = zuteilungen[spiel.id] || [];
              const cardHelfer = ids
                .map((id) => helfer.find((h) => h.id === id))
                .filter((h): h is Helfer => Boolean(h));
              return (
                <SpielCard
                  key={spiel.id}
                  spiel={spiel}
                  helfer={cardHelfer}
                  allSpiele={spiele}
                  zuteilungen={zuteilungen}
                  isFull={cardHelfer.length >= MAX_PER_SPIEL}
                  onRemove={removeToPool}
                  onReassign={assignToSpiel}
                />
              );
            })}
          </div>
        </section>

        <PoolSection
          helfer={filteredPool}
          totalInPool={poolHelfer.length}
          filter={filter}
          onFilterChange={setFilter}
          spiele={spiele}
          zuteilungen={zuteilungen}
          onAssign={assignToSpiel}
        />

        <DragOverlay dropAnimation={null}>
          {activeDragHelfer ? (
            <div className="bg-white border-2 border-orange-400 rounded-lg px-3 py-2 shadow-xl text-sm font-medium text-slate-800 pointer-events-none">
              {activeDragHelfer.name}
              {activeDragHelfer.klasse && (
                <span className="text-xs text-slate-400 ml-1">({activeDragHelfer.klasse})</span>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
}

function countComplete(spiele: Spiel[], zuteilungen: Record<string, string[]>): number {
  return spiele.filter((s) => (zuteilungen[s.id]?.length ?? 0) >= MAX_PER_SPIEL).length;
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') {
    return <span className="text-xs text-slate-400">Auto-Speichern aktiv</span>;
  }
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 size={12} className="animate-spin" />
        Wird gespeichert…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
        <Check size={12} />
        Gespeichert
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-red-600">
      <AlertCircle size={12} />
      Fehler beim Speichern
    </span>
  );
}

function SpielCard({
  spiel,
  helfer,
  allSpiele,
  zuteilungen,
  isFull,
  onRemove,
  onReassign,
}: {
  spiel: Spiel;
  helfer: Helfer[];
  allSpiele: Spiel[];
  zuteilungen: Record<string, string[]>;
  isFull: boolean;
  onRemove: (id: string) => void;
  onReassign: (helferId: string, spielId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `spiel:${spiel.id}`, disabled: isFull });
  return (
    <div
      ref={setNodeRef}
      className={`border rounded-xl p-3 transition-colors ${
        isFull
          ? 'bg-green-50 border-green-300'
          : isOver
            ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-200'
            : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-medium text-sm text-slate-800 truncate">{spiel.name}</div>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
            isFull ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isFull ? 'Komplett' : `${helfer.length}/${MAX_PER_SPIEL}`}
        </span>
      </div>
      <div className="space-y-1">
        {Array.from({ length: MAX_PER_SPIEL }).map((_, slotIdx) => {
          const h = helfer[slotIdx];
          if (h) {
            return (
              <AssignedHelferRow
                key={h.id}
                helfer={h}
                allSpiele={allSpiele}
                zuteilungen={zuteilungen}
                currentSpielId={spiel.id}
                onRemove={() => onRemove(h.id)}
                onReassign={(spielId) => onReassign(h.id, spielId)}
              />
            );
          }
          return (
            <div
              key={`empty-${slotIdx}`}
              className="text-[11px] text-slate-400 italic py-2 text-center border border-dashed border-slate-200 rounded-md"
            >
              Helfer hierher ziehen
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssignedHelferRow({
  helfer,
  allSpiele,
  zuteilungen,
  currentSpielId,
  onRemove,
  onReassign,
}: {
  helfer: Helfer;
  allSpiele: Spiel[];
  zuteilungen: Record<string, string[]>;
  currentSpielId: string;
  onRemove: () => void;
  onReassign: (spielId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: helfer.id });
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-1.5 bg-slate-50 rounded-md px-1.5 py-1.5 text-sm ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-0.5 -ml-0.5"
        aria-label="Ziehen"
      >
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-1 flex-wrap">
        <span className="font-medium text-slate-800 truncate">{helfer.name}</span>
        {helfer.klasse && <span className="text-[11px] text-slate-400">({helfer.klasse})</span>}
        {helfer.istExtern && (
          <span className="text-[9px] font-semibold uppercase tracking-wider bg-purple-100 text-purple-700 px-1 py-0.5 rounded">
            extern
          </span>
        )}
      </div>
      <select
        className="text-[11px] border border-slate-200 rounded px-1 py-0.5 text-slate-500 bg-white max-w-[100px]"
        value=""
        onChange={(e) => {
          if (e.target.value) onReassign(e.target.value);
        }}
        aria-label="Auf anderes Spiel verschieben"
      >
        <option value="">→ Spiel</option>
        {allSpiele
          .filter((s) => s.id !== currentSpielId)
          .map((s) => {
            const full = (zuteilungen[s.id]?.length ?? 0) >= MAX_PER_SPIEL;
            return (
              <option key={s.id} value={s.id} disabled={full}>
                {s.name}
                {full ? ' (komplett)' : ''}
              </option>
            );
          })}
      </select>
      <button
        onClick={onRemove}
        className="text-slate-400 hover:text-red-500 p-1"
        aria-label="In Pool zurücklegen"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function PoolSection({
  helfer,
  totalInPool,
  filter,
  onFilterChange,
  spiele,
  zuteilungen,
  onAssign,
}: {
  helfer: Helfer[];
  totalInPool: number;
  filter: string;
  onFilterChange: (s: string) => void;
  spiele: Spiel[];
  zuteilungen: Record<string, string[]>;
  onAssign: (helferId: string, spielId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'pool' });
  return (
    <section
      ref={setNodeRef}
      className={`border rounded-xl p-4 transition-colors ${
        isOver
          ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">
            Pool / Springer ({totalInPool})
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Diese Helfer bleiben als Reserve.
          </p>
        </div>
        <input
          type="text"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Suchen…"
          className="px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-300 bg-white"
        />
      </div>
      {totalInPool === 0 ? (
        <p className="text-xs text-slate-400 italic">Alle Helfer sind einem Spiel zugewiesen.</p>
      ) : helfer.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Kein Treffer für „{filter}".</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {helfer.map((h) => (
            <PoolHelferCard
              key={h.id}
              helfer={h}
              spiele={spiele}
              zuteilungen={zuteilungen}
              onAssign={(spielId) => onAssign(h.id, spielId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PoolHelferCard({
  helfer,
  spiele,
  zuteilungen,
  onAssign,
}: {
  helfer: Helfer;
  spiele: Spiel[];
  zuteilungen: Record<string, string[]>;
  onAssign: (spielId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: helfer.id });
  return (
    <div
      ref={setNodeRef}
      className={`bg-white border border-slate-200 rounded-lg p-2.5 ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <div className="flex items-start gap-1.5 mb-1.5">
        <button
          {...attributes}
          {...listeners}
          className="touch-none text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 mt-0.5"
          aria-label="Ziehen"
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-medium text-sm text-slate-800 truncate">{helfer.name}</span>
            {helfer.klasse && <span className="text-[11px] text-slate-400">({helfer.klasse})</span>}
            {helfer.istExtern && (
              <span className="text-[9px] font-semibold uppercase tracking-wider bg-purple-100 text-purple-700 px-1 py-0.5 rounded">
                extern
              </span>
            )}
          </div>
          {helfer.freitext && (
            <div className="text-[11px] text-slate-500 italic mt-1 border-l-2 border-amber-200 pl-2">
              „{helfer.freitext}"
            </div>
          )}
        </div>
      </div>
      <select
        className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 text-slate-600 bg-white"
        value=""
        onChange={(e) => {
          if (e.target.value) onAssign(e.target.value);
        }}
      >
        <option value="">Zuweisen…</option>
        {spiele.map((s) => {
          const full = (zuteilungen[s.id]?.length ?? 0) >= MAX_PER_SPIEL;
          return (
            <option key={s.id} value={s.id} disabled={full}>
              {s.name}
              {full ? ' (komplett)' : ''}
            </option>
          );
        })}
      </select>
    </div>
  );
}
