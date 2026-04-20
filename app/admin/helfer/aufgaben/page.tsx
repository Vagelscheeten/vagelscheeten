'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AufgabenListe } from './AufgabenListe';
import { AufgabenForm } from './AufgabenForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageShell, EmptyState } from '@/components/admin';

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
  zeitfenster: string;
  rueckmeldungen_count?: number;
}

interface Rueckmeldung {
  id: string;
  kind_id: string;
  aufgabe_id: string;
  prioritaet: number;
  freitext: string | null;
}

export default function AufgabenVerwaltung() {
  const [isLoading, setIsLoading] = useState(true);
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [rueckmeldungen, setRueckmeldungen] = useState<Rueckmeldung[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAufgabe, setSelectedAufgabe] = useState<Aufgabe | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();

      const { data: activeEvent, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('ist_aktiv', true)
        .single();

      if (eventError || !activeEvent) {
        console.error('Kein aktives Event gefunden:', eventError);
        setIsLoading(false);
        return;
      }

      const { data: aufgabenData, error: aufgabenError } = await supabase
        .from('helferaufgaben')
        .select('*')
        .eq('event_id', activeEvent.id)
        .order('titel');

      if (aufgabenError) {
        console.error('Fehler beim Laden der Aufgaben:', aufgabenError);
      } else {
        setAufgaben(aufgabenData || []);
      }

      const { data: rueckmeldungenData, error: rueckmeldungenError } = await supabase
        .from('helfer_rueckmeldungen')
        .select('id, kind_id, aufgabe_id, prioritaet, freitext')
        .eq('event_id', activeEvent.id);

      if (rueckmeldungenError) {
        console.error('Fehler beim Laden der Rückmeldungen:', rueckmeldungenError);
      } else {
        setRueckmeldungen(rueckmeldungenData || []);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [refreshTrigger]);

  const handleRefresh = () => setRefreshTrigger((prev) => prev + 1);
  const handleCreateNew = () => {
    setSelectedAufgabe(undefined);
    setIsEditing(false);
    setIsFormOpen(true);
  };
  const handleEdit = (aufgabe: Aufgabe) => {
    setSelectedAufgabe(aufgabe);
    setIsEditing(true);
    setIsFormOpen(true);
  };
  const handleCloseForm = () => setIsFormOpen(false);
  const handleFormSave = () => handleRefresh();

  const gesamtBedarf = aufgaben.reduce((sum, a) => sum + (a.bedarf ?? 0), 0);
  const gesamtRueckmeldungen = rueckmeldungen.length;

  return (
    <PageShell
      title="Helferaufgaben"
      description="Alle Aufgaben, ihr Bedarf und eingegangene Rückmeldungen."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Helfer', href: '/admin/helfer' },
        { label: 'Aufgaben' },
      ]}
      meta={
        <>
          <span className="tabular-nums">{aufgaben.length}</span> Aufgaben
          <span className="text-admin-border-strong">·</span>
          <span className="tabular-nums">{gesamtRueckmeldungen}</span> /{' '}
          <span className="tabular-nums">{gesamtBedarf}</span> Plätze besetzt
        </>
      }
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/helfer')}
            size="sm"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Zurück
          </Button>
          <Button onClick={handleCreateNew} size="sm">
            <PlusCircle className="mr-1.5 h-4 w-4" /> Neue Aufgabe
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-admin-ink-muted rounded-full border-t-transparent" />
        </div>
      ) : aufgaben.length === 0 ? (
        <EmptyState
          title="Noch keine Aufgaben angelegt"
          description={'Lege die erste Helferaufgabe an — z. B. „Aufbau", „Cafeteria" oder „Spielstation Armbrust".'}
          action={
            <Button onClick={handleCreateNew} size="sm">
              <PlusCircle className="mr-1.5 h-4 w-4" /> Erste Aufgabe anlegen
            </Button>
          }
        />
      ) : (
        <AufgabenListe
          aufgaben={aufgaben}
          rueckmeldungen={rueckmeldungen}
          onEdit={handleEdit}
          onRefresh={handleRefresh}
        />
      )}

      <AufgabenForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleFormSave}
        aufgabe={selectedAufgabe}
        isEditing={isEditing}
      />
    </PageShell>
  );
}
