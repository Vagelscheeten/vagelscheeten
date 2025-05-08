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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Aufgabe {
  id?: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
  zeitfenster?: string;
  has_slots?: boolean;
  is_game_supervisor?: boolean;
}

interface AufgabenFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  aufgabe?: Aufgabe;
  isEditing: boolean;
}

export function AufgabenForm({ 
  open, 
  onClose, 
  onSave, 
  aufgabe, 
  isEditing 
}: AufgabenFormProps) {
  const [titel, setTitel] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [bedarf, setBedarf] = useState(1);
  const [zeitfenster, setZeitfenster] = useState('vormittag');
  const [hasSlots, setHasSlots] = useState(false);
  const [isGameSupervisor, setIsGameSupervisor] = useState(false);
  const [errors, setErrors] = useState<{
    titel?: string;
    bedarf?: string;
    zeitfenster?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formular mit vorhandenen Daten füllen, wenn im Bearbeitungsmodus
  useEffect(() => {
    if (aufgabe && isEditing) {
      setTitel(aufgabe.titel || '');
      setBeschreibung(aufgabe.beschreibung || '');
      setBedarf(aufgabe.bedarf || 1);
      setZeitfenster(aufgabe.zeitfenster || 'vormittag');
      setHasSlots(aufgabe.has_slots || false);
      setIsGameSupervisor(aufgabe.is_game_supervisor || false);
    } else {
      // Zurücksetzen für neue Aufgabe
      setTitel('');
      setBeschreibung('');
      setBedarf(1);
      setZeitfenster('vormittag');
      setHasSlots(false);
      setIsGameSupervisor(false);
    }
    setErrors({});
  }, [aufgabe, isEditing, open]);

  const validateForm = () => {
    const newErrors: {
      titel?: string;
      bedarf?: string;
      zeitfenster?: string;
    } = {};
    
    if (!titel.trim()) {
      newErrors.titel = 'Titel ist erforderlich';
    }
    
    if (!bedarf || bedarf < 1) {
      newErrors.bedarf = 'Bedarf muss mindestens 1 sein';
    }
    
    if (!zeitfenster) {
      newErrors.zeitfenster = 'Zeitfenster ist erforderlich';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    const supabase = createClient();
    
    const aufgabenData = {
      titel,
      beschreibung: beschreibung || null,
      bedarf,
      zeitfenster,
      has_slots: hasSlots,
      is_game_supervisor: isGameSupervisor,
    };
    
    try {
      if (isEditing && aufgabe?.id) {
        // Bestehende Aufgabe aktualisieren
        const { error } = await supabase
          .from('helferaufgaben')
          .update(aufgabenData)
          .eq('id', aufgabe.id);
          
        if (error) throw error;
        toast.success('Aufgabe wurde aktualisiert');
      } else {
        // Neue Aufgabe erstellen
        const { error } = await supabase
          .from('helferaufgaben')
          .insert([aufgabenData]);
          
        if (error) throw error;
        toast.success('Neue Aufgabe wurde erstellt');
      }
      
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Fehler beim Speichern:', error);
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
            {isEditing ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="titel">
              Titel <span className="text-red-500">*</span>
            </Label>
            <Input
              id="titel"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="z.B. Kuchenverkauf"
              className={errors.titel ? "border-red-500" : ""}
            />
            {errors.titel && (
              <p className="text-red-500 text-sm">{errors.titel}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung (optional)</Label>
            <Textarea
              id="beschreibung"
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="Detaillierte Beschreibung der Aufgabe..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bedarf">
              Bedarf (Anzahl Helfer:innen) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="bedarf"
              type="number"
              min={1}
              value={bedarf}
              onChange={(e) => setBedarf(parseInt(e.target.value) || 0)}
              className={errors.bedarf ? "border-red-500" : ""}
            />
            {errors.bedarf && (
              <p className="text-red-500 text-sm">{errors.bedarf}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox 
                id="has_slots" 
                checked={hasSlots} 
                onCheckedChange={(checked) => setHasSlots(checked === true)}
              />
              <Label htmlFor="has_slots" className="cursor-pointer">
                Diese Aufgabe hat Zeitslots (für detaillierte Zeitplanung)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox 
                id="is_game_supervisor" 
                checked={isGameSupervisor} 
                onCheckedChange={(checked) => {
                  // Wenn bereits eine andere Aufgabe diesen Marker hat, zeige eine Warnung
                  if (checked === true) {
                    toast.warning('ACHTUNG: Nur EINE Aufgabe darf als "Betreuer eines Spiels" markiert sein. Bestehende Markierungen werden überschrieben!');
                  }
                  setIsGameSupervisor(checked === true);
                }}
              />
              <Label htmlFor="is_game_supervisor" className="cursor-pointer font-semibold text-amber-700">
                Diese Aufgabe ist "Betreuer eines Spiels" (WICHTIG: Nur EINE Aufgabe darf diesen Marker haben!)
              </Label>
            </div>
            
            <Label htmlFor="zeitfenster">
              Zeitfenster <span className="text-red-500">*</span>
            </Label>
            <Select
              value={zeitfenster}
              onValueChange={setZeitfenster}
            >
              <SelectTrigger id="zeitfenster" className={errors.zeitfenster ? "border-red-500" : ""}>
                <SelectValue placeholder="Zeitfenster wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vormittag">Vormittag</SelectItem>
                <SelectItem value="nachmittag">Nachmittag</SelectItem>
                <SelectItem value="beides">Ganztägig (beides)</SelectItem>
              </SelectContent>
            </Select>
            {errors.zeitfenster && (
              <p className="text-red-500 text-sm">{errors.zeitfenster}</p>
            )}
          </div>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
