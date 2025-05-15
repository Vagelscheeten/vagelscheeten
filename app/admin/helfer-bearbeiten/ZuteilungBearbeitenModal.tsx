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
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

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

// Typen (ggf. auslagern)
type Aufgabe = {
  id: string;
  titel: string;
  zeitfenster: string;
};

// Interface für das Ergebnis der Abfrage bestehender Zuteilungen
interface ExistingAssignmentQueryResult {
  aufgabe_id: string;
  helferaufgaben: { zeitfenster: string } | null;
}

// Die zu bearbeitende Zuteilung
interface ZuteilungToEdit {
  id: string;
  kind_id: string;
  kind_identifier: string;
  kind_name: string;
  aufgabe_id: string;
  aufgabe_titel: string;
  via_springer: boolean;
}

interface ZuteilungBearbeitenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  zuteilung: ZuteilungToEdit | null;
}

export function ZuteilungBearbeitenModal({ isOpen, onClose, onSuccess, zuteilung }: ZuteilungBearbeitenModalProps) {
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedAufgabeId, setSelectedAufgabeId] = useState('');
  const [viaSpringer, setViaSpringer] = useState(false);

  // Daten (Aufgaben) laden, wenn Modal geöffnet wird
  useEffect(() => {
    if (isOpen && zuteilung) {
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

        } catch (error: any) {
          console.error("Fehler beim Laden der Modal-Daten:", error);
          toast.error("Fehler beim Laden der Auswahlmöglichkeiten.");
        } finally {
          setIsLoadingData(false);
        }
      };
      loadInitialData();
      
      // Setze die Werte der zu bearbeitenden Zuteilung
      setSelectedAufgabeId(zuteilung.aufgabe_id);
      setViaSpringer(zuteilung.via_springer);
    }
  }, [isOpen, zuteilung]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!zuteilung) {
      toast.error('Keine Zuteilung zum Bearbeiten ausgewählt.');
      return;
    }
    
    setIsSubmitting(true);
    toast.loading('Zuteilung wird aktualisiert...');
    const supabase = createClient();

    // --- Validierung (Basis) ---
    if (!selectedAufgabeId) {
      toast.dismiss();
      toast.error('Bitte wählen Sie eine Aufgabe aus.');
      setIsSubmitting(false);
      return;
    }

    try {
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

      // 2. Bestehende Zuteilungen des Kindes holen (mit Zeitfenstern), außer der aktuell bearbeiteten
      const { data: existingAssignments, error: existingError } = await supabase
        .from('helfer_zuteilungen')
        .select('aufgabe_id, helferaufgaben ( zeitfenster )')
        .eq('kind_id', zuteilung.kind_id)
        .neq('id', zuteilung.id) as { data: ExistingAssignmentQueryResult[] | null; error: any };

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
      // 4. Zuteilung in Supabase aktualisieren
      const { error: updateError } = await supabase
        .from('helfer_zuteilungen')
        .update({
          aufgabe_id: selectedAufgabeId,
          via_springer: viaSpringer
        })
        .eq('id', zuteilung.id);

      if (updateError) {
        console.error("Fehler beim Aktualisieren der Zuteilung:", updateError);
        toast.dismiss();
        toast.error('Fehler beim Aktualisieren der Zuteilung.');
        setIsSubmitting(false);
        return;
      }

      // Erfolg
      toast.dismiss();
      toast.success('Zuteilung erfolgreich aktualisiert!');
      onSuccess(); // Daten in Parent neu laden
      onClose(); // Modal schließen

    } catch (error: any) {
      console.error("Unerwarteter Fehler beim Aktualisieren:", error);
      toast.dismiss();
      toast.error('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-6">
        <DialogHeader>
          <DialogTitle>Helfer-Zuteilung bearbeiten</DialogTitle>
          <DialogDescription>
            {zuteilung && `Bearbeiten Sie die Zuteilung für ${zuteilung.kind_name} (${zuteilung.kind_identifier}).`}
          </DialogDescription>
        </DialogHeader>
        {isLoadingData ? (
          <div className="flex justify-center items-center p-10"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Lade Auswahl...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6 py-2">
  <div className="bg-muted rounded-md p-3 mb-2">
    <div className="text-base font-semibold mb-1">Kind:</div>
    <div className="text-sm mb-1">{zuteilung?.kind_name}</div>
    <div className="text-xs text-muted-foreground break-all"><strong>ID:</strong> {zuteilung?.kind_identifier}</div>
  </div>
  <div className="flex flex-col gap-2">
    <label htmlFor="aufgabe" className="text-sm font-medium mb-1">Aufgabe</label>
    <Select value={selectedAufgabeId} onValueChange={setSelectedAufgabeId} required>
      <SelectTrigger className="w-full bg-white border rounded-md shadow-sm">
        <SelectValue placeholder="Aufgabe auswählen..." />
      </SelectTrigger>
      <SelectContent>
        {aufgaben.map((aufgabe) => (
          <SelectItem key={aufgabe.id} value={aufgabe.id}>
            {aufgabe.titel} ({aufgabe.zeitfenster})
          </SelectItem>
        ))}
        {aufgaben.length === 0 && <p className='p-4 text-sm text-muted-foreground'>Keine Aufgaben geladen.</p>}
      </SelectContent>
    </Select>
  </div>
  <div className="flex items-center gap-3 mt-2">
    <Checkbox
      id="viaSpringer"
      checked={viaSpringer}
      onCheckedChange={(checked) => setViaSpringer(!!checked)}
    />
    <label htmlFor="viaSpringer" className="text-sm font-medium leading-none">
      Als Springer zugewiesen?
    </label>
  </div>
</div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>
                  Abbrechen
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Speichern
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
