import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Kind {
  id?: string;
  vorname: string;
  nachname: string;
  geschlecht: string;
  klasse: string;
  event_id: string;
}

interface ImportDialogProps {
  eventId: string | null;
  onImportComplete: () => void;
}

export default function ImportDialog({ eventId, onImportComplete }: ImportDialogProps) {
  const [batchKlasseStufe, setBatchKlasseStufe] = useState('');
  const [batchKlasseBuchstabe, setBatchKlasseBuchstabe] = useState('');
  const [step, setStep] = useState<'idle'|'preview'|'success'>('idle');
  const [rawData, setRawData] = useState<string>('');
  const [rows, setRows] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);

  function canImport() {
    // Mindestens eine Zeile mit Vorname, Nachname, eventId, geschlecht, klasse
    return rows.length > 0 && rows.every(row => row.vorname && row.nachname && eventId);
  }

  async function handleImport() {
    if (!canImport() || !eventId) return;
    setImporting(true);
    const supabase = createClient();
    
    try {
      // Baue Insert-Objekte
      const insertRows = rows.map(row => ({
        vorname: row.vorname,
        nachname: row.nachname,
        geschlecht: row.geschlecht || '',
        klasse: row.klasse || '',
        event_id: eventId
      }));
      
      const { error } = await supabase.from('kinder').insert(insertRows);
      
      if (error) {
        toast.error('Fehler beim Import: ' + error.message);
      } else {
        toast.success(`${insertRows.length} Kinder erfolgreich importiert`);
        setStep('success');
        onImportComplete();
      }
    } catch (error) {
      console.error('Import-Fehler:', error);
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setImporting(false);
    }
  }

  // CSV/TXT-Parser (unterstützt Tab, ; oder , als Trennzeichen)
  function parseTextData(text: string): any[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 1) return [];

    // Trennzeichen erkennen (Tab, Semikolon oder Komma)
    const firstLine = lines[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    
    let sep = ','; // Standard: Komma
    if (tabCount > semicolonCount && tabCount > commaCount) {
      sep = '\t';
    } else if (semicolonCount > commaCount) {
      sep = ';';
    }

    // Header-Zeile verarbeiten
    const header = lines[0].split(sep).map(h => h.trim().toLowerCase());

    // Daten-Zeilen verarbeiten
    const parsedRows = lines.slice(1).map(line => {
      const vals = line.split(sep);
      const obj: any = {};
      header.forEach((h, i) => obj[h] = vals[i]?.trim() ?? '');
      return obj;
    });

    // Geschlechter normalisieren
    return parsedRows.map(row => {
      if (row.geschlecht) {
        const gender = row.geschlecht.toLowerCase();
        if (gender === 'm' || gender === 'männlich' || gender === 'junge') {
          row.geschlecht = 'Junge';
        } else if (gender === 'w' || gender === 'weiblich' || gender === 'mädchen') {
          row.geschlecht = 'Mädchen';
        }
      }
      return row;
    });
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setRawData(e.target.value);
  }

  function handlePreview() {
    if (rawData.trim()) {
      try {
        setRows(parseTextData(rawData));
        setStep('preview');
        setSelectedRows([]);
      } catch (error) {
        console.error('Fehler beim Parsen der Text-Daten:', error);
        toast.error('Fehler beim Parsen. Bitte überprüfe das Format der Eingabe.');
      }
    } else {
      toast.error('Bitte lade eine Datei hoch oder füge Text ein.');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // XLS(X) einlesen (Textfeld bleibt leer!)
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          if (json.length < 1) {
            toast.error('Die Excel-Datei enthält keine Daten');
            return;
          }
          
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
        } catch (error) {
          console.error('Excel-Parsing-Fehler:', error);
          toast.error('Fehler beim Einlesen der Excel-Datei');
        }
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

  if (step === 'success') {
    return (
      <div className="border rounded p-4 bg-green-50">
        <h3 className="text-lg font-semibold text-green-700 mb-2">Import erfolgreich!</h3>
        <p className="mb-4">Die Kinder wurden erfolgreich importiert.</p>
        <Button onClick={() => setStep('idle')}>Neuen Import starten</Button>
      </div>
    );
  }

  return (
    <div className="border rounded p-4 bg-gray-50">
      {step === 'idle' && (
        <>
          <h3 className="text-lg font-semibold mb-2">Daten-Import</h3>
          <p className="mb-4">Importiere Kinder per Excel, CSV oder direkter Texteingabe.</p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Datenformat:</label>
            <div className="p-4 bg-white rounded border">
              <p className="mb-2">Die Datei sollte folgende Spalten enthalten:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>vorname</li>
                <li>nachname</li>
                <li>geschlecht (Junge/Mädchen)</li>
                <li>klasse</li>
              </ul>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Excel oder CSV-Datei hochladen:</label>
            <input 
              type="file" 
              accept=".csv,.txt,.xls,.xlsx" 
              className="w-full border rounded p-2" 
              onChange={handleFileChange} 
            />
            <p className="text-xs text-gray-500 mt-1">
              Unterstützte Formate: Excel (.xlsx, .xls), CSV (.csv) oder Text (.txt)
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Oder Text direkt einfügen:</label>
            <textarea
              className="w-full border rounded p-2"
              rows={6}
              placeholder="Vorname,Nachname,Geschlecht,Klasse&#10;Max,Mustermann,männlich,1a&#10;Lisa,Beispiel,weiblich,2b&#10;..."
              value={rawData}
              onChange={handleTextChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: Erste Zeile = Spaltenüberschriften (vorname, nachname, geschlecht, klasse), dann eine Zeile pro Kind.
              Trennzeichen: Komma oder Semikolon.
            </p>
          </div>
          
          <Button 
            onClick={handlePreview} 
            disabled={!rawData.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Vorschau anzeigen
          </Button>
        </>
      )}
      
      {step === 'preview' && (
        <>
          <div className="mb-4 flex gap-2">
            <Button variant="outline" onClick={() => setStep('idle')}>Zurück</Button>
            <Button 
              onClick={handleImport} 
              disabled={importing || !canImport()}
            >
              {importing ? 'Importiere...' : 'Importieren'}
            </Button>
          </div>
          
          <div className="mb-4 flex flex-wrap gap-4 items-center">
            <div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedRows([])} 
                className="mr-2"
              >
                Auswahl aufheben
              </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRows(rows.map((_, idx) => idx))}
              disabled={rows.length === 0 || selectedRows.length === rows.length}
            >
              Alle auswählen
            </Button>
          </div>
          
          <div className="mt-4 w-full">
            <span className="font-medium block mb-2">Batch-Zuweisung für Auswahl:</span>
            <div className="flex flex-wrap gap-2 items-center">
              <select 
                className="border rounded p-2" 
                onChange={e => handleBatchSet('geschlecht', e.target.value)}
                defaultValue=""
              >
                <option value="">Geschlecht wählen</option>
                <option value="Mädchen">Mädchen</option>
                <option value="Junge">Junge</option>
              </select>
              
              <select
                className="border rounded p-2"
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
                className="border rounded p-2"
                value={batchKlasseBuchstabe}
                onChange={e => setBatchKlasseBuchstabe(e.target.value)}
                disabled={batchKlasseStufe === '' || batchKlasseStufe === 'Schulis'}
              >
                <option value="">-</option>
                <option value="a">a</option>
                <option value="b">b</option>
              </select>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setBatchKlasseStufe(''); setBatchKlasseBuchstabe(''); }}
              >
                Zurücksetzen
              </Button>
              
              <Button
                variant="default"
                size="sm"
                disabled={!batchKlasseStufe}
                onClick={() => {
                  const value = batchKlasseStufe === 'Schulis' ? 'Schulis' : batchKlasseStufe + (batchKlasseBuchstabe ? batchKlasseBuchstabe : '');
                  handleBatchSet('klasse', value);
                }}
              >
                Zuweisen
              </Button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border"></th>
                {rows.length > 0 && Object.keys(rows[0]).map(key => (
                  <th key={key} className="p-2 border">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr 
                  key={idx} 
                  className={`cursor-pointer ${selectedRows.includes(idx) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => handleSelectRow(idx)}
                >
                  <td className="p-2 border text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedRows.includes(idx)}
                      onChange={() => {}} 
                      className="h-4 w-4"
                    />
                  </td>
                  {Object.keys(row).map(key => (
                    <td 
                      key={`${idx}-${key}`} 
                      className={`p-2 border ${!row[key] && (key === 'geschlecht' || key === 'klasse') ? 'bg-yellow-100' : ''}`}
                    >
                      {row[key] || <span className="text-gray-400">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-sm text-gray-500 mt-2">
          Gelb markierte Felder sind leer und sollten vor dem Import ausgefüllt werden.
        </div>
      </>
    )}
  </div>
);
}
