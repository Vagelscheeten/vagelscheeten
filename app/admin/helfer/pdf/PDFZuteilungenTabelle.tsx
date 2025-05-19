'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

// Typen aus der types.ts-Datei importieren
import type { ZuteilungMitKindUndAufgabeDetails } from './types';

// Wir importieren die Funktionen dynamisch, um Probleme mit zirkulären Abhängigkeiten zu vermeiden
const generatePDF = async (kindId: string) => {
  try {
    // Dynamischer Import mit Fehlerbehandlung
    const pdfGeneratorModule = await import('./pdfGenerator');
    if (!pdfGeneratorModule || !pdfGeneratorModule.generatePDF) {
      throw new Error('PDF-Generator-Modul konnte nicht geladen werden');
    }
    return pdfGeneratorModule.generatePDF(kindId);
  } catch (error) {
    console.error('Fehler beim Importieren des PDF-Generators:', error);
    throw new Error('PDF-Generator konnte nicht geladen werden: ' + (error instanceof Error ? error.message : String(error)));
  }
};

interface PDFZuteilungenTabelleProps {
  zuteilungen: ZuteilungMitKindUndAufgabeDetails[];
  onVorschau: (kindId: string) => void;
  isLoading: boolean;
}

export function PDFZuteilungenTabelle({ zuteilungen, onVorschau, isLoading }: PDFZuteilungenTabelleProps) {
  const handleGeneratePDF = async (kindId: string, kindName: string) => {
    try {
      console.log(`Starte PDF-Generierung für Kind-ID: ${kindId}`);
      toast.loading(`PDF für ${kindName} wird generiert...`);
      
      // Prüfe, ob die Kind-ID gültig ist
      if (!kindId || kindId.trim() === '') {
        throw new Error('Keine gültige Kind-ID angegeben');
      }
      
      await generatePDF(kindId);
      toast.dismiss();
      toast.success(`PDF für ${kindName} erfolgreich generiert`);
    } catch (error) {
      console.error('Fehler bei der PDF-Generierung:', error);
      toast.dismiss();
      toast.error(`Fehler bei der PDF-Generierung für ${kindName}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  if (zuteilungen.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keine Zuteilungen gefunden</CardTitle>
          <CardDescription>
            Es wurden keine Zuteilungen mit den ausgewählten Filterkriterien gefunden.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Gruppiere Zuteilungen nach Kind
  const groupedByKind = zuteilungen.reduce((acc, zuteilung) => {
    // Stelle sicher, dass zuteilung.kind existiert, bevor auf dessen Eigenschaften zugegriffen wird.
    if (!zuteilung.kind) {
      // Überspringe diese Zuteilung oder handle sie entsprechend, falls 'kind' null sein kann.
      // Für den Moment überspringen wir sie, um Laufzeitfehler zu vermeiden.
      // Dies sollte idealerweise nicht passieren, wenn die Daten in page.tsx korrekt gefiltert werden.
      console.warn('Zuteilung ohne Kind-Informationen gefunden, wird übersprungen:', zuteilung);
      return acc;
    }
    const kindId = zuteilung.kind_id; // kind_id sollte immer vorhanden sein
    
    if (!acc[kindId]) {
      acc[kindId] = {
        kindDetails: zuteilung.kind, // kind sollte hier definiert sein
        aufgaben: [],
      };
    }
    acc[kindId].aufgaben.push(zuteilung.helferaufgaben);
    return acc;
  }, {} as Record<string, { kindDetails: NonNullable<ZuteilungMitKindUndAufgabeDetails['kind']>; aufgaben: ZuteilungMitKindUndAufgabeDetails['helferaufgaben'][] }>);

  // Umwandlung in ein Array für die Iteration im JSX
  const zuteilungenArray = Object.values(groupedByKind);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gefilterte Helferzuteilungen</CardTitle>
        <CardDescription>
          Zeigt die aktuell gefilterten Zuteilungen an. Nutzen Sie die Buttons für PDF-Export oder Vorschau.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <p>Lade Zuteilungen...</p> 
          </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kind</TableHead>
              <TableHead>Klasse</TableHead>
              <TableHead>Zugewiesene Aufgaben</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zuteilungenArray.map(({ kindDetails, aufgaben }) => {
              // Überprüfe, ob kindDetails nicht null ist, bevor auf Eigenschaften zugegriffen wird.
              if (!kindDetails) {
                // Dies sollte nicht passieren, wenn die Logik oben korrekt ist.
                // Handle den Fall, dass kindDetails null ist (z.B. durch Rückgabe von null oder einer Platzhalter-Zeile).
                return null; 
              }
              return (
                <TableRow key={kindDetails.id}>
                  <TableCell>{kindDetails.vorname} {kindDetails.nachname}</TableCell>
                  <TableCell>{kindDetails.klasse || 'N/A'}</TableCell>
                  <TableCell>
                    <ul className="list-disc pl-5 space-y-1">
                      {aufgaben.map((aufgabe, index) => (
                        <li key={`${aufgabe.id}-${index}`}>
                          {aufgabe.titel}
                          {aufgabe.zeitfenster && (
                            <Badge variant="outline" className="ml-2">
                              {aufgabe.zeitfenster}
                            </Badge>
                          )}
                          {aufgabe.bereich && (
                            <Badge variant="secondary" className="ml-2">
                              {aufgabe.bereich}
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onVorschau(kindDetails.id)}
                      title="Vorschau dieser Zuteilung"
                    >
                      <Eye className="h-4 w-4 mr-1" /> Vorschau
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleGeneratePDF(kindDetails.id, `${kindDetails.vorname} ${kindDetails.nachname}`)}
                      title="PDF für dieses Kind generieren"
                    >
                      <FileDown className="h-4 w-4 mr-1" /> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}
