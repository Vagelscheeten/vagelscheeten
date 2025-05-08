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
import { generatePDF, generateAllPDFs } from './pdfGenerator';
import { PDFZuteilungenTabelle } from './PDFZuteilungenTabelle';
import { PDFVorschauModal } from './PDFVorschauModal';

// Typen für die Zuteilungen mit Kind- und Aufgabeninformationen
interface ZuteilungMitDetails {
  id: string;
  kind_id: string;
  aufgabe_id: string;
  via_springer: boolean;
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
  helferaufgaben: {
    id: string;
    titel: string;
    beschreibung: string | null;
    zeitfenster: string | null;
    bereich?: string | null;
  };
}

interface Klasse {
  name: string;
  anzahl: number;
}

interface Aufgabe {
  id: string;
  titel: string;
  anzahl: number;
}

export default function PDFVerwaltung() {
  const [isLoading, setIsLoading] = useState(true);
  // any-Typ verwenden, um TypeScript-Konflikte zu umgehen
  const [zuteilungen, setZuteilungen] = useState<any[]>([]);
  const [filteredZuteilungen, setFilteredZuteilungen] = useState<any[]>([]);
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [zeitfenster, setZeitfenster] = useState<string[]>([]);
  
  // Filter-States
  const [selectedKlasse, setSelectedKlasse] = useState<string>('alle');
  const [selectedAufgabe, setSelectedAufgabe] = useState<string>('alle');
  const [selectedZeitfenster, setSelectedZeitfenster] = useState<string>('alle');
  
  // Vorschau-Modal
  const [isVorschauOpen, setIsVorschauOpen] = useState(false);
  const [vorschauKindId, setVorschauKindId] = useState<string | null>(null);
  
  const router = useRouter();
  
  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      
      try {
        console.log('Lade Zuteilungen...');
        // Zuteilungen mit Kind- und Aufgabeninformationen laden
        const { data: zuteilungenData, error: zuteilungenError } = await supabase
          .from('helfer_zuteilungen')
          .select(`
            id,
            kind_id,
            aufgabe_id,
            via_springer,
            kind:kinder(id, vorname, nachname, klasse)
          `)
          .order('aufgabe_id');
          
        // Separate Abfrage für Aufgaben, da die Join-Abfrage Probleme verursacht
        interface AufgabeDetails {
          id: string;
          titel: string;
          beschreibung: string | null;
          zeitfenster: string | null;
        }
        
        let aufgabenDetails: Record<string, AufgabeDetails> = {};
        if (zuteilungenData && zuteilungenData.length > 0) {
          const aufgabenIds = [...new Set(zuteilungenData.map(z => z.aufgabe_id))];
          const { data: aufgabenData } = await supabase
            .from('helferaufgaben')
            .select('id, titel, beschreibung, zeitfenster')
            .in('id', aufgabenIds);
            
          if (aufgabenData) {
            aufgabenDetails = aufgabenData.reduce<Record<string, AufgabeDetails>>((acc, aufgabe) => {
              acc[aufgabe.id] = aufgabe as AufgabeDetails;
              return acc;
            }, {});
          }
        }
          
        if (zuteilungenError) {
          console.error('Fehler beim Laden der Zuteilungen:', zuteilungenError);
          throw zuteilungenError;
        }
        
        console.log('Geladene Zuteilungen:', zuteilungenData);
        
        // Daten transformieren und speichern
        const transformedZuteilungen = zuteilungenData.map(z => {
          // Explizite Typkonvertierung mit Überprüfung
          const kind = z.kind as any;
          
          // Definiere den Typ für aufgabe mit optionalen Eigenschaften
          interface AufgabeDetails {
            titel?: string;
            beschreibung?: string | null;
            zeitfenster?: string | null;
          }
          
          const aufgabe = (aufgabenDetails[z.aufgabe_id] || {}) as AufgabeDetails;
          
          return {
            ...z,
            kind: {
              id: kind.id,
              vorname: kind.vorname,
              nachname: kind.nachname,
              klasse: kind.klasse
            },
            helferaufgaben: {
              id: z.aufgabe_id,
              titel: aufgabe.titel || 'Unbekannte Aufgabe',
              beschreibung: aufgabe.beschreibung || null,
              zeitfenster: aufgabe.zeitfenster || null
            }
          };
        });
        
        // Explizite Typumwandlung, um TypeScript-Fehler zu beheben
        setZuteilungen(transformedZuteilungen as ZuteilungMitDetails[]);
        setFilteredZuteilungen(transformedZuteilungen as ZuteilungMitDetails[]);
        
        // Klassen extrahieren
        const klassenMap = new Map<string, number>();
        transformedZuteilungen.forEach(z => {
          const klasse = z.kind.klasse || 'Ohne Klasse';
          klassenMap.set(klasse, (klassenMap.get(klasse) || 0) + 1);
        });
        
        const klassenArray = Array.from(klassenMap.entries()).map(([name, anzahl]) => ({
          name,
          anzahl
        }));
        
        setKlassen(klassenArray);
        
        // Aufgaben extrahieren
        const aufgabenMap = new Map<string, { id: string, titel: string, anzahl: number }>();
        transformedZuteilungen.forEach(z => {
          const aufgabe = z.helferaufgaben;
          if (!aufgabenMap.has(aufgabe.id)) {
            aufgabenMap.set(aufgabe.id, {
              id: aufgabe.id,
              titel: aufgabe.titel,
              anzahl: 1
            });
          } else {
            const current = aufgabenMap.get(aufgabe.id)!;
            aufgabenMap.set(aufgabe.id, {
              ...current,
              anzahl: current.anzahl + 1
            });
          }
        });
        
        const aufgabenArray = Array.from(aufgabenMap.values());
        setAufgaben(aufgabenArray);
        
        // Zeitfenster extrahieren
        const zeitfensterSet = new Set<string>();
        transformedZuteilungen.forEach(z => {
          if (z.helferaufgaben.zeitfenster) {
            zeitfensterSet.add(z.helferaufgaben.zeitfenster);
          }
        });
        
        setZeitfenster(Array.from(zeitfensterSet));
      } catch (error) {
        console.error('Fehler beim Laden der Zuteilungen:', error);
        toast.error('Fehler beim Laden der Zuteilungen');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Filter anwenden
  useEffect(() => {
    let filtered = [...zuteilungen];
    
    // Nach Klasse filtern
    if (selectedKlasse !== 'alle') {
      filtered = filtered.filter(z => 
        (z.kind.klasse || 'Ohne Klasse') === selectedKlasse
      );
    }
    
    // Nach Aufgabe filtern
    if (selectedAufgabe !== 'alle') {
      filtered = filtered.filter(z => z.helferaufgaben.id === selectedAufgabe);
    }
    
    // Nach Zeitfenster filtern
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
    toast.loading('PDF-Generierung für alle Zuteilungen gestartet...');
    try {
      await generateAllPDFs();
      toast.success('Alle PDFs wurden erfolgreich generiert und als ZIP-Datei heruntergeladen');
    } catch (error) {
      console.error('Fehler bei der Generierung aller PDFs:', error);
      toast.error(`Fehler bei der PDF-Generierung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
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
              <Label htmlFor="klasseFilter">Klasse</Label>
              <Select
                value={selectedKlasse}
                onValueChange={setSelectedKlasse}
              >
                <SelectTrigger id="klasseFilter">
                  <SelectValue placeholder="Alle Klassen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Klassen</SelectItem>
                  {klassen.map((klasse) => (
                    <SelectItem key={klasse.name} value={klasse.name}>
                      {klasse.name} ({klasse.anzahl})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="aufgabeFilter">Aufgabe</Label>
              <Select
                value={selectedAufgabe}
                onValueChange={setSelectedAufgabe}
              >
                <SelectTrigger id="aufgabeFilter">
                  <SelectValue placeholder="Alle Aufgaben" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Aufgaben</SelectItem>
                  {aufgaben.map((aufgabe) => (
                    <SelectItem key={aufgabe.id} value={aufgabe.id}>
                      {aufgabe.titel} ({aufgabe.anzahl})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zeitfensterFilter">Zeitfenster</Label>
              <Select
                value={selectedZeitfenster}
                onValueChange={setSelectedZeitfenster}
              >
                <SelectTrigger id="zeitfensterFilter">
                  <SelectValue placeholder="Alle Zeitfenster" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Zeitfenster</SelectItem>
                  {zeitfenster.map((zf) => (
                    <SelectItem key={zf} value={zf}>
                      {zf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end mb-4">
        <Button 
          variant="default" 
          onClick={handleGenerateAllPDFs}
          disabled={isLoading || filteredZuteilungen.length === 0}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Alle PDFs generieren
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Laden...
        </div>
      ) : (
        <PDFZuteilungenTabelle 
          zuteilungen={filteredZuteilungen}
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
    </div>
  );
}
