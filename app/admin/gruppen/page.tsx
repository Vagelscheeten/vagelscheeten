'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { toast } from 'sonner';
import { GruppenVerwaltungNeu } from './GruppenVerwaltungNeu';
import { KinderImport } from './KinderImport';
import KinderVerwaltung from './KinderVerwaltung';
import { GruppenPDFGenerator } from './GruppenPDFGenerator';

// Typen
type Event = {
  id: string;
  name: string;
  ist_aktiv: boolean;
};

// Einfacher Wrapper für Admin-Seiten
const AdminSidebarWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background">{children}</div>
);

export default function GruppenPage() {
  // Supabase Client
  const supabase = createClient();
  
  // State
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [klassen, setKlassen] = useState<string[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<string>('');
  const [alleKinder, setAlleKinder] = useState<any[]>([]);
  const [kinderZuordnungen, setKinderZuordnungen] = useState<any[]>([]);
  const [spielgruppen, setSpielgruppen] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Daten laden
  useEffect(() => {
    const loadInitialData = async () => {
      // Prüfen, ob Benutzer angemeldet ist
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsLoading(false);
        return;
      }
      
      setUser(session.user);

      try {
        // Lade alle Events und finde das aktive manuell
        const { data: allEvents, error: eventsError } = await supabase.from('events').select('*');
        console.log('Alle Events:', allEvents);
        
        if (eventsError) {
          console.error('Events Error:', eventsError);
          toast.error(`Fehler beim Laden der Events: ${eventsError.message}`);
          return;
        }
        
        // Finde das aktive Event manuell
        const activeEventData = allEvents?.find(event => event.ist_aktiv === true);
        console.log('Manuell gefundenes aktives Event:', activeEventData);
        
        if (!activeEventData) {
          console.log('Kein aktives Event gefunden');
          setIsLoading(false);
          return;
        }
        
        // Setze das aktive Event
        setActiveEvent(activeEventData);
        
        // Lade alle Kinder für dieses Event
        const { data: kinderData, error: kinderError } = await supabase
          .from('kinder')
          .select('*')
          .eq('event_id', activeEventData.id);
          
        if (kinderError) {
          console.error('Kinder Error:', kinderError);
          toast.error(`Fehler beim Laden der Kinder: ${kinderError.message}`);
          return;
        }
        
        // Setze alle Kinder
        setAlleKinder(kinderData || []);
        
        // Extrahiere einzigartige Klassen
        const uniqueKlassen = [...new Set(kinderData?.map(kind => kind.klasse))];
        console.log('Verfügbare Klassen:', uniqueKlassen);
        setKlassen(uniqueKlassen.sort());
        
        // Lade alle Spielgruppen
        const { data: gruppenData, error: gruppenError } = await supabase
          .from('spielgruppen')
          .select('*')
          .eq('event_id', activeEventData.id);
          
        if (gruppenError) {
          console.error('Gruppen Error:', gruppenError);
          toast.error(`Fehler beim Laden der Gruppen: ${gruppenError.message}`);
          return;
        }
        
        setSpielgruppen(gruppenData || []);
        
        // Lade alle Zuordnungen
        const { data: zuordnungenData, error: zuordnungenError } = await supabase
          .from('kind_spielgruppe_zuordnung')
          .select('*')
          .eq('event_id', activeEventData.id);
          
        if (zuordnungenError) {
          console.error('Zuordnungen Error:', zuordnungenError);
          toast.error(`Fehler beim Laden der Zuordnungen: ${zuordnungenError.message}`);
          return;
        }
        
        setKinderZuordnungen(zuordnungenData || []);
        
        // Prüfe, ob für jede Klasse eine Gruppe existiert
        for (const klasse of uniqueKlassen) {
          // Prüfe, ob bereits eine Gruppe für diese Klasse existiert
          const { data: existingGroups } = await supabase
            .from('spielgruppen')
            .select('*')
            .eq('event_id', activeEventData.id)
            .eq('klasse', klasse);
            
          if (!existingGroups || existingGroups.length === 0) {
            // Erstelle die erste Gruppe für diese Klasse
            const gruppenName = `${klasse}-1`;
            const leiterCode = `${klasse}-leiter`;
            
            const { error: createError } = await supabase
              .from('spielgruppen')
              .insert({
                name: gruppenName,
                klasse: klasse,
                event_id: activeEventData.id,
                leiter_zugangscode: leiterCode
              });
              
            if (createError) {
              console.error(`Fehler beim Erstellen der ersten Gruppe für ${klasse}:`, createError);
              toast.error(`Fehler beim Erstellen der ersten Gruppe für ${klasse}`);
            } else {
              console.log(`Erste Gruppe für ${klasse} erstellt: ${gruppenName}`);
              toast.success(`Erste Gruppe für ${klasse} erstellt: ${gruppenName}`);
            }
          }
        }
        
        // Erste Klasse als Standard auswählen
        if (uniqueKlassen.length > 0) {
          setSelectedKlasse(uniqueKlassen[0]);
        }
      } catch (error: any) {
        toast.error('Ein Fehler ist aufgetreten beim Laden der Daten');
        console.error('Fehler beim Laden der Daten:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [supabase]);

  // Rendering für Ladezustand
  if (isLoading) {
    return (
      <AdminSidebarWrapper>
        <div className="flex justify-center items-center h-screen">
          <LoadingIndicator />
        </div>
      </AdminSidebarWrapper>
    );
  }

  // Rendering für nicht angemeldeten Benutzer
  if (!user) {
    return (
      <AdminSidebarWrapper>
        <div className="p-4 text-center text-red-500">
          Bitte melden Sie sich an, um auf diese Seite zuzugreifen.
        </div>
      </AdminSidebarWrapper>
    );
  }

  // Rendering für fehlendes aktives Event
  if (!activeEvent) {
    return (
      <AdminSidebarWrapper>
        <div className="p-4 text-center text-red-500">
          Kein aktives Event gefunden. Bitte erstellen Sie zuerst ein Event im Admin-Bereich.
        </div>
      </AdminSidebarWrapper>
    );
  }

  // Funktion zum Neuladen der Daten
  const refreshData = async () => {
    if (!activeEvent) return;
    
    setIsLoading(true);
    try {
      // Lade alle Kinder für dieses Event
      const { data: kinderData } = await supabase
        .from('kinder')
        .select('*')
        .eq('event_id', activeEvent.id);
      
      setAlleKinder(kinderData || []);
      
      // Lade alle Spielgruppen
      const { data: gruppenData } = await supabase
        .from('spielgruppen')
        .select('*')
        .eq('event_id', activeEvent.id);
      
      setSpielgruppen(gruppenData || []);
      
      // Lade alle Zuordnungen
      const { data: zuordnungenData } = await supabase
        .from('kind_spielgruppe_zuordnung')
        .select('*')
        .eq('event_id', activeEvent.id);
      
      setKinderZuordnungen(zuordnungenData || []);
      
      // Aktualisiere die Klassen
      const uniqueKlassen = [...new Set(kinderData?.map(kind => kind.klasse))];
      setKlassen(uniqueKlassen.sort());
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Daten:', error);
      toast.error('Fehler beim Aktualisieren der Daten');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Hauptrendering
  return (
    <AdminSidebarWrapper>
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Gruppenverwaltung für Event: {activeEvent?.name}</CardTitle>
          </CardHeader>
        </Card>

        {activeEvent && (
          <Tabs defaultValue="import" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="gruppen">Gruppenverwaltung</TabsTrigger>
              <TabsTrigger value="import">Kinder verwalten</TabsTrigger>
            </TabsList>
            
            {klassen.length === 0 && (
              <div className="my-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800">Es sind noch keine Klassen vorhanden. Bitte importieren Sie zuerst Kinder, um mit der Gruppenverwaltung zu beginnen.</p>
              </div>
            )}
            
            <TabsContent value="gruppen">
              <Card className="mb-6">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <label htmlFor="klasse-select" className="font-medium">Klasse auswählen:</label>
                      <Select value={selectedKlasse} onValueChange={setSelectedKlasse} disabled={klassen.length === 0}>
                        <SelectTrigger className="w-[180px]" id="klasse-select">
                          <SelectValue placeholder={klassen.length > 0 ? "Klasse auswählen" : "Keine Klassen verfügbar"} />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {klassen.map((klasse) => (
                            <SelectItem key={klasse} value={klasse}>
                              {klasse}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedKlasse && activeEvent && (
                      <GruppenPDFGenerator 
                        activeEventId={activeEvent.id}
                        selectedKlasseName={selectedKlasse}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {selectedKlasse ? (
                <GruppenVerwaltungNeu
                  activeEventId={activeEvent.id}
                  selectedKlasseName={selectedKlasse}
                />
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-gray-600">Bitte wählen Sie eine Klasse aus, um die Gruppenverwaltung zu nutzen.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="import">
              <div className="space-y-8">
                {/* Kinder Import Komponente */}
                <KinderImport
                  activeEventId={activeEvent.id}
                />
                
                {/* Kinder Verwaltung Komponente */}
                <KinderVerwaltung
                  alleKinderDesEvents={alleKinder}
                  spielgruppenDieserKlasse={spielgruppen.filter(g => g.klasse === selectedKlasse)}
                  kinderZuordnungen={kinderZuordnungen}
                  selectedKlasseName={selectedKlasse}
                  activeEventId={activeEvent.id}
                  onKinderChange={() => {
                    setRefreshTrigger(prev => prev + 1);
                    refreshData();
                  }}
                  isLoading={isLoading}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminSidebarWrapper>
  );
}
