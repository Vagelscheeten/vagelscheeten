import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface AutoZuteilungButtonProps {
  onComplete: () => void;
  rueckmeldungen: any[];
}

interface ZuteilungErgebnis {
  erfolg: boolean;
  anzahlZugewiesen: number;
  anzahlRegulaeZugewiesen: number;
  anzahlSpringerZugewiesen: number;
  nichtZugewiesen: Array<{
    id: string;
    grund: string;
  }>;
  fehler?: string;
}

export function AutoZuteilungButton({ onComplete, rueckmeldungen }: AutoZuteilungButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [ergebnis, setErgebnis] = useState<ZuteilungErgebnis | null>(null);

  const handleAutoZuteilung = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/helfer/auto-zuteilung', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.fehler || 'Fehler bei der automatischen Zuteilung');
      }
      
      setErgebnis(data);
      setShowResults(true);
      
      if (data.erfolg) {
        toast.success(`${data.anzahlZugewiesen} Helfer:innen wurden automatisch zugewiesen`);
      }
    } catch (error: any) {
      console.error('Fehler bei der automatischen Zuteilung:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowResults(false);
    onComplete();
  };

  // Finde die Rückmeldung anhand der ID
  const findRueckmeldung = (id: string) => {
    return rueckmeldungen.find(r => r.id === id);
  };
  
  // Finde die Aufgabe anhand der ID
  const findAufgabe = (id: string) => {
    // Suche in allen Rückmeldungen nach der passenden Aufgabe
    for (const r of rueckmeldungen) {
      if (r.helferaufgaben && r.helferaufgaben[0] && r.aufgabe_id === id) {
        return r.helferaufgaben[0];
      }
    }
    return null;
  };

  return (
    <>
      <Button 
        onClick={handleAutoZuteilung} 
        disabled={isLoading}
        className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Zuteilung läuft...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Automatische Erstverteilung starten
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle>Ergebnis der automatischen Zuteilung</DialogTitle>
            <DialogDescription>
              {ergebnis?.erfolg ? (
                <div className="space-y-1 mt-1">
                  <p>
                    Es wurden insgesamt <strong>{ergebnis.anzahlZugewiesen}</strong> Helfer:innen automatisch zugewiesen.
                  </p>
                  <div className="flex flex-col text-xs space-y-1">
                    <div className="flex items-center">
                      <span className="w-32">Reguläre Zuteilungen:</span>
                      <Badge variant="outline" className="ml-2 bg-blue-50">
                        {ergebnis.anzahlRegulaeZugewiesen}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      <span className="w-32">Springer-Zuteilungen:</span>
                      <Badge variant="outline" className="ml-2 bg-purple-50">
                        {ergebnis.anzahlSpringerZugewiesen}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                'Die automatische Zuteilung konnte nicht durchgeführt werden.'
              )}
            </DialogDescription>
          </DialogHeader>

          {ergebnis?.nichtZugewiesen && ergebnis.nichtZugewiesen.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <h3 className="font-medium text-base mb-1">Nicht zugewiesene Rückmeldungen</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Die folgenden Rückmeldungen konnten nicht automatisch zugewiesen werden.
              </p>
              
              <div className="border rounded-md overflow-hidden flex-1 flex flex-col">
                <div className="overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-2 px-2 text-xs">Kind</TableHead>
                        <TableHead className="py-2 px-2 text-xs">Aufgabe</TableHead>
                        <TableHead className="py-2 px-2 text-xs">Priorität</TableHead>
                        <TableHead className="py-2 px-2 text-xs">Grund</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ergebnis.nichtZugewiesen.map((nz) => {
                        const rueckmeldung = findRueckmeldung(nz.id);
                        if (!rueckmeldung) return null;
                        
                        // Finde die Aufgabe für diese Rückmeldung
                        const aufgabe = findAufgabe(rueckmeldung.aufgabe_id);
                        
                        return (
                          <TableRow key={nz.id}>
                            <TableCell className="py-1 px-2 text-xs">
                              {rueckmeldung.kind?.vorname} {rueckmeldung.kind?.nachname}
                              {rueckmeldung.kind?.klasse && (
                                <span className="ml-1 text-muted-foreground text-xs">
                                  ({rueckmeldung.kind.klasse})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-1 px-2 text-xs">
                              {aufgabe ? aufgabe.titel : 'Unbekannte Aufgabe'}
                            </TableCell>
                            <TableCell className="py-1 px-2 text-xs">
                              <Badge variant="outline" className="text-xs py-0 px-1 h-5">
                                {rueckmeldung.prioritaet || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1 px-2 text-xs">
                              <span className="text-red-500">{nz.grund}</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 pt-2 border-t">
            <DialogClose asChild>
              <Button onClick={handleClose}>
                Schließen und Ergebnisse anzeigen
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


