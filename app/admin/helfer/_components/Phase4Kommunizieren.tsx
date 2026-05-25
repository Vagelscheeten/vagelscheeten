'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, CheckCircle2, AlertCircle, Info, Send, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Phase4KommunizierenProps {
  eventId: string;
  onRefresh: () => void;
}

interface BenachrichtigungsStats {
  zuSenden: number;
  bereitsGesendet: number;
  ohneEmail: number;
}

interface MitbringStatus {
  anzahlEintraege: number;
  hatPdf: boolean;
}

interface FilterOption { id: string; titel: string }

interface VorschauData {
  anmeldungId?: string;
  kindName?: string;
  kindKlasse?: string;
  elternEmail?: string;
  subject?: string;
  html?: string;
  hatZuteilung?: boolean;
  poolSize: number;
  currentIndex?: number;
  filterOptions?: {
    klassen: string[];
    aufgaben: FilterOption[];
    spenden: FilterOption[];
  };
  error?: string;
}

export function Phase4Kommunizieren({ eventId, onRefresh }: Phase4KommunizierenProps) {
  const [stats, setStats] = useState<BenachrichtigungsStats | null>(null);
  const [vorschau, setVorschau] = useState<VorschauData | null>(null);
  const [vorschauIndex, setVorschauIndex] = useState(0);
  const [filterKlasse, setFilterKlasse] = useState('');
  const [filterAufgabe, setFilterAufgabe] = useState('');
  const [filterSpende, setFilterSpende] = useState('');
  const [vorschauLoading, setVorschauLoading] = useState(false);
  const [mitbringStatus, setMitbringStatus] = useState<MitbringStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [ergebnis, setErgebnis] = useState<{ gesendet: number; fehler: number } | null>(null);

  const ladeStats = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { data: anmeldungen } = await supabase
      .from('anmeldungen')
      .select('id, eltern_email, benachrichtigt_am')
      .eq('event_id', eventId)
      .eq('verifiziert', true);

    if (anmeldungen) {
      const bereitsGesendet = anmeldungen.filter((a) => a.benachrichtigt_am).length;
      const mitEmail = anmeldungen.filter((a) => a.eltern_email && !a.benachrichtigt_am);
      const ohneEmail = anmeldungen.filter((a) => !a.eltern_email && !a.benachrichtigt_am);
      setStats({
        zuSenden: mitEmail.length,
        bereitsGesendet,
        ohneEmail: ohneEmail.length,
      });
    }

    const [eintragRes, eventRes] = await Promise.all([
      supabase
        .from('mitbringliste_eintraege')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId),
      supabase
        .from('events')
        .select('mitbringliste_pdf_filename')
        .eq('id', eventId)
        .single(),
    ]);
    setMitbringStatus({
      anzahlEintraege: eintragRes.count || 0,
      hatPdf: !!eventRes.data?.mitbringliste_pdf_filename,
    });

    setIsLoading(false);
  }, [eventId]);

  const ladeVorschau = useCallback(
    async (index: number, klasse: string, aufgabe: string, spende: string) => {
      setVorschauLoading(true);
      try {
        const params = new URLSearchParams({ eventId, index: String(index) });
        if (klasse) params.set('klasse', klasse);
        if (aufgabe) params.set('aufgabe', aufgabe);
        if (spende) params.set('spende', spende);
        const res = await fetch(`/api/helfer/benachrichtigung/vorschau?${params.toString()}`);
        if (res.ok) {
          const data: VorschauData = await res.json();
          setVorschau(data);
        } else {
          setVorschau(null);
        }
      } catch {
        setVorschau(null);
      } finally {
        setVorschauLoading(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    ladeStats();
  }, [ladeStats]);

  // Bei Filter-Änderung Index auf 0 zurücksetzen
  useEffect(() => {
    setVorschauIndex(0);
  }, [filterKlasse, filterAufgabe, filterSpende]);

  useEffect(() => {
    ladeVorschau(vorschauIndex, filterKlasse, filterAufgabe, filterSpende);
  }, [ladeVorschau, vorschauIndex, filterKlasse, filterAufgabe, filterSpende]);

  const handleSenden = async () => {
    setConfirming(false);
    setIsSending(true);
    setErgebnis(null);

    try {
      const res = await fetch('/api/helfer/benachrichtigung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });

      const data = await res.json();

      if (data.erfolg) {
        setErgebnis({ gesendet: data.gesendet, fehler: data.fehler || 0 });
        toast.success(`${data.gesendet} E-Mails gesendet`);
        ladeStats();
        ladeVorschau(vorschauIndex, filterKlasse, filterAufgabe, filterSpende);
        onRefresh();
      } else {
        toast.error(data.error || 'Fehler beim Senden');
      }
    } catch {
      toast.error('Fehler beim Senden');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" size={24} /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Eltern-Benachrichtigung</p>
          <p>Es werden E-Mails an alle verifizierten Anmeldungen gesendet, die noch nicht benachrichtigt wurden. Jede E-Mail enthält die zugeteilte Helfer-Aufgabe.</p>
        </div>
      </div>

      {/* Status-Karten */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.zuSenden}</div>
            <div className="text-xs text-slate-500 mt-1">Zu senden</div>
          </div>
          <div className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.bereitsGesendet}</div>
            <div className="text-xs text-slate-500 mt-1">Bereits gesendet</div>
          </div>
          <div className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-400">{stats.ohneEmail}</div>
            <div className="text-xs text-slate-500 mt-1">Ohne E-Mail</div>
          </div>
        </div>
      )}

      {/* Hinweis: externe Helfer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-sm text-amber-800">
        <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
        <span>Manuell hinzugefügte und externe Helfer werden nicht per E-Mail benachrichtigt — bitte direkt kontaktieren.</span>
      </div>

      {/* Warnung: Mitbringliste nicht vollständig konfiguriert */}
      {mitbringStatus && (mitbringStatus.anzahlEintraege === 0 || !mitbringStatus.hatPdf) && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex gap-2 text-sm text-amber-900">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <div className="font-semibold mb-0.5">Mitbringliste nicht vollständig konfiguriert</div>
            <ul className="list-disc list-inside space-y-0.5">
              {mitbringStatus.anzahlEintraege === 0 && (
                <li>Keine Listeneinträge gepflegt — der entsprechende Abschnitt in der E-Mail entfällt.</li>
              )}
              {!mitbringStatus.hatPdf && (
                <li>Kein PDF verknüpft — der Download-Link in der E-Mail entfällt.</li>
              )}
            </ul>
            <Link
              href="/admin/mitbringliste"
              className="inline-flex items-center gap-1 mt-1.5 text-amber-900 hover:text-amber-950 underline"
            >
              Jetzt konfigurieren <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      )}

      {/* Echte E-Mail-Vorschau mit Filter + Navigation */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">E-Mail-Vorschau</h3>

        {/* Filter-Leiste */}
        <div className="flex flex-wrap items-center gap-2 mb-3 bg-white border rounded-xl p-3">
          <select
            value={filterKlasse}
            onChange={(e) => setFilterKlasse(e.target.value)}
            className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white"
          >
            <option value="">Alle Klassen</option>
            {(vorschau?.filterOptions?.klassen || []).map((k) => (
              <option key={k} value={k}>Klasse {k}</option>
            ))}
          </select>
          <select
            value={filterAufgabe}
            onChange={(e) => setFilterAufgabe(e.target.value)}
            className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white"
          >
            <option value="">Alle Aufgaben</option>
            <option value="keine">— Keine Aufgabe —</option>
            {(vorschau?.filterOptions?.aufgaben || []).map((a) => (
              <option key={a.id} value={a.id}>Aufgabe: {a.titel}</option>
            ))}
          </select>
          <select
            value={filterSpende}
            onChange={(e) => setFilterSpende(e.target.value)}
            className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white"
          >
            <option value="">Alle Essensspenden</option>
            <option value="keine">— Keine Essensspende —</option>
            {(vorschau?.filterOptions?.spenden || []).map((s) => (
              <option key={s.id} value={s.id}>Spende: {s.titel}</option>
            ))}
          </select>
          {(filterKlasse || filterAufgabe || filterSpende) && (
            <button
              onClick={() => { setFilterKlasse(''); setFilterAufgabe(''); setFilterSpende(''); }}
              className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
            >
              Filter zurücksetzen
            </button>
          )}

          {/* Navigation */}
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVorschauIndex((i) => Math.max(0, i - 1))}
              disabled={vorschauLoading || !vorschau || vorschau.poolSize === 0 || (vorschau.currentIndex || 0) === 0}
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="text-xs text-slate-600 px-2 min-w-[80px] text-center">
              {vorschau && vorschau.poolSize > 0
                ? `${(vorschau.currentIndex || 0) + 1} / ${vorschau.poolSize}`
                : '0 / 0'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVorschauIndex((i) => i + 1)}
              disabled={vorschauLoading || !vorschau || vorschau.poolSize === 0 || ((vorschau.currentIndex || 0) + 1) >= vorschau.poolSize}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>

        {vorschauLoading && !vorschau ? (
          <div className="bg-white border rounded-xl p-8 flex justify-center">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : vorschau && vorschau.html ? (
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b px-4 py-3 text-sm space-y-0.5">
              <div className="flex gap-2">
                <span className="text-slate-400 w-16 shrink-0">Von:</span>
                <span className="text-slate-700">Orgateam Vagelscheeten &lt;orgateam@vagelscheeten.de&gt;</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 w-16 shrink-0">An:</span>
                <span className="text-slate-700">{vorschau.elternEmail}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 w-16 shrink-0">Betreff:</span>
                <span className="text-slate-700 font-medium">{vorschau.subject}</span>
              </div>
              <div className="flex gap-2 pt-1 mt-1 border-t text-xs text-slate-500">
                <span className="w-16 shrink-0">Familie:</span>
                <span>
                  {vorschau.kindName}{vorschau.kindKlasse ? ` (Klasse ${vorschau.kindKlasse})` : ''}
                  {vorschau.hatZuteilung === false && (
                    <span className="ml-2 text-amber-600">— ohne Helfer-Zuteilung</span>
                  )}
                </span>
              </div>
            </div>
            <iframe
              title="E-Mail-Vorschau"
              srcDoc={vorschau.html}
              sandbox=""
              className="w-full bg-white"
              style={{ height: '650px', border: 'none' }}
            />
          </div>
        ) : (
          <div className="bg-white border rounded-xl p-8 text-center text-sm text-slate-500">
            <Mail size={32} className="mx-auto mb-2 text-slate-300" />
            {vorschau?.error || 'Keine Anmeldung für Vorschau verfügbar.'}
          </div>
        )}
      </div>

      {/* Sende-Button */}
      {stats && stats.zuSenden > 0 && !ergebnis && (
        <>
          {!confirming ? (
            <Button
              onClick={() => setConfirming(true)}
              disabled={isSending}
              className="w-full gap-2"
              size="lg"
            >
              <Send size={16} />
              {stats.zuSenden} Eltern benachrichtigen
            </Button>
          ) : (
            <div className="bg-slate-50 border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">E-Mails wirklich senden?</p>
              <p className="text-sm text-slate-600">Es werden {stats.zuSenden} E-Mails gesendet. Diese Aktion kann nicht rückgängig gemacht werden.</p>
              <div className="flex gap-2">
                <Button onClick={handleSenden} disabled={isSending} className="gap-2">
                  {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Ja, jetzt senden
                </Button>
                <Button variant="outline" onClick={() => setConfirming(false)}>Abbrechen</Button>
              </div>
            </div>
          )}
        </>
      )}

      {stats && stats.zuSenden === 0 && stats.bereitsGesendet > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
          <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-semibold">Alle Eltern wurden bereits benachrichtigt.</p>
            <p className="mt-0.5">{stats.bereitsGesendet} E-Mails gesendet.</p>
          </div>
        </div>
      )}

      {/* Ergebnis */}
      {ergebnis && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
          <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-semibold">{ergebnis.gesendet} E-Mails erfolgreich gesendet.</p>
            {ergebnis.fehler > 0 && (
              <p className="text-amber-700 mt-0.5">{ergebnis.fehler} Fehler beim Senden.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
