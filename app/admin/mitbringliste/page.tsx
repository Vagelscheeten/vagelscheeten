'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, X, Loader2, Sun, Moon, ExternalLink, FileText } from 'lucide-react';
import Link from 'next/link';
import { PageShell, EmptyState } from '@/components/admin';

type Kategorie = 'vormittag' | 'nachmittag';

interface Eintrag {
  id: string;
  event_id: string;
  kategorie: Kategorie;
  zielgruppe: string;
  inhalt: string;
  sortierung: number;
}

interface EventLite {
  id: string;
  name: string;
  mitbringliste_pdf_filename: string | null;
}

interface StorageFile {
  name: string;
}

const KATEGORIE_LABEL: Record<Kategorie, string> = {
  vormittag: 'Spiele am Vormittag',
  nachmittag: 'Fest am Nachmittag',
};

export default function MitbringlisteAdmin() {
  const [event, setEvent] = useState<EventLite | null>(null);
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [pdfFiles, setPdfFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Eintrag | null>(null);
  const [newRow, setNewRow] = useState<{ kategorie: Kategorie; zielgruppe: string; inhalt: string } | null>(null);
  const [savingPdf, setSavingPdf] = useState(false);

  const supabase = createClient();

  const lade = useCallback(async () => {
    setLoading(true);
    const { data: eventData } = await supabase
      .from('events')
      .select('id, name, mitbringliste_pdf_filename')
      .eq('ist_aktiv', true)
      .single();

    if (!eventData) {
      setLoading(false);
      return;
    }
    setEvent(eventData as EventLite);

    const [eintRes, fileRes] = await Promise.all([
      supabase
        .from('mitbringliste_eintraege')
        .select('id, event_id, kategorie, zielgruppe, inhalt, sortierung')
        .eq('event_id', eventData.id)
        .order('kategorie')
        .order('sortierung'),
      supabase.storage.from('downloads').list(''),
    ]);

    setEintraege((eintRes.data || []) as Eintrag[]);
    setPdfFiles((fileRes.data || []).filter((f) => f.name.toLowerCase().endsWith('.pdf')));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { lade(); }, [lade]);

  const speichereEintrag = async (eintrag: Eintrag) => {
    const { error } = await supabase
      .from('mitbringliste_eintraege')
      .update({
        kategorie: eintrag.kategorie,
        zielgruppe: eintrag.zielgruppe.trim(),
        inhalt: eintrag.inhalt.trim(),
        sortierung: eintrag.sortierung,
      })
      .eq('id', eintrag.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Eintrag gespeichert');
    setEditing(null);
    lade();
  };

  const loescheEintrag = async (id: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return;
    const { error } = await supabase.from('mitbringliste_eintraege').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Eintrag gelöscht');
    lade();
  };

  const erstelleEintrag = async () => {
    if (!newRow || !event) return;
    if (!newRow.zielgruppe.trim() || !newRow.inhalt.trim()) {
      toast.error('Zielgruppe und Inhalt sind Pflichtfelder');
      return;
    }
    const maxSortierung = Math.max(
      0,
      ...eintraege.filter((e) => e.kategorie === newRow.kategorie).map((e) => e.sortierung),
    );
    const { error } = await supabase.from('mitbringliste_eintraege').insert({
      event_id: event.id,
      kategorie: newRow.kategorie,
      zielgruppe: newRow.zielgruppe.trim(),
      inhalt: newRow.inhalt.trim(),
      sortierung: maxSortierung + 10,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Eintrag hinzugefügt');
    setNewRow(null);
    lade();
  };

  const setzePdf = async (filename: string | null) => {
    if (!event) return;
    setSavingPdf(true);
    const { error } = await supabase
      .from('events')
      .update({ mitbringliste_pdf_filename: filename })
      .eq('id', event.id);
    setSavingPdf(false);
    if (error) { toast.error(error.message); return; }
    toast.success(filename ? 'PDF verknüpft' : 'PDF-Verknüpfung entfernt');
    setEvent({ ...event, mitbringliste_pdf_filename: filename });
  };

  if (loading) {
    return (
      <PageShell title="Mitbringliste">
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-admin-ink-muted" size={24} /></div>
      </PageShell>
    );
  }

  if (!event) {
    return (
      <PageShell title="Mitbringliste" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Mitbringliste' }]}>
        <EmptyState title="Kein aktives Event" description="Bitte zuerst ein Event aktivieren." />
      </PageShell>
    );
  }

  const pdfUrl = event.mitbringliste_pdf_filename
    ? supabase.storage.from('downloads').getPublicUrl(event.mitbringliste_pdf_filename).data.publicUrl
    : null;

  return (
    <PageShell
      title="Mitbringliste"
      description="Was die Familien am Festtag mitbringen sollen. Inhalt erscheint in der Bestätigungs-E-Mail und als verknüpftes PDF."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Mitbringliste' }]}
    >
      <div className="space-y-6">
        {/* PDF-Verknüpfung */}
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-admin-ink-muted" />
            <h2 className="font-semibold text-admin-ink">PDF-Anhang (Druck-Version)</h2>
          </div>
          <p className="text-sm text-admin-ink-soft mb-3">
            Wähle die PDF-Datei, die in der Bestätigungs-E-Mail als Download-Link erscheinen soll.
            Die Datei muss vorher unter{' '}
            <Link href="/admin/downloads" className="text-admin-accent hover:underline inline-flex items-center gap-1">
              Admin → Downloads <ExternalLink size={12} />
            </Link>{' '}
            hochgeladen werden.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={event.mitbringliste_pdf_filename || ''}
              onChange={(e) => setzePdf(e.target.value || null)}
              disabled={savingPdf}
              className="flex-1 min-w-[260px] px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
            >
              <option value="">— Keine Verknüpfung —</option>
              {pdfFiles.map((f) => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-admin-ink-soft hover:text-admin-ink border border-admin-border bg-white rounded-md px-3 py-2 inline-flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                Vorschau
              </a>
            )}
          </div>
          {!event.mitbringliste_pdf_filename && (
            <p className="text-xs text-amber-700 mt-2">
              Aktuell ist kein PDF verknüpft — die E-Mail enthält dann nur den strukturierten Listen-Inhalt ohne PDF-Link.
            </p>
          )}
        </div>

        {/* Einträge pro Kategorie */}
        {(['vormittag', 'nachmittag'] as Kategorie[]).map((kat) => {
          const liste = eintraege.filter((e) => e.kategorie === kat);
          const Icon = kat === 'vormittag' ? Sun : Moon;
          return (
            <div key={kat} className="rounded-xl border border-admin-border bg-admin-surface p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-admin-ink-muted" />
                  <h2 className="font-semibold text-admin-ink">{KATEGORIE_LABEL[kat]}</h2>
                  <span className="text-xs text-admin-ink-muted">({liste.length})</span>
                </div>
                <button
                  onClick={() => setNewRow({ kategorie: kat, zielgruppe: '', inhalt: '' })}
                  className="text-sm inline-flex items-center gap-1.5 border border-admin-border rounded-md px-3 py-1.5 bg-white hover:bg-slate-50"
                >
                  <Plus size={14} />
                  Eintrag hinzufügen
                </button>
              </div>

              <div className="space-y-1">
                {liste.map((e) => (
                  <EintragZeile
                    key={e.id}
                    eintrag={e}
                    editing={editing?.id === e.id ? editing : null}
                    onStart={() => setEditing(e)}
                    onChange={setEditing}
                    onCancel={() => setEditing(null)}
                    onSave={() => editing && speichereEintrag(editing)}
                    onDelete={() => loescheEintrag(e.id)}
                  />
                ))}
                {liste.length === 0 && (
                  <p className="text-sm text-admin-ink-muted py-3 text-center">Noch keine Einträge in dieser Kategorie.</p>
                )}
                {newRow?.kategorie === kat && (
                  <div className="mt-2 grid grid-cols-12 gap-2 items-center p-2 rounded-md border border-admin-border bg-slate-50">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Zielgruppe (z.B. Klasse 1, alle)"
                      value={newRow.zielgruppe}
                      onChange={(ev) => setNewRow({ ...newRow, zielgruppe: ev.target.value })}
                      className="col-span-3 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Inhalt (z.B. Obst geschnitten)"
                      value={newRow.inhalt}
                      onChange={(ev) => setNewRow({ ...newRow, inhalt: ev.target.value })}
                      className="col-span-7 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
                    />
                    <div className="col-span-2 flex gap-1 justify-end">
                      <button onClick={erstelleEintrag} className="p-1.5 rounded-md bg-admin-accent text-white hover:opacity-90" title="Speichern">
                        <Save size={14} />
                      </button>
                      <button onClick={() => setNewRow(null)} className="p-1.5 rounded-md text-admin-ink-muted hover:text-admin-ink hover:bg-white" title="Abbrechen">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}

function EintragZeile({
  eintrag, editing, onStart, onChange, onCancel, onSave, onDelete,
}: {
  eintrag: Eintrag;
  editing: Eintrag | null;
  onStart: () => void;
  onChange: (e: Eintrag) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  if (editing) {
    return (
      <div className="grid grid-cols-12 gap-2 items-center p-2 rounded-md border border-admin-accent bg-amber-50/30">
        <input
          type="text"
          value={editing.zielgruppe}
          onChange={(ev) => onChange({ ...editing, zielgruppe: ev.target.value })}
          className="col-span-3 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
        />
        <input
          type="text"
          value={editing.inhalt}
          onChange={(ev) => onChange({ ...editing, inhalt: ev.target.value })}
          className="col-span-7 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
        />
        <div className="col-span-2 flex gap-1 justify-end">
          <button onClick={onSave} className="p-1.5 rounded-md bg-admin-accent text-white hover:opacity-90" title="Speichern">
            <Save size={14} />
          </button>
          <button onClick={onCancel} className="p-1.5 rounded-md text-admin-ink-muted hover:text-admin-ink hover:bg-white" title="Abbrechen">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer" onClick={onStart}>
      <span className="col-span-3 text-sm font-medium text-admin-ink-soft truncate">{eintrag.zielgruppe}</span>
      <span className="col-span-7 text-sm text-admin-ink truncate">{eintrag.inhalt}</span>
      <div className="col-span-2 flex gap-1 justify-end">
        <button
          onClick={(ev) => { ev.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-md text-admin-ink-muted hover:text-red-600 hover:bg-red-50"
          title="Löschen"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
