import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
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
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, ChevronDown, ChevronUp, Clock, Filter } from 'lucide-react';
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

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
  zeitfenster: string;
  rueckmeldungen_count?: number;
}

interface AufgabenListeProps {
  aufgaben: Aufgabe[];
  rueckmeldungen: { aufgabe_id: string }[];
  onEdit: (aufgabe: Aufgabe) => void;
  onRefresh: () => void;
}

export function AufgabenListe({ 
  aufgaben, 
  rueckmeldungen,
  onEdit,
  onRefresh
}: AufgabenListeProps) {
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [aufgabeToDelete, setAufgabeToDelete] = useState<Aufgabe | null>(null);
  const [isDeletingWithRueckmeldungen, setIsDeletingWithRueckmeldungen] = useState(false);
  const [zeitfensterFilter, setZeitfensterFilter] = useState<string | null>(null);

  // Anzahl der Rückmeldungen pro Aufgabe berechnen
  const getRueckmeldungenCount = (aufgabeId: string) => {
    return rueckmeldungen.filter(r => r.aufgabe_id === aufgabeId).length;
  };
  
  // Zeitfenster formatieren
  const formatZeitfenster = (zeitfenster: string) => {
    switch (zeitfenster) {
      case 'vormittag': return 'Vormittag';
      case 'nachmittag': return 'Nachmittag';
      case 'beides': return 'Ganztägig';
      default: return zeitfenster;
    }
  };
  
  // Zeitfenster-Badge-Farbe bestimmen
  const getZeitfensterBadgeClass = (zeitfenster: string) => {
    switch (zeitfenster) {
      case 'vormittag': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'nachmittag': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'beides': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const toggleDescription = (aufgabeId: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [aufgabeId]: !prev[aufgabeId]
    }));
  };

  const handleDeleteClick = (aufgabe: Aufgabe) => {
    const rueckmeldungenCount = getRueckmeldungenCount(aufgabe.id);
    setAufgabeToDelete(aufgabe);
    setIsDeletingWithRueckmeldungen(rueckmeldungenCount > 0);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!aufgabeToDelete) return;
    
    const supabase = createClient();
    
    try {
      // Wenn Rückmeldungen vorhanden sind, diese zuerst löschen
      if (isDeletingWithRueckmeldungen) {
        const { error: rueckmeldungenError } = await supabase
          .from('helfer_rueckmeldungen')
          .delete()
          .eq('aufgabe_id', aufgabeToDelete.id);
          
        if (rueckmeldungenError) throw rueckmeldungenError;
      }
      
      // Dann die Aufgabe löschen
      const { error } = await supabase
        .from('helferaufgaben')
        .delete()
        .eq('id', aufgabeToDelete.id);
        
      if (error) throw error;
      
      toast.success('Aufgabe wurde gelöscht');
      onRefresh();
    } catch (error: any) {
      console.error('Fehler beim Löschen:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setDeleteDialogOpen(false);
      setAufgabeToDelete(null);
    }
  };

  // Gefilterte Aufgaben basierend auf Zeitfenster
  const filteredAufgaben = zeitfensterFilter
    ? aufgaben.filter(aufgabe => aufgabe.zeitfenster === zeitfensterFilter)
    : aufgaben;
    
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Alle Helferaufgaben</h3>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Zeitfenster filtern
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Nach Zeitfenster filtern</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={zeitfensterFilter || 'all'} onValueChange={(value) => setZeitfensterFilter(value === 'all' ? null : value)}>
                  <DropdownMenuRadioItem value="all">Alle Zeitfenster</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="vormittag">Nur Vormittag</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="nachmittag">Nur Nachmittag</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="beides">Nur Ganztägig</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Titel & Beschreibung</TableHead>
                <TableHead>Bedarf</TableHead>
                <TableHead>Zeitfenster</TableHead>
                <TableHead>Rückmeldungen</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAufgaben.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Keine Aufgaben gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filteredAufgaben.map((aufgabe) => {
                  const rueckmeldungenCount = getRueckmeldungenCount(aufgabe.id);
                  const isExpanded = expandedDescriptions[aufgabe.id] || false;
                  
                  return (
                    <TableRow key={aufgabe.id}>
                      <TableCell className="align-top">
                        <div className="font-medium">{aufgabe.titel}</div>
                        {aufgabe.beschreibung && (
                          <div className="mt-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-1 text-xs text-muted-foreground"
                              onClick={() => toggleDescription(aufgabe.id)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="mr-1 h-3 w-3" />
                                  Beschreibung ausblenden
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="mr-1 h-3 w-3" />
                                  Beschreibung anzeigen
                                </>
                              )}
                            </Button>
                            {isExpanded && (
                              <p className="text-sm text-muted-foreground mt-1 pl-2 border-l-2 border-muted">
                                {aufgabe.beschreibung}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {aufgabe.bedarf} Helfer:innen
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className={getZeitfensterBadgeClass(aufgabe.zeitfenster)}>
                          <Clock className="mr-1 h-3 w-3" />
                          {formatZeitfenster(aufgabe.zeitfenster)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center">
                          <span className="font-medium">{rueckmeldungenCount}</span>
                          <span className="text-muted-foreground ml-1">/ {aufgabe.bedarf}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              rueckmeldungenCount >= aufgabe.bedarf 
                                ? 'bg-green-500' 
                                : rueckmeldungenCount > 0 
                                  ? 'bg-yellow-500' 
                                  : 'bg-red-500'
                            }`} 
                            style={{ width: `${Math.min(100, (rueckmeldungenCount / aufgabe.bedarf) * 100)}%` }}
                          ></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => onEdit(aufgabe)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteClick(aufgabe)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Lösch-Bestätigungsdialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aufgabe löschen</AlertDialogTitle>
            <AlertDialogDescription>
              {isDeletingWithRueckmeldungen ? (
                <>
                  <p className="mb-2">
                    <strong>Achtung:</strong> Für diese Aufgabe existieren bereits Rückmeldungen, 
                    die ebenfalls gelöscht werden.
                  </p>
                  <p>Bist du sicher, dass du die Aufgabe "{aufgabeToDelete?.titel}" und alle 
                  zugehörigen Rückmeldungen löschen möchtest?</p>
                </>
              ) : (
                <p>Bist du sicher, dass du die Aufgabe "{aufgabeToDelete?.titel}" löschen möchtest?</p>
              )}
              <p className="mt-2">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
