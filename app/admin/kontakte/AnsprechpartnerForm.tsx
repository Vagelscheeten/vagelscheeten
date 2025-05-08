'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Ansprechpartner } from '@/types/ansprechpartner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface AnsprechpartnerFormProps {
  ansprechpartner: Ansprechpartner | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function AnsprechpartnerForm({ ansprechpartner, onCancel, onSuccess }: AnsprechpartnerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    bereich: string;
    name: string;
    telefonnummer: string;
  }>({
    bereich: '',
    name: '',
    telefonnummer: '',
  });

  // Formular mit Daten füllen, wenn ein Ansprechpartner zum Bearbeiten ausgewählt wurde
  useEffect(() => {
    if (ansprechpartner) {
      setFormData({
        bereich: ansprechpartner.bereich || '',
        name: ansprechpartner.name || '',
        telefonnummer: ansprechpartner.telefonnummer || '',
      });
    } else {
      // Formular zurücksetzen, wenn kein Ansprechpartner ausgewählt ist
      setFormData({
        bereich: '',
        name: '',
        telefonnummer: '',
      });
    }
  }, [ansprechpartner]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung
    if (!formData.bereich.trim() || !formData.name.trim()) {
      toast.error('Bitte fülle alle Pflichtfelder aus');
      return;
    }
    
    setIsSubmitting(true);
    const supabase = createClient();
    
    try {
      if (ansprechpartner) {
        // Ansprechpartner aktualisieren
        const { error } = await supabase
          .from('ansprechpartner')
          .update({
            bereich: formData.bereich,
            name: formData.name,
            telefonnummer: formData.telefonnummer || null,
          })
          .eq('id', ansprechpartner.id);
          
        if (error) throw error;
        
        toast.success('Ansprechpartner erfolgreich aktualisiert');
      } else {
        // Neuen Ansprechpartner erstellen
        const { error } = await supabase
          .from('ansprechpartner')
          .insert({
            bereich: formData.bereich,
            name: formData.name,
            telefonnummer: formData.telefonnummer || null,
          });
          
        if (error) throw error;
        
        toast.success('Ansprechpartner erfolgreich erstellt');
      }
      
      // Formular zurücksetzen und Eltern-Komponente benachrichtigen
      setFormData({
        bereich: '',
        name: '',
        telefonnummer: '',
      });
      onSuccess();
    } catch (error) {
      console.error('Fehler beim Speichern des Ansprechpartners:', error);
      toast.error('Fehler beim Speichern des Ansprechpartners');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ansprechpartner ? 'Ansprechpartner bearbeiten' : 'Neuen Ansprechpartner anlegen'}</CardTitle>
        <CardDescription>
          Fülle das Formular aus, um {ansprechpartner ? 'den Ansprechpartner zu aktualisieren' : 'einen neuen Ansprechpartner anzulegen'}.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bereich">Bereich *</Label>
            <Input
              id="bereich"
              name="bereich"
              placeholder="z.B. Spiele, Catering, Allgemein"
              value={formData.bereich}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Vollständiger Name"
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="telefonnummer">Telefonnummer</Label>
            <Input
              id="telefonnummer"
              name="telefonnummer"
              placeholder="z.B. 0123 456789"
              value={formData.telefonnummer}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              'Speichern'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
