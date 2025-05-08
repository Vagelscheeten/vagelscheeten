import { createClient } from '@/lib/supabase/client';
import { saveAs } from 'file-saver';
import { Kind, Zuteilung, Ansprechpartner, SpendenRueckmeldung } from './types'; 
import ReactPDF from '@react-pdf/renderer';
import { ZuteilungPDFDocument } from './ZuteilungPDFDocument';
import React from 'react';
import JSZip from 'jszip';

// Wir verwenden react-pdf/renderer für die PDF-Generierung
const supabase = createClient();

// Hilfsfunktion, um alle Daten für ein PDF vorzubereiten
async function preparePDFData(kindId: string) {
  // 1. Kind-Daten laden
  const { data: kindData, error: kindError } = await supabase
    .from('kinder')
    .select('id, vorname, nachname, klasse')
    .eq('id', kindId)
    .single();

  if (kindError || !kindData) {
    console.error('Fehler beim Laden der Kind-Daten:', kindError);
    throw new Error('Kind-Daten konnten nicht geladen werden.');
  }

  // 2. Zuteilungen für das Kind laden - Originaltabellenname verwenden
  const { data: zuteilungenData, error: zuteilungenError } = await supabase
    .from('helfer_zuteilungen')
    .select(`
      id,
      aufgabe_id,
      via_springer
    `)
    .eq('kind_id', kindId);

  if (zuteilungenError) {
    console.error('Fehler beim Laden der Zuteilungen:', zuteilungenError);
    throw new Error('Zuteilungen konnten nicht geladen werden.');
  }

  if (!zuteilungenData || zuteilungenData.length === 0) {
    console.warn('Keine Zuteilungen für dieses Kind gefunden.');
    // Optional: Hier könnte man eine leere PDF oder eine Nachricht generieren
  }
  
  // 2.1 Slot-Zuteilungen für die Helfer-Zuteilungen laden
  const zuteilungIds = zuteilungenData?.map(z => z.id) || [];
  let slotZuteilungenMap: Record<string, any[]> = {};
  
  console.log('DEBUG: Zuteilungs-IDs für Slots:', zuteilungIds);
  
  if (zuteilungIds.length > 0) {
    // Lade zuerst die Slot-Zuteilungen
    const { data: slotZuteilungenData, error: slotZuteilungenError } = await supabase
      .from('helfer_slot_zuteilungen')
      .select(`
        id,
        slot_id,
        zuteilung_id
      `)
      .in('zuteilung_id', zuteilungIds);
      
    console.log('DEBUG: Slot-Zuteilungen Daten:', slotZuteilungenData);
    console.log('DEBUG: Slot-Zuteilungen Fehler:', slotZuteilungenError);
      
    if (slotZuteilungenError) {
      console.error('Fehler beim Laden der Slot-Zuteilungen:', slotZuteilungenError);
      // Wir werfen hier keinen Fehler, da Slot-Zuteilungen optional sind
    } else if (slotZuteilungenData && slotZuteilungenData.length > 0) {
      // Sammle alle Slot-IDs
      const slotIds = slotZuteilungenData.map(sz => sz.slot_id);
      
      // Lade die Slot-Details separat
      const { data: slotsData, error: slotsError } = await supabase
        .from('helfer_slots')
        .select('id, beschreibung, startzeit, endzeit, max_helfer')
        .in('id', slotIds);
        
      console.log('DEBUG: Slots Daten:', slotsData);
      console.log('DEBUG: Slots Fehler:', slotsError);
      
      if (slotsError) {
        console.error('Fehler beim Laden der Slots:', slotsError);
      } else if (slotsData) {
        // Erstelle eine Map für schnellen Zugriff auf Slot-Details
        const slotsMap = slotsData.reduce((acc, slot) => {
          acc[slot.id] = slot;
          return acc;
        }, {} as Record<string, any>);
        
        // Erstelle die SlotZuteilungen mit korrekter Struktur
        const slotZuteilungen = slotZuteilungenData.map(sz => ({
          slot_id: sz.slot_id,
          zuteilung_id: sz.zuteilung_id,
          slot: slotsMap[sz.slot_id] || null
        })).filter(sz => sz.slot !== null); // Filtere Einträge ohne gültigen Slot
        
        // Gruppiere nach zuteilung_id
        slotZuteilungenMap = slotZuteilungen.reduce((acc, sz) => {
          if (!acc[sz.zuteilung_id]) {
            acc[sz.zuteilung_id] = [];
          }
          acc[sz.zuteilung_id].push(sz);
          return acc;
        }, {} as Record<string, any[]>);
        
        console.log('DEBUG: Slot-Zuteilungen Map (neu):', slotZuteilungenMap);
      }
    }
  }

  // 3. Aufgaben separat laden - wie in der Originalversion
  const aufgabenIds = zuteilungenData?.map(z => z.aufgabe_id) || [];
  
  if (aufgabenIds.length === 0) {
    console.warn(`Keine Aufgaben-IDs gefunden für Kind ${kindId}`);
    throw new Error(`Keine Helferaufgaben für Kind ${kindId} gefunden`);
  }
  
  const { data: aufgabenData, error: aufgabenError } = await supabase
    .from('helferaufgaben')
    .select('id, titel, beschreibung, zeitfenster') // Ohne 'bereich'
    .in('id', aufgabenIds);
    
  if (aufgabenError) {
    console.error('Fehler beim Laden der Aufgaben:', aufgabenError);
    throw new Error(`Fehler beim Laden der Aufgaben: ${aufgabenError.message}`);
  }
  
  // 4. Aufgaben in Map umwandeln für schnellen Zugriff
  const aufgabenMap = aufgabenData?.reduce((acc, aufgabe) => {
    acc[aufgabe.id] = aufgabe;
    return acc;
  }, {} as Record<string, any>) || {};
  
  // 5. Zuteilungen transformieren - mit 'bereich: null' für ZuteilungPDFDocument
  const transformedZuteilungen = zuteilungenData?.map(z => {
    const aufgabe = aufgabenMap[z.aufgabe_id] || {};
    
    // Slot-Zuteilungen für diese Zuteilung hinzufügen, falls vorhanden
    const slots = slotZuteilungenMap[z.id] || [];
    
    // Slots nach Startzeit sortieren
    const sortedSlots = [...slots].sort((a, b) => {
      return a.slot.startzeit.localeCompare(b.slot.startzeit);
    });
    
    return {
      ...z,
      helferaufgaben: {
        titel: aufgabe.titel || 'Unbekannte Aufgabe',
        beschreibung: aufgabe.beschreibung || null,
        zeitfenster: aufgabe.zeitfenster || null,
        bereich: null // Explizit auf null setzen für ZuteilungPDFDocument
      },
      slots: sortedSlots.length > 0 ? sortedSlots : undefined
    };
  }) || [];
  
  // 6. Ansprechpartner - leeres Array, da wir die bereich-Logik anpassen müssten
  const ansprechpartnerData: Ansprechpartner[] = [];
  
  // 7. Essensspenden für das Kind laden
  // Wir müssen den kind_identifier im Format "Nachname, Vorname (Klasse)" erstellen
  const kindIdentifier = `${kindData.nachname}, ${kindData.vorname}${kindData.klasse ? ` (${kindData.klasse})` : ''}`;
  
  // Jetzt die Rueckmeldungen laden mit dem korrekten Identifier
  const { data: essensspendenData, error: essensspendenError } = await supabase
    .from('essensspenden_rueckmeldungen')
    .select(`
      id,
      spende_id,
      kind_identifier,
      menge,
      freitext,
      spende:essensspenden_bedarf(id, titel)
    `)
    .eq('kind_identifier', kindIdentifier);
    
  if (essensspendenError) {
    console.error('Fehler beim Laden der Essensspenden:', essensspendenError);
    // Wir werfen hier keinen Fehler, da Essensspenden optional sind
  }
  
  // Essensspenden transformieren
  const transformedSpenden = essensspendenData?.map(spende => ({
    id: spende.id,
    spende_id: spende.spende_id,
    kind_identifier: spende.kind_identifier,
    menge: spende.menge,
    freitext: spende.freitext,
    spende: {
      titel: spende.spende?.titel || 'Unbekannte Spende'
    }
  })) || [];
  
  // Debug-Log für die transformierten Zuteilungen
  console.log('DEBUG: Transformierte Zuteilungen mit Slots:', JSON.stringify(transformedZuteilungen, null, 2));
  
  // 8. Daten für das PDF zusammenstellen
  const pdfData = {
    kind: kindData,
    zuteilungen: transformedZuteilungen,
    ansprechpartner: ansprechpartnerData,
    essensspenden: transformedSpenden  // Geändert von 'spenden' zu 'essensspenden', um mit ZuteilungPDFDocument übereinzustimmen
  };
  
  console.log('DEBUG: Vollständige PDF-Daten:', JSON.stringify(pdfData, null, 2));
  
  return pdfData;
}

