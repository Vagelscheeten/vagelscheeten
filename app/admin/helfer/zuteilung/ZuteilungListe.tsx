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
import { Trash2, CheckSquare, PlusCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { AutoZuteilungButton } from './AutoZuteilungButton';
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
import { Badge } from '@/components/ui/badge';

// Import the modal components with named exports
import { ZuteilungModal } from './ZuteilungModal';
import { ManuelleZuteilungModal } from './ManuelleZuteilungModal';

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
}

interface Rueckmeldung {
  id: string;
  kind_id: string;
  aufgabe_id: string;
  prioritaet: number;
  freitext: string | null;
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
}

interface Zuteilung {
  id: string;
  kind_id: string;
  aufgabe_id: string;
  zugewiesen_am: string;
  via_springer?: boolean;
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
  rueckmeldung?: {
    id: string;
    prioritaet: number;
    freitext: string | null;
  };
}

interface ZuteilungListeProps {
  aufgaben: Aufgabe[];
  rueckmeldungen: Rueckmeldung[];
  zuteilungen: Zuteilung[];
  onRefresh: () => void;
}

export function ZuteilungListe({ 
  aufgaben, 
  rueckmeldungen,
  zuteilungen,
  onRefresh
}: ZuteilungListeProps) {
  const [expandedAufgaben, setExpandedAufgaben] = useState<Record<string, boolean>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [zuteilungToDelete, setZuteilungToDelete] = useState<Zuteilung | null>(null);
  const [zuteilungModalOpen, setZuteilungModalOpen] = useState(false);
  const [manuelleZuteilungModalOpen, setManuelleZuteilungModalOpen] = useState(false);
  const [selectedAufgabe, setSelectedAufgabe] = useState<Aufgabe | null>(null);

  // Anzahl der Rückmeldungen pro Aufgabe berechnen
  const getRueckmeldungenCount = (aufgabeId: string) => {
    return rueckmeldungen.filter(r => r.aufgabe_id === aufgabeId).length;
  };

  // Anzahl der Zuteilungen pro Aufgabe berechnen
  const getZuteilungenCount = (aufgabeId: string) => {
    return zuteilungen.filter(z => z.aufgabe_id === aufgabeId).length;
  };
  
  // Anzahl der regulären Zuteilungen pro Aufgabe berechnen
  const getRegulareZuteilungenCount = (aufgabeId: string) => {
    return zuteilungen.filter(z => z.aufgabe_id === aufgabeId && !z.via_springer).length;
  };
  
  // Anzahl der Springer-Zuteilungen pro Aufgabe berechnen
  const getSpringerZuteilungenCount = (aufgabeId: string) => {
    return zuteilungen.filter(z => z.aufgabe_id === aufgabeId && z.via_springer).length;
  };
  
  // Fortschrittsbalken-Farbe basierend auf Belegung bestimmen
  const getProgressBarColor = (zuteilungenCount: number, bedarf: number) => {
    if (zuteilungenCount >= bedarf) return 'bg-green-500';
    if (zuteilungenCount > 0) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Zuteilungen für eine Aufgabe abrufen
  const getZuteilungenForAufgabe = (aufgabeId: string) => {
    return zuteilungen.filter(z => z.aufgabe_id === aufgabeId);
  };

  // Rückmeldung für eine Zuteilung finden
  const findRueckmeldungForZuteilung = (zuteilung: Zuteilung) => {
    return rueckmeldungen.find(r => 
      r.kind_id === zuteilung.kind_id && r.aufgabe_id === zuteilung.aufgabe_id
    );
  };

  const toggleAufgabe = (aufgabeId: string) => {
    setExpandedAufgaben(prev => ({
      ...prev,
      [aufgabeId]: !prev[aufgabeId]
    }));
  };

  const handleDeleteClick = (zuteilung: Zuteilung) => {
    setZuteilungToDelete(zuteilung);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!zuteilungToDelete) return;
    
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('helfer_zuteilungen')
        .delete()
        .eq('id', zuteilungToDelete.id);
        
      if (error) throw error;
      
      toast.success('Zuteilung wurde entfernt');
      onRefresh();
    } catch (error: any) {
      console.error('Fehler beim Löschen:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setDeleteDialogOpen(false);
      setZuteilungToDelete(null);
    }
  };

  const handleOpenZuteilungModal = (aufgabe: Aufgabe) => {
    setSelectedAufgabe(aufgabe);
    setZuteilungModalOpen(true);
  };

  const handleOpenManuelleZuteilungModal = (aufgabe: Aufgabe) => {
    setSelectedAufgabe(aufgabe);
    setManuelleZuteilungModalOpen(true);
  };

  const getPriorityBadge = (prioritaet: number | undefined) => {
    if (prioritaet === undefined) return null;
    
    let color;
    switch (prioritaet) {
      case 1:
        color = "bg-green-100 text-green-800 border-green-300";
        break;
      case 2:
        color = "bg-yellow-100 text-yellow-800 border-yellow-300";
        break;
      case 3:
        color = "bg-red-100 text-red-800 border-red-300";
        break;
      default:
        color = "bg-gray-100 text-gray-800 border-gray-300";
    }
    
    return (
      <Badge variant="outline" className={`ml-2 ${color}`}>
        Prio {prioritaet}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Helferaufgaben und Zuteilungen</h3>
            <AutoZuteilungButton 
              onComplete={onRefresh} 
              rueckmeldungen={rueckmeldungen} 
            />
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Aufgabe</TableHead>
                <TableHead>Bedarf</TableHead>
                <TableHead>Rückmeldungen</TableHead>
                <TableHead>Zuteilungen</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aufgaben.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Keine Aufgaben gefunden
                  </TableCell>
                </TableRow>
              ) : (
                aufgaben.map((aufgabe) => {
                  const rueckmeldungenCount = getRueckmeldungenCount(aufgabe.id);
                  const zuteilungenCount = getZuteilungenCount(aufgabe.id);
                  const isExpanded = expandedAufgaben[aufgabe.id] || false;
                  const aufgabenZuteilungen = getZuteilungenForAufgabe(aufgabe.id);
                  
                  return (
                    <React.Fragment key={aufgabe.id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleAufgabe(aufgabe.id)}
                      >
                        <TableCell>
                          <div className="font-medium flex items-center">
                            {isExpanded ? 
                              <ChevronUp className="mr-2 h-4 w-4" /> : 
                              <ChevronDown className="mr-2 h-4 w-4" />
                            }
                            {aufgabe.titel}
                          </div>
                        </TableCell>
                        <TableCell>{aufgabe.bedarf} Helfer:innen</TableCell>
                        <TableCell>{rueckmeldungenCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="font-medium">{zuteilungenCount}</span>
                            <span className="text-muted-foreground ml-1">/ {aufgabe.bedarf}</span>
                            
                            {/* Anzeige von regulären und Springer-Zuteilungen */}
                            {getSpringerZuteilungenCount(aufgabe.id) > 0 && (
                              <div className="flex ml-2">
                                <Badge variant="outline" className="text-xs py-0 px-1 h-5 bg-blue-50">
                                  {getRegulareZuteilungenCount(aufgabe.id)} regulär
                                </Badge>
                                <Badge variant="outline" className="text-xs py-0 px-1 h-5 bg-purple-50 ml-1">
                                  {getSpringerZuteilungenCount(aufgabe.id)} Springer
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 mt-1">
                            {/* Fortschrittsbalken für Zuteilungen */}
                            <div className="relative h-2">
                              {/* Hintergrund für den gesamten Fortschritt */}
                              <div 
                                className={`h-2 rounded-full ${getProgressBarColor(zuteilungenCount, aufgabe.bedarf)}`} 
                                style={{ width: `${Math.min(100, (zuteilungenCount / aufgabe.bedarf) * 100)}%` }}
                              ></div>
                              
                              {/* Springer-Anteil im Fortschrittsbalken */}
                              {getSpringerZuteilungenCount(aufgabe.id) > 0 && (
                                <div 
                                  className="h-2 rounded-full bg-purple-500 absolute top-0 left-0"
                                  style={{ 
                                    width: `${Math.min(
                                      100, 
                                      (getRegulareZuteilungenCount(aufgabe.id) / aufgabe.bedarf) * 100
                                    )}%` 
                                  }}
                                ></div>
                              )}
                            </div>
                          </div>
                          
                          {/* Warnhinweis bei nicht gedecktem Bedarf */}
                          {zuteilungenCount < aufgabe.bedarf && (
                            <div className="text-xs text-orange-600 mt-1 flex items-center">
                              <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-1"></span>
                              Noch {aufgabe.bedarf - zuteilungenCount} Helfer:innen benötigt
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenZuteilungModal(aufgabe);
                              }}
                            >
                              <CheckSquare className="mr-2 h-4 w-4" />
                              Zuweisen
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenManuelleZuteilungModal(aufgabe);
                              }}
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Manuell
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Zuteilungen für diese Aufgabe anzeigen */}
                      {isExpanded && aufgabenZuteilungen.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30 p-0">
                            <div className="p-4">
                              <h4 className="font-medium mb-2">Zugewiesene Helfer:innen</h4>
                              <div className="space-y-2">
                                {aufgabenZuteilungen.map(zuteilung => {
                                  const rueckmeldung = findRueckmeldungForZuteilung(zuteilung);
                                  
                                  return (
                                    <div 
                                      key={zuteilung.id} 
                                      className="flex items-center justify-between bg-white p-3 rounded-md border"
                                    >
                                      <div>
                                        <div className="font-medium flex items-center">
                                          {zuteilung.kind.nachname}, {zuteilung.kind.vorname}
                                          
                                          {/* Springer-Badge anzeigen */}
                                          {zuteilung.via_springer && (
                                            <Badge variant="outline" className="ml-2 text-xs py-0 px-1 h-5 bg-purple-50 border-purple-200">
                                              Springer
                                            </Badge>
                                          )}
                                          {zuteilung.kind.klasse && (
                                            <span className="text-muted-foreground ml-1">
                                              ({zuteilung.kind.klasse})
                                            </span>
                                          )}
                                          {rueckmeldung && getPriorityBadge(rueckmeldung.prioritaet)}
                                        </div>
                                        {rueckmeldung?.freitext && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            "{rueckmeldung.freitext}"
                                          </p>
                                        )}
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => handleDeleteClick(zuteilung)}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Keine Zuteilungen Hinweis */}
                      {isExpanded && aufgabenZuteilungen.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30">
                            <div className="p-4 text-center text-muted-foreground">
                              Noch keine Helfer:innen zugewiesen
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
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
            <AlertDialogTitle>Zuteilung entfernen</AlertDialogTitle>
            <AlertDialogDescription>
              Bist du sicher, dass du die Zuteilung von{' '}
              <strong>
                {zuteilungToDelete?.kind.nachname}, {zuteilungToDelete?.kind.vorname}
              </strong>{' '}
              entfernen möchtest?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Zuteilungs-Modal */}
      {selectedAufgabe && (
        <>
          <ZuteilungModal
            open={zuteilungModalOpen}
            onClose={() => setZuteilungModalOpen(false)}
            aufgabe={selectedAufgabe}
            rueckmeldungen={rueckmeldungen}
            zuteilungen={zuteilungen}
            onSave={onRefresh}
          />
          
          <ManuelleZuteilungModal
            open={manuelleZuteilungModalOpen}
            onClose={() => setManuelleZuteilungModalOpen(false)}
            aufgabe={selectedAufgabe}
            onSave={onRefresh}
          />
        </>
      )}
    </div>
  );
}
