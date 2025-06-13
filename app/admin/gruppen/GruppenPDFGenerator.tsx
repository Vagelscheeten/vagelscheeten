'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, FileArchive } from 'lucide-react';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { GruppenUebersichtPDF } from './GruppenUebersichtPDF';
import { TeamleiterInfoPDF } from './TeamleiterInfoPDF';
import { Spielgruppe, Kind } from '@/lib/types';
import JSZip from 'jszip';
import QRCode from 'qrcode';

interface GruppenPDFGeneratorProps {
  activeEventId: string;
  selectedKlasseName: string;
}

export function GruppenPDFGenerator({ activeEventId, selectedKlasseName }: GruppenPDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const supabase = createClient();

  // Funktion zum Laden der Gruppen-Daten
  const loadGruppenData = async () => {
    if (!activeEventId || !selectedKlasseName) {
      toast.error('Bitte wählen Sie ein Event und eine Klasse aus.');
      return null;
    }

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

      return { eventName: eventData.name, spielgruppen: gruppenData };
    } catch (error: any) {
      console.error('Fehler beim Laden der Daten:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
      return null;
    }
  };

  // Generiert die Gruppen-Übersicht PDF wie bisher
  const generateGruppenUebersichtPDF = async () => {
    setIsGenerating(true);

    try {
      const data = await loadGruppenData();
      if (!data) return;

      const { eventName, spielgruppen } = data;

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
      spielgruppen.forEach(gruppe => {
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
          spielgruppen={spielgruppen}
          kinderByGruppe={kinderByGruppe}
          eventName={eventName}
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

  // Hilfsfunktion zur QR-Code-Generierung
  const generateQRCode = async (url: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(url, {
        width: 300,
        margin: 1,
        errorCorrectionLevel: 'H'
      });
    } catch (error) {
      console.error('Fehler bei der QR-Code-Generierung:', error);
      return '';
    }
  };

  // Lädt alle Gruppen für alle Klassen im aktuellen Event
  const loadAllGruppenData = async () => {
    if (!activeEventId) {
      toast.error('Bitte wählen Sie ein Event aus.');
      return null;
    }

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

      // 2. ALLE Spielgruppen für das Event laden, unabhängig von der Klasse
      const { data: gruppenData, error: gruppenError } = await supabase
        .from('spielgruppen')
        .select('*')
        .eq('event_id', activeEventId)
        .order('klasse, name');

      if (gruppenError || !gruppenData) {
        throw new Error('Spielgruppen konnten nicht geladen werden.');
      }

      return { eventName: eventData.name, spielgruppen: gruppenData };
    } catch (error: any) {
      console.error('Fehler beim Laden der Daten:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
      return null;
    }
  };

  // Generiert separate Teamleiter-Info-PDFs für ALLE Gruppen und stellt sie als ZIP bereit
  const generateTeamleiterInfoPDFs = async () => {
    setIsGeneratingZip(true);

    try {
      // Wir laden jetzt alle Gruppen für alle Klassen
      const data = await loadAllGruppenData();
      if (!data) return;

      const { spielgruppen } = data;
      
      if (spielgruppen.length === 0) {
        toast.error('Keine Spielgruppen gefunden für das aktuelle Event.');
        return;
      }

      toast.info(`Generiere Teamleiter-PDFs für alle ${spielgruppen.length} Gruppen...`);

      // Erstelle ein ZIP-Archiv
      const zip = new JSZip();
      const generatePromises = [];

      // Generiere ein PDF pro Gruppe
      for (const gruppe of spielgruppen) {
        // Prüfe, ob die Gruppe einen Zugangscode hat
        if (!gruppe.leiter_zugangscode) {
          console.warn(`Gruppe ${gruppe.name} hat keinen Zugangscode. Generiere trotzdem PDF.`);
        }

        // URL für den QR-Code mit Anmeldedaten erstellen
        const loginUrl = new URL("https://www.vagelscheeten.de/leiter/login");
        loginUrl.searchParams.append('gruppenname', gruppe.name);
        if (gruppe.leiter_zugangscode) {
          loginUrl.searchParams.append('zugangscode', gruppe.leiter_zugangscode);
        }

        // QR-Code für diese spezifische URL generieren
        const qrCodeDataURL = await generateQRCode(loginUrl.toString());

        if (!qrCodeDataURL) {
          console.error(`QR-Code für Gruppe ${gruppe.name} konnte nicht generiert werden.`);
          // Optional: Generierung für diese Gruppe überspringen
          continue;
        }

        // Generiere PDF für diese Gruppe
        const generatePromise = pdf(
          <TeamleiterInfoPDF 
            spielgruppe={gruppe} 
            qrCodeDataURL={qrCodeDataURL}
            loginUrl={loginUrl.toString()}
          />
        )
          .toBlob()
          .then(blob => {
            // Füge das PDF zum ZIP-Archiv hinzu
            const pdfName = `Teamleiter_${gruppe.name}_${gruppe.leiter_zugangscode || 'kein-code'}.pdf`;
            zip.file(pdfName, blob);
            return pdfName;
          });

        generatePromises.push(generatePromise);
      }

      // Warte bis alle PDFs generiert und zum ZIP hinzugefügt wurden
      await Promise.all(generatePromises);

      // Gruppieren nach Klassen für eine bessere Übersicht
      const klassenCount = new Set(spielgruppen.map(gruppe => gruppe.klasse)).size;
      
      // Generiere das ZIP-Archiv und biete es zum Download an
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const today = new Date().toISOString().split('T')[0];
      saveAs(zipBlob, `Teamleiter-Infos_Alle-Gruppen_${today}.zip`);

      toast.success(`${spielgruppen.length} Teamleiter-PDFs aus ${klassenCount} Klassen wurden erfolgreich generiert und als ZIP heruntergeladen.`);
    } catch (error: any) {
      console.error('Fehler bei der PDF-Generierung:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsGeneratingZip(false);
    }
  };

  return (
    <div className="flex space-x-4">
      {/* Button für Gruppenübersicht PDF */}
      <Button 
        onClick={generateGruppenUebersichtPDF} 
        disabled={isGenerating || isGeneratingZip || !activeEventId || !selectedKlasseName}
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

      {/* Button für Teamleiter-Info PDFs als ZIP */}
      <Button 
        onClick={generateTeamleiterInfoPDFs} 
        disabled={isGenerating || isGeneratingZip || !activeEventId || !selectedKlasseName}
        variant="outline"
        size="sm"
      >
        {isGeneratingZip ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Teamleiter-PDFs werden generiert...
          </>
        ) : (
          <>
            <FileArchive className="mr-2 h-4 w-4" />
            Teamleiter-Infos ALLE Gruppen
          </>
        )}
      </Button>
    </div>
  );
}
