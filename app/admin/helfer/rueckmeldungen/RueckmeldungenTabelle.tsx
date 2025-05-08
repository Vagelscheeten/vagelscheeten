import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Trash2, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
}

interface RueckmeldungenTabelleProps {
  rueckmeldungen: HelferRueckmeldung[];
  aufgaben: {id: string, titel: string}[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function RueckmeldungenTabelle({ 
  rueckmeldungen, 
  aufgaben,
  isLoading, 
  onRefresh 
}: RueckmeldungenTabelleProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('name');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Filter und Sortierung anwenden
  const filteredAndSortedRueckmeldungen = useMemo(() => {
    let result = [...rueckmeldungen];
    
    // Filter anwenden
    if (selectedFilter !== 'all') {
      result = result.filter(r => r.aufgabe_id === selectedFilter);
    }
    
    // Sortierung anwenden
    result.sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return `${a.kind.nachname} ${a.kind.vorname}`.localeCompare(`${b.kind.nachname} ${b.kind.vorname}`);
        case 'prioritaet':
          return a.prioritaet - b.prioritaet;
        case 'aufgabe':
          return a.aufgabe.titel.localeCompare(b.aufgabe.titel);
        default:
          return 0;
      }
    });
    
    return result;
  }, [rueckmeldungen, selectedFilter, sortOption]);

  const handleDeleteRueckmeldung = async () => {
    if (!itemToDelete) return;
    
    const supabase = createClient();
    const { error } = await supabase
      .from('helfer_rueckmeldungen')
      .delete()
      .eq('id', itemToDelete);
    
    if (error) {
      console.error('Fehler beim Löschen der Rückmeldung:', error);
      toast.error('Die Rückmeldung konnte nicht gelöscht werden.');
    } else {
      toast.success('Die Rückmeldung wurde erfolgreich gelöscht.');
      onRefresh();
    }
    
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const openDeleteConfirm = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Hilfsfunktion für die Prioritäts-Farbe
  const getPriorityColor = (prioritaet: number) => {
    switch (prioritaet) {
      case 1: return 'bg-green-500 text-white';
      case 2: return 'bg-yellow-500 text-white';
      case 3: return 'bg-red-500 text-white';
      default: return 'bg-gray-200 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Alle Helfer-Rückmeldungen</h3>
            
            <div className="flex gap-2">
              {/* Filter-Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtern
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Nach Aufgabe filtern</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={selectedFilter} onValueChange={setSelectedFilter}>
                    <DropdownMenuRadioItem value="all">Alle Aufgaben</DropdownMenuRadioItem>
                    {aufgaben.map(aufgabe => (
                      <DropdownMenuRadioItem key={aufgabe.id} value={aufgabe.id}>
                        {aufgabe.titel}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Sortier-Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Sortieren
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={sortOption} onValueChange={setSortOption}>
                    <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="prioritaet">Priorität</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="aufgabe">Aufgabe</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Kind</TableHead>
                <TableHead>Aufgabe</TableHead>
                <TableHead>Priorität</TableHead>
                <TableHead>Freitext</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <div className="flex justify-center">
                      <div className="animate-spin h-6 w-6 border-2 border-gray-500 rounded-full border-t-transparent"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedRueckmeldungen.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Keine Rückmeldungen gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedRueckmeldungen.map((rueckmeldung) => (
                  <TableRow key={rueckmeldung.id}>
                    <TableCell className="font-medium">
                      {rueckmeldung.kind.nachname}, {rueckmeldung.kind.vorname}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteConfirm(rueckmeldung.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
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
            <AlertDialogAction onClick={handleDeleteRueckmeldung} className="bg-red-500 hover:bg-red-600">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
