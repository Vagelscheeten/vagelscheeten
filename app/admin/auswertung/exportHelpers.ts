import { createClient } from '@/lib/supabase/client';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Erweitere den jsPDF-Typ um die autoTable-Methode
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => any;
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Typdefinitionen für die Daten
interface SpielPunkt {
  kind_id: string;
  kind_name: string;
  klasse: string;
  spiel_id: string;
  spiel_name: string;
  wert: number;
  rang: number;
  punkte: number;
  gruppe_id: string;
  [key: string]: any; // Für dynamischen Zugriff auf Eigenschaften
}

interface SpielGruppe {
  name: string;
  ergebnisse: SpielPunkt[];
}

interface KlassenGruppe {
  [klasse: string]: SpielPunkt[];
}

interface GesamtPunkt {
  kind_id: string;
  kind_name: string;
  klasse: string;
  gesamtpunkte: number;
  [key: string]: any;
}

/**
 * Exportiert die Spielpunkte-Daten als CSV-Datei
 */
export async function exportSpielPunkteCSV() {
  const supabase = createClient();
  
  try {
    // Daten aus der View abrufen
    const { data, error } = await supabase
      .from('spielpunkte_pro_kind')
      .select('*')
      .order('klasse, spiel_name, rang');
      
    if (error) {
      console.error('Fehler beim Abrufen der Daten:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Keine Daten zum Exportieren vorhanden');
    }
    
    // CSV-Header erstellen
    const headers = Object.keys(data[0]);
    let csvContent = headers.join(',') + '\n';
    
    // CSV-Zeilen erstellen
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Werte mit Kommas in Anführungszeichen setzen
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      });
      csvContent += values.join(',') + '\n';
    });
    
    // CSV-Datei erstellen und herunterladen
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    link.setAttribute('download', `spielpunkte_auswertung_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('CSV-Export fehlgeschlagen:', error);
    return false;
  }
}

/**
 * Exportiert die Spielpunkte-Daten als PDF-Datei
 * Jedes Spiel wird auf einer eigenen Seite dargestellt
 */
export async function exportSpielPunktePDF() {
  const supabase = createClient();
  
  try {
    // Daten aus der View abrufen
    const { data, error } = await supabase
      .from('spielpunkte_pro_kind')
      .select('*')
      .order('klasse, spiel_name, rang');
      
    if (error) {
      console.error('Fehler beim Abrufen der Daten:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Keine Daten zum Exportieren vorhanden');
    }
    
    // PDF erstellen
    const pdf = new jsPDF();
    
    // Titel für das Dokument
    pdf.setFontSize(18);
    pdf.text('Spielauswertung – Ranglisten je Spiel', 14, 20);
    
    // Datum hinzufügen
    pdf.setFontSize(10);
    pdf.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 14, 28);
    
    // Gruppiere Daten nach Spielen
    const spieleGruppiert: Record<string, SpielGruppe> = {};
    data.forEach((row: SpielPunkt) => {
      if (!spieleGruppiert[row.spiel_id]) {
        spieleGruppiert[row.spiel_id] = {
          name: row.spiel_name,
          ergebnisse: []
        };
      }
      spieleGruppiert[row.spiel_id].ergebnisse.push(row);
    });
    
    // Für jedes Spiel eine Seite erstellen
    let isFirstPage = true;
    Object.values(spieleGruppiert).forEach((spiel: SpielGruppe) => {
      if (!isFirstPage) {
        pdf.addPage();
      } else {
        // Auf der ersten Seite haben wir bereits einen Titel, also fügen wir mehr Platz hinzu
        isFirstPage = false;
      }
      
      // Überschrift für das Spiel
      pdf.setFontSize(16);
      pdf.text(`Spiel: ${spiel.name}`, 14, isFirstPage ? 40 : 20);
      
      // Gruppiere Ergebnisse nach Klassen
      const klassenGruppiert: KlassenGruppe = {};
      spiel.ergebnisse.forEach((row: SpielPunkt) => {
        if (!klassenGruppiert[row.klasse]) {
          klassenGruppiert[row.klasse] = [];
        }
        klassenGruppiert[row.klasse].push(row);
      });
      
      // Für jede Klasse eine Tabelle erstellen
      let yPosition = isFirstPage ? 50 : 30;
      Object.entries(klassenGruppiert).forEach(([klasse, ergebnisse]: [string, SpielPunkt[]]) => {
        pdf.setFontSize(14);
        pdf.text(`Klasse: ${klasse}`, 14, yPosition);
        
        // Tabelle erstellen
        pdf.autoTable({
          startY: yPosition + 10,
          head: [['Rang', 'Name', 'Punkte', 'Wert']],
          body: ergebnisse.map(row => [
            row.rang,
            row.kind_name,
            row.punkte,
            row.wert
          ]),
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { top: 30 }
        });
        
        yPosition = (pdf as any).lastAutoTable.finalY + 20;
        
        // Wenn die Position zu weit unten ist, neue Seite hinzufügen
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
      });
    });
    
    // PDF speichern
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    pdf.save(`spielpunkte_auswertung_${timestamp}.pdf`);
    
    return true;
  } catch (error) {
    console.error('PDF-Export fehlgeschlagen:', error);
    return false;
  }
}

/**
 * Exportiert die Gesamtauswertung als CSV
 * @param klasseFilter Optional: Filtert nach einer bestimmten Klasse
 * @param nurVollstaendig Optional: Filtert nach vollständig absolvierten Spielen
 */
export async function exportGesamtauswertungCSV(klasseFilter?: string | null, nurVollstaendig?: boolean) {
  const supabase = createClient();
  
  try {
    // Gesamtpunkte pro Kind berechnen
    const { data, error } = await supabase.rpc('berechne_gesamtpunkte_pro_kind');
      
    if (error) {
      console.error('Fehler beim Abrufen der Gesamtpunkte:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Keine Daten zum Exportieren vorhanden');
    }
    
    // Daten filtern, wenn nötig
    let filteredData = data;
    if (klasseFilter) {
      filteredData = filteredData.filter(item => item.klasse === klasseFilter);
    }
    if (nurVollstaendig) {
      filteredData = filteredData.filter(item => item.status === 'vollständig');
    }
    
    // CSV-Header erstellen
    const headers = ['Rang', 'Name', 'Geschlecht', 'Klasse', 'Gruppe', 'Gesamtpunkte', 'Absolvierte Spiele', 'Status', 'König/Königin'];
    let csvContent = headers.join(',') + '\n';
    
    // CSV-Zeilen erstellen
    filteredData.forEach((row: any) => {
      const koenigStatus = row.ist_koenig ? 'König' : (row.ist_koenigin ? 'Königin' : '');
      const values = [
        row.rang,
        `"${row.kind_name}"`, // Namen in Anführungszeichen für Kommas
        row.geschlecht,
        row.klasse,
        row.spielgruppe_name,
        row.gesamtpunkte,
        `${row.anzahl_spiele}/${row.gesamt_spiele}`,
        row.status,
        koenigStatus
      ];
      csvContent += values.join(',') + '\n';
    });
    
    // CSV-Datei erstellen und herunterladen
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const klasseText = klasseFilter ? `_klasse_${klasseFilter}` : '';
    const vollstaendigText = nurVollstaendig ? '_vollstaendig' : '';
    link.setAttribute('download', `gesamtauswertung${klasseText}${vollstaendigText}_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('CSV-Export fehlgeschlagen:', error);
    return false;
  }
}

