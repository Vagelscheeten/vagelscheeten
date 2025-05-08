import React from 'react';
import { createClient } from '@/lib/supabase/server';
import SpielCardClient from '@/app/spiele/SpielCardClient';
import { Spiel } from '@/components/SpielCard';

export default async function Spiele() {
  const supabase = await createClient();
  
  // Alle Spiele aus der Datenbank laden
  const { data: spiele, error } = await supabase
    .from('spiele')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Fehler beim Laden der Spiele:', error);
    return (
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-6">Unsere Spiele</h1>
        <p className="text-red-500">Fehler beim Laden der Spiele. Bitte versuchen Sie es später erneut.</p>
      </main>
    );
  }
  
  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Header-Sektion */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-8 mb-8 rounded-lg">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-600 mb-4">Unsere Spiele</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Hier findest du eine Übersicht aller Spiele beim Vogelschießen. Klicke auf ein Spiel, um mehr Details zu erfahren.
          </p>
        </div>
      </section>
      
      {/* Spieleliste */}
      <section className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spiele?.map((spiel) => (
            <SpielCardClient key={spiel.id} spiel={spiel as Spiel} />
          ))}
        </div>
      </section>
      
      {/* Hinweise für Eltern */}
      <section className="mb-12">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-blue-600">Hinweise für Eltern</h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              <span className="text-gray-700">Alle Spiele werden von geschulten Betreuern beaufsichtigt</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              <span className="text-gray-700">Die Teilnahme an den Spielen ist für alle Kinder kostenlos</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              <span className="text-gray-700">Für jede Klassenstufe sind bestimmte Spiele vorgesehen</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              <span className="text-gray-700">Die Ergebnisse werden für die Königswürden ausgewertet</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              <span className="text-gray-700">Bei Fragen wenden Sie sich bitte an die Spielbetreuer vor Ort</span>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
