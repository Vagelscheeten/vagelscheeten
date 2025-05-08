'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // Wird später vom aufrufenden Button genutzt
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast'; // Annahme: react-hot-toast ist installiert

// Typen (ggf. auslagern)
type Aufgabe = {
  id: string;
  titel: string;
  zeitfenster: string; // Wichtig für spätere Validierung
};

type Kind = {
  id: string;
  vorname: string;
  nachname: string;
  klasse: string;
};

interface ZuteilungManuellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // Optional: targetAufgabeId?: string; // Um Aufgabe vorzubelegen/filtern
  initialKindIdentifier?: string; // Um Kind vorzubelegen
  // Neuer Parameter: Direkte Kind-ID
  kindId?: string; 
  kindName?: string; // Name des Kindes zur Anzeige
}

// Hilfsfunktion zum Parsen von Zeitfenstern (z.B. "10:00-12:00")
const parseTimeWindow = (zeitfenster: string): { start: number; end: number } | null => {
  const match = zeitfenster.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
  if (!match) return null;
  const startMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  const endMinutes = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
  return { start: startMinutes, end: endMinutes };
};

// Hilfsfunktion zum Prüfen von Zeitfenster-Überlappungen
const doTimeWindowsOverlap = (
  window1: { start: number; end: number } | null,
  window2: { start: number; end: number } | null
): boolean => {
  if (!window1 || !window2) return false; // Keine Überlappung, wenn ein Fenster ungültig ist
  // Überlappung, wenn Start1 < Ende2 UND Start2 < Ende1
  return window1.start < window2.end && window2.start < window1.end;
};

