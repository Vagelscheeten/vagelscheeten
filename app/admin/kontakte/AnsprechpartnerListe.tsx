'use client';

import React from 'react';
import { Ansprechpartner } from '@/types/ansprechpartner';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AnsprechpartnerListeProps {
  ansprechpartner: Ansprechpartner[];
  isLoading: boolean;
  onEdit: (ansprechpartner: Ansprechpartner) => void;
  onDelete: (id: string) => void;
}

export function AnsprechpartnerListe({ ansprechpartner, isLoading, onEdit, onDelete }: AnsprechpartnerListeProps) {
  // Gruppiere Ansprechpartner nach Bereich
  const gruppiertNachBereich = ansprechpartner.reduce((acc, person) => {
    if (!acc[person.bereich]) {
      acc[person.bereich] = [];
    }
    acc[person.bereich].push(person);
    return acc;
  }, {} as Record<string, Ansprechpartner[]>);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Laden...
      </div>
    );
  }

  if (ansprechpartner.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keine Ansprechpartner</CardTitle>
          <CardDescription>
            Es wurden noch keine Ansprechpartner angelegt. Bitte füge welche hinzu.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(gruppiertNachBereich).map(([bereich, personen]) => (
        <Card key={bereich}>
          <CardHeader>
            <CardTitle>{bereich}</CardTitle>
            <CardDescription>
              {personen.length} Ansprechpartner
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Telefonnummer</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personen.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>{person.telefonnummer || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(person)}
                        className="mr-1"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(person.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
