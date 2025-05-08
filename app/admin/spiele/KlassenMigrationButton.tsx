'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface KlassenMigrationButtonProps {
  onSuccess: () => void;
}

export default function KlassenMigrationButton({ onSuccess }: KlassenMigrationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const migrateKlassen = async () => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      // 1. Hole das aktive Event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('ist_aktiv', true)
        .single();

      if (eventError) throw eventError;
      if (!eventData) throw new Error('Kein aktives Event gefunden');

      const activeEventId = eventData.id;

      // 2. Hole alle einzigartigen Klassen aus der kinder-Tabelle für das aktive Event
      const { data: kinderData, error: kinderError } = await supabase
        .from('kinder')
        .select('klasse')
        .eq('event_id', activeEventId)
        .not('klasse', 'is', null);

      if (kinderError) throw kinderError;

      // Extrahiere einzigartige Klassen
      const uniqueKlassen = [...new Set(kinderData.map(k => k.klasse))].filter(Boolean);
      
      if (uniqueKlassen.length === 0) {
        toast.error('Keine Klassen in den Kinderdaten gefunden');
        return;
      }

      // 3. Prüfe, welche Klassen bereits in der klassen-Tabelle existieren
      const { data: existingKlassen, error: existingError } = await supabase
        .from('klassen')
        .select('name')
        .eq('event_id', activeEventId);

      if (existingError) throw existingError;
      
      const existingKlassenNames = new Set(existingKlassen?.map(k => k.name) || []);
      const klassenToCreate = uniqueKlassen.filter(k => !existingKlassenNames.has(k));

      // 4. Füge die fehlenden Klassen in die klassen-Tabelle ein
      let createdCount = 0;
      
      if (klassenToCreate.length > 0) {
        const klassenToInsert = klassenToCreate.map(name => ({
          name,
          event_id: activeEventId
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from('klassen')
          .insert(klassenToInsert)
          .select();

        if (insertError) throw insertError;
        createdCount = insertedData?.length || 0;
      }

      toast.success(`${createdCount} Klassen wurden erfolgreich importiert.`);
      
      // Rufe die onSuccess-Funktion auf, um die Daten neu zu laden
      onSuccess();
    } catch (error: any) {
      console.error('Fehler bei der Klassenmigration:', error);
      toast.error(`Fehler beim Import: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <Button 
        onClick={migrateKlassen} 
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Importiere...</span>
          </>
        ) : (
          <>
            <span>Klassen importieren</span>
          </>
        )}
      </Button>
      {showTooltip && (
        <div className="absolute right-0 mt-2 w-64 p-2 bg-black text-white text-xs rounded shadow-lg z-50">
          Importiert alle einzigartigen Klassen aus den vorhandenen Kinderdaten
        </div>
      )}
    </div>
  );
}
