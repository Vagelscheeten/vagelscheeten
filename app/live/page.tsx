import { createClient } from '@/lib/supabase/server';
import LiveContent from './LiveContent';
import Link from 'next/link';

export const revalidate = 0;

// Berlin-Datum (YYYY-MM-DD) für den heutigen Tag
function heuteInBerlin(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
}

function formatDatumDe(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default async function LivePage() {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, name, jahr, datum')
    .eq('ist_aktiv', true)
    .maybeSingle();

  // Admin-Override: eingeloggter User darf immer sehen (zum Testen vor dem Event-Tag)
  const { data: { user } } = await supabase.auth.getUser();
  const istAdmin = !!user;

  const heute = heuteInBerlin();
  const istEventTag = event?.datum === heute;

  if (!event) {
    return (
      <div className="min-h-screen bg-pastel-yellow/30 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md text-center">
          <div className="text-xl font-semibold text-slate-900 mb-2">Kein aktives Event</div>
          <p className="text-sm text-slate-500">Aktuell ist kein Vagelscheeten aktiv.</p>
        </div>
      </div>
    );
  }

  if (!istEventTag && !istAdmin) {
    return (
      <div className="min-h-screen bg-pastel-yellow/30 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md text-center">
          <div className="text-xl font-semibold text-slate-900 mb-2">Bald geht&apos;s los!</div>
          <p className="text-sm text-slate-600 mb-1">
            Der Live-Stand ist nur am Tag des {event.name} verfügbar.
          </p>
          <p className="text-sm font-medium text-melsdorf-orange">{formatDatumDe(event.datum)}</p>
          <Link
            href="/startseite"
            className="inline-block mt-5 text-sm font-medium text-slate-700 hover:text-slate-900 underline"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  return <LiveContent eventId={event.id} eventName={event.name} istEventTag={istEventTag} />;
}
