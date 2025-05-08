"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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

  useEffect(() => {
    if (!eventId) {
      setKinder([]);
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    supabase
      .from('kinder')
      .select('id, vorname, nachname, geschlecht, klasse')
      .eq('event_id', eventId)
      .order('nachname', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message || 'Fehler beim Laden der Kinder');
          setKinder([]);
        } else {
          setError(null);
          setKinder(data || []);
        }
        setLoading(false);
      });
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
        {kinder.map((kind) => (
          <tr key={kind.id}>
            <td className="p-2">{kind.vorname}</td>
            <td className="p-2">{kind.nachname}</td>
            <td className="p-2">{kind.geschlecht}</td>
            <td className="p-2">{kind.klasse}</td>
            <td className="p-2 text-gray-400">[Aktionen]</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ImportDialog({ eventId }: { eventId: string | null }) {
  const [step, setStep] = useState<'idle'|'preview'>('idle');
  const [rawData, setRawData] = useState<string>('');
  const [rows, setRows] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

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
    if (file.name.endsWith('.xlsx')) {
      // XLSX einlesen (Import erst im FileReader-Callback, damit Next.js beim Build nicht auflöst)
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
          <input type="file" accept=".csv,.txt,.xlsx" className="mb-2" onChange={handleFileChange} />
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
            <button className="px-2 py-1 bg-green-600 text-white rounded" disabled>Importieren (folgt)</button>
          </div>
          <div className="mb-2 flex gap-4 items-center">
            <span>Batch-Zuweisung für Auswahl:</span>
            <select className="border rounded p-1" onChange={e => handleBatchSet('geschlecht', e.target.value)} defaultValue="">
              <option value="">Geschlecht wählen</option>
              <option value="Mädchen">Mädchen</option>
              <option value="Junge">Junge</option>
            </select>
            <select className="border rounded p-1" onChange={e => handleBatchSet('klasse', e.target.value)} defaultValue="">
              <option value="">Klasse wählen</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
            </select>
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
                <tr key={idx} className={selectedRows.includes(idx) ? "bg-blue-50" : ""}>
                  <td>
                    <input type="checkbox" checked={selectedRows.includes(idx)} onChange={() => handleSelectRow(idx)} />
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
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.name} ({ev.jahr})
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


