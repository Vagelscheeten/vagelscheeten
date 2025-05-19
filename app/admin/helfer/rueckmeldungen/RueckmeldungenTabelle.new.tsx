'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, SortAsc, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface HelferRueckmeldung {
  id: string;
  kind_id: string;
  aufgabe_id: string;
  prioritaet: number;
  freitext: string | null;
  erstellt_am: string;
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
  aufgabe: {
    id: string;
    titel: string;
    beschreibung: string | null;
    bedarf: number;
  };
  // Für alle Helfer - wichtig: Zuteilungen anzeigen!
  zuteilungen?: {
    id: string;
    aufgabe_id: string;
    aufgabe_titel: string;
  }[];
}

interface SpringerZuteilung {
  id: string;
  kind_id: string;
  ist_springer: boolean;
  zeitfenster?: 'vormittag' | 'nachmittag' | 'beides' | null;
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
  zuteilungen?: {
    id: string;
    aufgabe_id: string;
    aufgabe_titel: string;
  }[];
}

interface RueckmeldungenTabelleProps {
  rueckmeldungen: HelferRueckmeldung[];
  springer: SpringerZuteilung[];
  aufgaben: {id: string, titel: string}[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function RueckmeldungenTabelle({ 
  rueckmeldungen, 
  springer,
  aufgaben,
  isLoading, 
  onRefresh 
}: RueckmeldungenTabelleProps) {
  useEffect(() => {
    console.log('Rueckmeldungen in Tabelle:', rueckmeldungen.length);
    console.log('Springer in Tabelle:', springer.length);
    console.log('Alle Daten:', { rueckmeldungen, springer });
  }, [rueckmeldungen, springer]);

  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('name');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRueckmeldungId, setSelectedRueckmeldungId] = useState<string>('');

  // Filter- und Sortierfunktionen
  const filteredAndSortedRueckmeldungen = React.useMemo(() => {
    // Erst filtern
    let filtered = [...rueckmeldungen];
    if (selectedFilter === 'no_assignment') {
      filtered = filtered.filter(
        (r) => !r.zuteilungen || r.zuteilungen.length === 0
      );
    } else if (selectedFilter === 'with_assignment') {
      filtered = filtered.filter(
        (r) => r.zuteilungen && r.zuteilungen.length > 0
      );
    }

    // Dann sortieren
    return filtered.sort((a, b) => {
      if (sortOption === 'name') {
        const nameA = `${a.kind?.nachname || ''}${a.kind?.vorname || ''}`;
        const nameB = `${b.kind?.nachname || ''}${b.kind?.vorname || ''}`;
        return nameA.localeCompare(nameB);
      } else if (sortOption === 'prioritaet') {
        return a.prioritaet - b.prioritaet;
      } else if (sortOption === 'aufgabe') {
        const aufgabeA = a.aufgabe?.titel || '';
        const aufgabeB = b.aufgabe?.titel || '';
        return aufgabeA.localeCompare(aufgabeB);
      }
      return 0;
    });
  }, [rueckmeldungen, selectedFilter, sortOption]);

  // Springer-Filter wird separat behandelt
  const filteredSpringer = React.useMemo(() => {
    return springer;
  }, [springer]);

  function getPriorityColor(priority: number): string {
    switch (priority) {
      case 1:
        return "bg-green-100 text-green-800";
      case 2:
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function openDeleteConfirm(id: string) {
    setSelectedRueckmeldungId(id);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteRueckmeldung() {
    if (!selectedRueckmeldungId) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('helfer_rueckmeldungen')
        .delete()
        .eq('id', selectedRueckmeldungId);

      if (error) {
        throw error;
      }

      toast.success('Rückmeldung erfolgreich gelöscht');
      onRefresh();
    } catch (error) {
      console.error('Fehler beim Löschen der Rückmeldung:', error);
      toast.error('Fehler beim Löschen der Rückmeldung');
    } finally {
      setDeleteDialogOpen(false);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Alle Helfer-Rückmeldungen</h2>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex gap-1">
                <Filter className="h-4 w-4" />
                <span>Filtern</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={selectedFilter === 'all'}
                onCheckedChange={() => setSelectedFilter('all')}
              >
                Alle Rückmeldungen
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={selectedFilter === 'no_assignment'}
                onCheckedChange={() => setSelectedFilter('no_assignment')}
              >
                Nur ohne Zuteilung
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedFilter === 'with_assignment'}
                onCheckedChange={() => setSelectedFilter('with_assignment')}
              >
                Nur mit Zuteilung
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex gap-1">
                <SortAsc className="h-4 w-4" />
                <span>Sortieren</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={sortOption === 'name'}
                onCheckedChange={() => setSortOption('name')}
              >
                Name
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortOption === 'prioritaet'}
                onCheckedChange={() => setSortOption('prioritaet')}
              >
                Priorität
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortOption === 'aufgabe'}
                onCheckedChange={() => setSortOption('aufgabe')}
              >
                Aufgabe
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Aufgabe</TableHead>
                <TableHead>Priorität/Rolle</TableHead>
                <TableHead>Freitext</TableHead>
                <TableHead>Zuteilungen</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex justify-center">
                      <div className="animate-spin h-6 w-6 border-2 border-gray-500 rounded-full border-t-transparent"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedRueckmeldungen.length === 0 && filteredSpringer.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Keine Rückmeldungen gefunden
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Alle Rückmeldungen (normale Helfer und Springer) anzeigen */}
                  {filteredAndSortedRueckmeldungen.map((rueckmeldung) => (
                    <TableRow key={rueckmeldung.id}>
                      <TableCell className="font-medium">
                        {rueckmeldung.kind.nachname || ''}, {rueckmeldung.kind.vorname || ''}
                        {rueckmeldung.kind.klasse && (
                          <span className="text-sm text-muted-foreground ml-1">
                            ({rueckmeldung.kind.klasse})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{rueckmeldung.aufgabe?.titel ?? '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rueckmeldung.prioritaet)}`}>
                          {rueckmeldung.prioritaet}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {rueckmeldung.freitext || '-'}
                      </TableCell>
                      <TableCell>
                        {/* Zuteilungen für normale Helfer anzeigen */}
                        {rueckmeldung.zuteilungen && rueckmeldung.zuteilungen.length > 0 ? (
                          <div className="space-y-1">
                            {rueckmeldung.zuteilungen.map((zuteilung) => (
                              <span 
                                key={zuteilung.id}
                                className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full block mb-1"
                              >
                                {zuteilung.aufgabe_titel}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">Keine Zuteilung</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirm(rueckmeldung.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Springer anzeigen */}
                  {filteredSpringer.map((springerItem) => (
                    <TableRow key={springerItem.id}>
                      <TableCell className="font-medium">
                        {springerItem.kind?.nachname || ''}, {springerItem.kind?.vorname || ''}
                        {springerItem.kind?.klasse && (
                          <span className="text-sm text-muted-foreground ml-1">
                            ({springerItem.kind.klasse})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="font-medium text-purple-700">Springer</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500 text-white">
                          Springer
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-purple-700">
                        {springerItem.zeitfenster ? springerItem.zeitfenster.toUpperCase() : '-'}
                      </TableCell>
                      <TableCell>
                        {springerItem.zuteilungen && springerItem.zuteilungen.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {springerItem.zuteilungen.map((zuteilung) => (
                              <span 
                                key={zuteilung.id}
                                className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                              >
                                {zuteilung.aufgabe_titel}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">Keine Zuteilung</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirm(springerItem.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Lösch-Bestätigungsdialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rückmeldung löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Willst du diese Rückmeldung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRueckmeldung} className="bg-black hover:bg-gray-800">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
