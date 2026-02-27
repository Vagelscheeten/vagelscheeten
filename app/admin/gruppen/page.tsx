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

type Event = {
  id: string;
  name: string;
  ist_aktiv: boolean;
};

export default function GruppenPage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [klassen, setKlassen] = useState<string[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<string>('');
  const [alleKinder, setAlleKinder] = useState<any[]>([]);
  const [kinderZuordnungen, setKinderZuordnungen] = useState<any[]>([]);
  const [spielgruppen, setSpielgruppen] = useState<any[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Nur aktives Event laden statt alle Events
        const { data: activeEventData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('ist_aktiv', true)
          .single();

        if (eventsError || !activeEventData) {
          setIsLoading(false);
          return;
        }

        setActiveEvent(activeEventData);

        // Alle abhängigen Queries parallel laden
        const [kinderResult, gruppenResult, zuordnungenResult] = await Promise.all([
          supabase.from('kinder').select('*').eq('event_id', activeEventData.id),
          supabase.from('spielgruppen').select('*').eq('event_id', activeEventData.id),
          supabase.from('kind_spielgruppe_zuordnung').select('*').eq('event_id', activeEventData.id),
        ]);

        if (kinderResult.error) {
          toast.error('Fehler beim Laden der Kinder');
          return;
        }
        if (gruppenResult.error) {
          toast.error('Fehler beim Laden der Gruppen');
          return;
        }
        if (zuordnungenResult.error) {
          toast.error('Fehler beim Laden der Zuordnungen');
          return;
        }

        const kinderData = kinderResult.data || [];
        setAlleKinder(kinderData);
        setSpielgruppen(gruppenResult.data || []);
        setKinderZuordnungen(zuordnungenResult.data || []);

        const uniqueKlassen = [...new Set(kinderData.map(kind => kind.klasse))].filter(Boolean) as string[];
        setKlassen(uniqueKlassen.sort());

        if (uniqueKlassen.length > 0) {
          setSelectedKlasse(uniqueKlassen[0]);
        }
      } catch (error: any) {
        toast.error('Ein Fehler ist aufgetreten beim Laden der Daten');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const refreshData = async () => {
    if (!activeEvent) return;

    setIsLoading(true);
    try {
      const [kinderResult, gruppenResult, zuordnungenResult] = await Promise.all([
        supabase.from('kinder').select('*').eq('event_id', activeEvent.id),
        supabase.from('spielgruppen').select('*').eq('event_id', activeEvent.id),
        supabase.from('kind_spielgruppe_zuordnung').select('*').eq('event_id', activeEvent.id),
      ]);

      const kinderData = kinderResult.data || [];
      setAlleKinder(kinderData);
      setSpielgruppen(gruppenResult.data || []);
      setKinderZuordnungen(zuordnungenResult.data || []);

      const uniqueKlassen = [...new Set(kinderData.map(kind => kind.klasse))].filter(Boolean) as string[];
      setKlassen(uniqueKlassen.sort());
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Daten');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="p-6 flex justify-center items-center h-64">
        <LoadingIndicator />
      </main>
    );
  }

  if (!activeEvent) {
    return (
      <main className="p-6">
        <p className="text-red-500">
          Kein aktives Event gefunden. Bitte erstelle zuerst ein Event im Admin-Bereich.
        </p>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kinder &amp; Gruppen</h1>
        <p className="text-sm text-slate-500 mt-1">Kinder importieren und Spielgruppen verwalten</p>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="gruppen">Gruppenverwaltung</TabsTrigger>
          <TabsTrigger value="import">Kinder verwalten</TabsTrigger>
        </TabsList>

        {klassen.length === 0 && (
          <div className="my-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">
              Noch keine Kinder erfasst. Bitte importiere zuerst Kinder im Tab „Kinder verwalten".
            </p>
          </div>
        )}

        <TabsContent value="gruppen">
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label htmlFor="klasse-select" className="font-medium text-sm">Klasse:</label>
                  <Select value={selectedKlasse} onValueChange={setSelectedKlasse} disabled={klassen.length === 0}>
                    <SelectTrigger className="w-[180px]" id="klasse-select">
                      <SelectValue placeholder={klassen.length > 0 ? "Klasse auswählen" : "Keine Klassen"} />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {klassen.map((klasse) => {
                        const count = alleKinder.filter(k => k.klasse === klasse).length;
                        return (
                          <SelectItem key={klasse} value={klasse}>{klasse} ({count} Kinder)</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {selectedKlasse && (
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
            <p className="text-slate-500 text-sm p-4">
              Bitte wähle eine Klasse aus, um die Gruppenverwaltung zu nutzen.
            </p>
          )}
        </TabsContent>

        <TabsContent value="import">
          <div className="space-y-8">
            <KinderImport
              activeEventId={activeEvent.id}
              onImportComplete={refreshData}
            />

            <KinderVerwaltung
              alleKinderDesEvents={alleKinder}
              spielgruppenDieserKlasse={spielgruppen.filter(g => g.klasse === selectedKlasse)}
              kinderZuordnungen={kinderZuordnungen}
              selectedKlasseName={selectedKlasse}
              activeEventId={activeEvent.id}
              onKinderChange={refreshData}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
