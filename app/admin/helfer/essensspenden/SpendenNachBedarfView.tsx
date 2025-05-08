'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SpendenBedarf, SpendenRueckmeldung } from './SpendenView';
import { SpendenBedarfCard } from './SpendenBedarfCard';

// Erweiterte Schnittstelle mit Zuteilungen
interface SpendenBedarfMitZuteilungen extends SpendenBedarf {
  summeRueckmeldungen: number;
  prozentAbdeckung: number;
  zuteilungen: SpendenRueckmeldung[];
  farbe: string;
}

// Farbpalette für verschiedene Spendenkategorien
const FARBEN = [
  'bg-amber-500', // Kuchen
  'bg-purple-500', // Muffins
  'bg-brown-500', // Kaffee
  'bg-green-500',
  'bg-blue-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-orange-500',
  'bg-teal-500',
];

export function SpendenNachBedarfView() {
  const [bedarfe, setBedarfe] = useState<SpendenBedarfMitZuteilungen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      
      try {
        // Bedarfe laden
        const { data: bedarfeData, error: bedarfeError } = await supabase
          .from('essensspenden_bedarf')
          .select('*')
          .order('titel');
        
        if (bedarfeError) throw bedarfeError;
        
        // Rückmeldungen laden
        const { data: rueckmeldungenData, error: rueckmeldungenError } = await supabase
          .from('essensspenden_rueckmeldungen')
          .select(`
            *,
            spende:spende_id(id, titel, beschreibung, anzahl_benoetigt)
          `)
          .order('erstellt_am', { ascending: false });
        
        if (rueckmeldungenError) throw rueckmeldungenError;
        
        // Bedarfe mit Zuteilungen und Farben anreichern
        const bedarfeMitZuteilungen = bedarfeData?.map((bedarf, index) => {
          const zuteilungen = rueckmeldungenData?.filter(r => r.spende_id === bedarf.id) || [];
          const summeRueckmeldungen = zuteilungen.reduce((sum, r) => sum + r.menge, 0);
          const prozentAbdeckung = bedarf.anzahl_benoetigt > 0 
            ? Math.min(100, Math.round((summeRueckmeldungen / bedarf.anzahl_benoetigt) * 100)) 
            : 0;
          
          return {
            ...bedarf,
            summeRueckmeldungen,
            prozentAbdeckung,
            zuteilungen,
            farbe: FARBEN[index % FARBEN.length]
          };
        }) || [];
        
        setBedarfe(bedarfeMitZuteilungen);
      } catch (error: any) {
        console.error('Fehler beim Laden der Daten:', error);
        toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [refreshTrigger]);

  // Callback nach Änderungen
  const handleChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Essensspenden nach Bedarf</h2>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Lade Daten...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bedarfe.map(bedarf => (
            <SpendenBedarfCard 
              key={bedarf.id} 
              bedarf={bedarf} 
              onChange={handleChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
