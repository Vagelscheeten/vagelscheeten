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

// Hilfsfunktion zum Parsen von Zeitfenstern (z.B. "10:00-12:00" oder "nachmittag")
const parseTimeWindow = (zeitfenster: string): { start: number; end: number } | null => {
  // Versuche zuerst, das Format HH:MM-HH:MM zu parsen
  const timeMatch = zeitfenster.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const startHours = parseInt(timeMatch[1], 10);
    const startMinutes = parseInt(timeMatch[2], 10);
    const endHours = parseInt(timeMatch[3], 10);
    const endMinutes = parseInt(timeMatch[4], 10);
    
    // Überprüfe auf gültige Zeiten
    if (startHours >= 0 && startHours <= 23 && startMinutes >= 0 && startMinutes <= 59 &&
        endHours >= 0 && endHours <= 23 && endMinutes >= 0 && endMinutes <= 59) {
      return {
        start: startHours * 60 + startMinutes,
        end: endHours * 60 + endMinutes
      };
    }
  }
  
  // Wenn keine Zeitangabe im Format HH:MM-HH:MM, prüfe auf bekannte Zeitfenster
  const lowerZeitfenster = zeitfenster.toLowerCase();
  
  // Definiere bekannte Zeitfenster (in Minuten seit Mitternacht)
  const timeWindows: Record<string, { start: number; end: number }> = {
    'morgens': { start: 8 * 60, end: 12 * 60 },      // 08:00 - 12:00
    'vormittag': { start: 9 * 60, end: 12 * 60 },    // 09:00 - 12:00
    'mittag': { start: 11 * 60, end: 14 * 60 },      // 11:00 - 14:00
    'nachmittag': { start: 13 * 60, end: 18 * 60 },   // 13:00 - 18:00
    'abend': { start: 17 * 60, end: 22 * 60 },       // 17:00 - 22:00
    'ganztags': { start: 8 * 60, end: 22 * 60 }      // 08:00 - 22:00
  };
  
  // Prüfe, ob das Zeitfenster bekannt ist
  if (lowerZeitfenster in timeWindows) {
    return timeWindows[lowerZeitfenster];
  }
  
  console.warn(`Unbekanntes Zeitfenster-Format: ${zeitfenster}`);
  return null;
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

