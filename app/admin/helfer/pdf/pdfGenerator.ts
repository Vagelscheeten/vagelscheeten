import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  AlleKlassenPdfsDaten,
  Ansprechpartner,
  SpendenBedarf,
  KindPdfDetails,
  // ZuteilungMitKindUndAufgabeDetails, // Enthalten in KindPdfDetails
  // HelferRueckmeldungMitDetailsFuerPDF, // Enthalten in KindPdfDetails
  // EssensspendeMitDetailsFuerPDF, // Enthalten in KindPdfDetails
  KlassenAggregierteDaten 
} from './types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Hilfsfunktion zum Hinzufügen eines Headers zu jeder Seite
const addHeader = (doc: jsPDF, titel: string, subTitel?: string) => {
  doc.setFontSize(16);
  doc.text(titel, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
  if (subTitel) {
    doc.setFontSize(12);
    doc.text(subTitel, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
  }
  doc.setFontSize(8);
  const currentDate = new Date().toLocaleDateString('de-DE');
  doc.text(`Stand: ${currentDate}`, doc.internal.pageSize.getWidth() - 15, 15, { align: 'right' });
  doc.line(15, 25, doc.internal.pageSize.getWidth() - 15, 25); // Horizontale Linie
};

// Hilfsfunktion zum Hinzufügen einer Fußzeile mit Seitenzahlen
const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Seite ${i} von ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
};

export const loadAnsprechpartnerAndSpenden = async (
  supabase: SupabaseClient,
  setPdfGenerationMessage?: (message: string | null) => void
): Promise<{ ansprechpartner: Ansprechpartner[], spendenBedarf: SpendenBedarf[] }> => {
  if (setPdfGenerationMessage) setPdfGenerationMessage('Lade Ansprechpartner und Spendenbedarf...');
  console.log('loadAnsprechpartnerAndSpenden: Start', { supabase });

  try {
    const { data: ansprechpartnerData, error: ansprechpartnerError } = await supabase
      .from('ansprechpartner_neu') 
      .select('*');

    if (ansprechpartnerError) {
      console.error('loadAnsprechpartnerAndSpenden: Fehler beim Laden der Ansprechpartner:', ansprechpartnerError, ansprechpartnerError?.stack);
      throw new Error(`Fehler beim Laden der Ansprechpartner: ${ansprechpartnerError.message}`);
    }
    console.log('loadAnsprechpartnerAndSpenden: Ansprechpartner geladen:', ansprechpartnerData);

    const { data: spendenBedarfData, error: spendenBedarfError } = await supabase
      .from('essensspenden_bedarf')
      .select('*');

    if (spendenBedarfError) {
      console.error('loadAnsprechpartnerAndSpenden: Fehler beim Laden des Spendenbedarfs:', spendenBedarfError, spendenBedarfError?.stack);
      throw new Error(`Fehler beim Laden des Spendenbedarfs: ${spendenBedarfError.message}`);
    }
    console.log('loadAnsprechpartnerAndSpenden: Spendenbedarf geladen:', spendenBedarfData);
    if (setPdfGenerationMessage) setPdfGenerationMessage('Ansprechpartner und Spendenbedarf geladen.');

    return {
      ansprechpartner: ansprechpartnerData || [],
      spendenBedarf: spendenBedarfData || [],
    };
  } catch (error: any) {
    if (error instanceof Error) {
      console.error('loadAnsprechpartnerAndSpenden: Exception:', error.message, error.stack);
      if (setPdfGenerationMessage) setPdfGenerationMessage(`Fehler beim Laden der Basisdaten: ${error.message}`);
      throw new Error(`loadAnsprechpartnerAndSpenden Exception: ${error.message}`);
    } else {
      console.error('loadAnsprechpartnerAndSpenden: Exception (non-Error):', error);
      if (setPdfGenerationMessage) setPdfGenerationMessage(`Fehler beim Laden der Basisdaten: ${JSON.stringify(error)}`);
      throw new Error('loadAnsprechpartnerAndSpenden Exception: ' + JSON.stringify(error));
    }
  }
};

const generateSingleKindContent = (doc: jsPDF, kind: KindPdfDetails, currentY: number, klassenName: string, pageHeaderSubTitle: string): number => {
  let yPos = currentY;
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 30; // For footer and some space

  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      addHeader(doc, `Helferliste ${klassenName}`, pageHeaderSubTitle);
      yPos = 30; // Start Y after header on new page
    }
  };

  checkPageBreak(20); // Space for Kindesname + a bit more
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`${kind.vorname} ${kind.nachname}`, 15, yPos);
  yPos += 6;
  doc.setFont(undefined, 'normal');

  // Zugewiesene Aufgaben
  if (kind.zugewieseneAufgaben.length > 0) {
    checkPageBreak(15); // Approx height for section title + first row
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text('Zugewiesene Aufgaben:', 17, yPos);
    yPos += 5;
    doc.setFont(undefined, 'normal');

    const aufgabenBody = kind.zugewieseneAufgaben.map(z => [
      z.helferaufgaben.titel,
      z.helferaufgaben.zeitfenster || '-',
      z.helferaufgaben.bereich || '-',
      z.via_springer ? 'Ja' : 'Nein',
    ]);
    autoTable(doc, {
      startY: yPos,
      head: [['Aufgabe', 'Zeitfenster', 'Bereich', 'Springer']],
      body: aufgabenBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, halign: 'left' },
      headStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: 'bold', halign: 'center' },
      margin: { left: 15, right: 15 },
      tableWidth: doc.internal.pageSize.getWidth() - 30,
      didDrawPage: () => { addHeader(doc, `Helferliste ${klassenName}`, pageHeaderSubTitle); } // Redraw header on new page by autotable
    });
    yPos = (doc as any).lastAutoTable.finalY + 7;
  } else {
    checkPageBreak(10);
    doc.setFontSize(9);
    doc.text('Keine zugewiesenen Aufgaben.', 17, yPos);
    yPos += 5;
  }

  // Wünsche
  if (kind.wuensche.length > 0) {
    checkPageBreak(15);
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text('Helferwünsche:', 17, yPos);
    yPos += 5;
    doc.setFont(undefined, 'normal');
    const wuenscheBody = kind.wuensche.map(w => [
      w.aufgabe_titel,
      w.zeitfenster_wunsch || '-',
      w.prioritaet?.toString() || '-',
      w.freitext || '-',
      w.ist_springer ? 'Ja' : 'Nein',
    ]);
    autoTable(doc, {
      startY: yPos,
      head: [['Aufgabe', 'Zeitfenster', 'Prio', 'Freitext', 'Springer']],
      body: wuenscheBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, halign: 'left' },
      headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold', halign: 'center' },
      margin: { left: 15, right: 15 },
      tableWidth: doc.internal.pageSize.getWidth() - 30,
      didDrawPage: () => { addHeader(doc, `Helferliste ${klassenName}`, pageHeaderSubTitle); }
    });
    yPos = (doc as any).lastAutoTable.finalY + 7;
  }

  // Essensspenden
  if (kind.essensspenden.length > 0) {
    checkPageBreak(15);
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text('Zugesagte Essensspenden:', 17, yPos);
    yPos += 5;
    doc.setFont(undefined, 'normal');
    const spendenBody = kind.essensspenden.map(es => [
      es.spende_titel,
      es.menge.toString(),
      es.freitext_spende || '-',
    ]);
    autoTable(doc, {
      startY: yPos,
      head: [['Spende', 'Menge', 'Hinweis']],
      body: spendenBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, halign: 'left' },
      headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold', halign: 'center' },
      margin: { left: 15, right: 15 },
      tableWidth: doc.internal.pageSize.getWidth() - 30,
      didDrawPage: () => { addHeader(doc, `Helferliste ${klassenName}`, pageHeaderSubTitle); }
    });
    yPos = (doc as any).lastAutoTable.finalY + 7;
  }
  return yPos + 5; // Add a little space before the next child or section
};

