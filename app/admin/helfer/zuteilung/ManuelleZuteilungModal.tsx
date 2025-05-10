import React, { useState, useEffect, useMemo } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
  zeitfenster?: string;
}

interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  klasse?: string;
}

interface ManuelleZuteilungModalProps {
  open: boolean;
  onClose: () => void;
  aufgabe: Aufgabe;
  onSave: () => void;
}

interface Klasse {
  klasse: string;
  count: number;
}

export function ManuelleZuteilungModal({ 
  open, 
  onClose, 
  aufgabe,
  onSave
}: ManuelleZuteilungModalProps) {
  const [selectedKindId, setSelectedKindId] = useState<string>('');
  const [selectedKlasse, setSelectedKlasse] = useState<string>('');
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Kinder und Klassen laden
  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;
      
      setIsLoading(true);
      const supabase = createClient();
      
      try {
        // Kinder laden
        const { data, error } = await supabase
          .from('kinder')
          .select('id, vorname, nachname, klasse')
          .order('nachname');
          
        if (error) throw error;
        setKinder(data || []);
        
        // Klassen extrahieren und zählen
        const klassenMap = new Map<string, number>();
        data?.forEach(kind => {
          if (kind.klasse) {
            const count = klassenMap.get(kind.klasse) || 0;
            klassenMap.set(kind.klasse, count + 1);
          }
        });
        
        // In Array umwandeln und sortieren
        const klassenArray = Array.from(klassenMap.entries()).map(([klasse, count]) => ({
          klasse,
          count
        }));
        klassenArray.sort((a, b) => a.klasse.localeCompare(b.klasse));
        
        setKlassen(klassenArray);
      } catch (error: any) {
        console.error('Fehler beim Laden der Daten:', error);
        toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [open]);
  
  // Kinder nach Klasse filtern
  const filteredKinder = useMemo(() => {
    if (!selectedKlasse || selectedKlasse === "all") return kinder;
    return kinder.filter(kind => kind.klasse === selectedKlasse);
  }, [kinder, selectedKlasse]);

  const handleSubmit = async () => {
    if (!selectedKindId) {
      toast.error('Bitte wähle ein Kind aus');
      return;
    }
    
    setIsSubmitting(true);
    const supabase = createClient();
    
    try {
      // Prüfen, ob bereits eine Zuteilung für dieses Kind und diese Aufgabe existiert
      const { data: existingZuteilung, error: checkError } = await supabase
        .from('helfer_zuteilungen')
        .select('id')
        .eq('kind_id', selectedKindId)
        .eq('aufgabe_id', aufgabe.id)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingZuteilung) {
        toast.error('Dieses Kind ist bereits für diese Aufgabe eingeteilt');
        return;
      }
      
      // Neue Zuteilung erstellen
      const { error } = await supabase
        .from('helfer_zuteilungen')
        .insert([{
          kind_id: selectedKindId,
          aufgabe_id: aufgabe.id,
          zeitfenster: aufgabe.zeitfenster || 'Nicht angegeben', // Standardwert für Zeitfenster
          via_springer: false // Standardwert für via_springer
        }]);
        
      if (error) throw error;
      
      toast.success('Helfer:in wurde erfolgreich zugewiesen');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Fehler beim Zuweisen:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Helfer:in manuell für "{aufgabe?.titel}" zuweisen
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="klasse">Klasse auswählen</Label>
            <Select 
              value={selectedKlasse} 
              onValueChange={(value) => {
                setSelectedKlasse(value);
                setSelectedKindId('');
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="klasse" className="w-full">
                <SelectValue placeholder="Klasse auswählen" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">Alle Klassen</SelectItem>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    Klassen werden geladen...
                  </SelectItem>
                ) : klassen.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    Keine Klassen gefunden
                  </SelectItem>
                ) : (
                  klassen.map(klasse => (
                    <SelectItem key={klasse.klasse} value={klasse.klasse}>
                      {klasse.klasse} ({klasse.count})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="kind">Kind auswählen</Label>
            <Select 
              value={selectedKindId} 
              onValueChange={setSelectedKindId}
              disabled={isLoading}
            >
              <SelectTrigger id="kind" className="w-full">
                <SelectValue placeholder="Kind auswählen" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    Kinder werden geladen...
                  </SelectItem>
                ) : filteredKinder.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    Keine Kinder gefunden
                  </SelectItem>
                ) : (
                  filteredKinder.map(kind => (
                    <SelectItem key={kind.id} value={kind.id}>
                      {kind.nachname}, {kind.vorname}
                      {kind.klasse && ` (${kind.klasse})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedKindId}
          >
            {isSubmitting ? 'Wird zugewiesen...' : 'Zuweisen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
