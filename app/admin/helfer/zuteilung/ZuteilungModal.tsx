import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
}

interface ZuteilungModalProps {
  open: boolean;
  onClose: () => void;
  aufgabe: Aufgabe;
  rueckmeldungen: Rueckmeldung[];
  zuteilungen: Zuteilung[];
  onSave: () => void;
}

export function ZuteilungModal({ 
  open, 
  onClose, 
  aufgabe,
  rueckmeldungen,
  zuteilungen,
  onSave
}: ZuteilungModalProps) {
  const [selectedRueckmeldungen, setSelectedRueckmeldungen] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredRueckmeldungen, setFilteredRueckmeldungen] = useState<Rueckmeldung[]>([]);

  // Rueckmeldungen für diese Aufgabe filtern und nach Priorität sortieren
  useEffect(() => {
    if (aufgabe) {
      // Bestehende Zuteilungen für diese Aufgabe finden
      const existingZuteilungen = zuteilungen.filter(z => z.aufgabe_id === aufgabe.id);
      const existingKindIds = existingZuteilungen.map(z => z.kind_id);
      
      // Rueckmeldungen filtern: nur für diese Aufgabe und noch nicht zugeteilt
      const relevantRueckmeldungen = rueckmeldungen.filter(r => 
        r.aufgabe_id === aufgabe.id && !existingKindIds.includes(r.kind_id)
      );
      
      // Nach Priorität sortieren (1, 2, 3)
      const sortedRueckmeldungen = [...relevantRueckmeldungen].sort((a, b) => 
        a.prioritaet - b.prioritaet
      );
      
      setFilteredRueckmeldungen(sortedRueckmeldungen);
      setSelectedRueckmeldungen([]);
    }
  }, [aufgabe, rueckmeldungen, zuteilungen, open]);

  const handleSubmit = async () => {
    if (selectedRueckmeldungen.length === 0) {
      toast.error('Bitte wähle mindestens eine Rückmeldung aus');
      return;
    }
    
    setIsSubmitting(true);
    const supabase = createClient();
    
    try {
      // Ausgewählte Rückmeldungen in Zuteilungen umwandeln
      const zuteilungenToInsert = selectedRueckmeldungen.map(rueckmeldungId => {
        const rueckmeldung = filteredRueckmeldungen.find(r => r.id === rueckmeldungId);
        if (!rueckmeldung) return null;
        
        return {
          kind_id: rueckmeldung.kind_id,
          aufgabe_id: aufgabe.id
        };
      }).filter(Boolean);
      
      if (zuteilungenToInsert.length > 0) {
        const { error } = await supabase
          .from('helfer_zuteilung')
          .insert(zuteilungenToInsert);
          
        if (error) throw error;
        
        toast.success(`${zuteilungenToInsert.length} Helfer:innen wurden zugewiesen`);
        onSave();
        onClose();
      }
    } catch (error: any) {
      console.error('Fehler beim Zuweisen:', error);
      
      // Prüfen, ob es sich um einen Unique-Constraint-Fehler handelt
      if (error.code === '23505') {
        toast.error('Einige Helfer:innen konnten nicht zugewiesen werden, da sie bereits für diese Aufgabe eingeteilt sind.');
      } else {
        toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRueckmeldung = (id: string) => {
    setSelectedRueckmeldungen(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const getPriorityBadge = (prioritaet: number) => {
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

  const selectAllByPriority = (priority: number) => {
    const rueckmeldungenWithPriority = filteredRueckmeldungen
      .filter(r => r.prioritaet === priority)
      .map(r => r.id);
    
    setSelectedRueckmeldungen(prev => {
      const newSelection = [...prev];
      
      rueckmeldungenWithPriority.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      
      return newSelection;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Helfer:innen für "{aufgabe?.titel}" zuweisen
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm font-medium">Bedarf: {aufgabe?.bedarf} Helfer:innen</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => selectAllByPriority(1)}
              >
                Alle Prio 1 auswählen
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => selectAllByPriority(2)}
              >
                Alle Prio 2 auswählen
              </Button>
            </div>
          </div>
          
          {filteredRueckmeldungen.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine verfügbaren Rückmeldungen für diese Aufgabe
            </div>
          ) : (
            <ScrollArea className="h-[300px] border rounded-md p-4">
              <div className="space-y-3">
                {filteredRueckmeldungen.map(rueckmeldung => (
                  <div 
                    key={rueckmeldung.id} 
                    className="flex items-start p-3 border rounded-md hover:bg-muted/30"
                  >
                    <Checkbox 
                      id={rueckmeldung.id}
                      checked={selectedRueckmeldungen.includes(rueckmeldung.id)}
                      onCheckedChange={() => toggleRueckmeldung(rueckmeldung.id)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor={rueckmeldung.id}
                        className="flex items-center font-medium cursor-pointer"
                      >
                        {rueckmeldung.kind.nachname}, {rueckmeldung.kind.vorname}
                        {rueckmeldung.kind.klasse && (
                          <span className="text-muted-foreground ml-1">
                            ({rueckmeldung.kind.klasse})
                          </span>
                        )}
                        {getPriorityBadge(rueckmeldung.prioritaet)}
                      </label>
                      {rueckmeldung.freitext && (
                        <p className="text-sm text-muted-foreground mt-1">
                          "{rueckmeldung.freitext}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        
        <DialogFooter className="mt-6">
          <div className="flex items-center mr-auto">
            <span className="text-sm">
              {selectedRueckmeldungen.length} von {filteredRueckmeldungen.length} ausgewählt
            </span>
          </div>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSubmitting || selectedRueckmeldungen.length === 0}
          >
            {isSubmitting ? 'Wird zugewiesen...' : 'Zuweisen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
