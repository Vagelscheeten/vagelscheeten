'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileDown, Eye, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateSinglePDF, generateAllPDFs, generateHelferTabellePDF } from './pdfGenerator';
import { generateKlassentabellenPDF } from './klassenTabellenPDF';
import { PDFZuteilungenTabelle } from './PDFZuteilungenTabelle';
import { PDFVorschauModal } from './PDFVorschauModal';
import { 
  ZuteilungMitKindUndAufgabeDetails, 
  KlassenAggregierteDaten, 
  AlleKlassenPdfsDaten, 
  Ansprechpartner, 
  SpendenBedarf, 
  HelferRueckmeldungMitDetailsFuerPDF, 
  EssensspendeMitDetailsFuerPDF, 
  KindPdfDetails 
} from './types';

interface HelferRueckmeldungMitDetails {
  id: string; 
  kind_id: string; 
  aufgabe_id: string;
  prioritaet: number | null;
  freitext: string | null;
  ist_springer: boolean;
  zeitfenster_wunsch: string | null; 
  aufgabe_titel: string; 
  kind_vorname?: string; 
  kind_nachname?: string;
  kind_klasse?: string;
}

interface EssensspendeMitDetails {
  id: string; 
  spende_id: string; 
  kind_identifier_original: string; 
  menge: number;
  freitext_spende: string | null; 
  spende_titel: string; 
  zugeordnetes_kind_id?: string;
  zugeordnetes_kind_vorname?: string;
  zugeordnetes_kind_nachname?: string;
  zugeordnetes_kind_klasse?: string;
}

interface KlasseFilterOption {
  name: string;
  anzahl: number;
}

interface AufgabeFilterOption {
  id: string;
  titel: string;
  anzahl: number;
}