const generatePdfForClass = (
  doc: jsPDF,
  klassenName: string,
  klassenDaten: KlassenAggregierteDaten,
  pageSubTitle: string
) => {
  addHeader(doc, `Helferliste Klasse: ${klassenName}`, pageSubTitle);
  let yPos = 30; // Initial yPosition after header

  klassenDaten.kinderDieserKlasse.forEach((kind) => {
    yPos = generateSingleKindContent(doc, kind, yPos, klassenName, pageSubTitle);
    // Add a separator line between children, if not too close to page bottom
    if (yPos < doc.internal.pageSize.getHeight() - 30) {
        doc.setDrawColor(200, 200, 200); // Light gray line
        doc.line(15, yPos - 2, doc.internal.pageSize.getWidth() - 15, yPos - 2);
    }
  });
};

export const generateAllPDFs = async (
  supabase: SupabaseClient,
  alleKlassenPdfsDaten: AlleKlassenPdfsDaten,
  setPdfGenerationMessage?: (message: string | null) => void
): Promise<void> => {
  try {
    console.log('generateAllPDFs: Start', { supabase, alleKlassenPdfsDaten });
    if (!supabase || !alleKlassenPdfsDaten) {
      const msg = 'generateAllPDFs: Supabase client or PDF data is missing.';
      console.error(msg, { supabase, alleKlassenPdfsDaten });
      if (setPdfGenerationMessage) setPdfGenerationMessage('Fehler: Notwendige Daten für PDF-Generierung fehlen.');
      throw new Error(msg);
    }
    if (setPdfGenerationMessage) setPdfGenerationMessage('Starte PDF-Generierung für alle Klassen...');
    const { ansprechpartner, spendenBedarf } = await loadAnsprechpartnerAndSpenden(supabase, setPdfGenerationMessage);
    console.log('generateAllPDFs: Ansprechpartner und SpendenBedarf geladen', { ansprechpartner, spendenBedarf });

    const doc = new jsPDF('p', 'mm', 'a4');
    let firstPageForLoop = true;
    const sortedKlassenNamen = Object.keys(alleKlassenPdfsDaten).sort();

    for (const klassenName of sortedKlassenNamen) {
      if (setPdfGenerationMessage) setPdfGenerationMessage(`Generiere Daten für Klasse ${klassenName}...`);
      const klassenDaten = alleKlassenPdfsDaten[klassenName];
      console.log('generateAllPDFs: Klasse', klassenName, klassenDaten);
      if (!firstPageForLoop) {
        doc.addPage();
      }
      firstPageForLoop = false;
      generatePdfForClass(doc, klassenName, klassenDaten, '(Teil des Gesamtdokuments)');
    }

    // Add Ansprechpartner and Spendenübersicht at the very end
    doc.addPage();
    addHeader(doc, 'Wichtige Kontakte & Spendenübersicht');
    let finalYPos = 30;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Ansprechpartner für Bereiche', 15, finalYPos);
    finalYPos += 7;
    doc.setFont(undefined, 'normal');

    if (ansprechpartner.length > 0) {
      const ansprechpartnerBody = ansprechpartner.map(ap => [ap.bereich, ap.name, ap.telefonnummer || '-']);
      autoTable(doc, {
        startY: finalYPos,
        head: [['Bereich', 'Name', 'Telefon']],
        body: ansprechpartnerBody,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 1.5 },
        headStyles: { fillColor: [200, 220, 255], textColor: 20, fontStyle: 'bold' },
        margin: { left: 15, right: 15 },
        tableWidth: doc.internal.pageSize.getWidth() - 30,
        didDrawPage: () => { addHeader(doc, 'Wichtige Kontakte & Spendenübersicht'); }
      });
      finalYPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.text('Keine Ansprechpartnerdaten verfügbar.', 15, finalYPos);
      finalYPos += 7;
    }
    
    const pageHeight = doc.internal.pageSize.getHeight();
    if (finalYPos + 40 > pageHeight - 20) { // Check if space for next table + header
       doc.addPage();
       addHeader(doc, 'Wichtige Kontakte & Spendenübersicht', '(Fortsetzung)');
       finalYPos = 30;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Übersicht Essensspenden Bedarf', 15, finalYPos);
    finalYPos += 7;
    doc.setFont(undefined, 'normal');

    if (spendenBedarf.length > 0) {
      const spendenBedarfBody = spendenBedarf.map(sb => [sb.titel, sb.beschreibung || '-', sb.anzahl_benoetigt.toString()]);
      autoTable(doc, {
        startY: finalYPos,
        head: [['Spende', 'Beschreibung', 'Benötigt']],
        body: spendenBedarfBody,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 1.5 },
        headStyles: { fillColor: [200, 255, 200], textColor: 20, fontStyle: 'bold' },
        margin: { left: 15, right: 15 },
        tableWidth: doc.internal.pageSize.getWidth() - 30,
        didDrawPage: () => { addHeader(doc, 'Wichtige Kontakte & Spendenübersicht', '(Fortsetzung)'); }
      });
    } else {
      doc.setFontSize(10);
      doc.text('Keine Daten zum Spendenbedarf verfügbar.', 15, finalYPos);
    }

    addFooter(doc);
    doc.save('Alle_Helferlisten_Vogelschiessen.pdf');
    if (setPdfGenerationMessage) setPdfGenerationMessage('Alle Helfer-PDFs erfolgreich generiert und heruntergeladen.');
    console.log('generateAllPDFs: PDF erfolgreich generiert und gespeichert.');

  } catch (error: any) {
    if (error instanceof Error) {
      console.error('generateAllPDFs: Fehler bei der PDF-Generierung:', error.message, error.stack);
      if (setPdfGenerationMessage) setPdfGenerationMessage(`Fehler bei der PDF-Generierung: ${error.message}`);
      throw new Error(`generateAllPDFs Exception: ${error.message}`);
    } else {
      console.error('generateAllPDFs: Fehler bei der PDF-Generierung (non-Error):', error);
      if (setPdfGenerationMessage) setPdfGenerationMessage(`Fehler bei der PDF-Generierung: ${JSON.stringify(error)}`);
      throw new Error('generateAllPDFs Exception: ' + JSON.stringify(error));
    }
  }
};

