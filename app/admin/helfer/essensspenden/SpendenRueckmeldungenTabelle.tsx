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
import { Trash2, Filter } from 'lucide-react';
import { SpendenRueckmeldung } from './types';
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

interface GruppierteSpende {
  kind_identifier: string;
  spenden: { id: string; titel: string; menge: number }[];
  ids: string[];
  datum: string;
}

export function SpendenRueckmeldungenTabelle({
  rueckmeldungen,
  onDelete
}: SpendenRueckmeldungenTabelleProps) {
  const [spendeFilter, setSpendeFilter] = useState<string>('alle');

  // Eindeutige Spenden für Filter
  const spendenNamen = useMemo(() => {
    const map = new Map<string, string>();
    rueckmeldungen.forEach(r => {
      if (r.spende?.id && r.spende?.titel) map.set(r.spende.id, r.spende.titel);
    });
    return map;
  }, [rueckmeldungen]);

  // Gefilterte Rückmeldungen
  const filtered = spendeFilter === 'alle'
    ? rueckmeldungen
    : rueckmeldungen.filter(r => r.spende?.id === spendeFilter);

  // Pro Kind gruppieren
  const gruppiert = useMemo(() => {
    const map = new Map<string, GruppierteSpende>();

    filtered.forEach(r => {
      const key = r.kind_identifier;
      if (!map.has(key)) {
        map.set(key, {
          kind_identifier: key,
          spenden: [],
          ids: [],
          datum: r.erstellt_am,
        });
      }
      const group = map.get(key)!;
      group.ids.push(r.id);
      if (r.spende?.titel) {
        group.spenden.push({ id: r.spende.id, titel: r.spende.titel, menge: r.menge });
      }
    });

    return Array.from(map.values());
  }, [filtered]);

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
            {Array.from(spendenNamen.entries()).map(([id, titel]) => (
              <SelectItem key={id} value={id}>{titel}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Kind</TableHead>
              <TableHead>Spendenart</TableHead>
              <TableHead className="w-[180px]">Datum</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gruppiert.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Keine Rückmeldungen vorhanden.
                </TableCell>
              </TableRow>
            ) : (
              gruppiert.map((g) => (
                <TableRow key={g.kind_identifier}>
                  <TableCell className="font-medium">{g.kind_identifier}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {g.spenden.map((s, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          {s.titel}{s.menge > 1 ? ` ×${s.menge}` : ''}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(g.datum)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => g.ids.forEach(id => onDelete(id))}
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
