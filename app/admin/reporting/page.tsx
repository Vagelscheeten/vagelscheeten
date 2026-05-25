'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportCard } from './components/ReportCard';
import { StatCard } from './components/StatCard';
import { KlassenTable } from './components/KlassenTable';
import { FortschrittTable } from './components/FortschrittTable';
import { Users, Gamepad2, BarChart3, Loader2 } from 'lucide-react';
import { SpielStatistik } from './components/SpielStatistik';
import { PageShell } from '@/components/admin';
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
  // Klassen-Name → zugewiesene Spiel-IDs (aus klasse_spiele)
  const [spielIdsProKlasse, setSpielIdsProKlasse] = useState<Map<string, Set<string>>>(new Map());
  
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
          label: klasse,
          value: anzahl as number
        }));
      

      setKinderProKlasse(kinderProKlasseData);
      
      // Berechne Fortschritt pro Klasse
      const fortschrittData = Array.from(newKlassenMap.keys())
        .filter(klasse => klasse) // Filtere leere Klassen
        .map(klasse => {
          // Finde alle Kinder dieser Klasse direkt
          const klassenKinder = kinder.filter(k => k.klasse === klasse);
          
          // Zugewiesene Spiel-IDs der Klasse (aus klasse_spiele in DB)
          const zugewieseneSpielIds = spielIdsProKlasse.get(klasse) ?? new Set<string>();
          const maxErgebnisse = klassenKinder.length * zugewieseneSpielIds.size;

          // Zähle abgeschlossene Spiele für diese Klasse
          let abgeschlosseneSpiele = 0;
          klassenKinder.forEach(kind => {
            const kindSpieleIds = new Set();
            ergebnisse
              .filter(e => e.kind_id === kind.id && zugewieseneSpielIds.has(e.spiel_id))
              .forEach(e => kindSpieleIds.add(e.spiel_id));

            abgeschlosseneSpiele += kindSpieleIds.size;
          });
          
          const prozent = maxErgebnisse > 0 ? Math.round((abgeschlosseneSpiele / maxErgebnisse) * 100) : 0;
          
          return {
            label: klasse,
            value: prozent,
            maxValue: maxErgebnisse
          };
        });
      
      setFortschrittProKlasse(fortschrittData);
    }
  }, [kinder, spielgruppen, spiele, ergebnisse, spielIdsProKlasse]);
  
  // Lade alle benötigten Daten
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Aktives Event ermitteln — alle folgenden Queries sind darauf gescopt.
      const { data: activeEvent, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('ist_aktiv', true)
        .maybeSingle();

      if (eventError) throw eventError;
      if (!activeEvent) {
        setKinder([]);
        setSpielgruppen([]);
        setErgebnisse([]);
        setIsLoading(false);
        return;
      }
      const eventId = activeEvent.id;

      // Lade Kinder
      const { data: kinderData, error: kinderError } = await supabase
        .from('kinder')
        .select('*')
        .eq('event_id', eventId);

      if (kinderError) throw kinderError;
      setKinder(kinderData || []);

      // Lade Spiele
      const { data: spieleData, error: spieleError } = await supabase
        .from('spiele')
        .select('*')
        .order('name');

      if (spieleError) throw spieleError;
      setSpiele(spieleData || []);
      setSpieleOptions(spieleData?.map(spiel => ({
        value: spiel.id,
        label: spiel.name
      })) || []);

      // Lade Spielgruppen
      const { data: gruppenData, error: gruppenError } = await supabase
        .from('spielgruppen')
        .select('*')
        .eq('event_id', eventId)
        .order('name');

      if (gruppenError) throw gruppenError;
      setSpielgruppen(gruppenData || []);

      // Lade Spiel-Zuweisungen pro Klasse aus der DB
      const { data: klasseSpieleData, error: klasseSpieleError } = await supabase
        .from('klasse_spiele')
        .select('spiel_id, klasse:klassen!inner(name)');
      if (klasseSpieleError) throw klasseSpieleError;
      const spielMap = new Map<string, Set<string>>();
      for (const row of klasseSpieleData ?? []) {
        const klasseName = (row as any).klasse?.name as string | undefined;
        if (!klasseName) continue;
        if (!spielMap.has(klasseName)) spielMap.set(klasseName, new Set());
        spielMap.get(klasseName)!.add(row.spiel_id);
      }
      setSpielIdsProKlasse(spielMap);
      
      // Extrahiere verfügbare Klassen
      const klassen = [...new Set(gruppenData?.map(g => g.klasse) || [])].sort();
      setKlassenOptions(klassen.map(klasse => ({
        value: klasse,
        label: klasse
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
        .select('*')
        .eq('event_id', eventId);
      
      if (ergebnisseError) throw ergebnisseError;
      // Berechne Punkte für jedes Ergebnis basierend auf dem Rang
      // Diese Logik sollte mit der Punkteberechnung in der Auswertung übereinstimmen
      setErgebnisse(ergebnisseData || []);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setIsLoading(false);
    }
  };
  
  return (
    <PageShell
      title="Reporting & Statistiken"
      description="Dashboard, Teilnehmer- und Spielstatistiken."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Reporting' }]}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="teilnehmer">Teilnehmerstatistik</TabsTrigger>
          <TabsTrigger value="spiele">Spielstatistik</TabsTrigger>

        </TabsList>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <ReportCard
                  title="Teilnahme nach Klassen"
                  description="Anzahl der Kinder pro Klasse"
                  onExport={() => {
                    // CSV Export
                    const csvContent = [
                      'Klasse,Anzahl Kinder',
                      ...Array.from(klassenMap.entries())
                        .filter(([klasse]) => klasse)
                        .map(([klasse, anzahl]) => `${klasse},${anzahl}`)
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
              
            </TabsContent>

            <TabsContent value="teilnehmer">
              <TeilnehmerStatistik 
                kinder={kinder}
                ergebnisse={ergebnisse}
                klassenMap={klassenMap}
                kinderProKlasse={kinderProKlasse}
              />
            </TabsContent>
            
            <TabsContent value="spiele" className="space-y-6">
              <SpielStatistik spiele={spiele} ergebnisse={ergebnisse} kinder={kinder} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </PageShell>
  );
}
