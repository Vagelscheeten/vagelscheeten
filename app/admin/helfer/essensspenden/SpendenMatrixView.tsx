'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Search, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SpendenBedarf, SpendenRueckmeldung, SpendenMatrixItem } from './types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SpendenMatrixView() {
  const [matrixData, setMatrixData] = useState<SpendenMatrixItem[]>([]);
  const [alleSpendenBedarfe, setAlleSpendenBedarfe] = useState<SpendenBedarf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [klassenFilter, setKlassenFilter] = useState<string>('all');
  const [klassen, setKlassen] = useState<string[]>([]);

  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      
      try {
        // Alle Spenden-Bedarfe laden
        const { data: bedarfeData, error: bedarfeError } = await supabase
          .from('essensspenden_bedarf')
          .select('*')
          .order('titel');
        
        if (bedarfeError) throw bedarfeError;
        setAlleSpendenBedarfe(bedarfeData || []);
        
        // Alle Rückmeldungen laden
        const { data: rueckmeldungenData, error: rueckmeldungenError } = await supabase
          .from('essensspenden_rueckmeldungen')
          .select(`
            *,
            spende:spende_id(id, titel, beschreibung, anzahl_benoetigt)
          `)
          .order('erstellt_am', { ascending: false });
        
        if (rueckmeldungenError) throw rueckmeldungenError;
        
        // Matrix-Daten erstellen
        const matrixMap = new Map<string, SpendenMatrixItem>();
        const klassenSet = new Set<string>();
        
        // Für jede Rückmeldung
        rueckmeldungenData?.forEach(rueckmeldung => {
          const kindIdentifier = rueckmeldung.kind_identifier;
          
          // Klasse aus dem Kind-Identifier extrahieren
          const klasseMatch = kindIdentifier.match(/\(([^)]+)\)/);
          const klasse = klasseMatch ? klasseMatch[1] : 'Unbekannt';
          klassenSet.add(klasse);
          
          if (!matrixMap.has(kindIdentifier)) {
            matrixMap.set(kindIdentifier, {
              kind_identifier: kindIdentifier,
              spenden: {}
            });
          }
          
          const kindData = matrixMap.get(kindIdentifier)!;
          
          if (rueckmeldung.spende?.id) {
            kindData.spenden[rueckmeldung.spende.id] = {
              zugewiesen: true,
              gewuenscht: false,
              titel: rueckmeldung.spende.titel
            };
          }
        });
        
        // In Array umwandeln und sortieren
        const matrixArray = Array.from(matrixMap.values());
        matrixArray.sort((a, b) => a.kind_identifier.localeCompare(b.kind_identifier));
        
        setMatrixData(matrixArray);
        setKlassen(Array.from(klassenSet).sort());
      } catch (error: any) {
        console.error('Fehler beim Laden der Daten:', error);
        toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Gefilterte Daten basierend auf Suche und Klassenfilter
  const filteredData = useMemo(() => {
    let filtered = matrixData;
    
    // Suche anwenden
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.kind_identifier.toLowerCase().includes(query)
      );
    }
    
    // Klassenfilter anwenden
    if (klassenFilter !== 'all') {
      filtered = filtered.filter(item => {
        const klasseMatch = item.kind_identifier.match(/\(([^)]+)\)/);
        const klasse = klasseMatch ? klasseMatch[1] : 'Unbekannt';
        return klasse === klassenFilter;
      });
    }
    
    return filtered;
  }, [matrixData, searchQuery, klassenFilter]);

  // CSV-Export der Matrix
  const exportToCSV = () => {
    try {
      // CSV-Header erstellen
      const header = ['Kind', ...alleSpendenBedarfe.map(bedarf => bedarf.titel)];
      
      // CSV-Zeilen erstellen
      const rows = filteredData.map(item => {
        const row = [item.kind_identifier];
        
        alleSpendenBedarfe.forEach(bedarf => {
          const zuweisung = item.spenden[bedarf.id];
          row.push(zuweisung?.zugewiesen ? 'X' : '');
        });
        
        return row;
      });
      
      // CSV-Inhalt zusammenführen
      const csvContent = [
        header.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // CSV-Datei erstellen und herunterladen
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'essensspenden-matrix.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Matrix erfolgreich exportiert');
    } catch (error: any) {
      console.error('Fehler beim Exportieren:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Spenden-Matrix</h2>
        
        <div className="flex items-center space-x-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nach Kind suchen..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select 
            value={klassenFilter} 
            onValueChange={setKlassenFilter}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Klasse auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Klassen</SelectItem>
              {klassen.map(klasse => (
                <SelectItem key={klasse} value={klasse}>
                  {klasse}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={exportToCSV}
            disabled={isLoading || filteredData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" /> CSV Export
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Lade Daten...
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center p-10 border rounded-md">
          <p className="text-lg text-gray-500">Keine Daten gefunden</p>
          <p className="text-sm text-gray-400 mt-2">
            {searchQuery || klassenFilter !== 'all' 
              ? 'Versuchen Sie, die Filter anzupassen.' 
              : 'Es wurden noch keine Essensspenden zugewiesen.'}
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-white z-10">Kind</TableHead>
                {alleSpendenBedarfe.map(bedarf => (
                  <TableHead key={bedarf.id} className="text-center whitespace-nowrap px-2">
                    {bedarf.titel}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map(item => (
                <TableRow key={item.kind_identifier}>
                  <TableCell className="font-medium sticky left-0 bg-white z-10">
                    {item.kind_identifier}
                  </TableCell>
                  {alleSpendenBedarfe.map(bedarf => {
                    const zuweisung = item.spenden[bedarf.id];
                    return (
                      <TableCell 
                        key={`${item.kind_identifier}-${bedarf.id}`} 
                        className="text-center"
                      >
                        {zuweisung?.zugewiesen ? '✅' : ''}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
