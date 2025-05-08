"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import LogModal from './LogModal';

interface Event {
  id: string;
  name: string;
  jahr: number;
}

interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  geschlecht: string;
  klasse: string;
}

function KinderTabelle({ eventId }: { eventId: string | null }) {
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editKind, setEditKind] = useState<Kind | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [logKindId, setLogKindId] = useState<string|null>(null);
  const [logOpen, setLogOpen] = useState(false);

  function handleShowLog(kindId: string) {
    setLogKindId(kindId);
    setLogOpen(true);
  }
  function handleCloseLog() {
    setLogOpen(false);
    setTimeout(() => setLogKindId(null), 300); // für Animation, falls gewünscht
  }

  function handleEditKind(kind: Kind) {
    setEditKind(kind);
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!editKind) return;
    setEditLoading(true);
    setEditError(null);
    const supabase = createClient();

    // Altes Kind-Objekt für Logging suchen
    const oldKind = kinder.find(k => k.id === editKind.id);

    // Kind-Datensatz aktualisieren
    const { error } = await supabase.from('kinder').update({
      vorname: editKind.vorname,
      nachname: editKind.nachname,
      geschlecht: editKind.geschlecht,
      klasse: editKind.klasse
    }).eq('id', editKind.id);

    // User-Email für Log holen
    let userEmail = 'unbekannt';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) userEmail = user.email;
    } catch {}

    // Log-Eintrag schreiben, wenn Update erfolgreich
    if (!error) {
      await supabase.from('kinder_log').insert([
        {
          kind_id: editKind.id,
          event_id: (oldKind && 'event_id' in oldKind) ? oldKind.event_id : null,
          action: 'update',
          altwerte: oldKind || null,
          neuwert: editKind,
          user_email: userEmail,
        }
      ]);
      setEditKind(null);
      // Liste neu laden
      if (eventId) fetchKinder(eventId);
    } else {
      setEditError('Fehler beim Speichern: ' + error.message);
    }
    setEditLoading(false);
  }

  function handleCancelEdit() {
    setEditKind(null);
  }

  function handleEditField(field: keyof Kind, value: string) {
    setEditKind(k => k ? { ...k, [field]: value } : k);
  }

  async function fetchKinder(eventId: string) {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('kinder')
      .select('id, vorname, nachname, geschlecht, klasse')
      .eq('event_id', eventId)
      .order('nachname', { ascending: true });
    if (!error && data) {
      setKinder(data);
    } else {
      setError(error?.message ?? 'Unbekannter Fehler');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!eventId) {
      setKinder([]);
      return;
    }
    fetchKinder(eventId);
  }, [eventId]);

  if (!eventId) {
    return <div className="text-gray-400">Bitte wähle ein Event/Jahrgang.</div>;
  }
  if (loading) {
    return <div className="text-gray-500">Lade Kinder ...</div>;
  }
  if (error) {
    return <div className="text-red-500">{error}</div>;
  }
  if (kinder.length === 0) {
    return <div className="text-gray-400">Keine Kinder für dieses Event gefunden.</div>;
  }
  return (
    <>
      <table className="min-w-full text-left">
        <thead>
          <tr>
            <th className="p-2">Vorname</th>
            <th className="p-2">Nachname</th>
            <th className="p-2">Geschlecht</th>
            <th className="p-2">Klasse</th>
            <th className="p-2">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {kinder.map(kind => (
            <tr key={kind.id}>
              <td className="p-2">{kind.vorname}</td>
              <td className="p-2">{kind.nachname}</td>
              <td className="p-2">{kind.geschlecht}</td>
              <td className="p-2">{kind.klasse}</td>
              <td className="p-2 text-gray-400">
                <button
                  className="hover:text-blue-600 mr-2"
                  title="Bearbeiten"
                  onClick={() => handleEditKind(kind)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 113.182 3.182L7.5 20.182 3 21l.818-4.5L16.862 4.487z" />
                  </svg>
                </button>
                <button
                  className="hover:text-green-600"
                  title="Änderungsprotokoll anzeigen"
                  onClick={() => handleShowLog(kind.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8h9m-9 4h9m-9 4h9M4.5 6.75A2.25 2.25 0 016.75 4.5h10.5a2.25 2.25 0 012.25 2.25v14.25a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V6.75z" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Edit Modal */}
      {editKind && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded shadow-lg p-6 min-w-[320px] relative">
            <h3 className="text-lg font-semibold mb-4">Kind bearbeiten</h3>
            <div className="mb-2">
              <label className="block text-sm font-medium">Vorname</label>
              <input
                className="border rounded p-1 w-full"
                value={editKind?.vorname ?? ''}
                onChange={e => handleEditField('vorname', e.target.value)}
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium">Nachname</label>
              <input
                className="border rounded p-1 w-full"
                value={editKind?.nachname ?? ''}
                onChange={e => handleEditField('nachname', e.target.value)}
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium">Geschlecht</label>
              <select
                className="border rounded p-1 w-full"
                value={editKind?.geschlecht ?? ''}
                onChange={e => handleEditField('geschlecht', e.target.value)}
              >
                <option value="">Geschlecht wählen</option>
                <option value="Junge">Junge</option>
                <option value="Mädchen">Mädchen</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium">Klasse</label>
              <input
                className="border rounded p-1 w-full"
                value={editKind?.klasse ?? ''}
                onChange={e => handleEditField('klasse', e.target.value)}
                placeholder="z.B. 3a, 2b, Schulis"
              />
            </div>
            {editError && <div className="text-red-600 mb-2">{editError}</div>}
            <div className="flex gap-2 justify-end mt-4">
              <button className="px-3 py-1 rounded bg-gray-200" onClick={handleCancelEdit} disabled={editLoading}>Abbrechen</button>
              <button className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={handleSaveEdit} disabled={editLoading}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </>

  );
}

// --- weitere Komponenten folgen ---

function ImportDialog({ eventId }: { eventId: string | null }) {
  const [batchKlasseStufe, setBatchKlasseStufe] = useState('');
  const [batchKlasseBuchstabe, setBatchKlasseBuchstabe] = useState('');
  const [step, setStep] = useState<'idle'|'preview'|'success'>('idle');
  const [rawData, setRawData] = useState<string>('');
  const [rows, setRows] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // ...rest wie gehabt...

  function canImport() {
    // Mindestens eine Zeile mit Vorname, Nachname, eventId, geschlecht, klasse
    return rows.length > 0 && rows.every(row => row.vorname && row.nachname && eventId && row.geschlecht && row.klasse);
  }

  async function handleImport() {
    if (!canImport() || !eventId) return;
    setImporting(true);
    const supabase = createClient();
    // Baue Insert-Objekte
    const insertRows = rows.map(row => ({
      vorname: row.vorname,
      nachname: row.nachname,
      geschlecht: row.geschlecht,
      klasse: row.klasse,
      event_id: eventId
    }));
    const { error } = await supabase.from('kinder').insert(insertRows);
    setImporting(false);
    if (!error) {
      setImportSuccess(true);
      setStep('success');
    } else {
      alert('Fehler beim Import: ' + error.message);
    }
  }


  // Dummy parser für Demo-Zwecke (CSV mit ; oder ,)
  function parseCSV(text: string): any[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 1) return [];
    const sep = lines[0].includes(';') ? ';' : ',';
    const header = lines[0].split(sep).map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(sep);
      const obj: any = {};
      header.forEach((h, i) => obj[h] = vals[i]?.trim() ?? '');
      return obj;
    });
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setRawData(e.target.value);
  }

  function handlePreview() {
    setRows(parseCSV(rawData));
    setStep('preview');
    setSelectedRows([]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // XLS(X) einlesen (Textfeld bleibt leer!)
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        if (json.length < 1) return;
        const header = (json[0] as string[]).map(h => h.trim().toLowerCase());
        const rows = json.slice(1).map((row: any) => {
          const obj: any = {};
          header.forEach((h, i) => obj[h] = row[i]?.toString().trim() ?? '');
          return obj;
        });
        setRawData(''); // Textfeld leeren!
        setRows(rows);
        setStep('preview');
        setSelectedRows([]);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV/TXT
      const reader = new FileReader();
      reader.onload = (ev) => {
        setRawData(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  }

  function handleSelectRow(idx: number) {
    setSelectedRows(sel => sel.includes(idx) ? sel.filter(i => i !== idx) : [...sel, idx]);
  }

  function handleBatchSet(field: string, value: string) {
    setRows(rows => rows.map((row, idx) => selectedRows.includes(idx) ? { ...row, [field]: value } : row));
  }

  if (!eventId) {
    return <div className="text-gray-400">Bitte wähle zuerst ein Event/Jahrgang.</div>;
  }

  return (
    <div className="border rounded p-4 bg-gray-50">
      {step === 'idle' && (
        <>
          <p className="mb-2">Importiere Kinder per Excel/CSV oder füge sie als Text ein.</p>
          <input type="file" accept=".csv,.txt,.xls,.xlsx" className="mb-2" onChange={handleFileChange} />
          <textarea
            className="w-full border rounded p-2 mb-2"
            rows={4}
            placeholder="Vorname,Nachname\nMax,Mustermann\n..."
            value={rawData}
            onChange={handleTextChange}
          />
          <button className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={handlePreview} disabled={!rawData.trim()}>
            Vorschau anzeigen
          </button>
        </>
      )}
      {step === 'preview' && (
        <>
          <div className="mb-2 flex gap-2">
            <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => setStep('idle')}>Zurück</button>
            <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={handleImport} disabled={importing || !canImport()}>{importing ? 'Importiere...' : 'Importieren'}</button>
          </div>
          <div className="mb-2 flex gap-4 items-center">
            <button className="px-2 py-1 bg-gray-100 rounded border hover:bg-gray-200" onClick={() => setSelectedRows([])} type="button">
              Auswahl aufheben
            </button>
            <button
              className="px-2 py-1 bg-gray-100 rounded border hover:bg-gray-200"
              onClick={() => setSelectedRows(rows.map((_, idx) => idx))}
              type="button"
              disabled={selectedRows.length === rows.length}
            >
              Alle auswählen
            </button>
            <span>Batch-Zuweisung für Auswahl:</span>
            <select className="border rounded p-1" onChange={e => handleBatchSet('geschlecht', e.target.value)} defaultValue="">
              <option value="">Geschlecht wählen</option>
              <option value="Mädchen">Mädchen</option>
              <option value="Junge">Junge</option>
            </select>
            {/* Neue Klassen-Batchauswahl: */}
            <select
              className="border rounded p-1"
              value={batchKlasseStufe}
              onChange={e => setBatchKlasseStufe(e.target.value)}
            >
              <option value="">Klasse wählen</option>
              <option value="Schulis">Schulis</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
            <select
              className="border rounded p-1"
              value={batchKlasseBuchstabe}
              onChange={e => setBatchKlasseBuchstabe(e.target.value)}
              disabled={batchKlasseStufe === '' || batchKlasseStufe === 'Schulis'}
            >
              <option value="">-</option>
              <option value="a">a</option>
              <option value="b">b</option>
            </select>
            <button
              className="ml-2 px-2 py-1 bg-gray-100 rounded border hover:bg-gray-200"
              type="button"
              onClick={() => { setBatchKlasseStufe(''); setBatchKlasseBuchstabe(''); }}
            >Zurücksetzen</button>
            <button
              className="ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              type="button"
              disabled={!batchKlasseStufe}
              onClick={() => {
                const value = batchKlasseStufe === 'Schulis' ? 'Schulis' : batchKlasseStufe + (batchKlasseBuchstabe ? batchKlasseBuchstabe : '');
                handleBatchSet('klasse', value);
              }}
            >Zuweisen</button>
          </div>
          <table className="min-w-full text-left border">
            <thead>
              <tr>
                <th></th>
                {Object.keys(rows[0] ?? { vorname: '', nachname: '', geschlecht: '', klasse: '' }).map(h => (
                  <th key={h} className="p-2 border-b">{h.charAt(0).toUpperCase() + h.slice(1)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className={selectedRows.includes(idx) ? "bg-blue-50 cursor-pointer" : "cursor-pointer"} onClick={() => handleSelectRow(idx)}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(idx)}
                      onChange={() => handleSelectRow(idx)}
                      className="w-5 h-5 cursor-pointer"
                      tabIndex={-1}
                    />
                  </td>
                  {Object.keys(rows[0] ?? { vorname: '', nachname: '', geschlecht: '', klasse: '' }).map(h => (
                    <td key={h} className={`p-2 border-b ${!row[h] && (h === 'geschlecht' || h === 'klasse') ? 'bg-yellow-100' : ''}`}>
                      {row[h] || <span className="text-gray-400">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-sm text-gray-500 mt-2">Gelb markierte Felder sind noch leer.</div>
        </>
      )}
      {step === 'success' && (
        <div className="p-4 text-green-700 bg-green-100 rounded">
          Import erfolgreich! Die Kinder wurden gespeichert.<br />
          <button className="mt-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => window.location.reload()}>Seite neu laden</button>
        </div>
      )}
    </div>
  );
}

export default function KinderVerwaltung() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Lade Events aus Supabase
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('events')
        .select('id, name, jahr')
        .order('jahr', { ascending: false });
      if (!error && data) {
        setEvents(data);
        if (data.length > 0 && !selectedEventId) {
          setSelectedEventId(data[0].id);
        }
      }
      setLoading(false);
    };
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧒 Kinder- & Gruppenverwaltung</h1>
      {/* Event/Jahrgang-Auswahl */}
      <section className="mb-6">
        <label className="block font-semibold mb-1">Event/Jahrgang wählen:</label>
        <select
          className="border rounded px-3 py-2"
          value={selectedEventId || ''}
          onChange={e => setSelectedEventId(e.target.value)}
          disabled={loading || events.length === 0}
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
        <button className="ml-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={!selectedEventId}>Kinder aus Vorjahr übernehmen</button>
      </section>

      {/* Import-Dialog */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Kinder importieren</h2>
        <ImportDialog eventId={selectedEventId} />
      </section>

      {/* Kinder-Tabelle */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Kinder-Liste</h2>
        <div className="border rounded p-4 bg-gray-50">
          <KinderTabelle eventId={selectedEventId} />
        </div>
      </section>

      {/* Änderungsprotokoll Platzhalter */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Änderungsprotokoll</h2>
        <div className="border rounded p-4 bg-gray-50">
          <p className="text-gray-500">Hier wird jede Änderung an den Kinder-Daten protokolliert und angezeigt. (Log-UI folgt)</p>
        </div>
      </section>
    </main>
  );
}


