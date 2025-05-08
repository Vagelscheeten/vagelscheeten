'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Edit, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SpendenBedarf, SpendenRueckmeldung, KindMitSpenden } from './types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SpendenKindZuweisungModal } from './SpendenKindZuweisungModal';

export function SpendenNachKindView() {
  const [kinderMitSpenden, setKinderMitSpenden] = useState<KindMitSpenden[]>([]);
  const [alleSpendenBedarfe, setAlleSpendenBedarfe] = useState<SpendenBedarf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKind, setSelectedKind] = useState<KindMitSpenden | null>(null);
  const [isZuweisungModalOpen, setIsZuweisungModalOpen] = useState(false);

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
        
        // Gruppieren nach Kind
        const kinderMap = new Map<string, KindMitSpenden>();
        
        rueckmeldungenData?.forEach(rueckmeldung => {
          const kindIdentifier = rueckmeldung.kind_identifier;
          
          if (!kinderMap.has(kindIdentifier)) {
            kinderMap.set(kindIdentifier, {
              kind_identifier: kindIdentifier,
              wuensche: [],
              zugewiesen: [],
              anzahl: 0,
              rueckmeldungen: []
            });
          }
          
          const kindData = kinderMap.get(kindIdentifier)!;
          
          if (rueckmeldung.spende?.titel) {
            kindData.zugewiesen.push(rueckmeldung.spende.titel);
            kindData.anzahl += 1;
          }
          
          kindData.rueckmeldungen.push(rueckmeldung);
        });
        
        // In Array umwandeln und sortieren
        const kinderArray = Array.from(kinderMap.values());
        kinderArray.sort((a, b) => a.kind_identifier.localeCompare(b.kind_identifier));
        
        setKinderMitSpenden(kinderArray);
      } catch (error: any) {
        console.error('Fehler beim Laden der Daten:', error);
        toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [refreshTrigger]);

  // Gefilterte Kinder basierend auf der Suche
  const filteredKinder = useMemo(() => {
    if (!searchQuery.trim()) return kinderMitSpenden;
    
    const query = searchQuery.toLowerCase();
    return kinderMitSpenden.filter(kind => 
      kind.kind_identifier.toLowerCase().includes(query) ||
      kind.zugewiesen.some(spende => spende.toLowerCase().includes(query))
    );
  }, [kinderMitSpenden, searchQuery]);

  // Callback nach Änderungen
  const handleChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Kind zur Bearbeitung auswählen
  const handleEditKind = (kind: KindMitSpenden) => {
    setSelectedKind(kind);
    setIsZuweisungModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Essensspenden nach Kind</h2>
        
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nach Kind oder Spende suchen..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Lade Daten...
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Kind</TableHead>
                <TableHead className="w-[250px]">Zugewiesen</TableHead>
                <TableHead className="w-[80px] text-center">Anzahl</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKinder.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    {searchQuery ? 'Keine Ergebnisse für die Suche gefunden.' : 'Keine Kinder mit Essensspenden gefunden.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredKinder.map((kind) => (
                  <TableRow key={kind.kind_identifier} className={kind.anzahl > 1 ? "bg-amber-50" : ""}>
                    <TableCell className="font-medium">{kind.kind_identifier}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {kind.zugewiesen.map((spende, index) => (
                          <Badge 
                            key={`${kind.kind_identifier}-${spende}-${index}`}
                            variant="outline"
                            className="bg-white"
                          >
                            ✅ {spende}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={kind.anzahl > 1 ? "destructive" : "outline"}
                        className="flex items-center justify-center"
                      >
                        {kind.anzahl}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditKind(kind)}
                      >
                        <Edit className="h-4 w-4 mr-2" /> Bearbeiten
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {isZuweisungModalOpen && selectedKind && (
        <SpendenKindZuweisungModal
          open={isZuweisungModalOpen}
          onClose={() => {
            setIsZuweisungModalOpen(false);
            setSelectedKind(null);
          }}
          kind={selectedKind}
          alleSpendenBedarfe={alleSpendenBedarfe}
          onSave={handleChange}
        />
      )}
    </div>
  );
}
