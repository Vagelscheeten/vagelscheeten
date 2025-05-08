import React from 'react';
import { createClient } from '@/lib/supabase/server';

// Typ für einen historischen Eintrag
interface HistoricalEntry {
  id: string;
  year: number;
  class: string;
  king?: string;
  queen?: string;
  notes?: string;
}

// Statische Daten für die Entwicklung
const historicalData: HistoricalEntry[] = [
  { id: '1', year: 2024, class: 'Klasse 1', king: 'Max Müller', queen: 'Emma Schmidt' },
  { id: '2', year: 2024, class: 'Klasse 2', king: 'Paul Weber', queen: 'Lena Hoffmann' },
  { id: '3', year: 2024, class: 'Klasse 3', king: 'Felix Becker', queen: 'Sophie Meyer' },
  { id: '4', year: 2024, class: 'Klasse 4', king: 'Noah Fischer', queen: 'Mia Wagner' },
  { id: '5', year: 2023, class: 'Klasse 1', king: 'Ben Schulz', queen: 'Lina Richter' },
  { id: '6', year: 2023, class: 'Klasse 2', king: 'Tim Krause', queen: 'Hannah Schuster' },
  { id: '7', year: 2023, class: 'Klasse 3', king: 'Lukas Neumann', queen: 'Laura Braun' },
  { id: '8', year: 2023, class: 'Klasse 4', king: 'Jonas Wolf', queen: 'Leonie Schwarz' },
  { id: '9', year: 2022, class: 'Klasse 1', king: 'Elias Zimmermann', queen: 'Sophia Koch' },
  { id: '10', year: 2022, class: 'Klasse 2', king: 'Niklas Bauer', queen: 'Anna Hartmann' },
  { id: '11', year: 2022, class: 'Klasse 3', king: 'Julian Lange', queen: 'Julia Kraus' },
  { id: '12', year: 2022, class: 'Klasse 4', king: 'David Schmitt', queen: 'Amelie Schröder' },
  { id: '13', year: 2021, class: 'Klasse 1', king: 'Luca Hofmann', queen: 'Emilia Maier' },
  { id: '14', year: 2021, class: 'Klasse 2', king: 'Finn Walter', queen: 'Marie Berger' },
  { id: '15', year: 2021, class: 'Klasse 3', king: 'Leon Keller', queen: 'Lara Huber' },
  { id: '16', year: 2021, class: 'Klasse 4', king: 'Jan Peters', queen: 'Johanna Fuchs' },
];

export default async function Historie() {
  // Später könnten wir die Daten aus Supabase laden
  // const supabase = await createClient();
  // const { data, error } = await supabase.from('historie').select('*').order('year', { ascending: false });
  
  // Daten nach Jahr gruppieren
  const entriesByYear: Record<number, HistoricalEntry[]> = {};
  historicalData.forEach(entry => {
    if (!entriesByYear[entry.year]) {
      entriesByYear[entry.year] = [];
    }
    entriesByYear[entry.year].push(entry);
  });
  
  // Jahre in absteigender Reihenfolge sortieren
  const years = Object.keys(entriesByYear).map(Number).sort((a, b) => b - a);
  
  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">🏆 Historie</h1>
        <p className="text-lg text-gray-700">
          Die Geschichte des Vogelschießens der Regenbogenschule Melsdorf, besondere Momente 
          und die Liste aller bisherigen Königinnen und Könige seit 1952.
        </p>
      </div>
      
      {/* Geschichte des Vogelschießens */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Geschichte des Vogelschießens</h2>
        <div className="prose max-w-none">
          <p>
            Das Vogelschießen an der Regenbogenschule Melsdorf hat eine lange Tradition, die bis ins Jahr 1952 zurückreicht. 
            Ursprünglich aus alten Schützenfesten hervorgegangen, wurde es als kindgerechtes Schulfest neu interpretiert 
            und hat sich seitdem zu einem festen Bestandteil des Schullebens entwickelt.
          </p>
          <p className="mt-4">
            In den Anfängen wurde tatsächlich mit kleinen Armbrusten auf einen hölzernen Vogel geschossen. 
            Im Laufe der Jahre kamen immer mehr Spiele hinzu, und heute umfasst das Vogelschießen eine Vielzahl 
            von Aktivitäten, die Geschicklichkeit, Konzentration und Teamgeist fördern.
          </p>
          <p className="mt-4">
            Der traditionelle Umzug durch Melsdorf, die feierliche Königsproklamation und das gemeinsame Feiern 
            sind bis heute wichtige Elemente des Festes geblieben und verbinden Generationen von Schülerinnen und Schülern.
          </p>
        </div>
      </div>
      
      {/* Ehrentafel der Königspaare */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Ehrentafel der Königspaare</h2>
        <p className="mb-6 text-gray-700">
          Hier finden Sie alle Königspaare der vergangenen Jahre, sortiert nach Jahr und Klassenstufe.
        </p>
        
        <div className="space-y-8">
          {years.map(year => (
            <div key={year}>
              <h3 className="text-xl font-semibold mb-4 bg-blue-50 p-2 rounded">{year}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-2 px-4 border-b text-left font-medium">Klassenstufe</th>
                      <th className="py-2 px-4 border-b text-left font-medium">König</th>
                      <th className="py-2 px-4 border-b text-left font-medium">Königin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {entriesByYear[year].map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">{entry.class}</td>
                        <td className="py-3 px-4">{entry.king || '-'}</td>
                        <td className="py-3 px-4">{entry.queen || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Besondere Momente */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Besondere Momente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">🎉</div>
            <h3 className="text-xl font-semibold mb-2">50-jähriges Jubiläum (2002)</h3>
            <p className="text-gray-600">Zum 50. Jubiläum wurde ein besonders großes Fest mit ehemaligen Schülern und Lehrern gefeiert. Viele ehemalige Königspaare waren zu Gast.</p>
          </div>
          
          <div className="bg-white p-5 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">🌟</div>
            <h3 className="text-xl font-semibold mb-2">Neue Spiele (2015)</h3>
            <p className="text-gray-600">2015 wurden mehrere neue Spiele eingeführt, darunter das heute sehr beliebte Glücksrad und der Gummistiefelweitwurf.</p>
          </div>
          
          <div className="bg-white p-5 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">🌧️</div>
            <h3 className="text-xl font-semibold mb-2">Das Regenjahr (2010)</h3>
            <p className="text-gray-600">2010 fand das Vogelschießen trotz starken Regens statt. Die Spiele wurden kurzerhand in die Sporthalle verlegt.</p>
          </div>
          
          <div className="bg-white p-5 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">📺</div>
            <h3 className="text-xl font-semibold mb-2">Fernsehbeitrag (2018)</h3>
            <p className="text-gray-600">2018 berichtete der NDR über unser Vogelschießen und zeigte einen kurzen Beitrag in der Regionalsendung.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
