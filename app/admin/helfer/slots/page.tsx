"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // Pfad anpassen, falls nötig
import { Aufgabe } from '@/lib/types'; // Annahme, dass es einen Typ Aufgabe gibt, ggf. anpassen oder neu definieren
import SlotManager from './SlotManager'; // Wird später implementiert

// Temporäre Definition, falls nicht in lib/types vorhanden
// interface Aufgabe {
//   id: string;
//   titel: string;
//   beschreibung?: string;
//   // Weitere Felder...
// }

const supabase = createClient();

export default function HelferSlotsPage() {
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAufgabe, setSelectedAufgabe] = useState<Aufgabe | null>(null);

  useEffect(() => {
    async function fetchAufgaben() {
      setLoading(true);
      const { data, error } = await supabase
        .from('helferaufgaben') // Annahme: Tabelle heißt 'helferaufgaben'
        .select('*')
        .eq('has_slots', true); // Nur Aufgaben mit aktiviertem has_slots-Marker anzeigen

      console.log('Supabase response in fetchAufgaben:', { data, error });

      if (error) {
        console.error('Fehler beim Laden der Aufgaben:', error);
        setError(error.message);
        setAufgaben([]);
      } else {
        setAufgaben(data || []);
        setError(null);
      }
      setLoading(false);
    }

    fetchAufgaben();
  }, []);

  if (loading) {
    return <div className="container mx-auto p-4">Lade Aufgaben...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Fehler: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Helfer-Zeiteinteilung (Slots)</h1>

      {selectedAufgabe ? (
        <div>
          <SlotManager aufgabe={selectedAufgabe} onBack={() => setSelectedAufgabe(null)} />
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Aufgabenübersicht</h2>
          {aufgaben.length === 0 ? (
            <p>Keine Aufgaben gefunden.</p>
          ) : (
            <ul className="space-y-4">
              {Array.isArray(aufgaben) && aufgaben.map((aufgabe) => (
                <li key={aufgabe.id} className="p-4 border rounded-lg shadow-sm bg-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">{aufgabe.titel}</h3>
                      {aufgabe.beschreibung && <p className="text-sm text-gray-600">{aufgabe.beschreibung}</p>}
                    </div>
                    <button 
                      onClick={() => setSelectedAufgabe(aufgabe)} 
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Slots verwalten
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
