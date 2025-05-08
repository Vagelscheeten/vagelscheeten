import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { SpendenBedarf } from './SpendenView';

interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  klasse?: string;
}

interface ManuelleEssensspendeZuweisungModalProps {
  open: boolean;
  onClose: () => void;
  bedarf: SpendenBedarf;
  onSave: () => void;
  verfuegbareMenge: number;
}

interface Klasse {
  klasse: string;
  count: number;
}

export function ManuelleEssensspendeZuweisungModal({ 
  open, 
  onClose, 
  bedarf,
  onSave,
  verfuegbareMenge
}: ManuelleEssensspendeZuweisungModalProps) {
  const [selectedKindId, setSelectedKindId] = useState<string>('');
  const [selectedKlasse, setSelectedKlasse] = useState<string>('');
  const [menge, setMenge] = useState<number>(1);
  const [freitext, setFreitext] = useState<string>('');
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zugewieseneKinder, setZugewieseneKinder] = useState<string[]>([]);

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

        // Bereits zugewiesene Kinder laden
        const { data: rueckmeldungen, error: rueckmeldungenError } = await supabase
          .from('essensspenden_rueckmeldungen')
          .select('kind_identifier')
          .eq('spende_id', bedarf.id);

        if (rueckmeldungenError) throw rueckmeldungenError;
        
        // Kind-Identifier extrahieren
        const zugewieseneIdentifier = rueckmeldungen?.map(r => r.kind_identifier) || [];
        setZugewieseneKinder(zugewieseneIdentifier);
      } catch (error: any) {
        console.error('Fehler beim Laden der Daten:', error);
        toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [open, bedarf.id]);
  
  // Kinder nach Klasse filtern
  const filteredKinder = useMemo(() => {
    if (!selectedKlasse || selectedKlasse === "all") return kinder;
    return kinder.filter(kind => kind.klasse === selectedKlasse);
  }, [kinder, selectedKlasse]);

  // Prüfen, ob ein Kind bereits zugewiesen ist
  const isKindBereitsZugewiesen = (kind: Kind): boolean => {
    const kindIdentifier = `${kind.nachname}, ${kind.vorname}${kind.klasse ? ` (${kind.klasse})` : ''}`;
    return zugewieseneKinder.includes(kindIdentifier);
  };

  // Kinder filtern, die noch nicht zugewiesen sind
  const verfuegbareKinder = filteredKinder.filter(kind => !isKindBereitsZugewiesen(kind));

  const handleSubmit = async () => {
    if (!selectedKindId) {
      toast.error('Bitte wähle ein Kind aus');
      return;
    }

    if (menge <= 0) {
      toast.error('Die Menge muss größer als 0 sein');
      return;
    }

    if (menge > verfuegbareMenge) {
      toast.error(`Es sind nur noch ${verfuegbareMenge} Einheiten verfügbar`);
      return;
    }
    
    setIsSubmitting(true);
    const supabase = createClient();
    
    try {
      // Das ausgewählte Kind finden
      const selectedKind = kinder.find(kind => kind.id === selectedKindId);
      if (!selectedKind) {
        throw new Error('Kind nicht gefunden');
      }

      // Kind-Identifier erstellen
      const kindIdentifier = `${selectedKind.nachname}, ${selectedKind.vorname}${selectedKind.klasse ? ` (${selectedKind.klasse})` : ''}`;
      
      // Prüfen, ob bereits eine Zuweisung für dieses Kind und diese Spende existiert
      const { data: existingRueckmeldung, error: checkError } = await supabase
        .from('essensspenden_rueckmeldungen')
        .select('id')
        .eq('kind_identifier', kindIdentifier)
        .eq('spende_id', bedarf.id)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingRueckmeldung) {
        toast.error('Dieses Kind ist bereits für diese Essensspende eingetragen');
        return;
      }
      
      // Neue Rückmeldung erstellen
      const { error } = await supabase
        .from('essensspenden_rueckmeldungen')
        .insert([{
          kind_identifier: kindIdentifier,
          spende_id: bedarf.id,
          menge: menge,
          freitext: freitext || null
        }]);
        
      if (error) throw error;
      
      toast.success('Essensspende wurde erfolgreich zugewiesen');
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
            Kind manuell für "{bedarf?.titel}" zuweisen
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
              <SelectContent>
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
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    Kinder werden geladen...
                  </SelectItem>
                ) : verfuegbareKinder.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    Keine verfügbaren Kinder gefunden
                  </SelectItem>
                ) : (
                  verfuegbareKinder.map(kind => (
                    <SelectItem key={kind.id} value={kind.id}>
                      {kind.nachname}, {kind.vorname}
                      {kind.klasse && ` (${kind.klasse})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="menge">Menge</Label>
            <Input
              id="menge"
              type="number"
              min="1"
              max={verfuegbareMenge}
              value={menge}
              onChange={(e) => setMenge(parseInt(e.target.value) || 1)}
              disabled={isLoading}
            />
            <p className="text-sm text-gray-500">
              Verfügbar: {verfuegbareMenge} von {bedarf.anzahl_benoetigt}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="freitext">Anmerkungen (optional)</Label>
            <Input
              id="freitext"
              value={freitext}
              onChange={(e) => setFreitext(e.target.value)}
              disabled={isLoading}
              placeholder="z.B. Besonderheiten, Allergien, etc."
            />
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedKindId || menge <= 0 || menge > verfuegbareMenge}
          >
            {isSubmitting ? 'Wird zugewiesen...' : 'Zuweisen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
