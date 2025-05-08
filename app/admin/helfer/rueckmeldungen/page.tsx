'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { HeadingSection } from './HeadingSection';
import { RueckmeldungenTabelle } from './RueckmeldungenTabelle';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HelferRueckmeldung {
  id: string;
  kind_id: string;
  aufgabe_id: string;
  prioritaet: number;
  freitext: string | null;
  erstellt_am: string;
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
  aufgabe: {
    id: string;
    titel: string;
    beschreibung: string | null;
    bedarf: number;
  };
}

export default function RueckmeldungenVerwaltung() {
  const [isLoading, setIsLoading] = useState(true);
  const [rueckmeldungen, setRueckmeldungen] = useState<HelferRueckmeldung[]>([]);
  const [aufgaben, setAufgaben] = useState<{id: string, titel: string}[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();
  
  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      
      // Alle Aufgaben laden für Filter
      const { data: aufgabenData, error: aufgabenError } = await supabase
        .from('helferaufgaben')
        .select('id, titel')
        .order('titel');
      
      if (aufgabenError) {
        console.error('Fehler beim Laden der Aufgaben:', aufgabenError);
      } else {
        setAufgaben(aufgabenData || []);
      }
      
      // Rückmeldungen mit allen benötigten Relationen laden
      const { data: rueckmeldungenData, error: rueckmeldungenError } = await supabase
        .from('helfer_rueckmeldungen')
        .select(`
          *,
          kind:kinder(id, vorname, nachname, klasse),
          aufgabe:helferaufgaben(id, titel, beschreibung, bedarf)
        `);
      
      if (rueckmeldungenError) {
        console.error('Fehler beim Laden der Rückmeldungen:', rueckmeldungenError);
      } else {
        setRueckmeldungen(rueckmeldungenData || []);
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [refreshTrigger]);
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
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
      
      <RueckmeldungenTabelle 
        rueckmeldungen={rueckmeldungen}
        aufgaben={aufgaben}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />
    </main>
  );
}
