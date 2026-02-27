import React from 'react';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Historie – Melsdörper Vagelscheeten',
  description: 'Die Königspaare vergangener Jahre beim Vogelschießen der Regenbogenschule Melsdorf.',
};

type HistorieEintrag = {
  id: string;
  jahr: number;
  klasse: string;
  koenig: string | null;
  koenigin: string | null;
  anmerkung: string | null;
};

export default async function HistoriePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('historie_eintraege')
    .select('*')
    .order('jahr', { ascending: false })
    .order('klasse');

  const eintraege: HistorieEintrag[] = data || [];
  const years = [...new Set(eintraege.map(e => e.jahr))].sort((a, b) => b - a);

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>
          👑 Historie
        </h1>
        <p className="text-lg text-gray-700">
          Die Königspaare vergangener Jahre – ein Rückblick auf die Geschichte des Melsdörper Vagelscheetens.
        </p>
      </div>

      {/* Geschichte */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Über das Vogelschießen</h2>
        <div className="text-gray-700 space-y-4 leading-relaxed">
          <p>
            Das Vogelschießen in Melsdorf hat eine lange Tradition und wird seit 1952 jährlich gefeiert.
            Was einst als einfaches Schulfest begann, hat sich zu einem der Höhepunkte im jährlichen
            Kalender der Regenbogenschule entwickelt.
          </p>
          <p>
            An diesem besonderen Tag treten die Kinder in verschiedenen Wettkampfspielen gegeneinander an.
            Die besten Jungen und Mädchen jeder Klassenstufe werden am Ende des Tages zu Königen und
            Königinnen gekrönt – eine Tradition, die bei den Kindern für unvergessliche Erinnerungen sorgt.
          </p>
        </div>
      </div>

      {/* Königspaare */}
      {years.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Noch keine Historie-Einträge vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {years.map((jahr) => {
            const jahrEintraege = eintraege.filter(e => e.jahr === jahr);
            return (
              <section key={jahr}>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="text-yellow-500 mr-2">👑</span>
                  {jahr}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full bg-white rounded-xl shadow-sm overflow-hidden">
                    <thead>
                      <tr className="bg-blue-50 text-blue-800">
                        <th className="py-3 px-4 text-left font-semibold">Klasse</th>
                        <th className="py-3 px-4 text-left font-semibold">♚ König</th>
                        <th className="py-3 px-4 text-left font-semibold">♛ Königin</th>
                        <th className="py-3 px-4 text-left font-semibold">Anmerkung</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {jahrEintraege.map((eintrag) => (
                        <tr key={eintrag.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-medium text-blue-600">{eintrag.klasse}</td>
                          <td className="py-3 px-4">{eintrag.koenig || '—'}</td>
                          <td className="py-3 px-4">{eintrag.koenigin || '—'}</td>
                          <td className="py-3 px-4 text-gray-500 text-sm">{eintrag.anmerkung || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
