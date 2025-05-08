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
import type { Zuteilung } from './types';

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

// Typen für die Zuteilungen mit Kind- und Aufgabeninformationen
interface ZuteilungMitDetails {
  id: string;
  kind_id: string;
  aufgabe_id: string;
  via_springer: boolean;
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
  helferaufgaben: {
    id: string;
    titel: string;
    beschreibung: string | null;
    zeitfenster: string | null;
    bereich: string | null;
  };
}

interface PDFZuteilungenTabelleProps {
  zuteilungen: ZuteilungMitDetails[];
  onVorschau: (kindId: string) => void;
}

export function PDFZuteilungenTabelle({ zuteilungen, onVorschau }: PDFZuteilungenTabelleProps) {
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
    const kindId = zuteilung.kind_id;
    
    if (!acc[kindId]) {
      acc[kindId] = {
        kind: zuteilung.kind,
        zuteilungen: []
      };
    }
    
    acc[kindId].zuteilungen.push(zuteilung);
    return acc;
  }, {} as Record<string, { kind: ZuteilungMitDetails['kind'], zuteilungen: ZuteilungMitDetails[] }>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Helfer-Zuteilungen</CardTitle>
        <CardDescription>
          {Object.keys(groupedByKind).length} Kinder mit insgesamt {zuteilungen.length} Zuteilungen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Klasse</TableHead>
              <TableHead>Aufgaben</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(groupedByKind).map(({ kind, zuteilungen }) => (
              <TableRow key={kind.id}>
                <TableCell className="font-medium">
                  {kind.vorname} {kind.nachname}
                </TableCell>
                <TableCell>{kind.klasse || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {zuteilungen.map((zuteilung) => (
                      <Badge key={zuteilung.id} variant="outline" className="mr-1 mb-1">
                        {zuteilung.helferaufgaben.titel}
                        {zuteilung.via_springer && ' (Springer)'}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onVorschau(kind.id)}
                    className="mr-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Vorschau
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleGeneratePDF(kind.id, `${kind.vorname} ${kind.nachname}`)}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