/**
 * Generiert eine PDF-Tabelle mit allen Helfern (Kinder und externe Helfer) und ihren zugewiesenen Aufgaben
 * @param supabase - Der Supabase-Client
 * @param setPdfGenerationMessage - Optionale Funktion zum Setzen einer Status-Nachricht
 */
export const generateHelferTabellePDF = async (
  supabase: SupabaseClient,
  setPdfGenerationMessage?: (message: string | null) => void
): Promise<void> => {
  if (setPdfGenerationMessage) setPdfGenerationMessage('Erzeuge Helfer-Tabelle PDF...');
  
  try {
    // PDF-Dokument erstellen
    const doc = new jsPDF();
    
    // Metadaten hinzufügen
    doc.setProperties({
      title: 'Helfer-Übersicht',
      subject: 'Vollständige Übersicht aller Helfer und ihrer Zuordnungen'
    });
    
    // 1. Kinderdaten laden
    if (setPdfGenerationMessage) setPdfGenerationMessage('Lade Kinderhelfer...');
    const { data: kinderData, error: kinderError } = await supabase
      .from('kinder')
      .select('id, vorname, nachname, klasse')
      .order('klasse, nachname, vorname');
      
    if (kinderError) {
      console.error('Fehler beim Laden der Kinder:', kinderError);
      throw new Error(`Fehler beim Laden der Kinder: ${kinderError.message}`);
    }
    
    // 2. Externe Helfer laden
    if (setPdfGenerationMessage) setPdfGenerationMessage('Lade externe Helfer...');
    const { data: externeHelferData, error: externeHelferError } = await supabase
      .from('externer_helfer')
      .select('id, name')
      .order('name');
      
    if (externeHelferError) {
      console.error('Fehler beim Laden der externen Helfer:', externeHelferError);
      throw new Error(`Fehler beim Laden der externen Helfer: ${externeHelferError.message}`);
    }
    
    // 3. Aufgaben laden
    if (setPdfGenerationMessage) setPdfGenerationMessage('Lade Aufgaben...');
    const { data: aufgabenData, error: aufgabenError } = await supabase
      .from('helferaufgaben')
      .select('id, titel, beschreibung, zeitfenster, bereich')
      .order('bereich, titel');
      
    if (aufgabenError) {
      console.error('Fehler beim Laden der Aufgaben:', aufgabenError);
      throw new Error(`Fehler beim Laden der Aufgaben: ${aufgabenError.message}`);
    }
    
    // 4. Zuteilungen für Kinder laden
    if (setPdfGenerationMessage) setPdfGenerationMessage('Lade Zuteilungen...');
    const { data: zuteilungenData, error: zuteilungenError } = await supabase
      .from('helfer_zuteilungen')
      .select('id, kind_id, aufgabe_id, via_springer');
      
    if (zuteilungenError) {
      console.error('Fehler beim Laden der Zuteilungen:', zuteilungenError);
      throw new Error(`Fehler beim Laden der Zuteilungen: ${zuteilungenError.message}`);
    }
    
    // 5. Zuteilungen für externe Helfer laden
    if (setPdfGenerationMessage) setPdfGenerationMessage('Lade externe Helfer-Zuteilungen...');
    const { data: externeZuteilungenData, error: externeZuteilungenError } = await supabase
      .from('externer_helfer_zuteilungen')
      .select('id, externer_helfer_id, aufgabe_id');
      
    if (externeZuteilungenError) {
      console.error('Fehler beim Laden der externen Zuteilungen:', externeZuteilungenError);
      throw new Error(`Fehler beim Laden der externen Zuteilungen: ${externeZuteilungenError.message}`);
    }
    
    // 6. Aufgaben in Map umwandeln für schnellen Zugriff
    const aufgabenMap = aufgabenData?.reduce((acc, aufgabe) => {
      acc[aufgabe.id] = aufgabe;
      return acc;
    }, {} as Record<string, any>) || {};
    
    // 7. Daten für Tabelle vorbereiten
    const tableData = [];
    
    // Kinderdaten aufbereiten
    kinderData?.forEach(kind => {
      // Aufgaben für dieses Kind finden
      const kindZuteilungen = zuteilungenData
        ?.filter(z => z.kind_id === kind.id && z.kind_id != null) || [];
        
      const aufgabenDesKindes = kindZuteilungen
        ?.map(z => {
          const aufgabe = aufgabenMap[z.aufgabe_id] || { titel: 'Unbekannt', bereich: '', zeitfenster: '' };
          return `${aufgabe.titel}${aufgabe.bereich ? ` (${aufgabe.bereich})` : ''}${aufgabe.zeitfenster ? ` - ${aufgabe.zeitfenster}` : ''}${z.via_springer ? ' (Springer)' : ''}`;
        })
        .join('\n') || 'Keine Aufgaben';
      
      tableData.push([
        `${kind.vorname} ${kind.nachname}`,
        kind.klasse || 'Ohne Klasse',
        'Kind',
        aufgabenDesKindes
      ]);
    });
    
    // Externe Helfer aufbereiten
    externeHelferData?.forEach(helfer => {
      // Aufgaben für diesen externen Helfer finden
      const helferZuteilungen = externeZuteilungenData
        ?.filter(z => z.externer_helfer_id === helfer.id && z.externer_helfer_id != null) || [];
        
      const aufgabenDesHelfers = helferZuteilungen
        ?.map(z => {
          const aufgabe = aufgabenMap[z.aufgabe_id] || { titel: 'Unbekannt', bereich: '', zeitfenster: '' };
          return `${aufgabe.titel}${aufgabe.bereich ? ` (${aufgabe.bereich})` : ''}${aufgabe.zeitfenster ? ` - ${aufgabe.zeitfenster}` : ''}`;
        })
        .join('\n') || 'Keine Aufgaben';
      
      tableData.push([
        helfer.name,
        'Extern',
        'Externer Helfer',
        aufgabenDesHelfers
      ]);
    });
    
    // 8. Tabellen-Header definieren
    const headers = [['Name', 'Klasse/Status', 'Typ', 'Aufgaben']];
    
    // 9. PDF-Titel und Header hinzufügen
    addHeader(doc, 'Helfer-Übersicht', 'Alle Helfer und ihre Aufgaben');
    
    // 10. Tabelle zum PDF hinzufügen
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 30,
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      styles: { overflow: 'linebreak', cellWidth: 'auto' },
      columnStyles: {
        0: { cellWidth: 50 }, // Name
        1: { cellWidth: 30 }, // Klasse/Status
        2: { cellWidth: 30 }, // Typ
        3: { cellWidth: 'auto' } // Aufgaben
      }
    });
    
    // 11. Footer hinzufügen
    addFooter(doc);
    
    // 12. PDF speichern
    doc.save(`Helfer-Uebersicht_${new Date().toISOString().split('T')[0]}.pdf`);
    if (setPdfGenerationMessage) setPdfGenerationMessage('Helfer-Tabelle PDF erfolgreich erstellt.');
    
  } catch (error: any) {
    if (error instanceof Error) {
      console.error('generateHelferTabellePDF: Fehler:', error.message, error.stack);
      if (setPdfGenerationMessage) setPdfGenerationMessage(`Fehler bei der Tabellen-Generierung: ${error.message}`);
      throw new Error(`generateHelferTabellePDF: ${error.message}`);
    } else {
      console.error('generateHelferTabellePDF: Fehler (non-Error):', error);
      if (setPdfGenerationMessage) setPdfGenerationMessage(`Fehler bei der Tabellen-Generierung: ${JSON.stringify(error)}`);
      throw new Error('generateHelferTabellePDF: ' + JSON.stringify(error));
    }
  }
};

