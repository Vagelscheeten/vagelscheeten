import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generiert PDF-Tabellen je Klasse mit Namen der Kinder, zugeteilten Aufgaben, Wünschen und Essensspenden
 * @param supabase - Der Supabase-Client
 * @param setPdfGenerationMessage - Optionale Funktion zum Setzen einer Status-Nachricht
 */
export async function generateKlassentabellenPDF(
  supabase: any,
  setPdfGenerationMessage?: (message: string | null) => void
): Promise<void> {
  if (setPdfGenerationMessage) setPdfGenerationMessage('Erzeuge Klassentabellen-PDFs...');
  
  try {
    // 1. Kinderdaten laden
    if (setPdfGenerationMessage) setPdfGenerationMessage('Lade Kinder...');
    const { data: kinderData, error: kinderError } = await supabase
      .from('kinder')
      .select('id, vorname, nachname, klasse')
      .order('klasse, nachname, vorname');
      
    if (kinderError) {
      console.error('Fehler beim Laden der Kinder:', kinderError);
      throw new Error(`Fehler beim Laden der Kinder: ${kinderError.message}`);
    }
    
    // 2. Aufgaben laden
    if (setPdfGenerationMessage) setPdfGenerationMessage('Lade Aufgaben...');
    const { data: aufgabenData, error: aufgabenError } = await supabase
      .from('helferaufgaben')
      .select('id, titel, beschreibung, zeitfenster')
      .order('titel');
      
    if (aufgabenError) {
      console.error('Fehler beim Laden der Aufgaben:', aufgabenError);
      throw new Error(`Fehler beim Laden der Aufgaben: ${aufgabenError.message}`);
    }
    
    // 3. Zuteilungen laden
    if (setPdfGenerationMessage) setPdfGenerationMessage('Lade Zuteilungen...');
    const { data: zuteilungenData, error: zuteilungenError } = await supabase
      .from('helfer_zuteilungen')
      .select('id, kind_id, aufgabe_id, via_springer')
      .order('kind_id, aufgabe_id');
      
    if (zuteilungenError) {
      console.error('Fehler beim Laden der Zuteilungen:', zuteilungenError);
      throw new Error(`Fehler beim Laden der Zuteilungen: ${zuteilungenError.message}`);
    }
    
    // 4. Wünsche laden
    if (setPdfGenerationMessage) setPdfGenerationMessage('Lade Wünsche...');
    const { data: wuenscheData, error: wuenscheError } = await supabase
      .from('helfer_rueckmeldungen')
      .select('id, kind_id, aufgabe_id, freitext, prioritaet, ist_springer, zeitfenster');
      
    if (wuenscheError) {
      console.error('Fehler beim Laden der Wünsche:', wuenscheError);
      throw new Error(`Fehler beim Laden der Wünsche: ${wuenscheError.message}`);
    }
    
    // 5. Essensspenden laden
    if (setPdfGenerationMessage) setPdfGenerationMessage('Lade Essensspenden...');
    const { data: spendenData, error: spendenError } = await supabase
      .from('essensspenden_bedarf')
      .select('id, titel');
      
    if (spendenError) {
      console.error('Fehler beim Laden der Essensspenden:', spendenError);
      throw new Error(`Fehler beim Laden der Essensspenden: ${spendenError.message}`);
    }
    
    // 6. Essenspenden-Rückmeldungen laden
    if (setPdfGenerationMessage) setPdfGenerationMessage('Lade Essensspenden-Rückmeldungen...');
    const { data: spendenRueckmeldungenData, error: spendenRueckmeldungenError } = await supabase
      .from('essensspenden_rueckmeldungen')
      .select('id, kind_identifier, spende_id, menge, freitext');
      
    if (spendenRueckmeldungenError) {
      console.error('Fehler beim Laden der Essensspenden-Rückmeldungen:', spendenRueckmeldungenError);
      throw new Error(`Fehler beim Laden der Essensspenden-Rückmeldungen: ${spendenRueckmeldungenError.message}`);
    }
    
    // 7. Aufgaben und Spenden in Maps umwandeln für schnellen Zugriff
    const aufgabenMap = aufgabenData?.reduce((acc, aufgabe) => {
      acc[aufgabe.id] = aufgabe;
      return acc;
    }, {} as Record<string, any>) || {};
    
    const spendenMap = spendenData?.reduce((acc, spende) => {
      acc[spende.id] = spende;
      return acc;
    }, {} as Record<string, any>) || {};
    
    // 8. Daten nach Klassen gruppieren
    const klassenGruppiert: Record<string, any[]> = {};
    kinderData?.forEach(kind => {
      const klasse = kind.klasse || 'Ohne Klasse';
      if (!klassenGruppiert[klasse]) {
        klassenGruppiert[klasse] = [];
      }
      
      // Aufgaben für dieses Kind finden
      const kindZuteilungen = zuteilungenData
        ?.filter(z => z.kind_id === kind.id) || [];
      
      const kindAufgaben = kindZuteilungen
        .map(z => {
          const aufgabeId = z.aufgabe_id as string;
          const aufgabe = aufgabenMap[aufgabeId] || { titel: 'Unbekannt', zeitfenster: '' };
          return {
            titel: aufgabe.titel,
            zeitfenster: aufgabe.zeitfenster,
            viaSpringer: z.via_springer
          };
        }) || [];
        
      // Wünsche für dieses Kind finden
      const kindWuensche = wuenscheData
        ?.filter(w => w.kind_id === kind.id && w.aufgabe_id)
        .map(w => {
          const aufgabeId = w.aufgabe_id as string;
          const aufgabe = aufgabenMap[aufgabeId] || { titel: 'Unbekannt' };
          return {
            titel: aufgabe.titel,
            prioritaet: w.prioritaet,
            freitext: w.freitext,
            istSpringer: w.ist_springer,
            zeitfensterWunsch: w.zeitfenster
          };
        }) || [];
        
      // Essensspenden für dieses Kind finden - kind_identifier hat Format "Nachname, Vorname (Klasse)"
      // Erstelle mögliche Formatvarianten zum Abgleich
      const kindNamePattern1 = `${kind.nachname}, ${kind.vorname}`; // Basis-Format ohne Klasse
      const kindNamePattern2 = kind.klasse ? `${kind.nachname}, ${kind.vorname} (${kind.klasse})` : null; // Mit Klasse
      
      const kindSpenden = spendenRueckmeldungenData
        ?.filter(s => {
          if (!s.kind_identifier || !s.spende_id) return false;
          const identifierLower = s.kind_identifier.toLowerCase();
          return identifierLower.includes(kindNamePattern1.toLowerCase()) || 
                 (kindNamePattern2 && identifierLower.includes(kindNamePattern2.toLowerCase()));
        })
        .map(s => {
          const spendeId = s.spende_id as string;
          const spende = spendenMap[spendeId] || { titel: 'Unbekannt' };
          return {
            titel: spende.titel,
            menge: s.menge,
            freitext: s.freitext
          };
        }) || [];
        
      klassenGruppiert[klasse].push({
        vorname: kind.vorname,
        nachname: kind.nachname,
        aufgaben: kindAufgaben,
        wuensche: kindWuensche,
        spenden: kindSpenden
      });
    });
    
    // 9. Für jede Klasse ein PDF erstellen
    for (const klasse in klassenGruppiert) {
      if (klassenGruppiert.hasOwnProperty(klasse) && klassenGruppiert[klasse].length > 0) {
        const kindDaten = klassenGruppiert[klasse];
        
        // PDF-Dokument erstellen
        const doc = new jsPDF();

        // Metadaten hinzufügen
        doc.setProperties({
          title: `Klasse ${klasse}`,
          subject: 'Übersicht aller Kinder und ihrer Aufgaben, Wünsche und Essensspenden'
        });
        
        // Überschrift
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`Klasse: ${klasse}`, 10, 20);
        
        // Beschreibung
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Übersicht aller Kinder und ihrer Aufgaben, Wünsche und Essensspenden`, 10, 30);
        
        // Tabelle mit Inhalten
        autoTable(doc, {
          startY: 40,
          head: [['Name', 'Aufgaben', 'Wünsche', 'Essensspenden']],
          body: kindDaten.map(kind => {
            const aufgabenText = kind.aufgaben.length > 0 
              ? kind.aufgaben.map((a: any) => `${a.titel}${a.zeitfenster ? ` - ${a.zeitfenster}` : ''}${a.viaSpringer ? ' (Springer)' : ''}`).join('\n')
              : 'Keine';
              
            const wuenscheText = kind.wuensche.length > 0
              ? kind.wuensche.map((w: any) => `${w.titel}${w.prioritaet ? ` (Priorität: ${w.prioritaet})` : ''}${w.freitext ? ` - "${w.freitext}"` : ''}${w.istSpringer ? ' (Springer)' : ''}${w.zeitfensterWunsch ? ` (Zeit: ${w.zeitfensterWunsch})` : ''}`).join('\n')
              : 'Keine';
              
            const spendenText = kind.spenden.length > 0
              ? kind.spenden.map((s: any) => `${s.titel}${s.menge ? ` (${s.menge}x)` : ''}${s.freitext ? ` - "${s.freitext}"` : ''}`).join('\n')
              : 'Keine';
              
            return [
              `${kind.vorname} ${kind.nachname}`,
              aufgabenText,
              wuenscheText,
              spendenText
            ];
          }),
          theme: 'striped',
          styles: {
            fontSize: 10,
            cellPadding: 4
          },
          headStyles: {
            fillColor: [100, 100, 100],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 40 }, // Name
            1: { cellWidth: 50 }, // Aufgaben
            2: { cellWidth: 50 }, // Wünsche
            3: { cellWidth: 50 }  // Spenden
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          }
        });
        
        // PDF speichern
        doc.save(`Klasse_${klasse}_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    }
    
    if (setPdfGenerationMessage) setPdfGenerationMessage('Klassentabellen-PDFs erfolgreich erstellt.');
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('generateKlassentabellenPDF: Fehler:', error.message, error.stack);
      if (setPdfGenerationMessage) setPdfGenerationMessage(`Fehler bei der Klassentabellen-Generierung: ${error.message}`);
      throw new Error(`generateKlassentabellenPDF: ${error.message}`);
    } else {
      console.error('generateKlassentabellenPDF: Fehler (non-Error):', error);
      if (setPdfGenerationMessage) setPdfGenerationMessage(`Fehler bei der Klassentabellen-Generierung: ${JSON.stringify(error)}`);
      throw new Error('generateKlassentabellenPDF: Unbekannter Fehler');
    }
  } finally {
    if (setPdfGenerationMessage) setPdfGenerationMessage(null);
  }
}
