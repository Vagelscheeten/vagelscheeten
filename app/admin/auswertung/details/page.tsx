'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

// Datenmodelle/Interfaces
interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  geschlecht: string;
  klasse: string;
}

interface Spiel {
  id: string;
  name: string;
  beschreibung: string | null;
  wertungstyp: string;
  einheit: string | null;
}

interface Spielgruppe {
  id: string;
  name: string;
  klasse: string;
  event_id: string;
}

interface Ergebnis {
  id: string;
  kind_id: string;
  spiel_id: string;
  spielgruppe_id: string;
  event_id: string;
  wert: string;
  wert_numeric: number;
  erfasst_am: string;
  rang?: number;
  punkte?: number;
}

interface ErgebnisDetail {
  ergebnis_id: string;
  kind_name: string;
  spiel_name: string;
  wert: string;
  wert_numeric: number;
  wertungstyp: string;
  einheit: string | null | undefined;
  rang: number | null | undefined;
  punkte: number;
  berechnungsmethode: string;
  rohwert_vergleich: string;
}

export default function AuswertungDetailsPage() {
  // Daten aus der Datenbank
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [spielgruppen, setSpielgruppen] = useState<Spielgruppe[]>([]);
  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([]);
  const [kinder, setKinder] = useState<Kind[]>([]);
  
  // Filter
  const [selectedKlasse, setSelectedKlasse] = useState<string>('');
  const [selectedSpielId, setSelectedSpielId] = useState<string>('alle');
  const [selectedGruppeId, setSelectedGruppeId] = useState<string>('');
  
  // Berechnete Daten
  const [isLoading, setIsLoading] = useState(true);
  const [ergebnisDetails, setErgebnisDetails] = useState<ErgebnisDetail[]>([]);
  const [verfuegbareKlassen, setVerfuegbareKlassen] = useState<string[]>([]);
  const [filteredGruppen, setFilteredGruppen] = useState<Spielgruppe[]>([]);
  const [filteredSpiele, setFilteredSpiele] = useState<Spiel[]>([]);
  
  const supabase = createClient();
  
  // Lade Daten beim ersten Rendern
  useEffect(() => {
    loadInitialData();
  }, []);
  
  // Aktualisiere gefilterte Gruppen, wenn sich die Klasse ändert
  useEffect(() => {
    if (selectedKlasse) {
      const filtered = spielgruppen.filter(gruppe => gruppe.klasse === selectedKlasse);
      setFilteredGruppen(filtered);
      
      if (filtered.length > 0 && (!selectedGruppeId || !filtered.some(g => g.id === selectedGruppeId))) {
        setSelectedGruppeId(filtered[0].id);
      }
    }
  }, [selectedKlasse, spielgruppen, selectedGruppeId]);
  
  // Lade alle Daten
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Lade Spiele
      const { data: spieleData, error: spieleError } = await supabase
        .from('spiele')
        .select('*')
        .order('name');
      
      if (spieleError) throw spieleError;
      setSpiele(spieleData || []);
      setFilteredSpiele(spieleData || []);
      
      // Lade Spielgruppen
      const { data: gruppenData, error: gruppenError } = await supabase
        .from('spielgruppen')
        .select('*')
        .order('name');
      
      if (gruppenError) throw gruppenError;
      setSpielgruppen(gruppenData || []);
      
      // Extrahiere verfügbare Klassen
      const klassen = [...new Set(gruppenData?.map(g => g.klasse) || [])].sort();
      setVerfuegbareKlassen(klassen);
      
      if (klassen.length > 0) {
        setSelectedKlasse(klassen[0]);
      }
      
      // Lade Kinder
      const { data: kinderData, error: kinderError } = await supabase
        .from('kinder')
        .select('*');
      
      if (kinderError) throw kinderError;
      setKinder(kinderData || []);
      
      // Lade Ergebnisse
      const { data: ergebnisseData, error: ergebnisseError } = await supabase
        .from('ergebnisse')
        .select('*');
      
      if (ergebnisseError) throw ergebnisseError;
      setErgebnisse(ergebnisseData || []);
      
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Berechne Ränge für Ergebnisse
  const berechneRaenge = (ergebnisseData: Ergebnis[], spieleData: Spiel[]) => {
    // Gruppiere Ergebnisse nach Spiel und Spielgruppe
    const gruppiertNachSpielUndGruppe: Record<string, Ergebnis[]> = {};
    
    ergebnisseData.forEach(ergebnis => {
      const key = `${ergebnis.spiel_id}_${ergebnis.spielgruppe_id}`;
      if (!gruppiertNachSpielUndGruppe[key]) {
        gruppiertNachSpielUndGruppe[key] = [];
      }
      gruppiertNachSpielUndGruppe[key].push(ergebnis);
    });
    
    // Berechne Rang für jedes Ergebnis innerhalb seiner Gruppe
    const ergebnisseMitRang = [...ergebnisseData];
    
    Object.entries(gruppiertNachSpielUndGruppe).forEach(([key, gruppenErgebnisse]) => {
      const [spielId] = key.split('_');
      const spiel = spieleData.find(s => s.id === spielId);
      
      if (!spiel) return;
      
      // Sortiere Ergebnisse basierend auf dem Wertungstyp
      const sortierteErgebnisse = [...gruppenErgebnisse].sort((a, b) => {
        if (spiel.wertungstyp === 'ZEIT_MIN_STRAFE') {
          // Für Zeit: Kleinerer Wert ist besser
          return a.wert_numeric - b.wert_numeric;
        } else {
          // Für andere Wertungen: Größerer Wert ist besser
          return b.wert_numeric - a.wert_numeric;
        }
      });
      
      // Weise Ränge zu
      let letzterRang = 1;
      let letzterWert = sortierteErgebnisse.length > 0 ? sortierteErgebnisse[0].wert_numeric : 0;
      
      sortierteErgebnisse.forEach((ergebnis, index) => {
        // Wenn der Wert sich vom vorherigen unterscheidet, erhöhe den Rang
        if (index > 0 && (
          (spiel.wertungstyp === 'ZEIT_MIN_STRAFE' && ergebnis.wert_numeric > letzterWert) ||
          (spiel.wertungstyp !== 'ZEIT_MIN_STRAFE' && ergebnis.wert_numeric < letzterWert)
        )) {
          letzterRang = index + 1;
          letzterWert = ergebnis.wert_numeric;
        }
        
        // Finde das entsprechende Ergebnis in der Originalliste und setze den Rang
        const originalIndex = ergebnisseMitRang.findIndex(e => e.id === ergebnis.id);
        if (originalIndex !== -1) {
          ergebnisseMitRang[originalIndex] = {
            ...ergebnisseMitRang[originalIndex],
            rang: letzterRang
          };
        }
      });
    });
    
    return ergebnisseMitRang;
  };
  
  // Berechne Punkte für ein Ergebnis
  const berechnePunkteFuerErgebnis = (ergebnis: Ergebnis, spiel: Spiel | undefined): { punkte: number, methode: string } => {
    if (!spiel) return { punkte: 0, methode: 'FEHLER: Spiel nicht gefunden' };
    
    if (!ergebnis.rang) {
      return { punkte: 0, methode: 'FEHLER: Kein Rang vorhanden! Rangberechnung fehlgeschlagen.' };
    }
    
    // Wenn Rang 11 oder schlechter, dann 0 Punkte
    if (ergebnis.rang >= 11) {
      return { punkte: 0, methode: `Rang ${ergebnis.rang} → 0 Punkte (Rang 11 oder schlechter)` };
    }
    
    const punkte = 11 - ergebnis.rang;
    return { 
      punkte, 
      methode: `Rang ${ergebnis.rang} → 11 - ${ergebnis.rang} = ${punkte} Punkte` 
    };
  };
  
  // Berechne Ergebnisdetails für die aktuelle Auswahl
  const berechneErgebnisDetails = () => {
    if (!selectedKlasse || !selectedGruppeId) return;
    
    // Berechne Ränge für alle Ergebnisse
    const ergebnisseMitRang = berechneRaenge(ergebnisse, spiele);
    
    // Filtere Ergebnisse nach ausgewählter Gruppe und optional nach Spiel
    let filteredErgebnisse = ergebnisseMitRang.filter(e => e.spielgruppe_id === selectedGruppeId);
    
    if (selectedSpielId && selectedSpielId !== 'alle') {
      filteredErgebnisse = filteredErgebnisse.filter(e => e.spiel_id === selectedSpielId);
    }
    
    // Erstelle detaillierte Ergebnisobjekte
    const details: ErgebnisDetail[] = filteredErgebnisse.map(ergebnis => {
      const kind = kinder.find(k => k.id === ergebnis.kind_id);
      const spiel = spiele.find(s => s.id === ergebnis.spiel_id);
      const { punkte, methode } = berechnePunkteFuerErgebnis(ergebnis, spiel);
      
      // Erstelle einen String für den Rohwertvergleich
      let rohwertVergleich = '';
      if (spiel) {
        if (spiel.wertungstyp === 'ZEIT_MIN_STRAFE') {
          rohwertVergleich = 'Weniger ist besser';
        } else {
          rohwertVergleich = 'Mehr ist besser';
        }
      }
      
      return {
        ergebnis_id: ergebnis.id,
        kind_name: kind ? `${kind.vorname} ${kind.nachname}` : 'Unbekannt',
        spiel_name: spiel?.name || 'Unbekannt',
        wert: ergebnis.wert,
        wert_numeric: ergebnis.wert_numeric,
        wertungstyp: spiel?.wertungstyp || '',
        einheit: spiel?.einheit,
        rang: ergebnis.rang,
        punkte,
        berechnungsmethode: methode,
        rohwert_vergleich: rohwertVergleich
      };
    });
    
    // Sortiere nach Spiel und Rang
    details.sort((a, b) => {
      // Zuerst nach Spiel
      const spielVergleich = a.spiel_name.localeCompare(b.spiel_name);
      if (spielVergleich !== 0) return spielVergleich;
      
      // Dann nach Rang (falls vorhanden)
      if (a.rang !== null && a.rang !== undefined && b.rang !== null && b.rang !== undefined) {
        return a.rang - b.rang;
      }
      
      // Fallback: Nach Wert sortieren
      if (a.wertungstyp === 'ZEIT_MIN_STRAFE') {
        return a.wert_numeric - b.wert_numeric;
      } else {
        return b.wert_numeric - a.wert_numeric;
      }
    });
    
    setErgebnisDetails(details);
  };
  
  // Exportiere die Daten als CSV
  const exportToCSV = () => {
    if (ergebnisDetails.length === 0) return;
    
    const headers = [
      'Kind', 'Spiel', 'Wert', 'Einheit', 'Wertungstyp', 
      'Vergleich', 'Rang', 'Punkte', 'Berechnungsmethode'
    ];
    
    const csvRows = [
      headers.join(','),
      ...ergebnisDetails.map(detail => [
        `"${detail.kind_name}"`,
        `"${detail.spiel_name}"`,
        detail.wert_numeric,
        detail.einheit || '',
        `"${detail.wertungstyp}"`,
        `"${detail.rohwert_vergleich}"`,
        detail.rang || '',
        detail.punkte,
        `"${detail.berechnungsmethode}"`
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `punkteberechnung_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Effekt zum Berechnen der Ergebnisdetails, wenn sich die Filter ändern
  useEffect(() => {
    berechneErgebnisDetails();
  }, [selectedKlasse, selectedGruppeId, selectedSpielId, ergebnisse, spiele, kinder]);
  
  return (
    <main className="container mx-auto py-6 space-y-8">
      <Tabs defaultValue="details" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="uebersicht" asChild>
              <Link href="/admin/auswertung">Übersicht</Link>
            </TabsTrigger>
            <TabsTrigger value="details">Detailansicht</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="details" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Detailansicht der Punkteberechnung</CardTitle>
                  <CardDescription>Detaillierte Ansicht aller Ergebnisse und Punkteberechnungen</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadInitialData}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Daten neu laden
                  </Button>
                  
                  <Button 
                    size="sm" 
                    onClick={exportToCSV}
                    disabled={ergebnisDetails.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Als CSV exportieren
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Klasse</label>
                  <Select
                    value={selectedKlasse}
                    onValueChange={setSelectedKlasse}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Klasse auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {verfuegbareKlassen.map(klasse => (
                        <SelectItem key={klasse} value={klasse}>
                          Klasse {klasse}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Gruppe</label>
                  <Select
                    value={selectedGruppeId}
                    onValueChange={setSelectedGruppeId}
                    disabled={isLoading || filteredGruppen.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Gruppe auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredGruppen.map(gruppe => (
                        <SelectItem key={gruppe.id} value={gruppe.id}>
                          {gruppe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Spiel (optional)</label>
                  <Select
                    value={selectedSpielId}
                    onValueChange={setSelectedSpielId}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Alle Spiele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alle">Alle Spiele</SelectItem>
                      {filteredSpiele.map(spiel => (
                        <SelectItem key={spiel.id} value={spiel.id}>
                          {spiel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Ergebnistabelle */}
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : ergebnisDetails.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kind</TableHead>
                        <TableHead>Spiel</TableHead>
                        <TableHead>Spielergebnis (Rohwert)</TableHead>
                        <TableHead>Wertungstyp</TableHead>
                        <TableHead className="text-center">Rang</TableHead>
                        <TableHead className="text-center">Punkte</TableHead>
                        <TableHead>Berechnungsmethode</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ergebnisDetails.map((detail) => (
                        <TableRow key={detail.ergebnis_id}>
                          <TableCell className="font-medium">{detail.kind_name}</TableCell>
                          <TableCell>{detail.spiel_name}</TableCell>
                          <TableCell>
                            <div className="font-medium text-lg">{detail.wert_numeric} {detail.einheit}</div>
                            <div className="text-xs text-gray-500">{detail.rohwert_vergleich}</div>
                          </TableCell>
                          <TableCell>
                            {detail.wertungstyp === 'ZEIT_MIN_STRAFE' 
                              ? 'Zeit (weniger ist besser)' 
                              : 'Standard (mehr ist besser)'}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {detail.rang || '-'}
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {detail.punkte}
                          </TableCell>
                          <TableCell className="text-sm">
                            {detail.berechnungsmethode}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {selectedKlasse && selectedGruppeId 
                    ? 'Keine Ergebnisse für die ausgewählten Filter gefunden.' 
                    : 'Bitte wählen Sie eine Klasse und Gruppe aus, um die Punkteberechnung anzuzeigen.'}
                </div>
              )}
              
              {/* Zusammenfassung */}
              {ergebnisDetails.length > 0 && (
                <div className="mt-8 bg-gray-50 p-4 rounded-lg border">
                  <h3 className="text-lg font-medium mb-4">Zusammenfassung der Punkteberechnung</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Rangberechnung:</h4>
                      <p className="text-sm text-gray-700">
                        1. Ergebnisse werden nach Spiel und Gruppe gruppiert<br />
                        2. Innerhalb jeder Gruppe werden Ergebnisse nach Wert sortiert (abhängig vom Wertungstyp)<br />
                        3. Ränge werden zugewiesen: Platz 1 für das beste Ergebnis, Platz 2 für das zweitbeste, usw.<br />
                        4. Bei Gleichstand erhalten alle betroffenen Kinder den gleichen Rang
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Punkteberechnung:</h4>
                      <p className="text-sm text-gray-700">
                        - Formel: <span className="font-mono">11 - Rang</span> (Rang 1 = 10 Punkte, Rang 2 = 9 Punkte, usw.)<br />
                        - Maximale Punktzahl pro Spiel: 10 Punkte<br />
                        - Minimale Punktzahl pro Spiel: 0 Punkte (für Rang 11 oder schlechter)<br />
                        - Rang 10: 1 Punkt<br />
                        - Bei fehlendem Rang: FEHLER (0 Punkte)
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Gesamtpunkte:</h4>
                      <p className="text-sm text-gray-700">
                        Die Gesamtpunkte eines Kindes sind die Summe aller Punkte aus allen Spielen.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