// Compatibility function to support existing code that calls generatePDF(kindId)
// This provides an adapter between the old API and the new generateSinglePDF function
export const generatePDF = async (kindId: string) => {
  try {
    const supabase = createClient();
    console.log(`Generating PDF for kind with ID: ${kindId}`);
    
    // 1. Fetch kind data
    const { data: kind, error: kindError } = await supabase
      .from('kinder')
      .select('id, vorname, nachname, klasse')
      .eq('id', kindId)
      .single();
      
    if (kindError || !kind) {
      console.error('Error fetching kind data:', kindError);
      throw new Error(`Could not find kind with ID ${kindId}`);
    }
    
    // 2. Fetch zuteilungen (assignments) for this kind
    const { data: zuteilungen, error: zuteilungenError } = await supabase
      .from('helfer_zuteilungen')
      .select(`
        id, 
        kind_id,
        aufgabe_id,
        via_springer,
        helferaufgaben:aufgabe_id (id, titel, beschreibung, zeitfenster, bereich)
      `)
      .eq('kind_id', kindId);
      
    if (zuteilungenError) {
      console.error('Error fetching zuteilungen:', zuteilungenError);
      throw new Error(`Error fetching assignments for kind ${kindId}`);
    }
    
    // 3. Transform data to expected format for generateSinglePDF
    const formattedZuteilungen = zuteilungen.map(z => ({
      id: z.id,
      kind_id: z.kind_id,
      aufgabe_id: z.aufgabe_id,
      via_springer: z.via_springer,
      helferaufgaben: z.helferaufgaben || {
        id: z.aufgabe_id,
        titel: 'Unbekannte Aufgabe',
        beschreibung: null,
        zeitfenster: null,
        bereich: null
      },
      kind: {
        id: kind.id,
        vorname: kind.vorname,
        nachname: kind.nachname,
        klasse: kind.klasse
      }
    }));
    
    // 4. Create the data structure expected by generateSinglePDF
    const klassenDaten = {
      kinderDieserKlasse: [{
        id: kind.id,
        vorname: kind.vorname,
        nachname: kind.nachname,
        klasse: kind.klasse,
        zugewieseneAufgaben: formattedZuteilungen,
        wuensche: [], // Add actual data here if needed
        rueckmeldungen: [],
        essensspenden: []
      }]
    };
    
    // 5. Call generateSinglePDF with the prepared data
    // Use type assertion to bypass type checking issues
    return generateSinglePDF(supabase, kind.klasse, klassenDaten as any);
  } catch (error) {
    console.error('Error in generatePDF compatibility function:', error);
    throw error;
  }
};

