'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { toast } from 'sonner';
import { GruppenVerwaltungNeu } from './GruppenVerwaltungNeu';
import { KinderImport } from './KinderImport';
import KinderVerwaltung from './KinderVerwaltung';
import { GruppenPDFGenerator } from './GruppenPDFGenerator';
import { PageShell, StatusBadge, EmptyState } from '@/components/admin';
import { Users } from 'lucide-react';

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
      <PageShell title="Kinder & Gruppen">
        <div className="flex justify-center py-12">
          <LoadingIndicator />
        </div>
      </PageShell>
    );
  }

  if (!activeEvent) {
    return (
      <PageShell
        title="Kinder & Gruppen"
        description="Kinder importieren und Spielgruppen verwalten."
      >
        <EmptyState
          title="Kein aktives Event"
          description="Es ist derzeit kein Event aktiv. Lege ein neues Event an oder aktiviere einen bestehenden Jahrgang."
        />
      </PageShell>
    );
  }

  const totalKinder = alleKinder.length;
  const totalGruppen = spielgruppen.length;

  return (
    <PageShell
      title="Kinder & Gruppen"
      description="Kinder importieren und Spielgruppen verwalten."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Kinder & Gruppen' }]}
      meta={
        <>
          <span className="inline-flex items-center gap-1.5">
            <Users size={11} className="text-admin-ink-muted" />
            <span className="tabular-nums">{totalKinder}</span> Kinder
          </span>
          <span className="text-admin-border-strong">·</span>
          <span className="tabular-nums">{totalGruppen}</span> Gruppen
          <span className="text-admin-border-strong">·</span>
          <span className="tabular-nums">{klassen.length}</span> Klassen
        </>
      }
    >
      <Tabs defaultValue="import" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="gruppen">Gruppenverwaltung</TabsTrigger>
          <TabsTrigger value="import">Kinder verwalten</TabsTrigger>
        </TabsList>

        {klassen.length === 0 && (
          <div className="mb-6">
            <EmptyState
              title="Noch keine Kinder erfasst"
              description="Bitte importiere zuerst Kinder im Tab „Kinder verwalten“."
            />
          </div>
        )}

        <TabsContent value="gruppen">
          <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-lg border border-admin-border bg-admin-surface">
            <div className="flex items-center gap-3">
              <label htmlFor="klasse-select" className="text-[0.85rem] font-medium text-admin-ink-soft">
                Klasse:
              </label>
              <Select value={selectedKlasse} onValueChange={setSelectedKlasse} disabled={klassen.length === 0}>
                <SelectTrigger className="w-[200px]" id="klasse-select">
                  <SelectValue placeholder={klassen.length > 0 ? 'Klasse auswählen' : 'Keine Klassen'} />
                </SelectTrigger>
                <SelectContent>
                  {klassen.map((klasse) => {
                    const count = alleKinder.filter((k) => k.klasse === klasse).length;
                    return (
                      <SelectItem key={klasse} value={klasse}>
                        {klasse} ({count} Kinder)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedKlasse && (
                <StatusBadge variant="info" size="sm">
                  {alleKinder.filter((k) => k.klasse === selectedKlasse).length} Kinder
                </StatusBadge>
              )}
            </div>

            {selectedKlasse && (
              <GruppenPDFGenerator
                activeEventId={activeEvent.id}
                selectedKlasseName={selectedKlasse}
              />
            )}
          </div>

          {selectedKlasse ? (
            <GruppenVerwaltungNeu
              activeEventId={activeEvent.id}
              selectedKlasseName={selectedKlasse}
            />
          ) : (
            <EmptyState
              title="Keine Klasse ausgewählt"
              description="Bitte wähle oben eine Klasse aus, um die Gruppenverwaltung zu nutzen."
              compact
            />
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
              spielgruppenDieserKlasse={spielgruppen.filter((g) => g.klasse === selectedKlasse)}
              kinderZuordnungen={kinderZuordnungen}
              selectedKlasseName={selectedKlasse}
              activeEventId={activeEvent.id}
              onKinderChange={refreshData}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
