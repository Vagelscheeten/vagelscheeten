'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowDown, ArrowUp, Download, FileText, RefreshCw, CheckCircle, AlertCircle, XCircle, Crown, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { exportSpielPunkteCSV, exportSpielPunktePDF, exportGesamtauswertungPDF, exportGesamtauswertungCSV } from './exportHelpers';

// Datenmodelle/Interfaces
interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  geschlecht: string; // 'Junge' oder 'Mädchen'
  klasse: string; // z.B. "1a", "2b", "Schulis"
  event_id: string;
  spielgruppe_id: string;
  spielgruppe_name: string;
  gesamtPunkte: number;
  alleErgebnisseVorhanden: boolean;
  status?: string;
  platz?: number;
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
  name: string; // z.B. '1a-1', '2b-2'
  klasse: string; // z.B. "1a", "2b", "Schulis"
  event_id: string;
}

interface KindSpielgruppeZuordnung {
  id: string;
  kind_id: string;
  spielgruppe_id: string;
  kind?: Kind;
  spielgruppe?: Spielgruppe;
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
  kind?: Kind;
  spiel?: Spiel;
  spielgruppe?: Spielgruppe;
  rang?: number;
  punkte?: number;
}

interface GruppeSpielStatus {
  spielgruppe_id: string;
  spiel_id: string;
  status: 'abgeschlossen' | 'teilweise' | 'offen' | 'nicht_zugewiesen';
  anzahlErgebnisse: number;
  anzahlKinder: number;
}

interface KlassenStatistik {
  klasse: string;
  gruppenIds: string[];
  spieleIds: string[];
  kinder: {
    id: string;
    vorname: string;
    nachname: string;
    geschlecht: string;
    gesamtPunkte: number;
    platz: number;
    spielgruppe_name: string;
    status?: 'koenig' | 'koenigin' | null;
  }[];
  koenig: { kind_id: string; punkte: number } | null;
  koenigin: { kind_id: string; punkte: number } | null;
  alleErgebnisseVorhanden: boolean;
}

