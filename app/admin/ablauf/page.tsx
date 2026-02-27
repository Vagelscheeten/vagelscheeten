'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Save, X, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type AblaufEintrag = {
  id: string;
  event_id: string | null;
  uhrzeit: string;
  titel: string;
  beschreibung: string | null;
  icon: string | null;
  farbe: string;
  sortierung: number;
  ist_highlight: boolean;
  hinweis: string | null;
};

type Event = {
  id: string;
  name: string;
  jahr: number;
  ist_aktiv: boolean;
};

type SectionSettings = {
  badge: string;
  titel: string;
  untertitel: string;
};

const FARB_OPTIONEN = [
  { value: 'primary',   label: 'Rot',        hex: '#E7432C' },
  { value: 'secondary', label: 'Orange',     hex: '#F2A03D' },
  { value: 'tertiary',  label: 'Grün',       hex: '#27AE60' },
  { value: 'accent',    label: 'Gold',       hex: '#F6C91C' },
  { value: 'green',     label: 'Dunkelgrün', hex: '#33665B' },
];

// Common emojis for a school festival
const EMOJI_OPTIONS = [
  '📌', '🎉', '🎊', '🎈', '🎁', '🎵', '🎶', '🎤', '🎭', '🎪',
  '🏆', '🥇', '🎯', '🎮', '⚽', '🏈', '🎾', '🎳', '🏹', '🎨',
  '🍦', '🍕', '🎂', '🧁', '🥤', '☀️', '🌈', '👑', '⭐', '🌟',
  '🔔', '⏰', '🚶', '🏃', '🤝', '🎓', '👨‍👩‍👧‍👦', '🧒', '📸', '🐦',
  '🎺', '🥁', '🎸', '📣', '🏫', '🚀', '✅', '👋', '🦅', '🎠',
];

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200 mb-2 max-h-36 overflow-y-auto">
        {EMOJI_OPTIONS.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={`text-xl p-1.5 rounded-md hover:bg-white transition-colors leading-none ${
              value === emoji ? 'bg-white shadow-sm ring-2 ring-blue-400' : ''
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
        placeholder="Oder eigenes Emoji / Text eingeben …"
      />
    </div>
  );
}

const emptyNew = { uhrzeit: '', titel: '', beschreibung: '', icon: '📌', farbe: 'secondary', sortierung: 0, ist_highlight: false, hinweis: '' };

export default function AblaufAdmin() {
  const [eintraege, setEintraege] = useState<AblaufEintrag[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newEintrag, setNewEintrag] = useState(emptyNew);

  // Section header settings
  const [sectionSettings, setSectionSettings] = useState<SectionSettings>({ badge: '', titel: 'Ablaufplan', untertitel: '' });
  const [savingSection, setSavingSection] = useState(false);

  const supabase = createClient();

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { if (selectedEventId) loadEintraege(); }, [selectedEventId]);

  const loadEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('jahr', { ascending: false });
    if (data) {
      setEvents(data);
      const active = data.find(e => e.ist_aktiv);
      if (active) setSelectedEventId(active.id);
    }
    loadSectionSettings();
  };

  const loadSectionSettings = async () => {
    const { data } = await supabase
      .from('seiteneinstellungen')
      .select('value')
      .eq('key', 'ablauf')
      .maybeSingle();
    if (data?.value) {
      setSectionSettings(prev => ({ ...prev, ...(data.value as Partial<SectionSettings>) }));
    }
  };

  const saveSectionSettings = async () => {
    setSavingSection(true);
    const { error } = await supabase.from('seiteneinstellungen').upsert({
      key: 'ablauf',
      value: sectionSettings,
      updated_at: new Date().toISOString(),
    });
    setSavingSection(false);
    if (error) toast.error('Fehler: ' + error.message);
    else toast.success('Abschnittsüberschriften gespeichert');
  };

  const loadEintraege = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ablauf_eintraege')
      .select('*')
      .eq('event_id', selectedEventId)
      .order('sortierung');
    if (data) setEintraege(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newEintrag.uhrzeit || !newEintrag.titel) {
      toast.error('Uhrzeit und Titel sind Pflichtfelder');
      return;
    }
    const sortierung = eintraege.length > 0 ? Math.max(...eintraege.map(e => e.sortierung)) + 1 : 1;
    const { error } = await supabase.from('ablauf_eintraege').insert({
      ...newEintrag,
      event_id: selectedEventId,
      sortierung,
      beschreibung: newEintrag.beschreibung || null,
      hinweis: newEintrag.hinweis || null,
    });
    if (error) { toast.error('Fehler: ' + error.message); return; }
    toast.success('Eintrag gespeichert');
    setShowNew(false);
    setNewEintrag(emptyNew);
    loadEintraege();
  };

  const handleUpdate = async (eintrag: AblaufEintrag) => {
    const { error } = await supabase
      .from('ablauf_eintraege')
      .update({
        uhrzeit: eintrag.uhrzeit,
        titel: eintrag.titel,
        beschreibung: eintrag.beschreibung,
        icon: eintrag.icon,
        farbe: eintrag.farbe,
        ist_highlight: eintrag.ist_highlight,
        hinweis: eintrag.hinweis,
      })
      .eq('id', eintrag.id);
    if (error) { toast.error('Fehler: ' + error.message); return; }
    toast.success('Eintrag aktualisiert');
    setEditingId(null);
    loadEintraege();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Diesen Eintrag wirklich löschen?')) return;
    await supabase.from('ablauf_eintraege').delete().eq('id', id);
    loadEintraege();
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= eintraege.length) return;
    const updated = [...eintraege];
    const temp = updated[index].sortierung;
    updated[index].sortierung = updated[newIndex].sortierung;
    updated[newIndex].sortierung = temp;
    await Promise.all([
      supabase.from('ablauf_eintraege').update({ sortierung: updated[index].sortierung }).eq('id', updated[index].id),
      supabase.from('ablauf_eintraege').update({ sortierung: updated[newIndex].sortierung }).eq('id', updated[newIndex].id),
    ]);
    loadEintraege();
  };

  const updateEditing = (id: string, field: keyof AblaufEintrag, value: string | boolean) => {
    setEintraege(prev => prev.map(ei => ei.id === id ? { ...ei, [field]: value } : ei));
  };

  const farbeDot = (farbe: string) => {
    const opt = FARB_OPTIONEN.find(f => f.value === farbe);
    return opt ? (
      <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: opt.hex }} />
    ) : null;
  };

  return (
    <main className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ablaufplan verwalten</h1>
          <p className="text-sm text-slate-500 mt-1">Tagesablauf und Seitenüberschriften für die Webseite</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Neuer Eintrag
        </button>
      </div>

      {/* ── Section header settings ── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>📝</span> Abschnittsüberschriften (Webseite)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Badge</label>
              <input
                value={sectionSettings.badge}
                onChange={e => setSectionSettings(p => ({ ...p, badge: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder={`Programm ${new Date().getFullYear()}`}
              />
              <p className="text-xs text-gray-400 mt-1">Kleines Label über der Überschrift</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Überschrift</label>
              <input
                value={sectionSettings.titel}
                onChange={e => setSectionSettings(p => ({ ...p, titel: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="Ablaufplan"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Subheadline</label>
              <input
                value={sectionSettings.untertitel}
                onChange={e => setSectionSettings(p => ({ ...p, untertitel: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="Unser buntes Programm …"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={saveSectionSettings}
              disabled={savingSection}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {savingSection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Event picker ── */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Event:</label>
        <select
          value={selectedEventId}
          onChange={e => setSelectedEventId(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name} {ev.ist_aktiv ? '(aktiv)' : ''}</option>
          ))}
        </select>
      </div>

      {/* ── New entry form ── */}
      {showNew && (
        <Card className="mb-6 border-blue-200 bg-blue-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Neuer Ablauf-Eintrag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Uhrzeit *</label>
                <input value={newEintrag.uhrzeit} onChange={e => setNewEintrag(p => ({ ...p, uhrzeit: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="z.B. 09:00 Uhr" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Titel *</label>
                <input value={newEintrag.titel} onChange={e => setNewEintrag(p => ({ ...p, titel: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="z.B. Treffen aller Helfer" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Icon</label>
                <EmojiPicker value={newEintrag.icon} onChange={v => setNewEintrag(p => ({ ...p, icon: v }))} />
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Farbe</label>
                  <select value={newEintrag.farbe} onChange={e => setNewEintrag(p => ({ ...p, farbe: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    {FARB_OPTIONEN.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input type="checkbox" id="highlight-new" checked={newEintrag.ist_highlight} onChange={e => setNewEintrag(p => ({ ...p, ist_highlight: e.target.checked }))} className="rounded" />
                  <label htmlFor="highlight-new" className="text-sm">Highlight-Eintrag</label>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Beschreibung</label>
                <textarea value={newEintrag.beschreibung} onChange={e => setNewEintrag(p => ({ ...p, beschreibung: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" rows={2} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Hinweis <span className="text-gray-400 font-normal">(wird rot hervorgehoben)</span></label>
                <input value={newEintrag.hinweis} onChange={e => setNewEintrag(p => ({ ...p, hinweis: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="z.B. Bitte pünktlich erscheinen" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleCreate} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><Save className="w-4 h-4" /> Speichern</button>
              <button onClick={() => setShowNew(false)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"><X className="w-4 h-4" /> Abbrechen</button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Entry list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Laden…
        </div>
      ) : eintraege.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Clock className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">Noch keine Einträge für dieses Event.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {eintraege.map((eintrag, index) => (
            <Card key={eintrag.id} className={eintrag.ist_highlight ? 'border-amber-300 bg-amber-50/40' : ''}>
              <CardContent className="py-3 px-4">
                {editingId === eintrag.id ? (
                  /* ── Edit mode ── */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-500">Uhrzeit</label>
                      <input value={eintrag.uhrzeit} onChange={e => updateEditing(eintrag.id, 'uhrzeit', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-500">Titel</label>
                      <input value={eintrag.titel} onChange={e => updateEditing(eintrag.id, 'titel', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-gray-500">Icon</label>
                      <EmojiPicker value={eintrag.icon || ''} onChange={v => updateEditing(eintrag.id, 'icon', v)} />
                    </div>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-500">Farbe</label>
                        <select value={eintrag.farbe} onChange={e => updateEditing(eintrag.id, 'farbe', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                          {FARB_OPTIONEN.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id={`hl-${eintrag.id}`} checked={eintrag.ist_highlight} onChange={e => updateEditing(eintrag.id, 'ist_highlight', e.target.checked)} className="rounded" />
                        <label htmlFor={`hl-${eintrag.id}`} className="text-sm">Highlight</label>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1 text-gray-500">Beschreibung</label>
                      <textarea value={eintrag.beschreibung || ''} onChange={e => updateEditing(eintrag.id, 'beschreibung', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" rows={2} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1 text-gray-500">Hinweis</label>
                      <input value={eintrag.hinweis || ''} onChange={e => updateEditing(eintrag.id, 'hinweis', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Roter Hinweistext …" />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <button onClick={() => handleUpdate(eintrag)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"><Save className="w-4 h-4" /> Speichern</button>
                      <button onClick={() => { setEditingId(null); loadEintraege(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-sm hover:bg-slate-200"><X className="w-4 h-4" /> Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Sort controls */}
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none text-xs">▲</button>
                        <button onClick={() => moveItem(index, 'down')} disabled={index === eintraege.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none text-xs">▼</button>
                      </div>
                      {/* Icon */}
                      <span className="text-2xl flex-shrink-0">{eintrag.icon || '📌'}</span>
                      {/* Color dot */}
                      {farbeDot(eintrag.farbe)}
                      {/* Content */}
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-gray-900">{eintrag.uhrzeit} – {eintrag.titel}</div>
                        {eintrag.beschreibung && <div className="text-gray-500 text-xs mt-0.5 truncate">{eintrag.beschreibung}</div>}
                        {eintrag.hinweis && <div className="text-red-500 text-xs mt-0.5 font-medium">⚠️ {eintrag.hinweis}</div>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditingId(eintrag.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(eintrag.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
