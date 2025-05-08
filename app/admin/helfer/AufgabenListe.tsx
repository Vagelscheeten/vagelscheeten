import React from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

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
  kind?: {
    vorname: string;
    nachname: string;
    klasse?: string;
  };
}

interface AufgabenListeProps {
  aufgaben: Aufgabe[];
  rueckmeldungen: Rueckmeldung[];
}

export function AufgabenListe({ aufgaben, rueckmeldungen }: AufgabenListeProps) {
  const handleDeleteRueckmeldung = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('helfer_rueckmeldungen')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Fehler beim Löschen der Rückmeldung:', error);
      toast.error('Die Rückmeldung konnte nicht gelöscht werden.');
    } else {
      toast.success('Die Rückmeldung wurde erfolgreich gelöscht.');
      // Hier würde normalerweise ein Refresh der Daten erfolgen
      // Da dies aber über den Parent-Component gesteuert wird, müsste hier
      // ein Callback aufgerufen werden
      window.location.reload();
    }
  };

  // Berechne die Anzahl der Rückmeldungen pro Aufgabe
  const getRueckmeldungenCount = (aufgabeId: string) => {
    return rueckmeldungen.filter(r => r.aufgabe_id === aufgabeId).length;
  };

  // Berechne den Deckungsgrad (in Prozent)
  const getDeckungsgrad = (aufgabeId: string, bedarf: number) => {
    const anzahl = getRueckmeldungenCount(aufgabeId);
    return Math.min(100, Math.round((anzahl / bedarf) * 100));
  };

  // Bestimme die Farbe für den Fortschrittsbalken basierend auf dem Deckungsgrad
  const getProgressBarColor = (deckungsgrad: number) => {
    if (deckungsgrad < 50) return 'bg-red-500';
    if (deckungsgrad < 100) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4">Helferaufgaben und Rückmeldungen</h3>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Aufgabe</TableHead>
                <TableHead>Bedarf</TableHead>
                <TableHead>Rückmeldungen</TableHead>
                <TableHead className="w-[200px]">Deckungsgrad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aufgaben.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    Keine Aufgaben gefunden
                  </TableCell>
                </TableRow>
              ) : (
                aufgaben.map((aufgabe) => {
                  const deckungsgrad = getDeckungsgrad(aufgabe.id, aufgabe.bedarf);
                  const barColor = getProgressBarColor(deckungsgrad);
                  
                  return (
                    <React.Fragment key={aufgabe.id}>
                      <TableRow>
                        <TableCell className="font-medium">
                          {aufgabe.titel}
                          {aufgabe.beschreibung && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {aufgabe.beschreibung}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>{aufgabe.bedarf} Helfer:innen</TableCell>
                        <TableCell>
                          {getRueckmeldungenCount(aufgabe.id)} Rückmeldungen
                        </TableCell>
                        <TableCell>
                          <div className="w-full bg-muted rounded-full h-2.5 mb-1">
                            <div 
                              className={`h-2.5 rounded-full ${barColor}`} 
                              style={{ width: `${deckungsgrad}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {deckungsgrad}% abgedeckt
                          </span>
                        </TableCell>
                      </TableRow>
                      
                      {/* Rückmeldungen für diese Aufgabe anzeigen */}
                      {rueckmeldungen
                        .filter(r => r.aufgabe_id === aufgabe.id)
                        .map(rueckmeldung => (
                          <TableRow key={rueckmeldung.id} className="bg-muted/30">
                            <TableCell colSpan={2} className="pl-8">
                              <div className="flex items-center">
                                <span className="font-medium">
                                  {rueckmeldung.kind ? 
                                    `${rueckmeldung.kind.nachname}, ${rueckmeldung.kind.vorname}` + 
                                    (rueckmeldung.kind.klasse ? ` (${rueckmeldung.kind.klasse})` : '') :
                                    'Unbekanntes Kind'}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className="ml-2"
                                >
                                  Priorität {rueckmeldung.prioritaet}
                                </Badge>
                              </div>
                              {rueckmeldung.freitext && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {rueckmeldung.freitext}
                                </p>
                              )}
                            </TableCell>
                            <TableCell colSpan={1}></TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteRueckmeldung(rueckmeldung.id)}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      }
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