export const generateSinglePDF = async (
  supabase: SupabaseClient,
  klassenName: string,
  klassenDaten: KlassenAggregierteDaten,
  setPdfGenerationMessage?: (message: string | null) => void
): Promise<void> => {
   if (!supabase || !klassenDaten || !klassenName) {
    console.error('generateSinglePDF: Wichtige Daten fehlen.');
    if (setPdfGenerationMessage) setPdfGenerationMessage('Fehler: Daten für PDF fehlen.');
    return;
  }
  if (setPdfGenerationMessage) setPdfGenerationMessage(`Generiere PDF für Klasse ${klassenName}...`);

  try {
    const { ansprechpartner, spendenBedarf } = await loadAnsprechpartnerAndSpenden(supabase, setPdfGenerationMessage);
    const doc = new jsPDF('p', 'mm', 'a4');
    generatePdfForClass(doc, klassenName, klassenDaten, `Helferliste`);
    
    // Add Ansprechpartner and Spendenübersicht at the end
    doc.addPage();
    addHeader(doc, `Wichtige Kontakte & Spendenübersicht für Klasse ${klassenName}`);
    let finalYPos = 30;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Ansprechpartner für Bereiche', 15, finalYPos);
    finalYPos += 6;
    doc.setFont(undefined, 'normal');

    if (ansprechpartner.length > 0) {
      const ansprechpartnerBody = ansprechpartner.map(ap => [ap.bereich, ap.name, ap.telefonnummer || '-']);
      autoTable(doc, {
        startY: finalYPos,
        head: [['Bereich', 'Name', 'Telefon']],
        body: ansprechpartnerBody, styles: { fontSize: 9 }, headStyles: { fillColor: [200,220,255] }, margin: { left: 15, right: 15 }, tableWidth: doc.internal.pageSize.getWidth() - 30,
        didDrawPage: () => { addHeader(doc, `Kontakte & Spenden Klasse ${klassenName}`); }
      });
      finalYPos = (doc as any).lastAutoTable.finalY + 8;
    }

    if (finalYPos + 30 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); addHeader(doc, `Kontakte & Spenden Klasse ${klassenName}`, '(Forts.)'); finalYPos = 30; }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Übersicht Essensspenden Bedarf (Allgemein)', 15, finalYPos);
    finalYPos += 6;
    doc.setFont(undefined, 'normal');
    if (spendenBedarf.length > 0) {
         const spendenBedarfBody = spendenBedarf.map(sb => [sb.titel, sb.beschreibung || '-', sb.anzahl_benoetigt.toString()]);
      autoTable(doc, {
        startY: finalYPos,
        head: [['Spende', 'Beschreibung', 'Benötigt']],
        body: spendenBedarfBody, styles: { fontSize: 9 }, headStyles: { fillColor: [200,255,200] }, margin: { left: 15, right: 15 }, tableWidth: doc.internal.pageSize.getWidth() - 30,
        didDrawPage: () => { addHeader(doc, `Kontakte & Spenden Klasse ${klassenName}`, '(Forts.)'); }
      });
    }

    addFooter(doc);
    doc.save(`Helferliste_${klassenName.replace(/\s+/g, '_')}.pdf`);
    if (setPdfGenerationMessage) setPdfGenerationMessage(`PDF für Klasse ${klassenName} erfolgreich generiert.`);

  } catch (error: any) {
    console.error(`Fehler bei PDF-Generierung für Klasse ${klassenName}:`, error);
    if (setPdfGenerationMessage) setPdfGenerationMessage(`Fehler PDF Klasse ${klassenName}: ${error.message}`);
  }
};