// Hilfsfunktion, um ein PDF als Blob zu generieren (für ZIP-Erstellung)
async function generatePDFBlob(kindId: string): Promise<Blob> {
  // Alle Daten wie in generatePDF laden
  const pdfData = await preparePDFData(kindId);
  
  // PDF als Blob generieren
  return await ReactPDF.pdf(React.createElement(ZuteilungPDFDocument, pdfData)).toBlob();
}

// Hauptfunktion zum Generieren eines einzelnen PDFs
export async function generatePDF(kindId: string): Promise<void> {
  // Daten für das PDF vorbereiten
  const pdfData = await preparePDFData(kindId);
  
  // PDF generieren und herunterladen
  const blob = await ReactPDF.pdf(React.createElement(ZuteilungPDFDocument, pdfData)).toBlob();
  
  // Kind-Daten für den Dateinamen
  const kind = pdfData.kind;
  const fileName = `${kind.nachname}_${kind.vorname}${kind.klasse ? `_${kind.klasse}` : ''}.pdf`;
  
  // PDF herunterladen
  saveAs(blob, fileName);
}

// Funktion zum Generieren aller PDFs als ZIP-Datei
export async function generateAllPDFs(): Promise<void> {
  // Alle Kinder mit Zuteilungen laden - verwende den originalen Tabellennamen
  const { data: kinder, error: kinderError } = await supabase
    .from('helfer_zuteilungen')
    .select('kind_id')
    .order('kind_id');
  
  if (kinderError) throw kinderError;
  
  // Duplikate entfernen
  const kindIds = [...new Set(kinder?.map(z => z.kind_id) || [])];
  
  if (kindIds.length === 0) {
    throw new Error('Keine Kinder mit Zuteilungen gefunden.');
  }
  
  // Alle Kinder-Daten laden, um die Dateinamen zu erstellen
  const { data: kinderDetails, error: kinderDetailsError } = await supabase
    .from('kinder')
    .select('id, vorname, nachname, klasse')
    .in('id', kindIds);
    
  if (kinderDetailsError) throw kinderDetailsError;
  
  // Erstelle eine Map für schnellen Zugriff auf Kinderdaten
  const kinderMap = kinderDetails?.reduce((acc, kind) => {
    acc[kind.id] = kind;
    return acc;
  }, {} as Record<string, any>) || {};
  
  // Erstelle ein neues ZIP-Archiv
  const zip = new JSZip();
  
  // Für jedes Kind ein PDF generieren und zum ZIP hinzufügen
  for (const kindId of kindIds) {
    try {
      // Kind-Daten aus der Map holen
      const kind = kinderMap[kindId];
      if (!kind) {
        console.error(`Keine Daten für Kind ${kindId} gefunden.`);
        continue;
      }
      
      // PDF generieren
      const pdfBlob = await generatePDFBlob(kindId);
      
      // Dateiname erstellen: Nachname_Vorname_Klasse.pdf
      const fileName = `${kind.nachname}_${kind.vorname}${kind.klasse ? `_${kind.klasse}` : ''}.pdf`;
      
      // PDF zum ZIP hinzufügen
      zip.file(fileName, pdfBlob);
      
      // Kleine Pause zwischen den Generierungen, um den Browser nicht zu überlasten
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Fehler bei PDF-Generierung für Kind ${kindId}:`, error);
    }
  }
  
  // ZIP-Datei generieren und herunterladen
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `Helfer-Zuteilungen_${new Date().toISOString().split('T')[0]}.zip`);
}
