import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MapPin, ChevronRight } from 'lucide-react';

export const revalidate = 0;

export default async function SpielbetreuerIndex() {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, name')
    .eq('ist_aktiv', true)
    .single();

  if (!event) {
    return (
      <div className="min-h-screen bg-pastel-yellow/30 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Kein aktives Event</h1>
          <p className="text-sm text-slate-500">Aktuell ist kein Vagelscheeten aktiv.</p>
        </div>
      </div>
    );
  }

  const [{ data: spiele }, { data: gruppen }, { data: statusData }, { data: klasseSpiele }] = await Promise.all([
    supabase.from('spiele').select('id, name, ort').order('name'),
    supabase.from('spielgruppen').select('id, klasse').eq('event_id', event.id),
    supabase.from('spielgruppe_spiel_status').select('spiel_id, spielgruppe_id').eq('event_id', event.id),
    // Spiel↔Klasse-Zuordnungen (nur Klassen des aktiven Events)
    supabase
      .from('klasse_spiele')
      .select('spiel_id, klassen!inner(name, event_id)')
      .eq('klassen.event_id', event.id),
  ]);

  // Anzahl Gruppen je Klassenname (im aktiven Event)
  const gruppenProKlasse = new Map<string, number>();
  for (const g of gruppen || []) {
    if (g.klasse) gruppenProKlasse.set(g.klasse, (gruppenProKlasse.get(g.klasse) || 0) + 1);
  }

  // Pro Spiel: Gesamtzahl der relevanten Gruppen (Summe über zugeordnete Klassen)
  const gruppenGesamtProSpiel = new Map<string, number>();
  for (const row of klasseSpiele || []) {
    const klasseName = (row as any).klassen?.name as string | undefined;
    if (!klasseName) continue;
    const anzahl = gruppenProKlasse.get(klasseName) || 0;
    gruppenGesamtProSpiel.set(row.spiel_id, (gruppenGesamtProSpiel.get(row.spiel_id) || 0) + anzahl);
  }

  // Pro Spiel: Anzahl abgeschlossen
  const abgeschlossenProSpiel = new Map<string, number>();
  for (const row of statusData || []) {
    abgeschlossenProSpiel.set(row.spiel_id, (abgeschlossenProSpiel.get(row.spiel_id) || 0) + 1);
  }

  return (
    <div className="min-h-screen bg-pastel-yellow/30">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-3 h-14 flex items-center max-w-2xl mx-auto">
          <div className="min-w-0">
            <div className="text-[17px] font-sans font-semibold text-slate-900 truncate leading-tight">
              Spielbetreuer
            </div>
            <div className="text-[13px] text-slate-500 leading-tight mt-0.5">{event.name}</div>
          </div>
        </div>
      </div>

      <div className="px-3 py-4 max-w-2xl mx-auto pb-12">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 px-1">
          Wähle dein Spiel
        </p>
        <div className="space-y-2">
          {(spiele || []).map((spiel) => {
            const erledigt = abgeschlossenProSpiel.get(spiel.id) || 0;
            const gruppenGesamt = gruppenGesamtProSpiel.get(spiel.id) || 0;
            const istKomplett = gruppenGesamt > 0 && erledigt >= gruppenGesamt;
            return (
              <Link
                key={spiel.id}
                href={`/spielbetreuer/${spiel.id}`}
                className="block bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-melsdorf-orange/60 hover:bg-melsdorf-orange/5 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-base text-slate-900 truncate">{spiel.name}</div>
                    {spiel.ort && (
                      <div className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1">
                        <MapPin size={11} className="shrink-0" />
                        {spiel.ort}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                        istKomplett
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {erledigt}/{gruppenGesamt}
                    </span>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </div>
              </Link>
            );
          })}
          {(!spiele || spiele.length === 0) && (
            <p className="text-sm text-slate-500 italic py-6 text-center">
              Keine Spiele konfiguriert.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