export default function PDFVerwaltung() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  // Prüfen, ob ZIP-Dateien unterstützt werden (für das Generieren mehrerer PDFs)
  const [isZipsSupported] = useState(true); // Vereinfachte Implementation, da moderne Browser ZIP unterstützen
  const [errorInitial, setErrorInitial] = useState('');
  const [zuteilungen, setZuteilungen] = useState<ZuteilungMitKindUndAufgabeDetails[]>([]);
  const [filteredZuteilungen, setFilteredZuteilungen] = useState<ZuteilungMitKindUndAufgabeDetails[]>([]);
  const [alleKlassenPdfsDaten, setAlleKlassenPdfsDaten] = useState<AlleKlassenPdfsDaten>({});
  const [pdfGenerationMessage, setPdfGenerationMessage] = useState<string | null>(null);
  const [pdfGenerationLoading, setPdfGenerationLoading] = useState(false);

  const [klassenFilterOptionen, setKlassenFilterOptionen] = useState<KlasseFilterOption[]>([]);
  const [aufgabenFilterOptionen, setAufgabenFilterOptionen] = useState<AufgabeFilterOption[]>([]);
  const [zeitfensterFilterOptionen, setZeitfensterFilterOptionen] = useState<string[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<string>('alle');
  const [selectedAufgabe, setSelectedAufgabe] = useState<string>('alle');
  const [selectedZeitfenster, setSelectedZeitfenster] = useState<string>('alle');
  
  const [isVorschauOpen, setIsVorschauOpen] = useState(false);
  const [vorschauKindId, setVorschauKindId] = useState<string | null>(null);
  
  const [debugCounts, setDebugCounts] = useState({
    kinder: 0,
    zuteilungenRoh: 0,
    transformedOnline: 0,
    pdfDataKlassen: 0,
    kinderInPdfData: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingInitial(true);
      
      try {
        const { data: kinderData, error: kinderError } = await supabase
          .from('kinder')
          .select('id, vorname, nachname, klasse')
          .order('klasse, nachname, vorname');
        if (kinderError) throw kinderError;
        if (!kinderData || kinderData.length === 0) throw new Error('Keine Kinderdaten geladen oder die Kinder-Tabelle ist leer');

        const { data: zuteilungenRohData, error: zuteilungenError } = await supabase
          .from('helfer_zuteilungen')
          .select('id, kind_id, aufgabe_id, via_springer'); 
        if (zuteilungenError) throw zuteilungenError;

        const { data: helferaufgabenData, error: helferaufgabenError } = await supabase
          .from('helferaufgaben')
          .select('id, titel, beschreibung, zeitfenster'); 
        if (helferaufgabenError) throw helferaufgabenError;
        const helferaufgabenMap = new Map(helferaufgabenData?.map(aufgabe => [aufgabe.id, aufgabe]));

        const { data: wuenscheRohData, error: wuenscheError } = await supabase
          .from('helfer_rueckmeldungen')
          .select('id, kind_id, aufgabe_id, prioritaet, freitext, ist_springer, zeitfenster'); 
        if (wuenscheError) throw wuenscheError;

        const { data: essensspendenRohData, error: essensspendenError } = await supabase
          .from('essensspenden_rueckmeldungen')
          .select('id, spende_id, kind_identifier, menge, freitext');
        if (essensspendenError) throw essensspendenError;

        const { data: essensspendenBedarfData, error: essensspendenBedarfError } = await supabase
          .from('essensspenden_bedarf')
          .select('id, titel'); 
        if (essensspendenBedarfError) throw essensspendenBedarfError;
        const essensspendenBedarfMap = new Map(essensspendenBedarfData?.map(bedarf => [bedarf.id, bedarf]));

        const transformedZuteilungenFuerOnlineAnsicht: ZuteilungMitKindUndAufgabeDetails[] = (zuteilungenRohData || []).map(z => {
          const kind = kinderData.find(k => k.id === z.kind_id);
          const aufgabeDetails = helferaufgabenMap.get(z.aufgabe_id); 
          return {
            ...z,
            kind: kind ? { id: kind.id, vorname: kind.vorname, nachname: kind.nachname, klasse: kind.klasse } : null,
            helferaufgaben: aufgabeDetails ? { 
              id: aufgabeDetails.id, 
              titel: aufgabeDetails.titel || 'Unbekannte Aufgabe',
              beschreibung: aufgabeDetails.beschreibung || null,
              zeitfenster: aufgabeDetails.zeitfenster || null,
            } : { id: z.aufgabe_id, titel: 'Unbekannte Aufgabe ZUO', beschreibung: null, zeitfenster: null } 
          };
        }).filter(z => z.kind) as ZuteilungMitKindUndAufgabeDetails[]; 
        
        setZuteilungen(transformedZuteilungenFuerOnlineAnsicht);
        setFilteredZuteilungen(transformedZuteilungenFuerOnlineAnsicht);

        const klassenMap = new Map<string, number>();
        transformedZuteilungenFuerOnlineAnsicht.forEach(z => {
          const klasse = z.kind?.klasse || 'Ohne Klasse';
          klassenMap.set(klasse, (klassenMap.get(klasse) || 0) + 1);
        });
        setKlassenFilterOptionen(Array.from(klassenMap.entries()).map(([name, anzahl]) => ({ name, anzahl })));

        const aufgabenMap = new Map<string, { id: string, titel: string, anzahl: number }>();
        transformedZuteilungenFuerOnlineAnsicht.forEach(z => {
          const aufgabe = z.helferaufgaben;
          if (aufgabe && aufgabe.id && aufgabe.titel) {
            const current = aufgabenMap.get(aufgabe.id) || { id: aufgabe.id, titel: aufgabe.titel, anzahl: 0 };
            aufgabenMap.set(aufgabe.id, { ...current, anzahl: current.anzahl + 1 });
          }
        });
        setAufgabenFilterOptionen(Array.from(aufgabenMap.values()));

        const zeitfensterSet = new Set<string>();
        transformedZuteilungenFuerOnlineAnsicht.forEach(z => {
          if (z.helferaufgaben?.zeitfenster) {
            zeitfensterSet.add(z.helferaufgaben.zeitfenster);
          }
        });
        setZeitfensterFilterOptionen(Array.from(zeitfensterSet));

        const aufbereitetePdfDaten: AlleKlassenPdfsDaten = {};

        for (const kind of kinderData) {
          if (!kind.klasse) continue; 

          if (!aufbereitetePdfDaten[kind.klasse]) {
            aufbereitetePdfDaten[kind.klasse] = { kinderDieserKlasse: [] };
          }

          const kindDetail: KindPdfDetails = {
            id: kind.id,
            vorname: kind.vorname,
            nachname: kind.nachname,
            klasse: kind.klasse,
            zugewieseneAufgaben: [],
            wuensche: [],
            essensspenden: []
          };

          (zuteilungenRohData || []).forEach(z => {
            if (z.kind_id === kind.id) {
              const aufgabeDetails = helferaufgabenMap.get(z.aufgabe_id); 
              kindDetail.zugewieseneAufgaben.push({
                ...z, 
                kind: {id: kind.id, vorname: kind.vorname, nachname: kind.nachname, klasse: kind.klasse },
                helferaufgaben: aufgabeDetails ? { 
                  id: aufgabeDetails.id, 
                  titel: aufgabeDetails.titel || 'Unbekannte Aufgabe',
                  beschreibung: aufgabeDetails.beschreibung || null,
                  zeitfenster: aufgabeDetails.zeitfenster || null,
                } : { id: z.aufgabe_id, titel: 'Unbekannte Aufgabe PDF', beschreibung: null, zeitfenster: null } 
              });
            }
          });

          (wuenscheRohData || []).forEach(w => {
            if (w.kind_id === kind.id) {
              const aufgabe = helferaufgabenMap.get(w.aufgabe_id);
              kindDetail.wuensche.push({
                ...w,
                aufgabe_titel: aufgabe?.titel || 'Unbekannte Aufgabe',
                zeitfenster_wunsch: w.zeitfenster, 
                kind_vorname: kind.vorname,
                kind_nachname: kind.nachname,
                kind_klasse: kind.klasse,
              } as HelferRueckmeldungMitDetailsFuerPDF);
            }
          });

          (essensspendenRohData || []).forEach(esr => {
            const identifier = esr.kind_identifier?.toLowerCase().trim();
            const kindVergleichsString = `${kind.nachname}, ${kind.vorname} (${kind.klasse})`.toLowerCase().trim();
            const kindVergleichsStringOhneKlasse = `${kind.nachname}, ${kind.vorname}`.toLowerCase().trim();

            if (identifier === kindVergleichsString || identifier === kindVergleichsStringOhneKlasse) {
              const bedarf = essensspendenBedarfMap.get(esr.spende_id);
              kindDetail.essensspenden.push({
                ...esr,
                kind_identifier_original: esr.kind_identifier, 
                freitext_spende: esr.freitext,
                spende_titel: bedarf?.titel || 'Unbekannte Spende',
                zugeordnetes_kind_id: kind.id,
                zugeordnetes_kind_vorname: kind.vorname,
                zugeordnetes_kind_nachname: kind.nachname,
                zugeordnetes_kind_klasse: kind.klasse,
              } as EssensspendeMitDetailsFuerPDF);
            }
          });
          
          if (kindDetail.zugewieseneAufgaben.length > 0 || kindDetail.wuensche.length > 0 || kindDetail.essensspenden.length > 0) {
            aufbereitetePdfDaten[kind.klasse].kinderDieserKlasse.push(kindDetail);
          }
        }
        
        for (const klassenName in aufbereitetePdfDaten) {
          if (aufbereitetePdfDaten[klassenName].kinderDieserKlasse.length === 0) {
            delete aufbereitetePdfDaten[klassenName];
          }
        }

        setAlleKlassenPdfsDaten(aufbereitetePdfDaten);

        setDebugCounts({
          kinder: kinderData?.length || 0,
          zuteilungenRoh: zuteilungenRohData?.length || 0,
          transformedOnline: transformedZuteilungenFuerOnlineAnsicht?.length || 0,
          pdfDataKlassen: Object.keys(aufbereitetePdfDaten).length,
          kinderInPdfData: Object.values(aufbereitetePdfDaten).reduce((sum, klasse) => sum + klasse.kinderDieserKlasse.length, 0)
        });

      } catch (error: any) {
        console.error('Fehler beim Laden oder Aufbereiten der Daten:', error);
        toast.error('Fehler beim Laden der Daten für PDF');
        setErrorInitial(error.message || (typeof error === 'string' ? error : 'Unbekannter Fehler beim Laden')); 
        setZuteilungen([]);
        setFilteredZuteilungen([]);
        setAlleKlassenPdfsDaten({});
      } finally {
        setIsLoadingInitial(false);
      }
    };
    
    fetchData();
  }, []);
  
  useEffect(() => {
    let filtered = [...zuteilungen];
    
    if (selectedKlasse !== 'alle') {
      filtered = filtered.filter(z => 
        (z.kind.klasse || 'Ohne Klasse') === selectedKlasse
      );
    }
    
    if (selectedAufgabe !== 'alle') {
      filtered = filtered.filter(z => z.helferaufgaben.id === selectedAufgabe); 
    }
    
    if (selectedZeitfenster !== 'alle') {
      filtered = filtered.filter(z => z.helferaufgaben.zeitfenster === selectedZeitfenster); 
    }
    
    setFilteredZuteilungen(filtered);
  }, [zuteilungen, selectedKlasse, selectedAufgabe, selectedZeitfenster]);

  const handleVorschau = (kindId: string) => {
    setVorschauKindId(kindId);
    setIsVorschauOpen(true);
  };
  
  const handleCloseVorschau = () => {
    setIsVorschauOpen(false);
    setVorschauKindId(null);
  };
  
  const handleGenerateAllPDFs = async () => {
    if (!supabase) {
      setPdfGenerationMessage('Supabase Client nicht initialisiert.');
      return;
    }
    if (Object.keys(alleKlassenPdfsDaten).length === 0) {
      setPdfGenerationMessage('Keine aufbereiteten PDF-Daten vorhanden. Bitte laden Sie zuerst die Daten.');
      return;
    }
    setPdfGenerationLoading(true);
    setPdfGenerationMessage('Starte PDF-Generierung...'); 
    try {
      await generateAllPDFs(supabase, alleKlassenPdfsDaten, setPdfGenerationMessage);
    } catch (error: any) {
      console.error("Fehler beim Generieren aller PDFs:", error);
      setPdfGenerationMessage(`Fehler: ${error.message || 'Unbekannter Fehler beim Generieren der PDFs'}`);
    }
    setPdfGenerationLoading(false);
  };
  
  // Handler für die neue Helfer-Tabelle als PDF-Funktion
  const handleGenerateHelferTabelle = async () => {
    if (!supabase) {
      setPdfGenerationMessage('Supabase Client nicht initialisiert.');
      return;
    }
    setPdfGenerationLoading(true);
    setPdfGenerationMessage('Starte Tabellen-PDF-Generierung...'); 
    try {
      await generateHelferTabellePDF(supabase, setPdfGenerationMessage);
    } catch (error: any) {
      console.error("Fehler beim Generieren der Helfer-Tabelle:", error);
      setPdfGenerationMessage(`Fehler: ${error.message || 'Unbekannter Fehler beim Generieren der Helfer-Tabelle'}`);
    }
    setPdfGenerationLoading(false);
  };
  
  // Handler für die Klassentabellen-PDF-Funktion
  const handleGenerateKlassentabellen = async () => {
    if (!supabase) {
      setPdfGenerationMessage('Supabase Client nicht initialisiert.');
      return;
    }
    setPdfGenerationLoading(true);
    setPdfGenerationMessage('Starte Klassentabellen-Generierung...'); 
    try {
      // Wenn eine spezifische Klasse ausgewählt ist, übergebe diese
      if (selectedKlasse !== 'alle') {
        await generateKlassentabellenPDF(supabase, setPdfGenerationMessage, selectedKlasse);
      } else {
        await generateKlassentabellenPDF(supabase, setPdfGenerationMessage);
      }
    } catch (error: any) {
      console.error("Fehler beim Generieren der Klassentabellen:", error);
      setPdfGenerationMessage(`Fehler: ${error.message || 'Unbekannter Fehler beim Generieren der Klassentabellen'}`);
    }
    setPdfGenerationLoading(false);
  };
  
  // Handler für das Generieren einer PDF für die ausgewählte Klasse
  const handleGenerateSelectedKlassePDF = async () => {
    if (!supabase || selectedKlasse === 'alle') {
      setPdfGenerationMessage('Bitte wählen Sie eine Klasse aus.');
      return;
    }
    setPdfGenerationLoading(true);
    setPdfGenerationMessage(`Erstelle PDF für Klasse ${selectedKlasse}...`); 
    try {
      await generateKlassentabellenPDF(supabase, setPdfGenerationMessage, selectedKlasse);
    } catch (error: any) {
      console.error(`Fehler beim Generieren der PDF für Klasse ${selectedKlasse}:`, error);
      setPdfGenerationMessage(`Fehler: ${error.message || 'Unbekannter Fehler beim Generieren der Klassen-PDF'}`);
    }
    setPdfGenerationLoading(false);
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/admin/helfer')}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <h1 className="text-2xl font-bold">Helfer-Zuteilungen PDF</h1>
      </div>
      
      <div className="mb-4 p-2 border border-yellow-500 bg-yellow-50 text-sm">
        <h3 className="font-semibold text-yellow-700">Debug Informationen:</h3>
        <p>Anzahl Kinder geladen: {debugCounts.kinder}</p>
        <p>Anzahl Roh-Zuteilungen geladen: {debugCounts.zuteilungenRoh}</p>
        <p>Anzahl Zuteilungen für Online-Tabelle (transformiert & gefiltert auf Kinder): {debugCounts.transformedOnline}</p>
        <p>Anzahl Klassen im PDF-Datensatz: {debugCounts.pdfDataKlassen}</p>
        <p>Anzahl Kinder insgesamt im PDF-Datensatz: {debugCounts.kinderInPdfData}</p>
        <p className="text-red-600">Fehler Initial: {errorInitial || (debugCounts.kinder === 0 && !isLoadingInitial ? 'Keine Kinder geladen, aber kein expliziter Fehler gefangen.' : 'Kein Fehler')}</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>
            Filtere die Zuteilungen nach Klasse, Aufgabe oder Zeitfenster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="klasse-filter">Klasse</Label>
              <Select value={selectedKlasse} onValueChange={setSelectedKlasse} disabled={isLoadingInitial}>
                <SelectTrigger id="klasse-filter">
                  <SelectValue placeholder="Klasse auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Klassen</SelectItem>
                  {klassenFilterOptionen.map((k) => (
                    <SelectItem key={k.name} value={k.name}>
                      {k.name} ({k.anzahl})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="aufgabe-filter">Aufgabe</Label>
              <Select value={selectedAufgabe} onValueChange={setSelectedAufgabe} disabled={isLoadingInitial}>
                <SelectTrigger id="aufgabe-filter">
                  <SelectValue placeholder="Aufgabe auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Aufgaben</SelectItem>
                  {aufgabenFilterOptionen.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.titel} ({a.anzahl})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zeitfenster-filter">Zeitfenster</Label>
              <Select value={selectedZeitfenster} onValueChange={setSelectedZeitfenster} disabled={isLoadingInitial}>
                <SelectTrigger id="zeitfenster-filter">
                  <SelectValue placeholder="Zeitfenster auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Zeitfenster</SelectItem>
                  {zeitfensterFilterOptionen.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-4 gap-2 mb-4 bg-gray-100 p-2 rounded">
        <div className="col-span-4 mb-1">
          <h3 className="text-sm font-semibold">PDF-Export:</h3>
        </div>
        
        {/* Button für die ausgewählte Klasse als PDF - NEUER HAUPTBUTTON */}
        <Button
          onClick={handleGenerateSelectedKlassePDF}
          disabled={pdfGenerationLoading || selectedKlasse === 'alle'}
          className="text-xs py-1 h-auto bg-blue-700 hover:bg-blue-800">
          {pdfGenerationLoading ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Gewählte Klasse
            </>
          ) : (
            <>
              <FileDown className="mr-1 h-3 w-3" /> {selectedKlasse !== 'alle' ? `${selectedKlasse} PDF` : 'Klasse wählen'}
            </>
          )}
        </Button>
        
        {/* Button für die Helfer-Tabelle als PDF */}
        <Button
          onClick={handleGenerateHelferTabelle}
          disabled={pdfGenerationLoading}
          className="text-xs py-1 h-auto">
          {pdfGenerationLoading ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Helfer-PDF
            </>
          ) : (
            <>
              <FileDown className="mr-1 h-3 w-3" /> Helfer-PDF
            </>
          )}
        </Button>
        
        {/* Button für alle Klassentabellen als PDF */}
        <Button
          onClick={handleGenerateKlassentabellen}
          disabled={pdfGenerationLoading}
          className="text-xs py-1 h-auto">
          {pdfGenerationLoading ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Alle Klassen
            </>
          ) : (
            <>
              <FileDown className="mr-1 h-3 w-3" /> Alle Klassen
            </>
          )}
        </Button>
        
        <Button 
          onClick={handleGenerateAllPDFs}
          disabled={pdfGenerationLoading || Object.keys(alleKlassenPdfsDaten).length === 0 || !isZipsSupported}
          className="text-xs py-1 h-auto">
          {pdfGenerationLoading ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Alle ZIP
            </>
          ) : (
            <>
              <FileDown className="mr-1 h-3 w-3" /> Alle ZIP
            </>
          )}
        </Button>
      </div>
      
      {isLoadingInitial ? (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Laden...
        </div>
      ) : (
        <PDFZuteilungenTabelle 
          zuteilungen={filteredZuteilungen} 
          isLoading={isLoadingInitial}
          onVorschau={handleVorschau}
        />
      )}
      
      {isVorschauOpen && vorschauKindId && (
        <PDFVorschauModal
          isOpen={isVorschauOpen}
          onClose={handleCloseVorschau}
          kindId={vorschauKindId}
        />
      )}
      
      {pdfGenerationMessage && (
        <div className="mb-4 p-2 border border-blue-500 bg-blue-50 text-sm text-blue-700">
          {pdfGenerationMessage}
        </div>
      )}
    </div>
  );
}
