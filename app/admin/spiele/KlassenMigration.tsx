'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function KlassenMigration() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    klassesFound: number;
    klassesCreated: number;
    error?: string;
  } | null>(null);

  const migrateKlassen = async () => {
    setIsLoading(true);
    setResults(null);

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
        setResults({
          klassesFound: 0,
          klassesCreated: 0,
          error: 'Keine Klassen in den Kinderdaten gefunden'
        });
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

      // 5. Setze die Ergebnisse
      setResults({
        klassesFound: uniqueKlassen.length,
        klassesCreated: createdCount
      });

      toast.success(`${createdCount} Klassen wurden erfolgreich migriert.`);
    } catch (error: any) {
      console.error('Fehler bei der Klassenmigration:', error);
      setResults({
        klassesFound: 0,
        klassesCreated: 0,
        error: `Fehler: ${error.message || 'Unbekannter Fehler'}`
      });
      toast.error(`Fehler bei der Migration: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Klassen Migration</CardTitle>
        <CardDescription>
          Dieses Tool extrahiert alle einzigartigen Klassen aus der Kinderdatenbank und fügt sie in die Klassen-Tabelle ein.
          Dies ist notwendig, um Spiele zu Klassen zuzuweisen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={migrateKlassen} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Migration läuft...
            </>
          ) : 'Klassen migrieren'}
        </Button>

        {results && (
          <div className="mt-4 p-4 rounded-md bg-muted">
            <h3 className="font-medium mb-2">Ergebnis:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gefundene Klassen: {results.klassesFound}</li>
              <li>Neu erstellte Klassen: {results.klassesCreated}</li>
              {results.error && <li className="text-destructive">Fehler: {results.error}</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
