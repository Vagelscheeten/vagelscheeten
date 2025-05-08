'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { SpendenBedarf } from './SpendenView';
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
import { PlusCircle, X, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SpendenRueckmeldungFormProps {
  bedarfe: SpendenBedarf[];
  kindIdentifier: string;
  onClose: () => void;
  onSubmit: () => void;
}

interface SpendenAuswahl {
  spendeId: string;
  menge: number;
  freitext: string;
}

export function SpendenRueckmeldungForm({
  bedarfe,
  kindIdentifier,
  onClose,
  onSubmit
}: SpendenRueckmeldungFormProps) {
  const [ausgewaehlteSpenden, setAusgewaehlteSpenden] = useState<SpendenAuswahl[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Spende hinzufügen
  const handleAddSpende = () => {
    // Nur hinzufügen, wenn noch Spenden übrig sind
    const verfuegbareSpenden = bedarfe.filter(
      spende => !ausgewaehlteSpenden.some(s => s.spendeId === spende.id)
    );
    
    if (verfuegbareSpenden.length > 0) {
      setAusgewaehlteSpenden([
        ...ausgewaehlteSpenden,
        { spendeId: verfuegbareSpenden[0].id, menge: 1, freitext: '' }
      ]);
    }
  };
  
  // Spende entfernen
  const handleRemoveSpende = (index: number) => {
    const newSpenden = [...ausgewaehlteSpenden];
    newSpenden.splice(index, 1);
    setAusgewaehlteSpenden(newSpenden);
  };
  
  // Spende ändern
  const handleChangeSpende = (index: number, spendeId: string) => {
    const newSpenden = [...ausgewaehlteSpenden];
    newSpenden[index].spendeId = spendeId;
    setAusgewaehlteSpenden(newSpenden);
  };
  
  // Menge ändern
  const handleChangeMenge = (index: number, menge: number) => {
    const newSpenden = [...ausgewaehlteSpenden];
    newSpenden[index].menge = menge;
    setAusgewaehlteSpenden(newSpenden);
  };
  
  // Freitext ändern
  const handleChangeFreitext = (index: number, freitext: string) => {
    const newSpenden = [...ausgewaehlteSpenden];
    newSpenden[index].freitext = freitext;
    setAusgewaehlteSpenden(newSpenden);
  };
  
  // Formular absenden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (ausgewaehlteSpenden.length === 0) {
      toast.error('Bitte wähle mindestens eine Spende aus.');
      return;
    }
    
    setIsSubmitting(true);
    const supabase = createClient();
    
    try {
      // Für jede ausgewählte Spende einen Eintrag erstellen
      const inserts = ausgewaehlteSpenden.map(spende => ({
        spende_id: spende.spendeId,
        kind_identifier: kindIdentifier,
        menge: spende.menge,
        freitext: spende.freitext.trim() || null
      }));
      
      const { error } = await supabase
        .from('essensspenden_rueckmeldungen')
        .insert(inserts);
      
      if (error) throw error;
      
      toast.success('Essensspenden erfolgreich gespeichert!');
      onSubmit();
    } catch (error: any) {
      console.error('Fehler beim Speichern der Essensspenden:', error);
      toast.error(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Essensspenden für {kindIdentifier}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Essensspenden</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleAddSpende}
                disabled={ausgewaehlteSpenden.length >= bedarfe.length}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Spende hinzufügen
              </Button>
            </div>
            
            {ausgewaehlteSpenden.length === 0 ? (
              <div className="text-center p-4 border rounded-md border-dashed">
                <p className="text-muted-foreground">Keine Spenden ausgewählt. Klicke auf "Spende hinzufügen".</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ausgewaehlteSpenden.map((spende, index) => (
                  <div key={index} className="p-4 border rounded-md relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                      onClick={() => handleRemoveSpende(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`spende-${index}`}>Spendenart</Label>
                        <Select
                          value={spende.spendeId}
                          onValueChange={(value) => handleChangeSpende(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Spendenart auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {bedarfe.map((bedarf) => (
                              <SelectItem 
                                key={bedarf.id} 
                                value={bedarf.id}
                                disabled={ausgewaehlteSpenden.some(
                                  (s, i) => i !== index && s.spendeId === bedarf.id
                                )}
                              >
                                {bedarf.titel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`menge-${index}`}>Menge</Label>
                        <Input
                          id={`menge-${index}`}
                          type="number"
                          min="1"
                          value={spende.menge}
                          onChange={(e) => handleChangeMenge(index, parseInt(e.target.value) || 1)}
                        />
                      </div>
                      
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor={`freitext-${index}`}>Anmerkungen (optional)</Label>
                        <Textarea
                          id={`freitext-${index}`}
                          placeholder="z.B. vegan, glutenfrei, etc."
                          value={spende.freitext}
                          onChange={(e) => handleChangeFreitext(index, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting || ausgewaehlteSpenden.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
