'use client';

import React, { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, Save } from 'lucide-react';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import * as XLSX from 'xlsx';

// Typen
interface KinderImportProps {
  activeEventId: string;
}

type Kind = {
  id?: string;
  vorname: string;
  nachname: string;
  geschlecht: 'Junge' | 'Mädchen';
  klasse: string;
  event_id: string;
  valid?: boolean;
  error?: string;
};

export function KinderImport({ activeEventId }: KinderImportProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State für Import
  const [bulkText, setBulkText] = useState('');
  const [previewData, setPreviewData] = useState<Kind[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importMethod, setImportMethod] = useState<'text' | 'excel'>('text');
  
  // Text-Import vorbereiten
  const handlePrepareTextImport = () => {
    if (!bulkText.trim()) {
      toast.warning('Bitte fügen Sie Daten ein.');
      return;
    }
    
    try {
      // Text in Zeilen aufteilen
      const lines = bulkText.trim().split('\n');
      const parsedData: Kind[] = [];
      
      // Jede Zeile verarbeiten
      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Versuche, die Zeile zu parsen (Format: Vorname Nachname Geschlecht Klasse)
        const parts = line.trim().split(/\s+/);
        
        if (parts.length < 4) {
          const kind: Kind = {
            vorname: parts[0] || '',
            nachname: parts.length > 1 ? parts[1] : '',
            geschlecht: 'Junge', // Standardwert
            klasse: '',
            event_id: activeEventId,
            valid: false,
            error: 'Unvollständige Daten: Benötigt Vorname, Nachname, Geschlecht und Klasse'
          };
          parsedData.push(kind);
          continue;
        }
        
        // Letztes Element ist die Klasse
        const klasseValue = parts[parts.length - 1];
        
        // Vorletztes Element ist das Geschlecht
        let geschlechtValue: 'Junge' | 'Mädchen' = 'Junge';
        const geschlechtPart = parts[parts.length - 2].toLowerCase();
        
        if (geschlechtPart === 'junge' || geschlechtPart === 'j') {
          geschlechtValue = 'Junge';
        } else if (geschlechtPart === 'mädchen' || geschlechtPart === 'maedchen' || geschlechtPart === 'm') {
          geschlechtValue = 'Mädchen';
        } else {
          // Ungültiges Geschlecht
          const kind: Kind = {
            vorname: parts[0],
            nachname: parts.slice(1, parts.length - 1).join(' '),
            geschlecht: 'Junge', // Standardwert
            klasse: klasseValue,
            event_id: activeEventId,
            valid: false,
            error: 'Ungültiges Geschlecht: Muss "Junge", "j", "Mädchen", "maedchen" oder "m" sein'
          };
          parsedData.push(kind);
          continue;
        }
        
        // Vorname ist das erste Element, Nachname alles dazwischen
        const vornameValue = parts[0];
        const nachnameValue = parts.slice(1, parts.length - 2).join(' ');
        
        parsedData.push({
          vorname: vornameValue.trim(),
          nachname: nachnameValue.trim(),
          geschlecht: geschlechtValue,
          klasse: klasseValue.trim(),
          event_id: activeEventId,
          valid: true
        });
      }
      
      setPreviewData(parsedData);
      
    } catch (error: any) {
      console.error('Fehler beim Parsen der Daten:', error);
      toast.error(`Fehler: ${error.message}`);
    }
  };
  
  // Excel-Import vorbereiten
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Konvertiere Excel-Daten in JSON
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
        
        // Verarbeite die Daten
        const parsedData: Kind[] = jsonData.map((row, index) => {
          const vorname = row['Vorname'] || row['vorname'] || '';
          const nachname = row['Nachname'] || row['nachname'] || '';
          let geschlecht: 'Junge' | 'Mädchen' = 'Junge';
          const geschlechtValue = row['Geschlecht'] || row['geschlecht'] || '';
          
          if (geschlechtValue.toLowerCase() === 'junge' || geschlechtValue.toLowerCase() === 'j') {
            geschlecht = 'Junge';
          } else if (geschlechtValue.toLowerCase() === 'mädchen' || geschlechtValue.toLowerCase() === 'maedchen' || geschlechtValue.toLowerCase() === 'm') {
            geschlecht = 'Mädchen';
          }
          
          const klasse = row['Klasse'] || row['klasse'] || '';
          
          // Validiere die Daten
          const valid = vorname.trim() !== '' && nachname.trim() !== '' && klasse.trim() !== '';
          let error = '';
          
          if (!valid) {
            if (vorname.trim() === '') error += 'Vorname fehlt. ';
            if (nachname.trim() === '') error += 'Nachname fehlt. ';
            if (klasse.trim() === '') error += 'Klasse fehlt. ';
          }
          
          return {
            vorname: vorname.trim(),
            nachname: nachname.trim(),
            geschlecht,
            klasse: klasse.trim(),
            event_id: activeEventId,
            valid,
            error: error.trim()
          };
        });
        
        setPreviewData(parsedData);
        setImportMethod('excel');
        
      } catch (error: any) {
        console.error('Fehler beim Parsen der Excel-Datei:', error);
        toast.error(`Fehler beim Parsen der Excel-Datei: ${error.message}`);
      } finally {
        setIsLoading(false);
        // Zurücksetzen des Datei-Inputs
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    
    reader.onerror = (error) => {
      console.error('Fehler beim Lesen der Datei:', error);
      toast.error('Fehler beim Lesen der Datei.');
      setIsLoading(false);
      // Zurücksetzen des Datei-Inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    reader.readAsBinaryString(file);
  };
  
  // Bulk-Import durchführen
  const handleBulkImport = async () => {
    if (previewData.length === 0) {
      toast.warning('Keine Daten zum Importieren.');
      return;
    }
    
    // Filtere nur gültige Datensätze
    const validData = previewData.filter(kind => kind.valid);
    
    if (validData.length === 0) {
      toast.warning('Keine gültigen Daten zum Importieren.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Kinder in Datenbank einfügen
      const { data, error } = await supabase
        .from('kinder')
        .insert(validData.map(({ valid, error, ...rest }) => rest))
        .select();
      
      if (error) throw error;
      
      toast.success(`${data.length} Kinder wurden importiert.`);
      
      // Felder zurücksetzen
      setBulkText('');
      setPreviewData([]);
      setImportMethod('text');
      
      // Seite neu laden, um die Klassenliste zu aktualisieren
      window.location.reload();
      
    } catch (error: any) {
      console.error('Fehler beim Importieren der Kinder:', error);
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Vorschau löschen
  const handleClearPreview = () => {
    setPreviewData([]);
    setBulkText('');
    setImportMethod('text');
    // Zurücksetzen des Datei-Inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Kinder importieren</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            {previewData.length === 0 && (
              <>
                <div className="flex space-x-4 mb-4">
                  <Button 
                    onClick={() => setImportMethod('text')}
                    variant={importMethod === 'text' ? 'default' : 'outline'}
                    className="w-full md:w-auto"
                  >
                    Text-Import
                  </Button>
                  <Button 
                    onClick={() => setImportMethod('excel')}
                    variant={importMethod === 'excel' ? 'default' : 'outline'}
                    className="w-full md:w-auto"
                  >
                    Excel-Import
                  </Button>
                </div>
                
                {importMethod === 'text' ? (
                  <div>
                    <Label htmlFor="bulk-import">Fügen Sie hier Ihre Daten ein (ein Kind pro Zeile, Format: Vorname Nachname Geschlecht Klasse)</Label>
                    <Textarea
                      id="bulk-import"
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder="Max Mustermann Junge 1a
Anna Beispiel Mädchen 2b
Peter Schmidt Junge Schulis"
                      rows={6}
                      disabled={isLoading}
                      className="font-mono"
                    />
                    <Button 
                      onClick={handlePrepareTextImport} 
                      disabled={!bulkText.trim() || isLoading}
                      className="w-full md:w-auto mt-4"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Daten prüfen
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="excel-import">Wählen Sie eine Excel-Datei aus (mit Spalten: Vorname, Nachname, Geschlecht, Klasse)</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        id="excel-import"
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleExcelFileChange}
                        disabled={isLoading}
                        ref={fileInputRef}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            
            {previewData.length > 0 && (
              <div className="space-y-4">
                <div className="text-lg font-medium">Vorschau ({previewData.length} Kinder, {previewData.filter(k => k.valid).length} gültig)</div>
                
                <div className="border rounded-md overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vorname</TableHead>
                        <TableHead>Nachname</TableHead>
                        <TableHead>Geschlecht</TableHead>
                        <TableHead>Klasse</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((kind, index) => (
                        <TableRow key={index} className={kind.valid ? '' : 'bg-red-50'}>
                          <TableCell>{kind.vorname || <span className="text-red-500">Fehlt</span>}</TableCell>
                          <TableCell>{kind.nachname || <span className="text-red-500">Fehlt</span>}</TableCell>
                          <TableCell>{kind.geschlecht}</TableCell>
                          <TableCell>{kind.klasse || <span className="text-red-500">Fehlt</span>}</TableCell>
                          <TableCell>
                            {kind.valid ? (
                              <span className="text-green-500">Gültig</span>
                            ) : (
                              <span className="text-red-500">{kind.error}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleBulkImport} 
                    disabled={isLoading || previewData.filter(k => k.valid).length === 0}
                    className="w-full md:w-auto"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {previewData.filter(k => k.valid).length} Kinder importieren
                  </Button>
                  
                  <Button 
                    onClick={handleClearPreview} 
                    disabled={isLoading}
                    variant="outline"
                    className="w-full md:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}
            
            {isLoading && (
              <div className="flex justify-center">
                <LoadingIndicator />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
