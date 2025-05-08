'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Filter, AlertCircle } from 'lucide-react';
import { SpendenRueckmeldung } from './types';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SpendenRueckmeldungenTabelleProps {
  rueckmeldungen: SpendenRueckmeldung[];
  onDelete: (rueckmeldungId: string) => void;
}

export function SpendenRueckmeldungenTabelle({ 
  rueckmeldungen, 
  onDelete 
}: SpendenRueckmeldungenTabelleProps) {
  const [spendeFilter, setSpendeFilter] = useState<string>('alle');
  
  // Eindeutige Spenden für Filter extrahieren
  const uniqueSpenden = Array.from(
    new Set(rueckmeldungen.map(r => r.spende?.id || ''))
  ).filter(id => id !== '');
  
  // Spendennamen für Filter
  const spendenNamen = new Map<string, string>();
  rueckmeldungen.forEach(r => {
    if (r.spende?.id && r.spende?.titel) {
      spendenNamen.set(r.spende.id, r.spende.titel);
    }
  });
  
  // Gefilterte Rückmeldungen
  const filteredRueckmeldungen = spendeFilter === 'alle'
    ? rueckmeldungen
    : rueckmeldungen.filter(r => r.spende?.id === spendeFilter);
    
  // Zähle die Anzahl der Spenden pro Person
  const spendenProPerson = useMemo(() => {
    const counter = new Map<string, number>();
    const spendenListe = new Map<string, string[]>();
    
    rueckmeldungen.forEach(r => {
      const count = counter.get(r.kind_identifier) || 0;
      counter.set(r.kind_identifier, count + 1);
      
      const spenden = spendenListe.get(r.kind_identifier) || [];
      if (r.spende?.titel) {
        spenden.push(r.spende.titel);
        spendenListe.set(r.kind_identifier, spenden);
      }
    });
    
    return { counter, spendenListe };
  }, [rueckmeldungen]);
  
  // Formatiere Datum
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4" />
        <span>Filtern nach Spendenart:</span>
        <Select value={spendeFilter} onValueChange={setSpendeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Alle Spenden" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Spenden</SelectItem>
            {uniqueSpenden.map(id => (
              <SelectItem key={id} value={id}>
                {spendenNamen.get(id) || 'Unbekannte Spende'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Kind</TableHead>
              <TableHead className="w-[200px]">Spendenart</TableHead>
              <TableHead className="text-center">Menge</TableHead>
              <TableHead>Anmerkungen</TableHead>
              <TableHead className="w-[120px]">Anzahl Spenden</TableHead>
              <TableHead className="w-[180px]">Datum</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRueckmeldungen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Keine Rückmeldungen vorhanden.
                </TableCell>
              </TableRow>
            ) : (
              filteredRueckmeldungen.map((rueckmeldung) => (
                <TableRow 
                  key={rueckmeldung.id}
                  className={spendenProPerson.counter.get(rueckmeldung.kind_identifier) && spendenProPerson.counter.get(rueckmeldung.kind_identifier)! > 1 ? "bg-amber-50" : ""}
                >
                  <TableCell className="font-medium">{rueckmeldung.kind_identifier}</TableCell>
                  <TableCell>{rueckmeldung.spende?.titel || 'Unbekannte Spende'}</TableCell>
                  <TableCell className="text-center">{rueckmeldung.menge}</TableCell>
                  <TableCell>{rueckmeldung.freitext || '-'}</TableCell>
                  <TableCell>
                    {spendenProPerson.counter.get(rueckmeldung.kind_identifier) && (
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={spendenProPerson.counter.get(rueckmeldung.kind_identifier)! > 1 ? "destructive" : "outline"}
                          className="flex items-center gap-1"
                        >
                          {spendenProPerson.counter.get(rueckmeldung.kind_identifier)! > 1 && (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {spendenProPerson.counter.get(rueckmeldung.kind_identifier)}
                        </Badge>
                        {spendenProPerson.counter.get(rueckmeldung.kind_identifier)! > 1 && (
                          <div className="text-xs text-gray-500 hidden md:block">
                            {spendenProPerson.spendenListe.get(rueckmeldung.kind_identifier)?.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(rueckmeldung.erstellt_am)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onDelete(rueckmeldung.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
