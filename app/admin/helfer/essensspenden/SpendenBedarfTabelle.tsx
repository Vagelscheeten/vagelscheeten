'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, UserPlus } from 'lucide-react';
import { SpendenBedarf, SpendenBedarfMitSumme } from './types';

// SpendenBedarfMitSumme wird jetzt aus SpendenView importiert

interface SpendenBedarfTabelleProps {
  bedarfe: SpendenBedarfMitSumme[];
  onEdit: (bedarf: SpendenBedarf) => void;
  onDelete: (bedarfId: string) => void;
  onManuelleZuweisung: (bedarf: SpendenBedarfMitSumme) => void;
}

export function SpendenBedarfTabelle({ bedarfe, onEdit, onDelete, onManuelleZuweisung }: SpendenBedarfTabelleProps) {
  // Funktion zum Bestimmen der Farbe des Fortschrittsbalkens
  const getProgressColor = (prozent: number) => {
    if (prozent < 50) return 'bg-red-500';
    if (prozent < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Titel</TableHead>
            <TableHead className="w-[300px]">Beschreibung</TableHead>
            <TableHead className="text-center">Benötigt</TableHead>
            <TableHead className="text-center">Zugesagt</TableHead>
            <TableHead className="w-[200px]">Fortschritt</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bedarfe.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                Keine Bedarfe vorhanden. Füge einen neuen Bedarf hinzu.
              </TableCell>
            </TableRow>
          ) : (
            bedarfe.map((bedarf) => (
              <TableRow key={bedarf.id}>
                <TableCell className="font-medium">{bedarf.titel}</TableCell>
                <TableCell>{bedarf.beschreibung || '-'}</TableCell>
                <TableCell className="text-center">{bedarf.anzahl_benoetigt}</TableCell>
                <TableCell className="text-center">{bedarf.summeRueckmeldungen}</TableCell>
                <TableCell>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${getProgressColor(bedarf.prozentAbdeckung)}`} 
                      style={{ width: `${bedarf.prozentAbdeckung}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-right mt-1">
                    {bedarf.prozentAbdeckung}%
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onManuelleZuweisung(bedarf)}
                      disabled={bedarf.summeRueckmeldungen >= bedarf.anzahl_benoetigt}
                      title={bedarf.summeRueckmeldungen >= bedarf.anzahl_benoetigt ? 'Kein weiterer Bedarf vorhanden' : 'Kind manuell zuweisen'}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onEdit(bedarf)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onDelete(bedarf.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