export default function AuswertungAdmin() {
  // Aktiver Tab/Sektion
  const [activeTab, setActiveTab] = useState('live');
  
  // Daten aus der Datenbank
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [spielgruppen, setSpielgruppen] = useState<Spielgruppe[]>([]);
  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([]);
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [kinderSpielgruppenZuordnungen, setKinderSpielgruppenZuordnungen] = useState<KindSpielgruppeZuordnung[]>([]);
  
  // Filter für Live-Zwischenstand
  const [verfuegbareKlassen, setVerfuegbareKlassen] = useState<string[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<string | null>(null);
  const [selectedGruppeId, setSelectedGruppeId] = useState<string>('');
  const [filteredGruppen, setFilteredGruppen] = useState<Spielgruppe[]>([]);
  
  // State und Berechnete Daten
  const [isLoading, setIsLoading] = useState(true);
  const [matrixDaten, setMatrixDaten] = useState<GruppeSpielStatus[]>([]);
  const [klassenStatistik, setKlassenStatistik] = useState<KlassenStatistik[]>([]);
  const [liveZwischenstand, setLiveZwischenstand] = useState<{
    kinder: any[];
    fortschritt: { abgeschlossen: number; gesamt: number };
  }>({ kinder: [], fortschritt: { abgeschlossen: 0, gesamt: 0 } });
  const [gesamtauswertungDaten, setGesamtauswertungDaten] = useState<any[]>([]);
  const [isLoadingGesamtauswertung, setIsLoadingGesamtauswertung] = useState(true);
  
  // Dialog für Detailansicht
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [detailViewData, setDetailViewData] = useState<{
    spielgruppe: Spielgruppe | null;
    spiel: Spiel | null;
    ergebnisse: Ergebnis[];
  }>({ spielgruppe: null, spiel: null, ergebnisse: [] });
  
  const supabase = createClient();

  // Lade Daten beim ersten Rendern
  useEffect(() => {
    loadInitialData();
    loadGesamtauswertung();
  }, []);

  // Aktualisiere gefilterte Gruppen, wenn sich die Klasse ändert
  useEffect(() => {
    if (selectedKlasse !== null) {
      const filtered = spielgruppen.filter(gruppe => gruppe.klasse === selectedKlasse);
      setFilteredGruppen(filtered);
      
      if (filtered.length > 0 && (!selectedGruppeId || !filtered.some(g => g.id === selectedGruppeId))) {
        setSelectedGruppeId(filtered[0].id);
      }
    }
  }, [selectedKlasse, spielgruppen]);

  // Lade Live-Zwischenstand, wenn sich die ausgewählte Gruppe ändert
  useEffect(() => {
    if (selectedGruppeId) {
      loadLiveZwischenstand(selectedGruppeId);
    }
  }, [selectedGruppeId]);

  // Daten laden und verarbeiten
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
      
      // Lade Spielgruppen
      const { data: gruppenData, error: gruppenError } = await supabase
        .from('spielgruppen')
        .select('*')
        .order('name');
      
      if (gruppenError) throw gruppenError;
      setSpielgruppen(gruppenData || []);
      
      // Lade Kinder
      const { data: kinderData, error: kinderError } = await supabase
        .from('kinder')
        .select('*');
      
      if (kinderError) throw kinderError;
      setKinder(kinderData || []);
      
      // Lade Kinder-Spielgruppen-Zuordnungen
      const { data: zuordnungData, error: zuordnungError } = await supabase
        .from('kind_spielgruppe_zuordnung')
        .select('*');
      
      if (zuordnungError) throw zuordnungError;
      setKinderSpielgruppenZuordnungen(zuordnungData || []);
      
      // Lade alle Ergebnisse für Matrix und Statistik
      const { data: ergebnisseData, error: ergebnisseError } = await supabase
        .from('ergebnisse')
        .select('*');
      
      if (ergebnisseError) throw ergebnisseError;
      setErgebnisse(ergebnisseData || []);
      
      // Bestimme verfügbare Klassen und setze eine Standardauswahl
      const klassen = [...new Set(gruppenData?.map(g => g.klasse) || [])];
      setVerfuegbareKlassen(klassen.sort());
      
      if (klassen.length > 0) {
        setSelectedKlasse(klassen[0]);
      }
      
      // Verarbeite Daten für Matrix und Statistik
      if (spieleData && gruppenData && ergebnisseData && kinderData && zuordnungData) {
        berechneFortschrittMatrix(spieleData, gruppenData, ergebnisseData, zuordnungData);
        berechneKlassenStatistik(spieleData, gruppenData, ergebnisseData, kinderData, zuordnungData);
      }
      
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Berechnet den Live-Zwischenstand für eine Gruppe
  const loadLiveZwischenstand = async (gruppeId: string) => {
    if (!gruppeId) return;
    
    const gruppe = spielgruppen.find(g => g.id === gruppeId);
    if (!gruppe) return;
    
    try {
      // Finde alle Kinder in dieser Gruppe
      const gruppenKinderIds = kinderSpielgruppenZuordnungen
        .filter(z => z.spielgruppe_id === gruppeId)
        .map(z => z.kind_id);
      
      const gruppenKinder = kinder.filter(k => gruppenKinderIds.includes(k.id));
      
      // Finde alle Ergebnisse für diese Gruppe
      const gruppenErgebnisse = ergebnisse.filter(e => e.spielgruppe_id === gruppeId);
      
      // Bestimme die Spiele, die dieser Klasse zugewiesen sind
      const klasseDesKindes = gruppe.klasse;
      
      // Hier verwenden wir die tatsächlichen Ergebnisse, um die Spielzuweisung zu bestimmen
      // Das stellt sicher, dass auch die "Schatzsuche" berücksichtigt wird, wenn Ergebnisse dafür vorliegen
      const spieleFuerKlasse = ermittleSpieleProKlasse(klasseDesKindes, ergebnisse);
      
      // Sammle alle Spiel-IDs, für die tatsächlich Ergebnisse vorliegen
      const spieleMitErgebnissen = new Set(gruppenErgebnisse.map(e => e.spiel_id));
      
      // Berechne Ränge für jedes Spiel
      const ergebnisseMitRang = berechneRaengeFuerGruppe(gruppenErgebnisse, spieleFuerKlasse);
      
      // Berechne die Gesamtpunkte pro Kind
      const kinderMitPunkten = gruppenKinder.map(kind => {
        // Finde alle Ergebnisse dieses Kindes, auch mit Wert 0
        const alleKindErgebnisse = gruppenErgebnisse.filter(e => e.kind_id === kind.id);
        
        // Finde die Ergebnisse mit Rang für die Punkteberechnung
        const kindErgebnisseMitRang = ergebnisseMitRang.filter(e => e.kind_id === kind.id);
        
        // Berechne Gesamtpunkte direkt aus den Ergebniswerten, wenn keine Rangpunkte vorhanden sind
        let gesamtPunkte = 0;
        
        if (kindErgebnisseMitRang.length > 0 && kindErgebnisseMitRang.some(e => e.punkte !== undefined)) {
          // Wenn Rangpunkte vorhanden sind, verwende diese
          gesamtPunkte = berechnePunkteFuerErgebnisseMitRang(kindErgebnisseMitRang);
        } else {
          // Sonst summiere die Werte direkt auf
          gesamtPunkte = alleKindErgebnisse.reduce((sum, ergebnis) => {
            // Verwende wert_numeric, falls vorhanden, sonst versuche wert zu parsen
            const wert = ergebnis.wert_numeric !== undefined ? 
              ergebnis.wert_numeric : 
              (ergebnis.wert ? parseFloat(ergebnis.wert) || 0 : 0);
            return sum + wert;
          }, 0);
        }
        
        // Zähle die Anzahl der Spiele, an denen das Kind teilgenommen hat (auch mit Wert 0)
        const anzahlErgebnisse = new Set(alleKindErgebnisse.map(e => e.spiel_id)).size;
        
        return {
          ...kind,
          gesamtPunkte,
          anzahlErgebnisse,
          gesamt_spiele: spieleFuerKlasse.length // Füge die korrekte Anzahl der Spiele hinzu
        };
      });
      
      // Sortiere nach Gesamtpunkten (absteigend)
      const sortierteKinder = [...kinderMitPunkten].sort((a, b) => b.gesamtPunkte - a.gesamtPunkte);
      
      // Berechne Fortschritt
      const abgeschlosseneSpiele = new Set(gruppenErgebnisse.map(e => e.spiel_id)).size;
      const gesamtSpiele = spieleFuerKlasse.length;
      
      setLiveZwischenstand({
        kinder: sortierteKinder,
        fortschritt: {
          abgeschlossen: abgeschlosseneSpiele,
          gesamt: gesamtSpiele
        }
      });
    } catch (error) {
      console.error('Fehler beim Laden des Zwischenstands:', error);
    }
  };
  
  // Ermittelt die Spiele, die einer bestimmten Klasse zugewiesen sind
  const ermittleSpieleProKlasse = (klasse: string, alleErgebnisse: Ergebnis[]): Spiel[] => {
    // Zuerst prüfen wir, ob wir die Spielzuweisungen aus den tatsächlichen Ergebnissen ableiten können
    // Finde alle Spielgruppen dieser Klasse
    const klassenGruppen = spielgruppen.filter(g => g.klasse === klasse);
    const klassenGruppenIds = klassenGruppen.map(g => g.id);
    
    // Finde alle Ergebnisse für diese Klasse
    const klassenErgebnisse = alleErgebnisse.filter(e => klassenGruppenIds.includes(e.spielgruppe_id));
    
    // Sammle alle einzigartigen Spiel-IDs aus den Ergebnissen
    const spielIdsAusErgebnissen = new Set(klassenErgebnisse.map(e => e.spiel_id));
    
    // Wenn Ergebnisse vorhanden sind, verwende diese zur Bestimmung der zugewiesenen Spiele
    if (spielIdsAusErgebnissen.size > 0) {
      const zugewieseneSpiele = spiele.filter(spiel => spielIdsAusErgebnissen.has(spiel.id));
      
      // Füge Schatzsuche hinzu, falls es fehlt aber in der statischen Zuordnung enthalten wäre
      const schatzsuche = spiele.find(s => s.name === "Schatzsuche");
      if (schatzsuche && !spielIdsAusErgebnissen.has(schatzsuche.id) && klasse === '1') {
        zugewieseneSpiele.push(schatzsuche);
      }
      
      return zugewieseneSpiele;
    }
    
    // Fallback: Verwende eine feste Zuordnung, wenn keine Ergebnisse vorhanden sind
    // Wichtig: "Heißer Draht" (Index 6) ist NICHT für Klasse 1 vorgesehen, sondern "Schatzsuche" (Index 8)
    const spieleZuweisungen: Record<string, number[]> = {
      '1': [0, 1, 2, 3, 4, 5, 8, 7], // Armbrust, Bälle, Figuren, Fisch, Glücksrad, Gummi, Schatzsuche, Roller
      '2': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // Die ersten 10 Spiele für Klasse 2
      '3': [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Spiele 3-12 für Klasse 3
      '4': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] // Alle Spiele für Klasse 4
    };
    
    // Wenn eine Zuordnung für die Klasse existiert, verwende diese
    if (spieleZuweisungen[klasse]) {
      return spieleZuweisungen[klasse].map(index => spiele[index]).filter(Boolean);
    }
    
    // Fallback: Verwende alle Spiele für Klassen ohne spezifische Zuordnung
    return spiele;
  };
  
  // Berechnet Ränge für Ergebnisse einer Gruppe
  const berechneRaengeFuerGruppe = (gruppenErgebnisse: Ergebnis[], spieleData: Spiel[]): Ergebnis[] => {
    // Gruppiere Ergebnisse nach Spiel
    const ergebnisseProSpiel = new Map<string, Ergebnis[]>();
    
    gruppenErgebnisse.forEach(ergebnis => {
      if (!ergebnisseProSpiel.has(ergebnis.spiel_id)) {
        ergebnisseProSpiel.set(ergebnis.spiel_id, []);
      }
      ergebnisseProSpiel.get(ergebnis.spiel_id)?.push(ergebnis);
    });
    
    // Berechne Ränge für jedes Spiel
    const ergebnisseMitRang: Ergebnis[] = [];
    
    ergebnisseProSpiel.forEach((spielErgebnisse, spielId) => {
      const spiel = spieleData.find(s => s.id === spielId);
      if (!spiel) return;
      
      // Sortiere Ergebnisse basierend auf dem Wertungstyp
      let sortierteErgebnisse: Ergebnis[];
      
      if (spiel.wertungstyp === 'ZEIT_MIN_STRAFE' || spiel.wertungstyp === 'MENGE_MAX_ZEIT') {
        // Niedrigerer Wert ist besser
        sortierteErgebnisse = [...spielErgebnisse].sort((a, b) => a.wert_numeric - b.wert_numeric);
      } else {
        // Höherer Wert ist besser (Standard)
        sortierteErgebnisse = [...spielErgebnisse].sort((a, b) => b.wert_numeric - a.wert_numeric);
      }
      
      // Füge Rang hinzu
      sortierteErgebnisse.forEach((ergebnis, index) => {
        ergebnisseMitRang.push({
          ...ergebnis,
          rang: index + 1,
          punkte: Math.max(1, 11 - (index + 1)) // 1. Platz = 10 Punkte, 2. Platz = 9 Punkte, usw.
        });
      });
    });
    
    return ergebnisseMitRang;
  };
  
  // Berechnet Punkte für eine Reihe von Ergebnissen mit Rang
  const berechnePunkteFuerErgebnisseMitRang = (ergebnisseMitRang: Ergebnis[]): number => {
    if (ergebnisseMitRang.length === 0) return 0;
    
    // Summiere die Punkte basierend auf dem Rang
    // 1. Platz: 10 Punkte, 2. Platz: 8 Punkte, 3. Platz: 6 Punkte, weitere Plätze: 4 Punkte
    return ergebnisseMitRang.reduce((sum, ergebnis) => {
      // Prüfe, ob das Ergebnis gültig ist
      if (!ergebnis) return sum;
      
      // Wenn das Ergebnis keine Punkte hat, aber einen numerischen Wert, dann verwende diesen
      if (ergebnis.punkte === undefined && ergebnis.wert_numeric !== undefined) {
        // Standardpunkte basierend auf dem Wert
        return sum + Math.max(1, ergebnis.wert_numeric);
      }
      
      const rang = ergebnis.rang || 0;
      let punkte = 4; // Standardpunkte für Teilnahme
      
      if (rang === 1) punkte = 10;
      else if (rang === 2) punkte = 8;
      else if (rang === 3) punkte = 6;
      
      return sum + punkte;
    }, 0);
  };

  // Berechnet die Fortschritt-Matrix für alle Gruppen und Spiele
  const berechneFortschrittMatrix = (
    spieleData: Spiel[], 
    gruppenData: Spielgruppe[],
    ergebnisseData: Ergebnis[],
    zuordnungData: KindSpielgruppeZuordnung[]
  ) => {
    const matrix: GruppeSpielStatus[] = [];
    
    // Für jede Gruppe und jedes Spiel einen Status berechnen
    gruppenData.forEach(gruppe => {
      spieleData.forEach(spiel => {
        // Finde alle Kinder in dieser Gruppe
        const kinderInGruppe = zuordnungData
          .filter(z => z.spielgruppe_id === gruppe.id)
          .map(z => z.kind_id);
          
        const anzahlKinder = kinderInGruppe.length;
        
        // Prüfe, ob dieses Spiel für diese Gruppe vorgesehen ist
        // Hier könnte eine Logik eingebaut werden, die prüft, ob das Spiel für die Gruppe zugewiesen ist
        // Aktuell nehmen wir an, dass ein Spiel nicht zugewiesen ist, wenn keine Kinder in der Gruppe sind
        if (anzahlKinder === 0) {
          matrix.push({
            spielgruppe_id: gruppe.id,
            spiel_id: spiel.id,
            status: 'nicht_zugewiesen',
            anzahlErgebnisse: 0,
            anzahlKinder: 0
          });
          return; // Skip weitere Verarbeitung für nicht zugewiesene Spiele
        }
        
        // Finde alle Ergebnisse für dieses Spiel und diese Gruppe
        const spielgruppenErgebnisse = ergebnisseData.filter(
          e => e.spiel_id === spiel.id && e.spielgruppe_id === gruppe.id
        );
        
        const anzahlErgebnisse = spielgruppenErgebnisse.length;
        
        // Bestimme den Status
        let status: 'abgeschlossen' | 'teilweise' | 'offen' = 'offen';
        
        if (anzahlErgebnisse > 0) {
          if (anzahlErgebnisse >= anzahlKinder) {
            status = 'abgeschlossen';
          } else {
            status = 'teilweise';
          }
        }
        
        matrix.push({
          spielgruppe_id: gruppe.id,
          spiel_id: spiel.id,
          status,
          anzahlErgebnisse,
          anzahlKinder
        });
      });
    });
    
    setMatrixDaten(matrix);
  };

  // Berechnet Statistiken pro Klasse, inkl. König/Königin
  const berechneKlassenStatistik = (
    spieleData: Spiel[], 
    gruppenData: Spielgruppe[],
    ergebnisseData: Ergebnis[],
    kinderData: Kind[],
    zuordnungData: KindSpielgruppeZuordnung[]
  ) => {
    // Gruppiere die Spielgruppen nach Klasse
    const klassenMap = new Map<string, Spielgruppe[]>();
    
    gruppenData.forEach(gruppe => {
      if (!klassenMap.has(gruppe.klasse)) {
        klassenMap.set(gruppe.klasse, []);
      }
      klassenMap.get(gruppe.klasse)?.push(gruppe);
    });
    
    const statistiken: KlassenStatistik[] = [];
    
    // Für jede Klasse
    klassenMap.forEach((gruppen, klasse) => {
      const gruppenIds = gruppen.map(g => g.id);
      
      // Bestimme die Spiele, die für diese Klasse relevant sind
      const spieleFuerKlasse = ermittleSpieleProKlasse(klasse, ergebnisseData);
      const spieleIds = spieleFuerKlasse.map(s => s.id);
      
      // Speichere die Anzahl der Spiele für diese Klasse
      const anzahlSpieleKlasse = spieleFuerKlasse.length;
      
      // Finde alle Kinder in diesen Gruppen
      const kinderZuordnungen = zuordnungData.filter(z => gruppenIds.includes(z.spielgruppe_id));
      const kinderIds = [...new Set(kinderZuordnungen.map(z => z.kind_id))];
      const klassenKinder = kinderData.filter(k => kinderIds.includes(k.id));
      
      // Prüfe, ob alle Ergebnisse vorhanden sind
      // Berechne die Anzahl der benötigten Ergebnisse basierend auf den Spielen für diese Klasse
      const benoetigteErgebnisseAnzahl = kinderIds.length * spieleIds.length;
      const vorhandeneErgebnisseAnzahl = ergebnisseData.filter(
        e => kinderIds.includes(e.kind_id) && spieleIds.includes(e.spiel_id)
      ).length;
      
      const alleErgebnisseVorhanden = vorhandeneErgebnisseAnzahl >= benoetigteErgebnisseAnzahl;
      
      // Berechne Gesamtpunkte pro Kind
      const kinderMitPunkten = klassenKinder.map(kind => {
        // Finde die Spielgruppe des Kindes
        const spielgruppe = gruppenData.find(g => {
          return kinderZuordnungen.some(z => z.kind_id === kind.id && z.spielgruppe_id === g.id);
        });
        
        if (!spielgruppe) {
          // Fallback, falls keine Spielgruppe gefunden wurde
          return {
            id: kind.id,
            vorname: kind.vorname,
            nachname: kind.nachname,
            geschlecht: kind.geschlecht,
            gesamtPunkte: 0,
            platz: 0,
            spielgruppe_name: 'Unbekannt',
            status: null as 'koenig' | 'koenigin' | null,
            anzahl_spiele: 0,
            gesamt_spiele: spieleIds.length,
            ist_koenig: false,
            ist_koenigin: false
          };
        }
        
        // Finde alle Ergebnisse dieses Kindes in seiner Gruppe
        const gruppenErgebnisse = ergebnisseData.filter(e => e.spielgruppe_id === spielgruppe.id);
        const alleKindErgebnisse = gruppenErgebnisse.filter(e => e.kind_id === kind.id);
        
        // Bestimme die tatsächlich gespielten Spiele dieser Gruppe
        const gespielteSpiele = new Set(gruppenErgebnisse.map(e => e.spiel_id));
        
        // Kombiniere die zugewiesenen Spiele mit den tatsächlich gespielten
        const alleRelevanteSpieleIds = new Set([...spieleIds, ...gespielteSpiele]);
        
        // Berechne Gesamtpunkte direkt aus den Ergebniswerten
        let gesamtPunkte = 0;
        
        // Summiere die Werte direkt auf
        gesamtPunkte = alleKindErgebnisse.reduce((sum, ergebnis) => {
          // Verwende wert_numeric, falls vorhanden, sonst versuche wert zu parsen
          const wert = ergebnis.wert_numeric !== undefined ? 
            ergebnis.wert_numeric : 
            (ergebnis.wert ? parseFloat(ergebnis.wert) || 0 : 0);
          return sum + wert;
        }, 0);
        
        // Zähle die Anzahl der Spiele, an denen das Kind teilgenommen hat
        // Wenn alle Kinder alle Spiele absolviert haben, sollte diese Zahl gleich anzahlSpieleKlasse sein
        const anzahlErgebnisse = anzahlSpieleKlasse; // Alle Kinder haben alle Spiele absolviert
        
        // Für TypeScript-Kompatibilität verwenden wir null als Standardstatus
        // Der tatsächliche Status wird in der UI angezeigt
        
        return {
          id: kind.id,
          vorname: kind.vorname,
          nachname: kind.nachname,
          geschlecht: kind.geschlecht,
          gesamtPunkte,
          platz: 0, // wird später gesetzt
          spielgruppe_name: spielgruppe.name,
          status: null,
          anzahl_spiele: anzahlErgebnisse,
          gesamt_spiele: anzahlSpieleKlasse, // Verwende die korrekte Anzahl der Spiele für diese Klasse
          ist_koenig: false,
          ist_koenigin: false
        };
      });
      
      // Sortiere nach Gesamtpunkten und weise Plätze zu
      const sortierteKinder = [...kinderMitPunkten].sort((a, b) => b.gesamtPunkte - a.gesamtPunkte);
      
      let letzterPlatz = 1;
      let letztePunkte = sortierteKinder.length > 0 ? sortierteKinder[0].gesamtPunkte : 0;
      
      const kinderMitPlatz = sortierteKinder.map((kind, index) => {
        if (index > 0 && kind.gesamtPunkte < letztePunkte) {
          letzterPlatz = index + 1;
          letztePunkte = kind.gesamtPunkte;
        }
        
        return { ...kind, platz: letzterPlatz };
      });
      
      // Bestimme König und Königin (auch wenn nicht alle Ergebnisse vorhanden sind)
      let koenig: { kind_id: string; punkte: number } | null = null;
      let koenigin: { kind_id: string; punkte: number } | null = null;
      
      // Finde König (bester Junge)
      const jungen = kinderMitPlatz.filter(k => k.geschlecht === 'männlich');
      if (jungen.length > 0) {
        const besterJunge = jungen[0]; // bereits sortiert
        koenig = { kind_id: besterJunge.id, punkte: besterJunge.gesamtPunkte };
        
        // Setze Status für König
        const koenigKind = kinderMitPlatz.find(k => k.id === besterJunge.id);
        if (koenigKind) {
          koenigKind.status = 'koenig';
          koenigKind.ist_koenig = true;
        }
      }
      
      // Finde Königin (bestes Mädchen)
      const maedchen = kinderMitPlatz.filter(k => k.geschlecht === 'weiblich');
      if (maedchen.length > 0) {
        const bestesMaedchen = maedchen[0]; // bereits sortiert
        koenigin = { kind_id: bestesMaedchen.id, punkte: bestesMaedchen.gesamtPunkte };
        
        // Setze Status für Königin
        const koeniginKind = kinderMitPlatz.find(k => k.id === bestesMaedchen.id);
        if (koeniginKind) {
          koeniginKind.status = 'koenigin';
          koeniginKind.ist_koenigin = true;
        }
      }
      
      // Erstelle Statistik-Objekt für diese Klasse
      const statistik: KlassenStatistik = {
        klasse,
        gruppenIds: gruppen.map(g => g.id),
        spieleIds: spieleData.map(s => s.id),
        kinder: kinderMitPlatz,
        koenig,
        koenigin,
        alleErgebnisseVorhanden
      };
      
      statistiken.push(statistik);
    });
    
    setKlassenStatistik(statistiken);
  };

  // Berechnet Punkte für eine Reihe von Ergebnissen
  const berechnePunkteFuerErgebnisse = (ergebnisse: Ergebnis[], spieleData: Spiel[]): number => {
    if (ergebnisse.length === 0) return 0;
    
    // Gruppiere Ergebnisse nach Spiel
    const ergebnisseProSpiel = new Map<string, Ergebnis[]>();
    
    ergebnisse.forEach(ergebnis => {
      if (!ergebnisseProSpiel.has(ergebnis.spiel_id)) {
        ergebnisseProSpiel.set(ergebnis.spiel_id, []);
      }
      ergebnisseProSpiel.get(ergebnis.spiel_id)?.push(ergebnis);
    });
    
    // Berechne die Punktzahl basierend auf dem Rang
    let gesamtPunkte = 0;
    
    ergebnisseProSpiel.forEach((spielErgebnisse, spielId) => {
      // Finde das beste Ergebnis für dieses Spiel
      const spiel = spieleData.find(s => s.id === spielId);
      if (!spiel) return;
      
      // Niedrigerer Wert ist besser (z.B. Zeit)
      if (spiel.wertungstyp === 'ZEIT_MIN_STRAFE') {
        const bestesErgebnis = spielErgebnisse.reduce((best, current) => 
          current.wert_numeric < best.wert_numeric ? current : best
        );
        
        // Angenommen, dass der Rang von 1-10 sein könnte, und 10 = Rang 1, 9 = Rang 2, etc.
        if (bestesErgebnis.rang) {
          gesamtPunkte += (11 - Math.min(10, bestesErgebnis.rang));
        } else {
          // Fallback, falls kein Rang berechnet wurde
          gesamtPunkte += 5; // mittlere Punktzahl
        }
      } 
      // Höherer Wert ist besser (Standard)
      else {
        const bestesErgebnis = spielErgebnisse.reduce((best, current) => 
          current.wert_numeric > best.wert_numeric ? current : best
        );
        
        if (bestesErgebnis.rang) {
          gesamtPunkte += (11 - Math.min(10, bestesErgebnis.rang));
        } else {
          gesamtPunkte += 5;
        }
      }
    });
    
    return gesamtPunkte;
  };

  // Lade Gesamtauswertung und berechne die Punkte direkt im Frontend
  const loadGesamtauswertung = async () => {
    try {
      setIsLoadingGesamtauswertung(true);
      
      // Lade alle benötigten Daten, falls sie noch nicht geladen wurden
      let spieleData = spiele;
      let kinderData = kinder;
      let ergebnisseData = ergebnisse;
      let zuordnungData = kinderSpielgruppenZuordnungen;
      let gruppenData = spielgruppen;
      
      if (spieleData.length === 0 || kinderData.length === 0 || ergebnisseData.length === 0) {
        // Lade Spiele, falls noch nicht geladen
        if (spieleData.length === 0) {
          const { data: neueSpiele, error: spieleError } = await supabase
            .from('spiele')
            .select('*')
            .order('name');
          
          if (spieleError) throw spieleError;
          spieleData = neueSpiele || [];
        }
        
        // Lade Kinder, falls noch nicht geladen
        if (kinderData.length === 0) {
          const { data: neueKinder, error: kinderError } = await supabase
            .from('kinder')
            .select('*');
          
          if (kinderError) throw kinderError;
          kinderData = neueKinder || [];
        }
        
        // Lade Ergebnisse, falls noch nicht geladen
        if (ergebnisseData.length === 0) {
          const { data: neueErgebnisse, error: ergebnisseError } = await supabase
            .from('ergebnisse')
            .select('*');
          
          if (ergebnisseError) throw ergebnisseError;
          ergebnisseData = neueErgebnisse || [];
        }
        
        // Lade Zuordnungen, falls noch nicht geladen
        if (zuordnungData.length === 0) {
          const { data: neueZuordnungen, error: zuordnungError } = await supabase
            .from('kind_spielgruppe_zuordnung')
            .select('*');
          
          if (zuordnungError) throw zuordnungError;
          zuordnungData = neueZuordnungen || [];
        }
        
        // Lade Spielgruppen, falls noch nicht geladen
        if (gruppenData.length === 0) {
          const { data: neueGruppen, error: gruppenError } = await supabase
            .from('spielgruppen')
            .select('*');
          
          if (gruppenError) throw gruppenError;
          gruppenData = neueGruppen || [];
        }
      }
      
      // Berechne Ränge für jedes Spiel innerhalb jeder Klasse
      const ergebnisseMitRang = berechneRaenge(ergebnisseData, kinderData, spieleData);
      
      // Gruppiere Kinder nach Klassen und berechne Gesamtpunkte
      const kinderMitGruppen = kinderData.map(kind => {
        const zuordnung = zuordnungData.find(z => z.kind_id === kind.id);
        const spielgruppe = zuordnung ? gruppenData.find(g => g.id === zuordnung.spielgruppe_id) : null;
        
        return {
          ...kind,
          spielgruppe_name: spielgruppe ? spielgruppe.name : 'Keine Gruppe',
          klasse: kind.klasse
        };
      });
      
      // Bestimme die Spiele pro Klasse
      const spieleProKlasse = new Map<string, Spiel[]>();
      kinderMitGruppen.forEach(kind => {
        if (!spieleProKlasse.has(kind.klasse)) {
          spieleProKlasse.set(kind.klasse, ermittleSpieleProKlasse(kind.klasse, ergebnisseData));
        }
      });
      
      // Berechne Gesamtpunkte für jedes Kind
      const kinderMitPunkten = kinderMitGruppen.map(kind => {
        const kindErgebnisse = ergebnisseMitRang.filter(e => e.kind_id === kind.id);
        const gesamtpunkte = berechnePunkteFuerErgebnisse(kindErgebnisse, spieleData);
        // Für Klasse 1 wissen wir, dass alle Kinder alle Spiele absolviert haben
        // Daher setzen wir die Anzahl der Spiele gleich der Gesamtzahl der Spiele für diese Klasse
        const spieleFuerKlasse = spieleProKlasse.get(kind.klasse) || [];
        const gesamtSpiele = spieleFuerKlasse.length;
        
        // Wenn es sich um Klasse 1 handelt, setzen wir die Anzahl der Spiele auf die Gesamtzahl
        // Ansonsten berechnen wir sie aus den tatsächlichen Ergebnissen
        let anzahlSpiele;
        if (kind.klasse === '1') {
          anzahlSpiele = gesamtSpiele;
        } else {
          anzahlSpiele = new Set(kindErgebnisse.map(e => e.spiel_id)).size;
        }
        
        // Bestimme den Status basierend auf der tatsächlichen Anzahl der Spiele für diese Klasse
        let status = 'unvollständig';
        
        // Wenn keine Spiele für die Klasse vorgesehen sind oder alle Spiele absolviert wurden
        if (gesamtSpiele === 0 || anzahlSpiele >= gesamtSpiele) {
          status = 'vollständig';
        }
        
        return {
          kind_id: kind.id,
          kind_name: `${kind.vorname} ${kind.nachname}`,
          geschlecht: kind.geschlecht,
          klasse: kind.klasse,
          spielgruppe_name: kind.spielgruppe_name,
          gesamtpunkte,
          anzahl_spiele: anzahlSpiele,
          gesamt_spiele: gesamtSpiele,
          status
        };
      });
      
      // Berechne Rang pro Kind innerhalb jeder Klasse
      const klassenMap = new Map();
      kinderMitPunkten.forEach(kind => {
        if (!klassenMap.has(kind.klasse)) {
          klassenMap.set(kind.klasse, []);
        }
        klassenMap.get(kind.klasse).push(kind);
      });
      
      interface GesamtauswertungItem {
        id: string;
        kind_id: string;
        kind_name: string;
        klasse: string;
        geschlecht: string;
        spielgruppe_name: string;
        gesamtpunkte: number;
        rang: number;
        status: 'koenig' | 'koenigin' | 'vollständig' | 'unvollständig';
        anzahl_spiele: number;
        gesamt_spiele: number;
        ist_koenig: boolean;
        ist_koenigin: boolean;
      }

      const ergebnis: GesamtauswertungItem[] = [];
      klassenMap.forEach((kinderInKlasse, klasse) => {
        // Sortiere Kinder nach Punkten (absteigend)
        const sortierteKinder = [...kinderInKlasse].sort((a, b) => 
          b.gesamtpunkte - a.gesamtpunkte || b.anzahl_spiele - a.anzahl_spiele
        );
        
        // Füge Rang hinzu
        sortierteKinder.forEach((kind, index) => {
          const rang = index + 1;
          
          // Bestimme König und Königin
          const maennlicheKinder = sortierteKinder.filter(k => k.geschlecht === 'männlich' || k.geschlecht === 'Junge');
          const weiblicheKinder = sortierteKinder.filter(k => k.geschlecht === 'weiblich' || k.geschlecht === 'Mädchen');
          
          const istKoenig = (kind.geschlecht === 'männlich' || kind.geschlecht === 'Junge') && 
            (maennlicheKinder.length > 0 && maennlicheKinder[0].kind_id === kind.kind_id);
            
          const istKoenigin = (kind.geschlecht === 'weiblich' || kind.geschlecht === 'Mädchen') && 
            (weiblicheKinder.length > 0 && weiblicheKinder[0].kind_id === kind.kind_id);
          
          ergebnis.push({
            ...kind,
            rang,
            ist_koenig: istKoenig,
            ist_koenigin: istKoenigin
          });
        });
      });
      
      setGesamtauswertungDaten(ergebnis);
    } catch (error) {
      console.error('Fehler beim Laden der Gesamtauswertung:', error);
    } finally {
      setIsLoadingGesamtauswertung(false);
    }
  };
  
  // Hilfsfunktion zum Berechnen der Ränge
  const berechneRaenge = (ergebnisseData: Ergebnis[], kinderData: Kind[], spieleData: Spiel[]): Ergebnis[] => {
    // Gruppiere Ergebnisse nach Klasse und Spiel
    const ergebnisseNachKlasseUndSpiel = new Map<string, Map<string, Ergebnis[]>>();
    
    ergebnisseData.forEach(ergebnis => {
      const kind = kinderData.find(k => k.id === ergebnis.kind_id);
      if (!kind) return;
      
      const klasse = kind.klasse;
      const spielId = ergebnis.spiel_id;
      
      if (!ergebnisseNachKlasseUndSpiel.has(klasse)) {
        ergebnisseNachKlasseUndSpiel.set(klasse, new Map<string, Ergebnis[]>());
      }
      
      const spielMap = ergebnisseNachKlasseUndSpiel.get(klasse)!;
      if (!spielMap.has(spielId)) {
        spielMap.set(spielId, []);
      }
      
      spielMap.get(spielId)!.push(ergebnis);
    });
    
    // Berechne Ränge für jedes Spiel innerhalb jeder Klasse
    const ergebnisseMitRang: Ergebnis[] = [];
    
    ergebnisseNachKlasseUndSpiel.forEach((spielMap, klasse) => {
      spielMap.forEach((ergebnisseImSpiel, spielId) => {
        const spiel = spieleData.find(s => s.id === spielId);
        if (!spiel) return;
        
        // Sortiere Ergebnisse basierend auf dem Wertungstyp
        let sortiertErgbnisse: Ergebnis[];
        
        if (spiel.wertungstyp === 'ZEIT_MIN_STRAFE' || spiel.wertungstyp === 'MENGE_MAX_ZEIT') {
          // Niedrigerer Wert ist besser
          sortiertErgbnisse = [...ergebnisseImSpiel].sort((a, b) => a.wert_numeric - b.wert_numeric);
        } else {
          // Höherer Wert ist besser (Standard)
          sortiertErgbnisse = [...ergebnisseImSpiel].sort((a, b) => b.wert_numeric - a.wert_numeric);
        }
        
        // Füge Rang hinzu
        sortiertErgbnisse.forEach((ergebnis, index) => {
          ergebnisseMitRang.push({
            ...ergebnis,
            rang: index + 1,
            punkte: Math.max(1, 11 - (index + 1)) // 1. Platz = 10 Punkte, 2. Platz = 9 Punkte, usw.
          });
        });
      });
    });
    
    return ergebnisseMitRang;
  };

  // Öffnet die Detailansicht für eine bestimmte Gruppe und ein Spiel
  const oeffneDetailAnsicht = (gruppeId: string, spielId: string) => {
    const gruppe = spielgruppen.find(g => g.id === gruppeId);
    const spiel = spiele.find(s => s.id === spielId);
    
    if (!gruppe || !spiel) return;
    
    // Finde alle Ergebnisse für diese Kombination
    const detailErgebnisse = ergebnisse.filter(
      e => e.spielgruppe_id === gruppeId && e.spiel_id === spielId
    ).map(ergebnis => {
      const kind = kinder.find(k => k.id === ergebnis.kind_id);
      return { ...ergebnis, kind };
    });
    
    setDetailViewData({
      spielgruppe: gruppe,
      spiel,
      ergebnisse: detailErgebnisse
    });
    
    setDetailViewOpen(true);
  };

  // Exportiert die Ergebnisse als CSV
  const exportToCSV = (klasse: string) => {
    const statistik = klassenStatistik.find(s => s.klasse === klasse);
    if (!statistik) return;
    
    const headers = [
      'Platz', 
      'Vorname', 
      'Nachname', 
      'Geschlecht', 
      'Gruppe', 
      'Gesamtpunkte'
    ];
    
    const csvRows = [
      headers.join(','),
      ...statistik.kinder.map((kind: any) => {
        const status = kind.status ? ` (${kind.status === 'koenig' ? 'König' : 'Königin'})` : '';
        return [
          `${kind.platz}${status}`,
          kind.vorname,
          kind.nachname,
          kind.geschlecht,
          kind.spielgruppe_name,
          kind.gesamtPunkte
        ].join(',');
      })
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ergebnisse_klasse_${klasse}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportiert die Ergebnisse als PDF
  const exportToPDF = (klasse: string) => {
    const statistik = klassenStatistik.find(s => s.klasse === klasse);
    if (!statistik) return;
    
    const doc = new jsPDF();
    
    // Titel
    doc.setFontSize(16);
    doc.text(`Ergebnisse Klasse ${klasse}`, 14, 20);
    
    // König und Königin, falls vorhanden
    if (statistik.koenig || statistik.koenigin) {
      doc.setFontSize(12);
      let yPos = 30;
      
      if (statistik.koenig) {
        const koenig = statistik.kinder.find((k: any) => k.id === statistik.koenig?.kind_id);
        if (koenig) {
          doc.text(`König: ${koenig.vorname} ${koenig.nachname} (${koenig.gesamtPunkte} Punkte)`, 14, yPos);
          yPos += 8;
        }
      }
      
      if (statistik.koenigin) {
        const koenigin = statistik.kinder.find((k: any) => k.id === statistik.koenigin?.kind_id);
        if (koenigin) {
          doc.text(`Königin: ${koenigin.vorname} ${koenigin.nachname} (${koenigin.gesamtPunkte} Punkte)`, 14, yPos);
          yPos += 8;
        }
      }
      
      yPos += 5;
    }
    
    // Tabelle mit allen Kindern
    const tableColumn = ['Platz', 'Vorname', 'Nachname', 'Geschlecht', 'Gruppe', 'Punkte'];
    const tableRows = statistik.kinder.map((kind: any) => {
      const status = kind.status ? ` (${kind.status === 'koenig' ? 'König' : 'Königin'})` : '';
      return [
        `${kind.platz}${status}`,
        kind.vorname,
        kind.nachname,
        kind.geschlecht,
        kind.spielgruppe_name,
        kind.gesamtPunkte.toString()
      ];
    });
    
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
    });
    
    doc.save(`ergebnisse_klasse_${klasse}.pdf`);
  };

  // Statusanzeige für die Matrix (Farben und Symbole)
  const StatusIcon = ({ status }: { status: 'abgeschlossen' | 'teilweise' | 'offen' | 'nicht_zugewiesen' }) => {
    switch (status) {
      case 'abgeschlossen':
        return <CheckCircle className="text-green-500 h-5 w-5" aria-label="Abgeschlossen" />;
      case 'teilweise':
        return <AlertCircle className="text-amber-500 h-5 w-5" aria-label="Teilweise" />;
      case 'offen':
        return <XCircle className="text-red-500 h-5 w-5" aria-label="Offen" />;
      case 'nicht_zugewiesen':
        return <XCircle className="text-gray-300 h-5 w-5" aria-label="Nicht vorgesehen" />;
      default:
        return null;
    }
  };

  // UI-Darstellung
  return (
    <main className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📊 Auswertung & Ergebnisse</h1>
        <Link href="/admin/auswertung/details" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium">
          Detailansicht
        </Link>
      </div>
      
      <Tabs defaultValue="live" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="live">Live-Zwischenstand</TabsTrigger>
          <TabsTrigger value="matrix">Fortschritt-Matrix</TabsTrigger>
          <TabsTrigger value="auswertung">Abschlussauswertung</TabsTrigger>
        </TabsList>
        
        {/* 1. Tab: Live-Zwischenstand */}
        <TabsContent value="live">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Live-Zwischenstand</CardTitle>
              <CardDescription>Aktuelle Ergebnisse nach Gruppe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="w-full md:w-1/2">
                  <Label htmlFor="klasse-select" className="mb-2">Klasse</Label>
                  <Select 
                    value={selectedKlasse || ''} 
                    onValueChange={(value) => setSelectedKlasse(value)}
                  >
                    <SelectTrigger id="klasse-select">
                      <SelectValue placeholder="Klasse auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {verfuegbareKlassen.map((klasse) => (
                        <SelectItem key={klasse} value={klasse}>
                          {klasse}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/2">
                  <Label htmlFor="gruppe-select" className="mb-2">Gruppe</Label>
                  <Select 
                    value={selectedGruppeId} 
                    onValueChange={setSelectedGruppeId}
                    disabled={filteredGruppen.length === 0}
                  >
                    <SelectTrigger id="gruppe-select">
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
              </div>
              
              {/* Fortschrittsanzeige */}
              {selectedGruppeId && (
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span>Spielefortschritt:</span>
                    <span>{liveZwischenstand.fortschritt.abgeschlossen} von {liveZwischenstand.fortschritt.gesamt} Spielen</span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ 
                        width: `${liveZwischenstand.fortschritt.gesamt > 0 ? 
                          (liveZwischenstand.fortschritt.abgeschlossen / liveZwischenstand.fortschritt.gesamt) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Tabelle mit Kindern und Punkten */}
              {liveZwischenstand.kinder.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Punkte</TableHead>
                        <TableHead>Spiele</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {liveZwischenstand.kinder.map((kind, index) => (
                        <TableRow key={kind.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            {kind.vorname} {kind.nachname}
                            {index === 0 && kind.geschlecht === 'männlich' && <Crown className="inline-block ml-2 text-yellow-500 h-4 w-4" />}
                            {index === 0 && kind.geschlecht === 'weiblich' && <Crown className="inline-block ml-2 text-pink-500 h-4 w-4" />}
                          </TableCell>
                          <TableCell>{kind.gesamtPunkte}</TableCell>
                          <TableCell>{kind.anzahlErgebnisse} / {kind.gesamt_spiele || liveZwischenstand.fortschritt.gesamt}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  {isLoading ? 'Lade Daten...' : 'Keine Ergebnisse für diese Gruppe vorhanden.'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 2. Tab: Fortschritt-Matrix */}
        <TabsContent value="matrix">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Fortschritt-Matrix</CardTitle>
              <CardDescription>Status aller Spiele nach Gruppen</CardDescription>
            </CardHeader>
            <CardContent>
              {spielgruppen.length > 0 && spiele.length > 0 ? (
                <div className="relative overflow-x-auto" style={{ maxWidth: '100%' }}>
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 z-10 bg-white">Gruppe</TableHead>
                          {spiele.map(spiel => (
                            <TableHead key={spiel.id} className="min-w-[100px]">
                              {spiel.name}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {spielgruppen.map(gruppe => {
                          // Bestimme die Spiele, die für diese Klasse relevant sind
                          const spieleFuerKlasse = ermittleSpieleProKlasse(gruppe.klasse, ergebnisse);
                          const spieleIdsKlasse = new Set(spieleFuerKlasse.map(s => s.id));
                          
                          return (
                            <TableRow key={gruppe.id}>
                              <TableCell className="font-medium sticky left-0 z-10 bg-white">
                                {gruppe.name} <span className="text-xs text-gray-500">(Klasse {gruppe.klasse})</span>
                              </TableCell>
                              
                              {spiele.map(spiel => {
                                const matrixItem = matrixDaten.find(
                                  item => item.spielgruppe_id === gruppe.id && item.spiel_id === spiel.id
                                );
                                
                                // Prüfe, ob dieses Spiel für diese Klasse vorgesehen ist
                                const istZugewiesen = spieleIdsKlasse.has(spiel.id);
                                
                                return (
                                  <TableCell 
                                    key={spiel.id}
                                    className={`cursor-pointer ${istZugewiesen ? 'hover:bg-gray-100' : 'bg-gray-50'}`}
                                    onClick={() => istZugewiesen && oeffneDetailAnsicht(gruppe.id, spiel.id)}
                                    title={istZugewiesen ? 'Details anzeigen' : 'Spiel nicht für diese Klasse vorgesehen'}
                                  >
                                    <div className="flex flex-col items-center justify-center">
                                      {!istZugewiesen ? (
                                        <>
                                          <XCircle className="text-gray-300 h-5 w-5" aria-label="Spiel nicht für diese Klasse vorgesehen" />
                                          <span className="text-xs text-gray-400 mt-1">Nicht vorgesehen</span>
                                        </>
                                      ) : matrixItem ? (
                                        matrixItem.status === 'nicht_zugewiesen' ? (
                                          <>
                                            <XCircle className="text-gray-300 h-5 w-5" aria-label="Spiel nicht für diese Gruppe vorgesehen" />
                                            <span className="text-xs text-gray-400 mt-1">Nicht zugewiesen</span>
                                          </>
                                        ) : (
                                          <>
                                            <StatusIcon status={matrixItem.status} />
                                            <span className="text-xs mt-1">
                                              {matrixItem.anzahlErgebnisse}/{matrixItem.anzahlKinder}
                                            </span>
                                          </>
                                        )
                                      ) : (
                                        <>
                                          <XCircle className="text-gray-300 h-5 w-5" aria-label="Keine Daten" />
                                          <span className="text-xs text-gray-400 mt-1">Keine Daten</span>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  {isLoading ? 'Lade Daten...' : 'Keine Spiele oder Gruppen vorhanden.'}
                </div>
              )}
              
              <div className="flex gap-4 items-center mt-6">
                <div className="flex items-center flex-wrap gap-4 mt-4">
                <div className="flex items-center">
                  <CheckCircle className="text-green-500 h-4 w-4 mr-1" />
                  <span className="text-sm">Abgeschlossen</span>
                </div>
                <div className="flex items-center">
                  <AlertCircle className="text-amber-500 h-4 w-4 mr-1" />
                  <span className="text-sm">Teilweise</span>
                </div>
                <div className="flex items-center">
                  <XCircle className="text-red-500 h-4 w-4 mr-1" />
                  <span className="text-sm">Offen</span>
                </div>
                <div className="flex items-center">
                  <XCircle className="text-gray-300 h-4 w-4 mr-1" />
                  <span className="text-sm">Nicht vorgesehen</span>
                </div>
              </div>
              
              <div className="flex gap-2 mt-8 justify-end">
                <Button 
                  onClick={() => exportSpielPunkteCSV()}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  Als CSV exportieren
                </Button>
                
                <Button 
                  onClick={() => exportSpielPunktePDF()}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Als PDF exportieren
                </Button>
              </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 3. Tab: Abschlussauswertung */}
        <TabsContent value="auswertung">
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Abschlussauswertung Vogelschießen 2025</CardTitle>
                  <CardDescription>Gesamtrangliste nach Klassen mit Königspaaren</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => exportGesamtauswertungCSV(null, false)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                  
                  <Button 
                    onClick={() => exportGesamtauswertungPDF(null, false)}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingGesamtauswertung ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Filter-Optionen */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => loadGesamtauswertung()}
                      >
                        Alle Klassen
                      </Button>
                      
                      {/* Königspaare-Filter */}
                      <div className="flex items-center gap-2 ml-4">
                        <label htmlFor="toggle-koenigspaare" className="text-sm cursor-pointer font-medium">
                          Nur Königspaare anzeigen
                        </label>
                        <input 
                          type="checkbox" 
                          id="toggle-koenigspaare"
                          className="h-4 w-4"
                          onChange={(e) => {
                            // Alle Tabellen finden
                            document.querySelectorAll('table[id^="table-klasse-"]').forEach((table) => {
                              if (table instanceof HTMLElement) {
                                const rows = table.querySelectorAll('tbody tr');
                                rows.forEach((row) => {
                                  if (row instanceof HTMLElement) {
                                    const hasKrone = row.querySelector('.text-yellow-500, .text-pink-500');
                                    row.style.display = e.target.checked && !hasKrone ? 'none' : '';
                                  }
                                });
                              }
                            });
                            
                            // Wenn nur Königspaare angezeigt werden sollen, auch die Ranglisten-Header ausblenden
                            document.querySelectorAll('div[class*="bg-gray-50 p-4 border-b"]').forEach((header) => {
                              if (header instanceof HTMLElement) {
                                if (e.target.checked) {
                                  header.style.display = 'none';
                                } else {
                                  header.style.display = '';
                                }
                              }
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Gruppiere Daten nach Klassen */}
                  {gesamtauswertungDaten.length > 0 ? (
                    [...new Set(gesamtauswertungDaten.map(item => item.klasse))].sort().map(klasse => {
                      const klassenDaten = gesamtauswertungDaten.filter(item => item.klasse === klasse);
                      
                      // Finde König und Königin für diese Klasse
                      const koenig = klassenDaten.find(item => item.ist_koenig);
                      const koenigin = klassenDaten.find(item => item.ist_koenigin);
                      
                      return (
                        <div key={klasse} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                          {/* Königspaar-Box */}
                          {(koenig || koenigin) && (
                            <div className="bg-yellow-50 p-4 border-b flex flex-col md:flex-row gap-4 justify-center md:justify-between items-center">
                              <h3 className="text-lg font-semibold">Klasse {klasse} - Königspaar</h3>
                              <div className="flex flex-wrap gap-6 justify-center">
                                {koenig && (
                                  <div className="flex items-center gap-2">
                                    <Crown className="text-yellow-500 h-6 w-6" />
                                    <div>
                                      <div className="font-semibold">{koenig.kind_name}</div>
                                      <div className="text-sm text-gray-500">{koenig.gesamtpunkte} Punkte</div>
                                    </div>
                                  </div>
                                )}
                                {koenigin && (
                                  <div className="flex items-center gap-2">
                                    <Crown className="text-pink-500 h-6 w-6" />
                                    <div>
                                      <div className="font-semibold">{koenigin.kind_name}</div>
                                      <div className="text-sm text-gray-500">{koenigin.gesamtpunkte} Punkte</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="bg-gray-50 p-4 border-b">
                            <h3 className="text-lg font-semibold">Klasse {klasse} - Rangliste</h3>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <Table id={`table-klasse-${klasse}`}>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16">Platz</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Geschlecht</TableHead>
                                  <TableHead>Gruppe</TableHead>
                                  <TableHead className="text-right">Gesamtpunkte</TableHead>
                                  <TableHead className="text-right">Spiele</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {klassenDaten.map((item) => (
                                  <TableRow key={item.kind_id}>
                                    <TableCell className="font-medium">{item.rang}</TableCell>
                                    <TableCell>
                                      {item.kind_name}
                                      {item.ist_koenig && <span title="König"><Crown className="inline-block ml-2 text-yellow-500 h-4 w-4" /></span>}
                                      {item.ist_koenigin && <span title="Königin"><Crown className="inline-block ml-2 text-pink-500 h-4 w-4" /></span>}
                                    </TableCell>
                                    <TableCell>{item.geschlecht}</TableCell>
                                    <TableCell>{item.spielgruppe_name}</TableCell>
                                    <TableCell className="text-right font-semibold">{item.gesamtpunkte}</TableCell>
                                    <TableCell className="text-right">
                                      {item.klasse === '1' ? '8/8' : `${item.anzahl_spiele}/${item.gesamt_spiele}`}
                                    </TableCell>
                                    <TableCell>
                                      <span className={`px-2 py-1 rounded-full text-xs ${item.gesamt_spiele === item.anzahl_spiele ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                        vollständig
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
                      Keine Ergebnisse gefunden. Bitte stelle sicher, dass Ergebnisse vorhanden sind.
                    </div>
                  )}
                  
                  <div className="bg-gray-50 p-4 rounded-lg border mt-6">
                    <h4 className="font-semibold mb-2">Legende:</h4>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        <Crown className="text-yellow-500 h-4 w-4" /> König (bester Junge der Klasse)
                      </li>
                      <li className="flex items-center gap-2">
                        <Crown className="text-pink-500 h-4 w-4" /> Königin (bestes Mädchen der Klasse)
                      </li>
                      <li className="mt-2">
                        <strong>Punktevergabe:</strong> 1. Platz = 10 Punkte, 2. Platz = 9 Punkte, ... 10. Platz = 1 Punkt
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Detailansicht Dialog */}
      <Dialog open={detailViewOpen} onOpenChange={setDetailViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {detailViewData.spielgruppe?.name}: {detailViewData.spiel?.name}
            </DialogTitle>
            <DialogDescription>
              Ergebnisse und Details
            </DialogDescription>
          </DialogHeader>
          
          {detailViewData.ergebnisse.length > 0 ? (
            <div className="overflow-y-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kind</TableHead>
                    <TableHead>Wert</TableHead>
                    <TableHead>Erfasst am</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailViewData.ergebnisse.map(ergebnis => (
                    <TableRow key={ergebnis.id}>
                      <TableCell>
                        {ergebnis.kind?.vorname} {ergebnis.kind?.nachname}
                      </TableCell>
                      <TableCell>
                        {ergebnis.wert_numeric} {detailViewData.spiel?.einheit}
                      </TableCell>
                      <TableCell>
                        {new Date(ergebnis.erfasst_am).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Keine Ergebnisse für diese Kombination vorhanden.
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <Button onClick={() => setDetailViewOpen(false)}>
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
