'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { HeadingSection } from './HeadingSection';
import { ZuteilungListe } from './ZuteilungListe';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
  zeitfenster?: string;
}

interface Rueckmeldung {
  id: string;
  kind_id: string;
  aufgabe_id: string;
  prioritaet: number;
  freitext: string | null;
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
}

interface Zuteilung {
  id: string;
  kind_id: string;
  aufgabe_id: string;
  zugewiesen_am: string;
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
}

export default function ZuteilungVerwaltung() {
  const [isLoading, setIsLoading] = useState(true);
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [rueckmeldungen, setRueckmeldungen] = useState<Rueckmeldung[]>([]);
  const [zuteilungen, setZuteilungen] = useState<Zuteilung[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();
  
  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      
      try {
        // Aufgaben laden
        const { data: aufgabenData, error: aufgabenError } = await supabase
          .from('helferaufgaben')
          .select('*')
          .order('titel');
        
        if (aufgabenError) throw aufgabenError;
        setAufgaben(aufgabenData || []);
        
        // Rückmeldungen mit Kind-Daten und Aufgaben-Daten laden
        const { data: rueckmeldungenData, error: rueckmeldungenError } = await supabase
          .from('helfer_rueckmeldungen')
          .select(`
            *,
            kind:kinder(id, vorname, nachname, klasse),
            helferaufgaben(id, titel, beschreibung, bedarf, zeitfenster)
          `);
        
        if (rueckmeldungenError) throw rueckmeldungenError;
        setRueckmeldungen(rueckmeldungenData || []);
        
        // Zuteilungen mit Kind-Daten und externen Helfer-Daten laden
        const { data: zuteilungenData, error: zuteilungenError } = await supabase
          .from('helfer_zuteilungen')
          .select(`
            *,
            kind:kinder(id, vorname, nachname, klasse),
            externer_helfer:externe_helfer(id, name)
          `);
        
        if (zuteilungenError) throw zuteilungenError;
        setZuteilungen(zuteilungenData || []);
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [refreshTrigger]);
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Funktion zum Hinzufügen und Zuweisen eines externen Helfers
  const handleExternenHelferHinzufuegenUndZuweisen = async (name: string, aufgabeId: string): Promise<void> => {
    const supabase = createClient();
    
    try {
      // 1. Externen Helfer in der Datenbank anlegen
      const { data: helferData, error: helferError } = await supabase
        .from('externe_helfer')
        .insert({
          name: name
        })
        .select('id')
        .single();
      
      if (helferError) throw helferError;
      
      if (!helferData?.id) {
        throw new Error('Externer Helfer konnte nicht erstellt werden.');
      }
      
      // Die ausgewählte Aufgabe finden, um das Zeitfenster zu bekommen
      const aufgabe = aufgaben.find(a => a.id === aufgabeId);
      const zeitfenster = aufgabe?.zeitfenster || 'Nicht angegeben';
      
      // 2. Zuteilung für den externen Helfer erstellen
      const { error: zuteilungError } = await supabase
        .from('helfer_zuteilungen')
        .insert({
          externer_helfer_id: helferData.id,
          aufgabe_id: aufgabeId,
          zugewiesen_am: new Date().toISOString(),
          zeitfenster: zeitfenster
        });
      
      if (zuteilungError) throw zuteilungError;
      
      // Daten neu laden
      handleRefresh();
    } catch (error: any) {
      console.error('Fehler beim Hinzufügen des externen Helfers:', error);
      throw error;
    }
  };
  
  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <HeadingSection />
        <Button 
          variant="outline" 
          onClick={() => router.push('/admin/helfer')}
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Übersicht
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-8 w-8 border-2 border-gray-500 rounded-full border-t-transparent"></div>
        </div>
      ) : (
        <ZuteilungListe 
          aufgaben={aufgaben}
          rueckmeldungen={rueckmeldungen}
          zuteilungen={zuteilungen}
          onRefresh={handleRefresh}
          onExternerHelferHinzufuegen={handleExternenHelferHinzufuegenUndZuweisen}
        />
      )}
    </main>
  );
}