/**
 * Exportiert die Gesamtauswertung als PDF (Urkunden-Format)
 * @param klasseFilter Optional: Filtert nach einer bestimmten Klasse
 * @param nurVollstaendig Optional: Filtert nach vollständig absolvierten Spielen
 */
export async function exportGesamtauswertungPDF(klasseFilter?: string | null, nurVollstaendig?: boolean) {
  const supabase = createClient();

  try {
    // Aktives Event laden — Jahr für den Titel und Kinder-Filter für die RPC-Daten
    const { data: activeEvent } = await supabase
      .from('events')
      .select('id, jahr')
      .eq('ist_aktiv', true)
      .maybeSingle();
    const eventJahr = activeEvent?.jahr ?? new Date().getFullYear();

    // Kind-IDs des aktiven Events (zum Filtern des RPC-Ergebnisses)
    let eventKinderIds: Set<string> | null = null;
    if (activeEvent?.id) {
      const { data: kinderData } = await supabase
        .from('kinder')
        .select('id')
        .eq('event_id', activeEvent.id);
      eventKinderIds = new Set((kinderData ?? []).map((k) => k.id));
    }

    // Gesamtpunkte pro Kind berechnen
    const { data, error } = await supabase.rpc('berechne_gesamtpunkte_pro_kind');

    if (error) {
      console.error('Fehler beim Abrufen der Gesamtpunkte:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Keine Daten zum Exportieren vorhanden');
    }

    // Daten filtern — zuerst auf Kinder des aktiven Events, dann optional weitere Filter
    let filteredData = data;
    if (eventKinderIds) {
      filteredData = filteredData.filter((item: any) => eventKinderIds!.has(item.kind_id));
    }
    if (klasseFilter) {
      filteredData = filteredData.filter(item => item.klasse === klasseFilter);
    }
    if (nurVollstaendig) {
      filteredData = filteredData.filter(item => item.status === 'vollständig');
    }

    // PDF erstellen
    const pdf = new jsPDF();

    // Titel für das Dokument
    pdf.setFontSize(18);
    pdf.text(`Vogelschießen ${eventJahr} – Abschlussauswertung`, 14, 20);
    
    // Datum hinzufügen
    pdf.setFontSize(10);
    pdf.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 14, 28);
    
    // Filter-Info hinzufügen, wenn vorhanden
    if (nurVollstaendig) {
      pdf.text('Filter: Nur vollständig absolvierte Spiele', 14, 34);
    }
    
    // Gruppiere Daten nach Klassen
    const klassenGruppiert: Record<string, any[]> = {};
    filteredData.forEach((row: any) => {
      if (!klassenGruppiert[row.klasse]) {
        klassenGruppiert[row.klasse] = [];
      }
      klassenGruppiert[row.klasse].push(row);
    });
    
    // Für jede Klasse eine Seite erstellen
    let isFirstPage = true;
    Object.entries(klassenGruppiert).forEach(([klasse, kinder]: [string, any[]]) => {
      if (!isFirstPage) {
        pdf.addPage();
      } else {
        isFirstPage = false;
      }
      
      // Überschrift für die Klasse
      pdf.setFontSize(16);
      pdf.text(`Abschlussauswertung Klasse ${klasse}`, 14, 40);
      
      // Tabelle erstellen
      pdf.autoTable({
        startY: 50,
        head: [['Rang', 'Name', 'Geschlecht', 'Gruppe', 'Gesamtpunkte', 'Spiele', 'Status']],
        body: kinder.map((kind) => [
          kind.rang,
          kind.ist_koenig ? `${kind.kind_name} 👑 (König)` : 
            kind.ist_koenigin ? `${kind.kind_name} 👑 (Königin)` : 
            kind.kind_name,
          kind.geschlecht,
          kind.spielgruppe_name,
          kind.gesamtpunkte,
          `${kind.anzahl_spiele}/${kind.gesamt_spiele}`,
          kind.status
        ]),
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { top: 30 }
      });
      
      // Legende hinzufügen
      const finalY = (pdf as any).lastAutoTable.finalY + 20;
      pdf.setFontSize(12);
      pdf.text('Legende:', 14, finalY);
      pdf.setFontSize(10);
      pdf.text('👑 König: Bestplatzierter Junge der Klasse', 14, finalY + 10);
      pdf.text('👑 Königin: Bestplatziertes Mädchen der Klasse', 14, finalY + 16);
      pdf.text('Punktevergabe: 1. Platz = 10 Punkte, 2. Platz = 9 Punkte, ... 10. Platz = 1 Punkt', 14, finalY + 22);
    });
    
    // PDF speichern
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const klasseText = klasseFilter ? `_klasse_${klasseFilter}` : '';
    const vollstaendigText = nurVollstaendig ? '_vollstaendig' : '';
    pdf.save(`gesamtauswertung${klasseText}${vollstaendigText}_${timestamp}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Gesamtauswertung-Export fehlgeschlagen:', error);
    return false;
  }
}