export function ZuteilungManuellModal({ isOpen, onClose, onSuccess, initialKindIdentifier, kindId, kindName }: ZuteilungManuellModalProps) {
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [klassen, setKlassen] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedKindId, setSelectedKindId] = useState('');
  const [selectedKlasse, setSelectedKlasse] = useState<string>('alle');
  const [selectedAufgabeId, setSelectedAufgabeId] = useState('');
  const [viaSpringer, setViaSpringer] = useState(false);
  
  // Prüfen, ob ein Kind direkt übergeben wurde
  const hasDirectKind = !!kindId;

  // Daten (Aufgaben, Kinder) laden, wenn Modal geöffnet wird
  useEffect(() => {
    if (isOpen) {
      const loadInitialData = async () => {
        setIsLoadingData(true);
        const supabase = createClient();
        try {
          // Aufgaben laden
          const { data: aufgabenData, error: aufgabenError } = await supabase
            .from('helferaufgaben')
            .select('id, titel, zeitfenster')
            .order('titel');
          if (aufgabenError) throw aufgabenError;
          setAufgaben(aufgabenData || []);

          // Kinder laden für die Kind-Auswahl-Combobox
          const { data: kinderData, error: kinderError } = await supabase
            .from('kinder')
            .select('id, vorname, nachname, klasse')
            .order('nachname');
          if (kinderError) throw kinderError;
          setKinder(kinderData || []);
          
          // Eindeutige Klassen extrahieren
          const uniqueKlassen = Array.from(new Set(
            kinderData?.map(kind => kind.klasse || 'Keine Klasse')
          )).sort();
          setKlassen(['alle', ...uniqueKlassen]);

        } catch (error: any) {
          console.error("Fehler beim Laden der Modal-Daten:", error);
          toast.error("Fehler beim Laden der Auswahlmöglichkeiten.");
          // Modal trotzdem anzeigen, aber Selects sind leer/deaktiviert
        } finally {
          setIsLoadingData(false);
        }
      };
      loadInitialData();
      // Reset state on open
      setSelectedAufgabeId('');
      setViaSpringer(false);
      
      // Wenn ein Kind direkt übergeben wurde, dieses verwenden
      if (kindId) {
        setSelectedKindId(kindId);
      } else {
        // Sonst zurücksetzen
        setSelectedKindId('');
        setSelectedKlasse('alle');
      }
    }
  }, [isOpen, initialKindIdentifier]); // Depend on initialKindIdentifier too

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    toast.loading('Zuteilung wird gespeichert...');
    const supabase = createClient();
    // Wir verwenden jetzt direkt die Kind-ID

    // --- Validierung (Basis) ---
    if (!selectedKindId) {
      toast.dismiss();
      toast.error('Bitte wähle ein Kind aus.');
      setIsSubmitting(false);
      return;
    }
    if (!selectedAufgabeId) {
      toast.dismiss();
      toast.error('Bitte wählen Sie eine Aufgabe aus.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Wir haben die Kind-ID bereits direkt aus der Auswahl
      const kindId = selectedKindId;

      // --- Erweiterte Validierung: Zeitfenster-Kollision --- 
      // 1. Zeitfenster der NEUEN Aufgabe holen
      const selectedAufgabe = aufgaben.find(a => a.id === selectedAufgabeId);
      if (!selectedAufgabe || !selectedAufgabe.zeitfenster) {
          toast.dismiss();
          toast.error("Zeitfenster für ausgewählte Aufgabe nicht gefunden.");
          setIsSubmitting(false);
          return;
      }
      const newTimeWindow = parseTimeWindow(selectedAufgabe.zeitfenster);
      if (!newTimeWindow) {
          toast.dismiss();
          toast.error("Ungültiges Zeitfensterformat für ausgewählte Aufgabe.");
          setIsSubmitting(false);
          return;
      }

      // 2. Bestehende Zuteilungen des Kindes holen (mit Zeitfenstern)
      interface ExistingAssignmentQueryResult {
        aufgabe_id: string;
        helferaufgaben: { zeitfenster: string } | null; // Erwarten ein Objekt oder null
      }
      const { data: existingAssignments, error: existingError } = await supabase
        .from('helfer_zuteilungen') // Explicitly type the result
        .select('aufgabe_id, helferaufgaben ( zeitfenster )')
        .eq('kind_id', kindId) as { data: ExistingAssignmentQueryResult[] | null; error: any };

      if (existingError) {
        console.error("Fehler beim Laden bestehender Zuteilungen:", existingError);
        toast.dismiss();
        toast.error('Fehler beim Prüfen auf Zeitkonflikte.');
        setIsSubmitting(false);
        return;
      }

      // 3. Überlappung prüfen
      if (existingAssignments) {
         for (const existing of existingAssignments) {
            // Stelle sicher, dass helferaufgaben existiert und ein Objekt ist
            if (!existing.helferaufgaben || typeof existing.helferaufgaben !== 'object' || !existing.helferaufgaben.zeitfenster) {
              console.warn(`Überspringe Zuteilung zur Aufgabe ${existing.aufgabe_id}, da Zeitfenster fehlt.`);
              continue;
            }
            const existingZeitfenster = existing.helferaufgaben.zeitfenster;

            const existingTimeWindow = parseTimeWindow(existingZeitfenster);
            if (doTimeWindowsOverlap(newTimeWindow, existingTimeWindow)) {
              toast.dismiss();
              toast.error(`Zeitkonflikt: Kind ist bereits im Zeitraum ${existingZeitfenster} eingeteilt.`);
              setIsSubmitting(false);
              return;
            }
         }
      }

      // --- Keine Kollision gefunden, jetzt Speichern --- 
      // 4. Zuteilung in Supabase eintragen
      const { error: insertError } = await supabase
        .from('helfer_zuteilungen')
        .insert({
          kind_id: kindId,
          aufgabe_id: selectedAufgabeId,
          via_springer: viaSpringer
        });

      if (insertError) {
        console.error("Fehler beim Speichern der Zuteilung:", insertError);
        toast.dismiss();
        // Prüfe auf spezifische DB-Constraints, z.B. Unique Constraint
        if (insertError.code === '23505') { // Unique violation
          toast.error('Dieses Kind ist dieser Aufgabe bereits zugewiesen.');
        } else {
          toast.error('Fehler beim Speichern der Zuteilung.');
        }
        setIsSubmitting(false);
        return;
      }

      // Erfolg
      toast.dismiss();
      toast.success('Zuteilung erfolgreich hinzugefügt!');
      onSuccess(); // Daten in Parent neu laden
      onClose(); // Modal schließen

    } catch (error: any) {
      console.error("Unerwarteter Fehler beim Speichern:", error);
      toast.dismiss();
      toast.error('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Helfer manuell zuweisen</DialogTitle>
          <DialogDescription>
            {hasDirectKind 
              ? `Wähle eine Aufgabe für ${kindName || 'das ausgewählte Kind'} aus.`
              : 'Wähle ein Kind und eine Aufgabe aus, um eine neue Zuteilung zu erstellen.'}
          </DialogDescription>
        </DialogHeader>
        
        {isLoadingData ? (
          <div className="flex justify-center items-center p-10">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Lade Auswahl...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 py-6">
              {/* Nur Kinderauswahl anzeigen, wenn kein Kind direkt übergeben wurde */}
              {!hasDirectKind && (
                <>
                  {/* Klassenfilter */}
                  <div className="space-y-2">
                    <Label htmlFor="klasseFilter">Klasse filtern</Label>
                    <Select
                      value={selectedKlasse}
                      onValueChange={setSelectedKlasse}
                      disabled={isSubmitting || klassen.length <= 1}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Klasse auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {klassen.map((klasse) => (
                          <SelectItem key={klasse} value={klasse}>
                            {klasse === 'alle' ? 'Alle Klassen' : klasse}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Kind-Auswahl */}
                  <div className="space-y-2">
                    <Label htmlFor="kindAuswahl">Kind auswählen</Label>
                    <Select
                      value={selectedKindId}
                      onValueChange={setSelectedKindId}
                      disabled={isSubmitting || kinder.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Kind auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {kinder
                          .filter(kind => selectedKlasse === 'alle' || kind.klasse === selectedKlasse)
                          .map((kind) => (
                            <SelectItem key={kind.id} value={kind.id}>
                              {kind.nachname}, {kind.vorname} ({kind.klasse})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {kinder.length === 0 && !isLoadingData && (
                      <p className="text-xs text-red-500">
                        Keine Kinder gefunden. Bitte prüfe die Datenbank.
                      </p>
                    )}
                    {kinder.length > 0 && 
                     kinder.filter(kind => selectedKlasse === 'alle' || kind.klasse === selectedKlasse).length === 0 && (
                      <p className="text-xs text-amber-500">
                        Keine Kinder in dieser Klasse gefunden.
                      </p>
                    )}
                  </div>
                </>
              )}
              
              {/* Wenn ein Kind direkt übergeben wurde, zeigen wir den Namen an */}
              {hasDirectKind && kindName && (
                <div className="space-y-2">
                  <Label>Ausgewähltes Kind</Label>
                  <div className="p-2 border rounded-md bg-muted/50">
                    {kindName}
                  </div>
                </div>
              )}
              
              {/* Aufgaben-Auswahl */}
              <div className="space-y-2">
                <Label htmlFor="aufgabeAuswahl">Aufgabe auswählen</Label>
                <Select
                  value={selectedAufgabeId}
                  onValueChange={setSelectedAufgabeId}
                  disabled={isSubmitting || aufgaben.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Aufgabe auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {aufgaben.map((aufgabe) => (
                      <SelectItem key={aufgabe.id} value={aufgabe.id}>
                        {aufgabe.titel} ({aufgabe.zeitfenster})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {aufgaben.length === 0 && !isLoadingData && (
                  <p className="text-xs text-red-500">
                    Keine Aufgaben gefunden. Bitte prüfe die Datenbank.
                  </p>
                )}
              </div>
              
              {/* Springer-Option */}
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="viaSpringer"
                  checked={viaSpringer}
                  onCheckedChange={(checked) => setViaSpringer(!!checked)}
                  disabled={isSubmitting}
                />
                <Label htmlFor="viaSpringer" className="text-sm font-medium">
                  Als Springer zuweisen?
                </Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
