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

interface Helferaufgabe {
  id: string;
  titel: string;
  beschreibung?: string | null;
  bedarf?: number;
  ist_teamleiter_aufgabe?: boolean;
}

interface SpringerZuteilung {
  id: string;
  kind_id: string;
  ist_springer: boolean;
  zeitfenster?: 'vormittag' | 'nachmittag' | 'beides' | null;
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
  zuteilungen?: {
    id: string;
    aufgabe_id: string;
    aufgabe_titel: string;
  }[];
}

export default function RueckmeldungenVerwaltung() {
  const [rueckmeldungen, setRueckmeldungen] = useState<HelferRueckmeldung[]>([]);
  const [springer, setSpringer] = useState<SpringerZuteilung[]>([]);
  const [aufgaben, setAufgaben] = useState<Helferaufgabe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();

  async function fetchData() {
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // ==========================================
      // ALLE HELFER-RÜCKMELDUNGEN LADEN
      // ==========================================
      console.log('Lade ALLE Helfer-Rückmeldungen...');
      
      const { data: alleRueckmeldungenData, error: rueckmeldungenError } = await supabase
        .from('helfer_rueckmeldungen')
        .select(`
          id,
          kind_id,
          aufgabe_id,
          ist_springer,
          prioritaet,
          freitext,
          erstellt_am,
          zeitfenster,
          kind:kinder(id, vorname, nachname, klasse),
          aufgabe:helferaufgaben(id, titel, beschreibung, bedarf)
        `);
      
      if (rueckmeldungenError) {
        console.error('Fehler beim Laden der Rückmeldungen:', rueckmeldungenError);
        return;
      }
      
      console.log('Geladene Rückmeldungen (ALLE):', alleRueckmeldungenData?.length || 0);
      console.log('Rohdaten (erste 3):', alleRueckmeldungenData?.slice(0, 3));
      
      // Teile die Daten in Springer und normale Helfer
      const springerRueckmeldungen = alleRueckmeldungenData?.filter(r => r.ist_springer === true) || [];
      const normaleRueckmeldungen = alleRueckmeldungenData?.filter(r => r.ist_springer !== true) || [];
      
      console.log('Normale Rückmeldungen:', normaleRueckmeldungen.length);
      console.log('Springer:', springerRueckmeldungen.length);

      // Entferne redundante Springer-Abfrage, da wir schon alle Daten haben
      console.log('Springer bereits geladen:', springerRueckmeldungen.length);

      const { data: alleZuteilungen, error: zuteilungenError } = await supabase
        .from('helfer_zuteilungen')
        .select(`
          id,
          kind_id,
          aufgabe_id,
          aufgabe:helferaufgaben(id, titel)
        `);

      if (zuteilungenError) {
        console.error('Fehler beim Laden der Zuteilungen:', zuteilungenError);
      }

      const zuteilungenProKind: Record<string, { id: string; aufgabe_id: string; aufgabe_titel: string }[]> = {};

      if (alleZuteilungen) {
        alleZuteilungen.forEach(zuteilung => {
          if (zuteilung.kind_id) {
            if (!zuteilungenProKind[zuteilung.kind_id]) {
              zuteilungenProKind[zuteilung.kind_id] = [];
            }

            zuteilungenProKind[zuteilung.kind_id].push({
              id: zuteilung.id,
              aufgabe_id: zuteilung.aufgabe_id,
              aufgabe_titel: (() => {
                if (!zuteilung.aufgabe) return 'Unbekannte Aufgabe';
                if (Array.isArray(zuteilung.aufgabe) && zuteilung.aufgabe[0]?.titel) {
                  return zuteilung.aufgabe[0].titel;
                } 
                // @ts-ignore - Hier wird die titel-Eigenschaft dynamisch abgefragt
                if (zuteilung.aufgabe.titel) return zuteilung.aufgabe.titel;
                return 'Unbekannte Aufgabe';
              })(),
            });
          }
        });
      }

      // Verarbeite Springer-Daten
      const formattedSpringerData = springerRueckmeldungen.map(springer => {
        // Kind-Objekt richtig konvertieren (Supabase gibt manchmal ein Array, manchmal ein Objekt zurück)
        const kindData = Array.isArray(springer.kind) ? springer.kind[0] : springer.kind;
        
        return {
          id: springer.id,
          kind_id: springer.kind_id,
          ist_springer: springer.ist_springer,
          zeitfenster: springer.zeitfenster,
          kind: kindData ? {
            id: kindData.id || '',
            vorname: kindData.vorname || '',
            nachname: kindData.nachname || '',
            klasse: kindData.klasse
          } : null,
          zuteilungen: zuteilungenProKind[springer.kind_id] || []
        };
      });

      // Verarbeite normale Helfer-Rückmeldungen
      const formattedNormalHelferData = normaleRueckmeldungen.map(item => {
        // Daten normalisieren
        const kindData = Array.isArray(item.kind) ? item.kind[0] : item.kind;
        const aufgabeData = Array.isArray(item.aufgabe) ? item.aufgabe[0] : item.aufgabe;
        
        return {
          id: item.id,
          kind_id: item.kind_id,
          aufgabe_id: item.aufgabe_id,
          prioritaet: item.prioritaet || 0,
          freitext: item.freitext,
          erstellt_am: item.erstellt_am,
          // WICHTIG: Auch normale Helfer bekommen Zuteilungen
          zuteilungen: zuteilungenProKind[item.kind_id] || [],
          kind: kindData ? {
            id: kindData.id,
            vorname: kindData.vorname,
            nachname: kindData.nachname,
            klasse: kindData.klasse
          } : null,
          aufgabe: aufgabeData ? {
            id: aufgabeData.id,
            titel: aufgabeData.titel,
            beschreibung: aufgabeData.beschreibung,
            bedarf: aufgabeData.bedarf
          } : null
        };
      });
      
      // Helferaufgaben laden
      const { data: aufgabenData, error: aufgabenError } = await supabase
        .from('helferaufgaben')
        .select('id, titel, beschreibung, bedarf')
        .order('titel');

      if (aufgabenError) {
        console.error('Fehler beim Laden der Aufgaben:', aufgabenError);
      }
      
      // Daten setzen
      setRueckmeldungen(formattedNormalHelferData);
      setSpringer(formattedSpringerData);
      setAufgaben(aufgabenData || []);
      
      console.log('Rueckmeldungen-Array-Größe:', formattedNormalHelferData.length);
      console.log('Springer-Array-Größe:', formattedSpringerData.length);
      console.log('RÜCKMELDUNGEN:', formattedNormalHelferData);
      
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleBack = () => {
    router.push('/admin/dashboard');
  };

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <HeadingSection />
        <Button variant="outline" onClick={handleBack} size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Übersicht
        </Button>
      </div>

      <RueckmeldungenTabelle
        rueckmeldungen={rueckmeldungen}
        springer={springer}
        aufgaben={aufgaben}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />
    </main>
  );
}
