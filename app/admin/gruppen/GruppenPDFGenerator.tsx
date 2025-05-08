'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { GruppenUebersichtPDF } from './GruppenUebersichtPDF';
import { Spielgruppe, Kind, KindZuordnung } from '@/lib/types';

interface GruppenPDFGeneratorProps {
  activeEventId: string;
  selectedKlasseName: string;
}

export function GruppenPDFGenerator({ activeEventId, selectedKlasseName }: GruppenPDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const supabase = createClient();

  const generatePDF = async () => {
    if (!activeEventId || !selectedKlasseName) {
      toast.error('Bitte wählen Sie ein Event und eine Klasse aus.');
      return;
    }

    setIsGenerating(true);

    try {
      // 1. Event-Name laden
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('name')
        .eq('id', activeEventId)
        .single();

      if (eventError || !eventData) {
        throw new Error('Event-Daten konnten nicht geladen werden.');
      }

      // 2. Spielgruppen für die ausgewählte Klasse laden
      const { data: gruppenData, error: gruppenError } = await supabase
        .from('spielgruppen')
        .select('*')
        .eq('event_id', activeEventId)
        .eq('klasse', selectedKlasseName)
        .order('name');

      if (gruppenError || !gruppenData) {
        throw new Error('Spielgruppen konnten nicht geladen werden.');
      }

      // 3. Zuordnungen laden
      const { data: zuordnungenData, error: zuordnungenError } = await supabase
        .from('kind_spielgruppe_zuordnung')
        .select('*')
        .eq('event_id', activeEventId);

      if (zuordnungenError || !zuordnungenData) {
        throw new Error('Zuordnungen konnten nicht geladen werden.');
      }

      // 4. Alle Kinder dieser Klasse laden
      const { data: kinderData, error: kinderError } = await supabase
        .from('kinder')
        .select('*')
        .eq('event_id', activeEventId)
        .eq('klasse', selectedKlasseName);

      if (kinderError || !kinderData) {
        throw new Error('Kinder-Daten konnten nicht geladen werden.');
      }

      // 5. Kinder nach Gruppen organisieren
      const kinderByGruppe: Record<string, Kind[]> = {};
      
      // Initialisiere leere Arrays für jede Gruppe
      gruppenData.forEach(gruppe => {
        kinderByGruppe[gruppe.id] = [];
      });

      // Füge Kinder zu ihren Gruppen hinzu
      zuordnungenData.forEach(zuordnung => {
        const kind = kinderData.find(k => k.id === zuordnung.kind_id);
        if (kind && kinderByGruppe[zuordnung.spielgruppe_id]) {
          kinderByGruppe[zuordnung.spielgruppe_id].push(kind);
        }
      });

      // Sortiere Kinder in jeder Gruppe nach Nachname, dann Vorname
      Object.keys(kinderByGruppe).forEach(gruppeId => {
        kinderByGruppe[gruppeId].sort((a, b) => {
          const nachnameVergleich = a.nachname.localeCompare(b.nachname);
          if (nachnameVergleich !== 0) return nachnameVergleich;
          return a.vorname.localeCompare(b.vorname);
        });
      });

      // 6. PDF generieren
      const pdfBlob = await pdf(
        <GruppenUebersichtPDF
          klassenName={selectedKlasseName}
          spielgruppen={gruppenData}
          kinderByGruppe={kinderByGruppe}
          eventName={eventData.name}
        />
      ).toBlob();

      // 7. PDF herunterladen
      saveAs(pdfBlob, `Gruppenübersicht_${selectedKlasseName}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('PDF wurde erfolgreich generiert und heruntergeladen.');
    } catch (error: any) {
      console.error('Fehler bei der PDF-Generierung:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={generatePDF} 
      disabled={isGenerating || !activeEventId || !selectedKlasseName}
      variant="outline"
      size="sm"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          PDF wird generiert...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Gruppenübersicht als PDF
        </>
      )}
    </Button>
  );
}
