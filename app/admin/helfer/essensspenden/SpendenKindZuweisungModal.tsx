'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SpendenBedarf, KindMitSpenden } from './types';

interface SpendenKindZuweisungModalProps {
  open: boolean;
  onClose: () => void;
  kind: KindMitSpenden;
  alleSpendenBedarfe: SpendenBedarf[];
  onSave: () => void;
}

export function SpendenKindZuweisungModal({
  open,
  onClose,
  kind,
  alleSpendenBedarfe,
  onSave
}: SpendenKindZuweisungModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rueckmeldungenToDelete, setRueckmeldungenToDelete] = useState<string[]>([]);

  const handleDelete = async (rueckmeldungId: string) => {
    setRueckmeldungenToDelete(prev => [...prev, rueckmeldungId]);
  };

  const handleSave = async () => {
    if (rueckmeldungenToDelete.length === 0) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      // Löschen der ausgewählten Rückmeldungen
      const { error } = await supabase
        .from('essensspenden_rueckmeldungen')
        .delete()
        .in('id', rueckmeldungenToDelete);

      if (error) throw error;

      toast.success(`${rueckmeldungenToDelete.length} Zuweisung(en) erfolgreich entfernt`);
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Fehler beim Löschen der Zuweisungen:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finde den Bedarf zu einer Rückmeldung
  const findBedarf = (spendeId: string) => {
    return alleSpendenBedarfe.find(bedarf => bedarf.id === spendeId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Essensspenden für {kind.kind_identifier}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Essensspende</TableHead>
                  <TableHead className="w-[80px] text-center">Menge</TableHead>
                  <TableHead className="w-[200px]">Anmerkung</TableHead>
                  <TableHead className="w-[80px] text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kind.rueckmeldungen.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Keine Zuweisungen gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  kind.rueckmeldungen.map((rueckmeldung) => {
                    const bedarf = findBedarf(rueckmeldung.spende_id);
                    const isMarkedForDeletion = rueckmeldungenToDelete.includes(rueckmeldung.id);

                    return (
                      <TableRow 
                        key={rueckmeldung.id}
                        className={isMarkedForDeletion ? "bg-red-50 line-through opacity-60" : ""}
                      >
                        <TableCell>
                          {bedarf?.titel || 'Unbekannte Spende'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {rueckmeldung.menge}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rueckmeldung.freitext || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {isMarkedForDeletion ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRueckmeldungenToDelete(prev => 
                                prev.filter(id => id !== rueckmeldung.id)
                              )}
                            >
                              Wiederherstellen
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(rueckmeldung.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {rueckmeldungenToDelete.length > 0 && (
            <div className="bg-red-50 p-4 rounded-md text-sm">
              <p className="font-medium text-red-800">
                Achtung: {rueckmeldungenToDelete.length} Zuweisung(en) werden gelöscht
              </p>
              <p className="text-red-600 mt-1">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            variant={rueckmeldungenToDelete.length > 0 ? "destructive" : "default"}
          >
            {isSubmitting ? 'Wird gespeichert...' : (
              rueckmeldungenToDelete.length > 0 
                ? `${rueckmeldungenToDelete.length} Zuweisung(en) löschen` 
                : 'Schließen'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
