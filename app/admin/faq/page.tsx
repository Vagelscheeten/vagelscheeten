'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Save, X, HelpCircle, FolderOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type FaqKategorie = {
  id: string;
  name: string;
  sortierung: number;
};

type FaqEintrag = {
  id: string;
  kategorie_id: string;
  frage: string;
  antwort: string;
  sortierung: number;
};

export default function FaqAdmin() {
  const [kategorien, setKategorien] = useState<FaqKategorie[]>([]);
  const [eintraege, setEintraege] = useState<FaqEintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewKategorie, setShowNewKategorie] = useState(false);
  const [showNewEintrag, setShowNewEintrag] = useState<string | null>(null);
  const [newKategorieName, setNewKategorieName] = useState('');
  const [newEintrag, setNewEintrag] = useState({ frage: '', antwort: '' });
  const [editKategorieId, setEditKategorieId] = useState<string | null>(null);
  const [editKategorieName, setEditKategorieName] = useState('');

  // FAQ-Header-Einstellungen
  const [heroTitel, setHeroTitel] = useState('');
  const [heroUntertitel, setHeroUntertitel] = useState('');
  const [savingHero, setSavingHero] = useState(false);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [katRes, einRes, settingsRes] = await Promise.all([
      supabase.from('faq_kategorien').select('*').order('sortierung'),
      supabase.from('faq_eintraege').select('*').order('sortierung'),
      supabase.from('seiteneinstellungen').select('value').eq('key', 'faq_hero').single(),
    ]);
    if (katRes.data) setKategorien(katRes.data);
    if (einRes.data) setEintraege(einRes.data);
    if (settingsRes.data?.value) {
      const v = settingsRes.data.value as { titel?: string; untertitel?: string };
      setHeroTitel(v.titel ?? '');
      setHeroUntertitel(v.untertitel ?? '');
    }
    setLoading(false);
  };

  const handleSaveHero = async () => {
    setSavingHero(true);
    const { error } = await supabase
      .from('seiteneinstellungen')
      .upsert({ key: 'faq_hero', value: { titel: heroTitel, untertitel: heroUntertitel }, updated_at: new Date().toISOString() });
    if (error) toast.error('Fehler: ' + error.message);
    else toast.success('FAQ-Header gespeichert!');
    setSavingHero(false);
  };

  const handleCreateKategorie = async () => {
    if (!newKategorieName.trim()) return;
    const sortierung = kategorien.length > 0 ? Math.max(...kategorien.map(k => k.sortierung)) + 1 : 1;
    await supabase.from('faq_kategorien').insert({ name: newKategorieName, sortierung });
    setNewKategorieName('');
    setShowNewKategorie(false);
    loadData();
  };

  const handleUpdateKategorie = async () => {
    if (!editKategorieId || !editKategorieName.trim()) return;
    await supabase.from('faq_kategorien').update({ name: editKategorieName }).eq('id', editKategorieId);
    setEditKategorieId(null);
    loadData();
  };

  const handleDeleteKategorie = async (id: string) => {
    const count = eintraege.filter(e => e.kategorie_id === id).length;
    if (!confirm(`Kategorie löschen? ${count} FAQ-Einträge werden ebenfalls gelöscht.`)) return;
    await supabase.from('faq_kategorien').delete().eq('id', id);
    loadData();
  };

  const handleCreateEintrag = async (kategorieId: string) => {
    if (!newEintrag.frage.trim() || !newEintrag.antwort.trim()) return;
    const katEintraege = eintraege.filter(e => e.kategorie_id === kategorieId);
    const sortierung = katEintraege.length > 0 ? Math.max(...katEintraege.map(e => e.sortierung)) + 1 : 1;
    await supabase.from('faq_eintraege').insert({ ...newEintrag, kategorie_id: kategorieId, sortierung });
    setNewEintrag({ frage: '', antwort: '' });
    setShowNewEintrag(null);
    loadData();
  };

  const handleUpdateEintrag = async (eintrag: FaqEintrag) => {
    await supabase.from('faq_eintraege').update({ frage: eintrag.frage, antwort: eintrag.antwort }).eq('id', eintrag.id);
    setEditingId(null);
    loadData();
  };

  const handleDeleteEintrag = async (id: string) => {
    if (!confirm('Diesen FAQ-Eintrag löschen?')) return;
    await supabase.from('faq_eintraege').delete().eq('id', id);
    loadData();
  };

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">FAQ verwalten</h1>
          <p className="text-sm text-slate-500 mt-1">Häufig gestellte Fragen nach Kategorien organisieren</p>
        </div>
        <Button onClick={() => setShowNewKategorie(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Neue Kategorie
        </Button>
      </div>

      {/* ── FAQ-Header-Einstellungen ── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span>🖊️</span> Seitenheader (FAQ-Seite)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titel <span className="text-gray-400 font-normal">(letztes Wort wird orange hervorgehoben)</span>
              </label>
              <input
                value={heroTitel}
                onChange={(e) => setHeroTitel(e.target.value)}
                placeholder="z. B. Häufig gestellte Fragen"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Untertitel</label>
              <textarea
                value={heroUntertitel}
                onChange={(e) => setHeroUntertitel(e.target.value)}
                placeholder="z. B. Hier findest du Antworten rund um das Melsdörper Vagelscheeten."
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                rows={2}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveHero}
                disabled={savingHero}
                className="flex items-center px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {savingHero ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Speichern
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showNewKategorie && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Kategoriename *</label>
                <input value={newKategorieName} onChange={(e) => setNewKategorieName(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="z.B. Allgemeine Informationen" onKeyDown={(e) => e.key === 'Enter' && handleCreateKategorie()} />
              </div>
              <button onClick={handleCreateKategorie} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save className="w-4 h-4 inline mr-1" /> Speichern</button>
              <button onClick={() => { setShowNewKategorie(false); setNewKategorieName(''); }} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"><X className="w-4 h-4 inline mr-1" /> Abbrechen</button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Laden...</div>
      ) : kategorien.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <HelpCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Noch keine FAQ-Kategorien erstellt.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {kategorien.map(kategorie => {
            const katEintraege = eintraege.filter(e => e.kategorie_id === kategorie.id);

            return (
              <div key={kategorie.id}>
                <div className="flex items-center justify-between mb-3">
                  {editKategorieId === kategorie.id ? (
                    <div className="flex gap-2 items-center flex-1">
                      <input value={editKategorieName} onChange={(e) => setEditKategorieName(e.target.value)} className="p-2 border rounded-lg flex-1" onKeyDown={(e) => e.key === 'Enter' && handleUpdateKategorie()} />
                      <button onClick={handleUpdateKategorie} className="p-2 text-green-600 hover:text-green-700"><Save className="w-5 h-5" /></button>
                      <button onClick={() => setEditKategorieId(null)} className="p-2 text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-semibold flex items-center">
                        <FolderOpen className="w-5 h-5 mr-2 text-blue-600" />
                        {kategorie.name}
                        <span className="ml-2 text-sm font-normal text-gray-500">({katEintraege.length} Einträge)</span>
                      </h2>
                      <div className="flex gap-1">
                        <button onClick={() => setShowNewEintrag(kategorie.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                          <Plus className="w-4 h-4 inline mr-1" /> Frage
                        </button>
                        <button onClick={() => { setEditKategorieId(kategorie.id); setEditKategorieName(kategorie.name); }} className="p-2 text-gray-500 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteKategorie(kategorie.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </>
                  )}
                </div>

                {showNewEintrag === kategorie.id && (
                  <Card className="mb-3 border-green-200 bg-green-50">
                    <CardContent className="py-4">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Frage *</label>
                          <input value={newEintrag.frage} onChange={(e) => setNewEintrag(p => ({ ...p, frage: e.target.value }))} className="w-full p-2 border rounded-lg" placeholder="z.B. Was ist das Vogelschießen?" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Antwort *</label>
                          <textarea value={newEintrag.antwort} onChange={(e) => setNewEintrag(p => ({ ...p, antwort: e.target.value }))} className="w-full p-2 border rounded-lg" rows={3} placeholder="Ausführliche Antwort..." />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleCreateEintrag(kategorie.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Save className="w-4 h-4 inline mr-1" /> Speichern</button>
                          <button onClick={() => { setShowNewEintrag(null); setNewEintrag({ frage: '', antwort: '' }); }} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"><X className="w-4 h-4 inline mr-1" /> Abbrechen</button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  {katEintraege.map(eintrag => (
                    <Card key={eintrag.id}>
                      <CardContent className="py-3">
                        {editingId === eintrag.id ? (
                          <div className="space-y-3">
                            <input value={eintrag.frage} onChange={(e) => setEintraege(prev => prev.map(ei => ei.id === eintrag.id ? { ...ei, frage: e.target.value } : ei))} className="w-full p-2 border rounded-lg font-medium" />
                            <textarea value={eintrag.antwort} onChange={(e) => setEintraege(prev => prev.map(ei => ei.id === eintrag.id ? { ...ei, antwort: e.target.value } : ei))} className="w-full p-2 border rounded-lg" rows={3} />
                            <div className="flex gap-2">
                              <button onClick={() => handleUpdateEintrag(eintrag)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm"><Save className="w-4 h-4 inline mr-1" /> Speichern</button>
                              <button onClick={() => { setEditingId(null); loadData(); }} className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm"><X className="w-4 h-4 inline mr-1" /> Abbrechen</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">{eintrag.frage}</h4>
                              <p className="text-gray-600 text-sm mt-1 line-clamp-2">{eintrag.antwort}</p>
                            </div>
                            <div className="flex gap-1 ml-4 flex-shrink-0">
                              <button onClick={() => setEditingId(eintrag.id)} className="p-2 text-gray-500 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteEintrag(eintrag.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {katEintraege.length === 0 && (
                    <p className="text-gray-400 text-sm pl-2 py-2">Keine FAQ-Einträge in dieser Kategorie.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
