'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { SpendenBedarf } from './types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface SpendenBedarfFormProps {
  bedarf: SpendenBedarf | null;
  onClose: () => void;
  onSubmit: () => void;
}

export function SpendenBedarfForm({ 
  bedarf, 
  onClose, 
  onSubmit 
}: SpendenBedarfFormProps) {
  const [titel, setTitel] = useState(bedarf?.titel || '');
  const [beschreibung, setBeschreibung] = useState(bedarf?.beschreibung || '');
  const [anzahlBenoetigt, setAnzahlBenoetigt] = useState(bedarf?.anzahl_benoetigt || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Formular zurücksetzen, wenn sich der Bedarf ändert
  useEffect(() => {
    if (bedarf) {
      setTitel(bedarf.titel);
      setBeschreibung(bedarf.beschreibung || '');
      setAnzahlBenoetigt(bedarf.anzahl_benoetigt);
    } else {
      setTitel('');
      setBeschreibung('');
      setAnzahlBenoetigt(1);
    }
  }, [bedarf]);
  
  // Formular absenden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titel.trim()) {
      toast.error('Bitte gib einen Titel ein.');
      return;
    }
    
    if (anzahlBenoetigt < 1) {
      toast.error('Die benötigte Anzahl muss mindestens 1 sein.');
      return;
    }
    
    setIsSubmitting(true);
    const supabase = createClient();
    
    try {
      if (bedarf) {
        // Bestehenden Bedarf aktualisieren
        const { error } = await supabase
          .from('essensspenden_bedarf')
          .update({
            titel: titel.trim(),
            beschreibung: beschreibung.trim() || null,
            anzahl_benoetigt: anzahlBenoetigt
          })
          .eq('id', bedarf.id);
          
        if (error) throw error;
        toast.success('Bedarf erfolgreich aktualisiert!');
      } else {
        // Neuen Bedarf erstellen
        const { error } = await supabase
          .from('essensspenden_bedarf')
          .insert({
            titel: titel.trim(),
            beschreibung: beschreibung.trim() || null,
            anzahl_benoetigt: anzahlBenoetigt
          });
          
        if (error) throw error;
        toast.success('Bedarf erfolgreich erstellt!');
      }
      
      onSubmit();
    } catch (error: any) {
      console.error('Fehler beim Speichern des Bedarfs:', error);
      toast.error(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {bedarf ? 'Bedarf bearbeiten' : 'Neuen Bedarf hinzufügen'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="titel">Titel</Label>
            <Input
              id="titel"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="z.B. Kuchen, Muffins, Kaffee"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung (optional)</Label>
            <Textarea
              id="beschreibung"
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="Weitere Informationen zur Spende"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="anzahl">Benötigte Anzahl</Label>
            <Input
              id="anzahl"
              type="number"
              min="1"
              value={anzahlBenoetigt}
              onChange={(e) => setAnzahlBenoetigt(parseInt(e.target.value) || 0)}
              disabled={isSubmitting}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bedarf ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
