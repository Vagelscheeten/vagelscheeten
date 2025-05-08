'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportCard } from './components/ReportCard';
import { StatCard } from './components/StatCard';
import { SimpleBarChart } from './components/SimpleBarChart';
import { ProgressBar } from './components/ProgressBar';
import { HeatMap } from './components/HeatMap';
import { FilterBar } from './components/FilterBar';
import { KlassenTable } from './components/KlassenTable';
import { FortschrittTable } from './components/FortschrittTable';
import { Users, Trophy, Activity, Gamepad2, Clock, BarChart3, Loader2 } from 'lucide-react';
import { TeilnehmerStatistik } from './components/TeilnehmerStatistik';

export default function Reporting() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // State für Daten
  const [kinder, setKinder] = useState<any[]>([]);
  const [spiele, setSpiele] = useState<any[]>([]);
  const [spielgruppen, setSpielgruppen] = useState<any[]>([]);
  const [ergebnisse, setErgebnisse] = useState<any[]>([]);
  
  // State für Klassendaten
  const [klassenMap, setKlassenMap] = useState<Map<string, number>>(new Map());
  const [klassenOptions, setKlassenOptions] = useState<{value: string, label: string}[]>([]);
  const [gruppenOptions, setGruppenOptions] = useState<{value: string, label: string}[]>([]);
  const [spieleOptions, setSpieleOptions] = useState<{value: string, label: string}[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<string>('');
  const [selectedGruppe, setSelectedGruppe] = useState<string>('');
  const [selectedSpiel, setSelectedSpiel] = useState<string>('alle');
  
  // Berechnete Daten für Reports
  const [kinderProKlasse, setKinderProKlasse] = useState<{label: string, value: number}[]>([]);
  const [fortschrittProKlasse, setFortschrittProKlasse] = useState<{label: string, value: number, maxValue: number}[]>([]);
  const [topPerformer, setTopPerformer] = useState<{rang: number, name: string, klasse: string, gruppe: string, punkte: number}[]>([]);
  
  const supabase = createClient();
  
  // Lade Daten beim ersten Rendern
  useEffect(() => {
    loadData();
  }, []);
  
  // Aktualisiere gefilterte Gruppen, wenn sich die Klasse ändert
  useEffect(() => {
    if (selectedKlasse && spielgruppen.length > 0) {
      const filteredGruppen = spielgruppen.filter(g => g.klasse === selectedKlasse);
      setGruppenOptions(filteredGruppen.map(gruppe => ({
        value: gruppe.id,
        label: gruppe.name
      })));
      
      if (filteredGruppen.length > 0 && 
          (!selectedGruppe || !filteredGruppen.some(g => g.id === selectedGruppe))) {
        setSelectedGruppe(filteredGruppen[0].id);
      }
    }
  }, [selectedKlasse, spielgruppen]);
  
  // Berechne Daten für Reports
  useEffect(() => {
    if (kinder.length > 0) {
      // Berechne Kinder pro Klasse - OPTIMIERT
      const newKlassenMap = new Map<string, number>();
      
      // Zähle Kinder pro Klasse direkt aus der kinder-Tabelle
      kinder.forEach(kind => {
        if (kind.klasse) {
          newKlassenMap.set(kind.klasse, (newKlassenMap.get(kind.klasse) || 0) + 1);
        }
      });
      
      // Speichere die Klassen-Map im State
      setKlassenMap(newKlassenMap);
      
      const kinderProKlasseData = Array.from(newKlassenMap.entries())
        .filter(([klasse]) => klasse) // Filtere leere Klassen
        .map(([klasse, anzahl]) => ({
          label: `Klasse ${klasse}`,
          value: anzahl as number
        }));
      
      console.log('Kinder pro Klasse (optimiert):', kinderProKlasseData);
      setKinderProKlasse(kinderProKlasseData);
      
      // Debug: Zeige die tatsächlichen Zahlen
      console.log('Kinder pro Klasse Map (optimiert):');
      newKlassenMap.forEach((anzahl, klasse) => {
        console.log(`Klasse ${klasse}: ${anzahl} Kinder`);
      });
      
      // Berechne Fortschritt pro Klasse - OPTIMIERT
      const fortschrittData = Array.from(newKlassenMap.keys())
        .filter(klasse => klasse) // Filtere leere Klassen
        .map(klasse => {
          // Finde alle Kinder dieser Klasse direkt
          const klassenKinder = kinder.filter(k => k.klasse === klasse);
          
          console.log(`Klasse ${klasse}: ${klassenKinder.length} Kinder gefunden (optimiert)`);
          
          // Finde die für diese Klasse zugewiesenen Spiele
          // Hier müssen wir die Spielzuweisungen aus der Datenbank berücksichtigen
          // Wir verwenden vorerst eine Hilfsfunktion, um die zugewiesenen Spiele zu ermitteln
          const zugewieseneSpiele = getZugewieseneSpieleFuerKlasse(klasse, spiele);
          console.log(`Klasse ${klasse}: ${zugewieseneSpiele.length} zugewiesene Spiele`);
          
          // Maximale Anzahl möglicher Ergebnisse für diese Klasse
          const maxErgebnisse = klassenKinder.length * zugewieseneSpiele.length;
          
          // Zähle abgeschlossene Spiele für diese Klasse
          let abgeschlosseneSpiele = 0;
          klassenKinder.forEach(kind => {
            // Zähle nur eindeutige Spiele pro Kind, die dieser Klasse zugewiesen sind
            const kindSpieleIds = new Set();
            ergebnisse
              .filter(e => e.kind_id === kind.id && zugewieseneSpiele.some(s => s.id === e.spiel_id))
              .forEach(e => kindSpieleIds.add(e.spiel_id));
            
            abgeschlosseneSpiele += kindSpieleIds.size;
          });
          
          console.log(`Klasse ${klasse}: ${abgeschlosseneSpiele} von ${maxErgebnisse} Spielen abgeschlossen (optimiert)`);
          
          const prozent = maxErgebnisse > 0 ? Math.round((abgeschlosseneSpiele / maxErgebnisse) * 100) : 0;
          
          return {
            label: `Klasse ${klasse}`,
            value: prozent,
            maxValue: maxErgebnisse
          };
        });
      
      console.log('Fortschritt pro Klasse:', fortschrittData);
      setFortschrittProKlasse(fortschrittData);
      
      // Berechne Top-Performer basierend auf der Punkteberechnung aus der Auswertung
      // Zuerst berechne die Punkte für jedes Kind basierend auf den Ergebnissen
      const kinderMitPunkten = kinder.map(kind => {
        // Finde alle Ergebnisse dieses Kindes
        const kindErgebnisse = ergebnisse.filter(e => e.kind_id === kind.id);
        
        // Berechne die Gesamtpunktzahl
        let gesamtPunkte = 0;
        
        // Gruppiere Ergebnisse nach Spiel
        const ergebnisseNachSpiel: Record<string, any[]> = {};
        kindErgebnisse.forEach(ergebnis => {
          if (!ergebnisseNachSpiel[ergebnis.spiel_id]) {
            ergebnisseNachSpiel[ergebnis.spiel_id] = [];
          }
          ergebnisseNachSpiel[ergebnis.spiel_id].push(ergebnis);
        });
        
        // Summiere Punkte aus allen Spielen
        Object.values(ergebnisseNachSpiel).forEach((spielErgebnisse) => {
          // Verwende das Ergebnis mit der höchsten Punktzahl für jedes Spiel
          if (spielErgebnisse.length > 0) {
            const bestesPunkte = Math.max(...spielErgebnisse.map((e: any) => e.punkte || 0));
            gesamtPunkte += bestesPunkte;
          }
        });
        
        const gruppe = spielgruppen.find(g => g.id === kind.spielgruppe_id);
        
        return {
          ...kind,
          punkte: gesamtPunkte,
          klassenName: gruppe ? gruppe.klasse : '',
          gruppenName: gruppe ? gruppe.name : ''
        };
      });
      
      // Sortiere Kinder nach Punkten und nimm die Top 5
      const sortierteKinder = [...kinderMitPunkten].sort((a, b) => b.punkte - a.punkte);
      const topKinder = sortierteKinder.slice(0, 5).map((kind, index) => ({
        rang: index + 1,
        name: `${kind.vorname} ${kind.nachname}`,
        klasse: `Klasse ${kind.klassenName}`,
        gruppe: kind.gruppenName,
        punkte: kind.punkte
      }));
      
      console.log('Top Performer:', topKinder);
      setTopPerformer(topKinder);
    }
  }, [kinder, spielgruppen, spiele, ergebnisse]);
  
  // Lade alle benötigten Daten
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Lade Kinder
      const { data: kinderData, error: kinderError } = await supabase
        .from('kinder')
        .select('*');
      
      if (kinderError) throw kinderError;
      console.log('Geladene Kinder:', kinderData?.length || 0);
      setKinder(kinderData || []);
      
      // Lade Spiele
      const { data: spieleData, error: spieleError } = await supabase
        .from('spiele')
        .select('*')
        .order('name');
      
      if (spieleError) throw spieleError;
      console.log('Geladene Spiele:', spieleData?.length || 0);
      setSpiele(spieleData || []);
      setSpieleOptions(spieleData?.map(spiel => ({
        value: spiel.id,
        label: spiel.name
      })) || []);
      
      // Lade Spielgruppen
      const { data: gruppenData, error: gruppenError } = await supabase
        .from('spielgruppen')
        .select('*')
        .order('name');
      
      if (gruppenError) throw gruppenError;
      console.log('Geladene Spielgruppen:', gruppenData?.length || 0);
      setSpielgruppen(gruppenData || []);
      
      // Extrahiere verfügbare Klassen
      const klassen = [...new Set(gruppenData?.map(g => g.klasse) || [])].sort();
      console.log('Verfügbare Klassen:', klassen);
      setKlassenOptions(klassen.map(klasse => ({
        value: klasse,
        label: `Klasse ${klasse}`
      })));
      
      if (klassen.length > 0) {
        setSelectedKlasse(klassen[0]);
        
        // Filtere Gruppen nach ausgewählter Klasse
        const filteredGruppen = gruppenData?.filter(g => g.klasse === klassen[0]) || [];
        setGruppenOptions(filteredGruppen.map(gruppe => ({
          value: gruppe.id,
          label: gruppe.name
        })));
        
        if (filteredGruppen.length > 0) {
          setSelectedGruppe(filteredGruppen[0].id);
        }
      }
      
      // Lade Ergebnisse mit Punkten
      const { data: ergebnisseData, error: ergebnisseError } = await supabase
        .from('ergebnisse')
        .select('*');
      
      if (ergebnisseError) throw ergebnisseError;
      console.log('Geladene Ergebnisse:', ergebnisseData?.length || 0);
      
      // Berechne Punkte für jedes Ergebnis basierend auf dem Rang
      // Diese Logik sollte mit der Punkteberechnung in der Auswertung übereinstimmen
      const ergebnisseMitPunkten = await berechnePunkteFuerErgebnisse(ergebnisseData || []);
      console.log('Ergebnisse mit Punkten:', ergebnisseMitPunkten.length);
      
      setErgebnisse(ergebnisseMitPunkten);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setIsLoading(false);
    }
  };
  
  // Hilfsfunktion, um die zugewiesenen Spiele für eine Klasse zu ermitteln
  const getZugewieseneSpieleFuerKlasse = (klasse: string, alleSpiele: any[]) => {
    // Basierend auf den Anforderungen haben verschiedene Klassen unterschiedliche Spielzuweisungen
    // Hier implementieren wir die Logik basierend auf den bekannten Zuweisungen
    
    // Bekannte Spielzuweisungen für Klasse 1
    if (klasse === '1') {
      // Laut Erinnerung hat Klasse 1 genau 8 spezifische Spiele:
      // Armbrustschießen, Bälletransport, Figurenwerfen, Fischstechen, Glücksrad, 
      // Gummistiefelweitwurf, Schatzsuche und Roller-Rennen
      const klasse1SpielNamen = [
        'Armbrustschießen', 'Bälletransport', 'Figurenwerfen', 'Fischstechen', 
        'Glücksrad', 'Gummistiefelweitwurf', 'Schatzsuche', 'Roller-Rennen'
      ];
      
      return alleSpiele.filter(spiel => klasse1SpielNamen.includes(spiel.name));
    }
    
    // Für andere Klassen müssten wir ähnliche Regeln implementieren
    // Vorerst nehmen wir an, dass alle anderen Klassen alle Spiele haben
    // In einer echten Implementierung würden wir diese Zuweisungen aus der Datenbank laden
    
    // Beispiel für Klasse 3 (basierend auf dem Screenshot)
    if (klasse === '3') {
      // Hier könnten wir spezifische Spiele für Klasse 3 definieren
      // Da wir keine genauen Informationen haben, nehmen wir an, dass Klasse 3 alle Spiele hat
      return alleSpiele;
    }
    
    // Für alle anderen Klassen geben wir vorerst alle Spiele zurück
    // In einer vollständigen Implementierung würden wir hier die korrekten Zuweisungen verwenden
    return alleSpiele;
  };
  
  // Berechne Punkte für Ergebnisse basierend auf dem Rang
  const berechnePunkteFuerErgebnisse = async (ergebnisse: any[]) => {
    // Gruppiere Ergebnisse nach Spiel und Spielgruppe
    const gruppiertNachSpielUndGruppe: Record<string, any[]> = {};
    
    ergebnisse.forEach(ergebnis => {
      const key = `${ergebnis.spiel_id}_${ergebnis.spielgruppe_id}`;
      if (!gruppiertNachSpielUndGruppe[key]) {
        gruppiertNachSpielUndGruppe[key] = [];
      }
      gruppiertNachSpielUndGruppe[key].push(ergebnis);
    });
    
    // Lade Spiele für die Wertungstypen
    const { data: spieleData, error: spieleError } = await supabase
      .from('spiele')
      .select('*');
    
    if (spieleError) throw spieleError;
    
    // Berechne Rang für jedes Ergebnis innerhalb seiner Gruppe
    const ergebnisseMitRang = [...ergebnisse];
    
    Object.entries(gruppiertNachSpielUndGruppe).forEach(([key, gruppenErgebnisse]) => {
      const [spielId] = key.split('_');
      const spiel = spieleData?.find(s => s.id === spielId);
      
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
    
    // Berechne Punkte basierend auf dem Rang
    return ergebnisseMitRang.map(ergebnis => {
      let punkte = 0;
      
      if (ergebnis.rang) {
        if (ergebnis.rang >= 11) {
          punkte = 0; // Rang 11 oder schlechter: 0 Punkte
        } else {
          punkte = 11 - ergebnis.rang; // Formel: 11 - Rang
        }
      }
      
      return {
        ...ergebnis,
        punkte
      };
    });
  };
  
  return (
    <main className="p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">📊 Reporting & Statistiken</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="teilnehmer">Teilnehmerstatistik</TabsTrigger>
          <TabsTrigger value="spiele">Spielstatistik</TabsTrigger>
          <TabsTrigger value="fortschritt">Fortschrittsmonitor</TabsTrigger>
          <TabsTrigger value="vergleich">Ergebnisvergleich</TabsTrigger>
        </TabsList>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  title="Teilnehmende Kinder" 
                  value={kinder.length.toString()} 
                  icon={<Users size={24} />} 
                />
                <StatCard 
                  title="Spiele" 
                  value={spiele.length.toString()} 
                  icon={<Gamepad2 size={24} />} 
                />
                <StatCard 
                  title="Fortschritt" 
                  value={(() => {
                    // Berechne den tatsächlichen Fortschritt
                    // Zähle nur eindeutige Spiel-Kind-Kombinationen
                    const spielKindKombinationen = new Set();
                    ergebnisse.forEach(e => {
                      spielKindKombinationen.add(`${e.kind_id}_${e.spiel_id}`);
                    });
                    
                    const abgeschlosseneSpiele = spielKindKombinationen.size;
                    const maxErgebnisse = kinder.length * spiele.length;
                    
                    const prozent = maxErgebnisse > 0 ? Math.round((abgeschlosseneSpiele / maxErgebnisse) * 100) : 0;
                    return `${prozent}%`;
                  })()} 
                  icon={<BarChart3 size={24} />} 
                />
                <StatCard 
                  title="Durchschnittl. Punkte" 
                  value={(() => {
                    // Berechne die Gesamtpunktzahl aller Kinder
                    let gesamtPunkte = 0;
                    
                    // Gruppiere Ergebnisse nach Kind und Spiel
                    const punkteProKind: Record<string, Record<string, number>> = {};
                    
                    ergebnisse.forEach(ergebnis => {
                      if (!punkteProKind[ergebnis.kind_id]) {
                        punkteProKind[ergebnis.kind_id] = {};
                      }
                      
                      const spielId = ergebnis.spiel_id;
                      const punkte = ergebnis.punkte || 0;
                      
                      // Speichere nur das beste Ergebnis pro Spiel
                      if (!punkteProKind[ergebnis.kind_id][spielId] || punkte > punkteProKind[ergebnis.kind_id][spielId]) {
                        punkteProKind[ergebnis.kind_id][spielId] = punkte;
                      }
                    });
                    
                    // Summiere die besten Punkte pro Kind
                    Object.values(punkteProKind).forEach(spielPunkte => {
                      Object.values(spielPunkte).forEach(punkte => {
                        gesamtPunkte += punkte;
                      });
                    });
                    
                    // Berechne den Durchschnitt (nur für Kinder mit Ergebnissen)
                    const kinderMitErgebnissen = Object.keys(punkteProKind).length;
                    return kinderMitErgebnissen > 0 ? Math.round(gesamtPunkte / kinderMitErgebnissen).toString() : '0';
                  })()} 
                  icon={<Trophy size={24} />} 
                />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReportCard
                  title="Teilnahme nach Klassen"
                  description="Anzahl der Kinder pro Klasse"
                  onExport={() => {
                    // CSV Export
                    const csvContent = [
                      'Klasse,Anzahl Kinder',
                      ...Array.from(klassenMap.entries())
                        .filter(([klasse]) => klasse)
                        .map(([klasse, anzahl]) => `Klasse ${klasse},${anzahl}`)
                    ].join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'teilnahme_nach_klassen.csv';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <div className="mt-4">
                    <KlassenTable klassenMap={klassenMap} />
                  </div>
                </ReportCard>
                
                <ReportCard
                  title="Fortschritt nach Klassen"
                  description="Prozentsatz der abgeschlossenen Spiele"
                  onExport={() => {
                    // CSV Export
                    const csvContent = [
                      'Klasse,Fortschritt (%),Abgeschlossene Spiele,Maximale Spiele',
                      ...fortschrittProKlasse.map(item => 
                        `${item.label},${item.value},${Math.round((item.value / 100) * item.maxValue)},${item.maxValue}`
                      )
                    ].join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'fortschritt_nach_klassen.csv';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <div className="mt-4">
                    <FortschrittTable fortschrittProKlasse={fortschrittProKlasse} />
                  </div>
                </ReportCard>
              </div>
              
              <ReportCard
                title="Top-Performer"
                description="Kinder mit den höchsten Gesamtpunktzahlen"
                onExport={() => {
                  // CSV Export
                  const csvContent = [
                    'Rang,Name,Klasse,Gruppe,Punkte',
                    ...topPerformer.map(item => `${item.rang},${item.name},${item.klasse},${item.gruppe},${item.punkte}`)
                  ].join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = 'top_performer.csv';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rang</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klasse</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gruppe</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punkte</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topPerformer.map((performer) => (
                        <tr key={performer.rang} className={performer.rang <= 2 ? 'bg-yellow-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{performer.rang}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{performer.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{performer.klasse}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{performer.gruppe}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{performer.punkte}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ReportCard>
            </TabsContent>
            
            {/* Weitere Tabs werden in separaten Dateien implementiert */}
            <TabsContent value="teilnehmer">
              <TeilnehmerStatistik 
                kinder={kinder}
                ergebnisse={ergebnisse}
                klassenMap={klassenMap}
                kinderProKlasse={kinderProKlasse}
              />
            </TabsContent>
            
            <TabsContent value="punktedurchschnitt">
              <ReportCard
                title="Durchschnittliche Punkte pro Klasse"
                description="Durchschnittliche Punkte aller Kinder pro Klasse"
                onExport={() => {
                  const punkteDurchschnittData = Array.from(klassenMap.keys())
                    .filter(klasse => klasse)
                    .map(klasse => {
                      const klassenKinder = kinder.filter(k => k.klasse === klasse);
                      let gesamtPunkte = 0;
                      let kinderMitPunkten = 0;
                      
                      // Berechne die Punkte für jedes Kind in dieser Klasse
                      klassenKinder.forEach(kind => {
                        // Finde alle Ergebnisse dieses Kindes
                        const kindErgebnisse = ergebnisse.filter(e => e.kind_id === kind.id);
                        if (kindErgebnisse.length > 0) {
                          // Gruppiere Ergebnisse nach Spiel
                          const ergebnisseNachSpiel: Record<string, any[]> = {};
                          kindErgebnisse.forEach(ergebnis => {
                            if (!ergebnisseNachSpiel[ergebnis.spiel_id]) {
                              ergebnisseNachSpiel[ergebnis.spiel_id] = [];
                            }
                            ergebnisseNachSpiel[ergebnis.spiel_id].push(ergebnis);
                          });
                          
                          // Summiere Punkte aus allen Spielen
                          let kindPunkte = 0;
                          Object.values(ergebnisseNachSpiel).forEach((spielErgebnisse) => {
                            if (spielErgebnisse.length > 0) {
                              // Verwende das Ergebnis mit der höchsten Punktzahl für jedes Spiel
                              // Stelle sicher, dass wir keine NaN oder undefined-Werte haben
                              const punkteWerte = spielErgebnisse.map(e => {
                                // Prüfe, ob das Ergebnis Punkte hat
                                return typeof e.punkte === 'number' ? e.punkte : 0;
                              });
                              
                              if (punkteWerte.length > 0) {
                                const bestesPunkte = Math.max(...punkteWerte);
                                kindPunkte += bestesPunkte;
                              }
                            }
                          });
                          
                          // Zähle nur Kinder mit Punkten > 0
                          if (kindPunkte > 0) {
                            gesamtPunkte += kindPunkte;
                            kinderMitPunkten++;
                          }
                        }
                      });
                      
                      // Berechne den Durchschnitt, aber nur wenn es Kinder mit Punkten gibt
                      const durchschnitt = kinderMitPunkten > 0 ? Math.round(gesamtPunkte / kinderMitPunkten) : 0;
                      
                      return {
                        klasse,
                        durchschnitt
                      };
                    });
                  
                  // CSV Export
                  const csvContent = [
                    'Klasse,Durchschnittliche Punkte',
                    ...punkteDurchschnittData.map(item => `Klasse ${item.klasse},${item.durchschnitt}`)
                  ].join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = 'punktedurchschnitt_pro_klasse.csv';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <div className="mt-4">
                  <div className="h-64">
                    <SimpleBarChart 
                      data={Array.from(klassenMap.keys())
                        .filter(klasse => klasse)
                        .map(klasse => {
                          const klassenKinder = kinder.filter(k => k.klasse === klasse);
                          let gesamtPunkte = 0;
                          let kinderMitPunkten = 0;
                          
                          // Berechne die Punkte für jedes Kind in dieser Klasse
                          klassenKinder.forEach(kind => {
                            // Finde alle Ergebnisse dieses Kindes
                            const kindErgebnisse = ergebnisse.filter(e => e.kind_id === kind.id);
                            if (kindErgebnisse.length > 0) {
                              // Gruppiere Ergebnisse nach Spiel
                              const ergebnisseNachSpiel: Record<string, any[]> = {};
                              kindErgebnisse.forEach(ergebnis => {
                                if (!ergebnisseNachSpiel[ergebnis.spiel_id]) {
                                  ergebnisseNachSpiel[ergebnis.spiel_id] = [];
                                }
                                ergebnisseNachSpiel[ergebnis.spiel_id].push(ergebnis);
                              });
                              
                              // Summiere Punkte aus allen Spielen
                              let kindPunkte = 0;
                              Object.values(ergebnisseNachSpiel).forEach((spielErgebnisse) => {
                                if (spielErgebnisse.length > 0) {
                                  // Verwende das Ergebnis mit der höchsten Punktzahl für jedes Spiel
                                  // Stelle sicher, dass wir keine NaN oder undefined-Werte haben
                                  const punkteWerte = spielErgebnisse.map(e => {
                                    // Prüfe, ob das Ergebnis Punkte hat
                                    return typeof e.punkte === 'number' ? e.punkte : 0;
                                  });
                                  
                                  if (punkteWerte.length > 0) {
                                    const bestesPunkte = Math.max(...punkteWerte);
                                    kindPunkte += bestesPunkte;
                                  }
                                }
                              });
                              
                              // Zähle nur Kinder mit Punkten > 0
                              if (kindPunkte > 0) {
                                gesamtPunkte += kindPunkte;
                                kinderMitPunkten++;
                              }
                            }
                          });
                          
                          // Berechne den Durchschnitt, aber nur wenn es Kinder mit Punkten gibt
                          const durchschnitt = kinderMitPunkten > 0 ? Math.round(gesamtPunkte / kinderMitPunkten) : 0;
                          
                          return {
                            label: `Klasse ${klasse}`,
                            value: durchschnitt
                          };
                        })} 
                      height={250} 
                      showValues 
                      showLabels
                    />
                  </div>
                </div>
              </ReportCard>
            </TabsContent>
            
            <TabsContent value="spiele">
              <p className="text-center py-8 text-gray-500">
                Spielstatistiken werden in Kürze implementiert.
              </p>
            </TabsContent>
            
            <TabsContent value="fortschritt">
              <p className="text-center py-8 text-gray-500">
                Fortschrittsmonitor wird in Kürze implementiert.
              </p>
            </TabsContent>
            
            <TabsContent value="vergleich">
              <p className="text-center py-8 text-gray-500">
                Ergebnisvergleich wird in Kürze implementiert.
              </p>
            </TabsContent>
          </>
        )}
      </Tabs>
    </main>
  );
}