export function ZuteilungManuellModal({ isOpen, onClose, onSuccess, initialKindIdentifier, kindId, kindName }: ZuteilungManuellModalProps): React.JSX.Element {
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
    
    let toastId: string | undefined;
    console.log('1. Starte handleSubmit...');
    
    try {
      console.log('2. Setze isSubmitting auf true');
      setIsSubmitting(true);
      
      console.log('3. Zeige Lade-Toast an');
      const toastId = toast.loading('Zuteilung wird gespeichert...');
      
      console.log('4. Erstelle Supabase-Client');
      const supabase = createClient();
      
      console.log('5. Formulardaten:', {
        selectedKindId,
        selectedAufgabeId,
        viaSpringer
      });
      
      // Wir verwenden jetzt direkt die Kind-ID

      // --- Validierung (Basis) ---
      if (!selectedKindId) {
        console.log('6. Validierung fehlgeschlagen: Kein Kind ausgewählt');
        toast.dismiss(toastId);
        toast.error('Bitte wähle ein Kind aus.');
        setIsSubmitting(false);
        return;
      }
      if (!selectedAufgabeId) {
        console.log('7. Validierung fehlgeschlagen: Keine Aufgabe ausgewählt');
        toast.dismiss(toastId);
        toast.error('Bitte wählen Sie eine Aufgabe aus.');
        setIsSubmitting(false);
        return;
      }

      // Wir haben die Kind-ID bereits direkt aus der Auswahl
      const kindId = selectedKindId;
      console.log('8. Verwendete Kind-ID:', kindId);

      // --- Erweiterte Validierung: Zeitfenster-Kollision --- 
      // 1. Zeitfenster der NEUEN Aufgabe holen
      console.log('9. Suche ausgewählte Aufgabe:', selectedAufgabeId);
      const selectedAufgabe = aufgaben.find(a => a.id === selectedAufgabeId);
      
      console.log('10. Ausgewählte Aufgabe:', selectedAufgabe);
      
      if (!selectedAufgabe || !selectedAufgabe.zeitfenster) {
          console.log('11. Validierung fehlgeschlagen: Kein Zeitfenster für die ausgewählte Aufgabe gefunden');
          toast.dismiss(toastId);
          toast.error("Zeitfenster für ausgewählte Aufgabe nicht gefunden.");
          setIsSubmitting(false);
          return;
      }
      console.log('12. Parse Zeitfenster:', selectedAufgabe.zeitfenster);
      const newTimeWindow = parseTimeWindow(selectedAufgabe.zeitfenster);
      console.log('13. Geparstes Zeitfenster:', newTimeWindow);
      
      if (!newTimeWindow) {
          console.log('14. Validierung fehlgeschlagen: Ungültiges Zeitfensterformat');
          toast.dismiss(toastId);
          toast.error("Ungültiges Zeitfensterformat für ausgewählte Aufgabe.");
          setIsSubmitting(false);
          return;
      }

      console.log('15. Starte Abfrage der bestehenden Zuteilungen für Kind:', kindId);
      
      // 2. Bestehende Zuteilungen des Kindes holen (mit Zeitfenstern)
      const { data: existingAssignments, error: existingError } = await supabase
        .from('helfer_zuteilungen')
        .select(`
          aufgabe_id, 
          helferaufgaben!inner(
            zeitfenster
          )
        `)
        .eq('kind_id', kindId);
        
      console.log('16. Bestehende Zuteilungen geladen:', existingAssignments, 'Fehler:', existingError);
      
      if (existingError) {
        console.error('17. Fehler beim Laden bestehender Zuteilungen:', existingError);
        throw existingError;
      }

      if (existingError) {
        console.error("Fehler beim Laden bestehender Zuteilungen:", existingError);
        toast.dismiss();
        toast.error('Fehler beim Prüfen auf Zeitkonflikte.');
        setIsSubmitting(false);
        return;
      }

      // 3. Überlappung prüfen
      console.log('18. Prüfe auf Zeitfenster-Überlappungen...');
      if (existingAssignments && existingAssignments.length > 0) {
        console.log('19. Prüfe', existingAssignments.length, 'bestehende Zuteilungen');
        
        for (const existing of existingAssignments) {
          console.log('20. Prüfe Zuteilung:', existing);
          
          // Stelle sicher, dass helferaufgaben existiert und ein Objekt ist
          if (!existing.helferaufgaben || !Array.isArray(existing.helferaufgaben) || existing.helferaufgaben.length === 0 || !existing.helferaufgaben[0]?.zeitfenster) {
            console.warn(`21. Überspringe Zuteilung zur Aufgabe ${existing.aufgabe_id}, da Zeitfenster fehlt.`);
            continue;
          }
          
          const existingZeitfenster = existing.helferaufgaben[0].zeitfenster;
          console.log('22. Bestehendes Zeitfenster:', existingZeitfenster);

            console.log('23. Parse bestehendes Zeitfenster:', existingZeitfenster);
            const existingTimeWindow = parseTimeWindow(existingZeitfenster);
            console.log('24. Geparstes bestehendes Zeitfenster:', existingTimeWindow);
            
            console.log('25. Prüfe Überlappung zwischen:', newTimeWindow, 'und', existingTimeWindow);
            const isOverlap = doTimeWindowsOverlap(newTimeWindow, existingTimeWindow);
            console.log('26. Überlappung gefunden:', isOverlap);
            
            if (isOverlap) {
              console.log('27. Zeitfenster-Überschneidung gefunden mit:', existingZeitfenster);
              toast.dismiss(toastId);
              toast.error(`Zeitfenster-Überschneidung mit einer anderen Aufgabe (${existingZeitfenster}).`);
              setIsSubmitting(false);
              return;
            }
         }
      }

      // --- Keine Kollision gefunden, jetzt Speichern --- 
      console.log('28. Keine Kollisionen gefunden, speichere Zuteilung...');
      
      // Erstelle das Zuteilungsobjekt mit allen erforderlichen Feldern
      const zuteilungDaten = {
        kind_id: kindId,
        aufgabe_id: selectedAufgabeId,
        zeitfenster: selectedAufgabe.zeitfenster, // Füge das Zeitfenster der Aufgabe hinzu
        via_springer: viaSpringer
      };
      
      console.log('29a. Ausgewähltes Zeitfenster:', selectedAufgabe.zeitfenster);
      
      console.log('29. Speichere Zuteilung mit Daten:', zuteilungDaten);
      
      // 4. Zuteilung in Supabase eintragen
      const { data: insertData, error: insertError } = await supabase
        .from('helfer_zuteilungen')
        .insert(zuteilungDaten)
        .select();
        
      console.log('30. Speichern abgeschlossen. Antwort:', { insertData, insertError });
      
      if (insertError) {
        console.error('31. Fehler beim Speichern der Zuteilung:', insertError);
        throw insertError;
      }

      console.log('32. Erfolgreich gespeichert, rufe onSuccess auf...');
      
      // Erfolg
      toast.dismiss(toastId);
      toast.success('Zuteilung erfolgreich hinzugefügt!');
      
      console.log('33. Rufe onSuccess auf...');
      onSuccess(); // Daten in Parent neu laden
      
      console.log('34. Schließe Modal...');
      onClose(); // Modal schließen

    } catch (error: any) {
      console.error('99. FEHLER:', error);
      
      if (toastId) {
        toast.dismiss(toastId);
      }
      
      // Prüfe auf spezifische DB-Constraints, z.B. Unique Constraint
      if (error.code === '23505') { // Unique violation
        toast.error('Dieses Kind ist dieser Aufgabe bereits zugewiesen.');
      } else {
        console.error('Unerwarteter Fehler beim Speichern:', error);
        toast.error('Fehler beim Speichern der Zuteilung: ' + (error.message || 'Unbekannter Fehler'));
      }
    } finally {
      console.log('100. Setze isSubmitting auf false');
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
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }}>
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
