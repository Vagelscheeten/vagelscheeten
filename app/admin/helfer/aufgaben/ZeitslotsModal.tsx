'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, X, Loader2, MapPin, Clock } from 'lucide-react';

interface Zeitslot {
  id: string;
  aufgabe_id: string;
  titel: string;
  standort: string | null;
  start_zeit: string; // "HH:MM" oder "HH:MM:SS"
  end_zeit: string;
  bedarf: number;
  sortierung: number;
}

interface NeuerSlot {
  titel: string;
  standort: string;
  start_zeit: string;
  end_zeit: string;
  bedarf: number;
}

interface Props {
  aufgabe: { id: string; titel: string } | null;
  onClose: () => void;
}

const emptyNew: NeuerSlot = {
  titel: 'Betreuung',
  standort: '',
  start_zeit: '09:00',
  end_zeit: '10:00',
  bedarf: 3,
};

function normalizeTime(t: string): string {
  // accepts "HH:MM" or "HH:MM:SS", returns "HH:MM"
  return t.substring(0, 5);
}

export function ZeitslotsModal({ aufgabe, onClose }: Props) {
  const [slots, setSlots] = useState<Zeitslot[]>([]);
  const [loading, setLoading] = useState(true);
  const [neu, setNeu] = useState<NeuerSlot | null>(null);
  const [editing, setEditing] = useState<Zeitslot | null>(null);
  const [saving, setSaving] = useState(false);

  const lade = useCallback(async () => {
    if (!aufgabe) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('helferaufgabe_zeitslots')
      .select('id, aufgabe_id, titel, standort, start_zeit, end_zeit, bedarf, sortierung')
      .eq('aufgabe_id', aufgabe.id)
      .order('sortierung')
      .order('start_zeit');
    setSlots((data || []) as Zeitslot[]);
    setLoading(false);
  }, [aufgabe]);

  useEffect(() => { lade(); }, [lade]);

  const erstelleSlot = async () => {
    if (!neu || !aufgabe) return;
    if (!neu.titel.trim() || !neu.start_zeit || !neu.end_zeit) {
      toast.error('Titel, Start- und Endzeit sind Pflichtfelder');
      return;
    }
    if (neu.end_zeit <= neu.start_zeit) {
      toast.error('Endzeit muss nach Startzeit liegen');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const maxSort = slots.reduce((m, s) => Math.max(m, s.sortierung), 0);
    const { error } = await supabase.from('helferaufgabe_zeitslots').insert({
      aufgabe_id: aufgabe.id,
      titel: neu.titel.trim(),
      standort: neu.standort.trim() || null,
      start_zeit: neu.start_zeit,
      end_zeit: neu.end_zeit,
      bedarf: neu.bedarf,
      sortierung: maxSort + 10,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Zeitslot hinzugefügt');
    setNeu(null);
    lade();
  };

  const speichereSlot = async (slot: Zeitslot) => {
    if (slot.end_zeit <= slot.start_zeit) {
      toast.error('Endzeit muss nach Startzeit liegen');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('helferaufgabe_zeitslots')
      .update({
        titel: slot.titel.trim(),
        standort: slot.standort?.trim() || null,
        start_zeit: normalizeTime(slot.start_zeit),
        end_zeit: normalizeTime(slot.end_zeit),
        bedarf: slot.bedarf,
      })
      .eq('id', slot.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Zeitslot gespeichert');
    setEditing(null);
    lade();
  };

  const loescheSlot = async (slot: Zeitslot) => {
    if (!confirm(`Slot "${slot.titel}" (${normalizeTime(slot.start_zeit)}–${normalizeTime(slot.end_zeit)}) wirklich löschen?\n\nBereits zugeteilte Helfer verlieren ihre Slot-Zuordnung (Aufgabe bleibt).`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('helferaufgabe_zeitslots').delete().eq('id', slot.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Zeitslot gelöscht');
    lade();
  };

  if (!aufgabe) return null;

  const bedarfSumme = slots.reduce((s, x) => s + x.bedarf, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">Zeitslots verwalten</h3>
            <p className="text-xs text-slate-500">{aufgabe.titel} · {slots.length} Slot{slots.length !== 1 ? 's' : ''} · Bedarf-Summe {bedarfSumme}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-xs text-slate-600">
            Definiere die einzelnen Zeitslots dieser Aufgabe (z.B. „Aufbau", „Betreuung", „Abbau"). Bei mehreren
            Standorten (Cafeteria 1 / 2) trage diese im Feld „Standort" ein. Die Bedarf-Summe sollte zum Aufgaben-Bedarf passen.
          </p>
        </div>

        <div className="overflow-auto px-5 py-3 space-y-2 flex-1">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
          ) : slots.length === 0 && !neu ? (
            <p className="text-sm text-slate-500 text-center py-8">Noch keine Zeitslots definiert.</p>
          ) : (
            slots.map((s) => (
              <SlotZeile
                key={s.id}
                slot={s}
                editing={editing?.id === s.id ? editing : null}
                onStart={() => setEditing({ ...s, start_zeit: normalizeTime(s.start_zeit), end_zeit: normalizeTime(s.end_zeit) })}
                onChange={setEditing}
                onCancel={() => setEditing(null)}
                onSave={() => editing && speichereSlot(editing)}
                onDelete={() => loescheSlot(s)}
                saving={saving}
              />
            ))
          )}

          {neu && (
            <div className="grid grid-cols-12 gap-2 items-center p-2 rounded-md border border-orange-200 bg-orange-50/40">
              <input
                type="text"
                autoFocus
                placeholder="Titel (z.B. Aufbau)"
                value={neu.titel}
                onChange={(e) => setNeu({ ...neu, titel: e.target.value })}
                className="col-span-4 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
              />
              <input
                type="text"
                placeholder="Standort (optional)"
                value={neu.standort}
                onChange={(e) => setNeu({ ...neu, standort: e.target.value })}
                className="col-span-3 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
              />
              <input
                type="time"
                value={neu.start_zeit}
                onChange={(e) => setNeu({ ...neu, start_zeit: e.target.value })}
                className="col-span-2 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
              />
              <input
                type="time"
                value={neu.end_zeit}
                onChange={(e) => setNeu({ ...neu, end_zeit: e.target.value })}
                className="col-span-2 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
              />
              <input
                type="number"
                min={1}
                value={neu.bedarf}
                onChange={(e) => setNeu({ ...neu, bedarf: parseInt(e.target.value) || 1 })}
                className="col-span-1 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
              />
              <div className="col-span-12 flex gap-2 justify-end pt-1">
                <button onClick={() => setNeu(null)} className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1">Abbrechen</button>
                <button onClick={erstelleSlot} disabled={saving} className="text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded inline-flex items-center gap-1 disabled:opacity-50">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Speichern
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-between">
          <button
            onClick={() => setNeu(emptyNew)}
            disabled={!!neu}
            className="text-sm inline-flex items-center gap-1.5 border border-slate-200 rounded-md px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus size={14} />
            Zeitslot hinzufügen
          </button>
          <button onClick={onClose} className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5">
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}

function SlotZeile({
  slot, editing, onStart, onChange, onCancel, onSave, onDelete, saving,
}: {
  slot: Zeitslot;
  editing: Zeitslot | null;
  onStart: () => void;
  onChange: (s: Zeitslot) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  if (editing) {
    return (
      <div className="grid grid-cols-12 gap-2 items-center p-2 rounded-md border border-orange-300 bg-orange-50/40">
        <input
          type="text"
          value={editing.titel}
          onChange={(e) => onChange({ ...editing, titel: e.target.value })}
          className="col-span-4 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
        />
        <input
          type="text"
          placeholder="Standort"
          value={editing.standort || ''}
          onChange={(e) => onChange({ ...editing, standort: e.target.value })}
          className="col-span-3 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
        />
        <input
          type="time"
          value={normalizeTime(editing.start_zeit)}
          onChange={(e) => onChange({ ...editing, start_zeit: e.target.value })}
          className="col-span-2 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
        />
        <input
          type="time"
          value={normalizeTime(editing.end_zeit)}
          onChange={(e) => onChange({ ...editing, end_zeit: e.target.value })}
          className="col-span-2 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
        />
        <input
          type="number"
          min={1}
          value={editing.bedarf}
          onChange={(e) => onChange({ ...editing, bedarf: parseInt(e.target.value) || 1 })}
          className="col-span-1 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
        />
        <div className="col-span-12 flex gap-2 justify-end pt-1">
          <button onClick={onCancel} className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1">Abbrechen</button>
          <button onClick={onSave} disabled={saving} className="text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded inline-flex items-center gap-1 disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Speichern
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer" onClick={onStart}>
      <span className="col-span-4 text-sm font-medium text-slate-800 truncate">{slot.titel}</span>
      <span className="col-span-3 text-xs text-slate-500 truncate inline-flex items-center gap-1">
        {slot.standort ? <><MapPin size={11} />{slot.standort}</> : <span className="text-slate-300">—</span>}
      </span>
      <span className="col-span-3 text-sm text-slate-600 tabular-nums inline-flex items-center gap-1">
        <Clock size={11} className="text-slate-400" />
        {normalizeTime(slot.start_zeit)} – {normalizeTime(slot.end_zeit)}
      </span>
      <span className="col-span-1 text-sm text-slate-700 tabular-nums text-right">{slot.bedarf}</span>
      <div className="col-span-1 flex justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
          title="Löschen"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
