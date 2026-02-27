import React from 'react';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Ablauf & Umzug – Melsdörper Vagelscheeten',
  description: 'Der zeitliche Ablauf des Vogelschießens der Regenbogenschule Melsdorf mit Umzugsroute und wichtigen Hinweisen.',
};

type AblaufEintrag = {
  id: string;
  uhrzeit: string;
  titel: string;
  beschreibung: string | null;
  icon: string | null;
  farbe: string;
  sortierung: number;
  ist_highlight: boolean;
  hinweis: string | null;
};

export default async function AblaufUndUmzug() {
  const supabase = await createClient();

  // Get active event and its ablauf entries
  const { data: event } = await supabase
    .from('events')
    .select('id, name, jahr, datum')
    .eq('ist_aktiv', true)
    .single();

  let eintraege: AblaufEintrag[] = [];
  if (event) {
    const { data } = await supabase
      .from('ablauf_eintraege')
      .select('*')
      .eq('event_id', event.id)
      .order('sortierung');
    eintraege = data || [];
  }

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">🗺️ Ablauf & Umzug</h1>
        <p className="text-lg text-gray-700">
          Hier findest du alle Informationen zum zeitlichen Ablauf des Vogelschießens,
          zur Umzugsroute und zu wichtigen Hinweisen für Anwohner.
        </p>
      </div>

      {/* Tagesablauf */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <span className="mr-2">⏰</span> Tagesablauf {event?.jahr || ''}
        </h2>

        {eintraege.length === 0 ? (
          <p className="text-gray-500">Noch kein Ablaufplan verfügbar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-blue-50 text-blue-800">
                  <th className="py-3 px-4 text-left font-semibold w-12"></th>
                  <th className="py-3 px-4 text-left font-semibold">Uhrzeit</th>
                  <th className="py-3 px-4 text-left font-semibold">Programmpunkt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {eintraege.map((eintrag) => (
                  <tr key={eintrag.id} className={eintrag.ist_highlight ? 'bg-yellow-50' : ''}>
                    <td className="py-3 px-4 text-xl">{eintrag.icon || '📌'}</td>
                    <td className="py-3 px-4 font-medium whitespace-nowrap">{eintrag.uhrzeit}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{eintrag.titel}</div>
                      {eintrag.beschreibung && (
                        <div className="text-gray-600 text-sm mt-1">{eintrag.beschreibung}</div>
                      )}
                      {eintrag.hinweis && (
                        <div className="text-red-600 text-sm mt-1 font-medium">⚠️ {eintrag.hinweis}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">
          (Der genaue Ablauf kann variieren – aktuelle Informationen erhalten Sie am Veranstaltungstag)
        </p>
      </div>

      {/* Umzugsroute */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <span className="mr-2">🚍</span> Umzugsroute
        </h2>
        <p className="mb-6 text-gray-700">
          Der traditionelle Festumzug führt durch das geschmückte Dorf Melsdorf.
          Der Umzug dauert ca. 45 Minuten.
        </p>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <h3 className="font-bold text-yellow-800">Hinweise für Anwohner</h3>
          <p className="text-yellow-700">
            Während des Umzugs kann es zu kurzzeitigen Verkehrsbehinderungen kommen.
            Die Straßen werden nicht gesperrt, aber wir bitten um Rücksichtnahme auf den Festumzug.
          </p>
        </div>
      </div>

      {/* Weitere Informationen */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Weitere Informationen</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Bei Regen findet das Vogelschießen trotzdem statt (ggf. in der Sporthalle)</li>
          <li>Eltern sind herzlich eingeladen, den Tag zu begleiten</li>
          <li>Für Verpflegung ist gesorgt (Kaffee, Kuchen)</li>
          <li>Bitte achten Sie auf wetterfeste Kleidung der Kinder</li>
          <li>Parken ist auf dem Parkplatz der Schule und in den umliegenden Straßen möglich</li>
        </ul>
      </div>
    </main>
  );
}
