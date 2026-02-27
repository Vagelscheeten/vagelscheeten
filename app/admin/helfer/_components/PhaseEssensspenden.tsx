'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Zap, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Bedarf {
  id: string;
  titel: string;
  anzahl_benoetigt: number;
  anzahlBestaetigt: number;
}

interface Zuteilung {
  id: string;
  kind_identifier: string;
  menge: number;
  anmerkung: string | null;
}

interface AutoErgebnis {
  bestaetigt: number;
  umgeteilt: number;
  luecken: { titel: string; fehlend: number }[];
}

interface PhaseEssensspendenProps {
  eventId: string;
  onRefresh: () => void;
}

export function PhaseEssensspenden({ eventId, onRefresh }: PhaseEssensspendenProps) {
  const [bedarfe, setBedarfe] = useState<Bedarf[]>([]);
  const [zuteilungenMap, setZuteilungenMap] = useState<Record<string, Zuteilung[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [ergebnis, setErgebnis] = useState<AutoErgebnis | null>(null);

  const ladeBedarfe = useCallback(async () => {
    const supabase = createClient();

    const { data: bedarfeDaten } = await supabase
      .from('essensspenden_bedarf')
      .select('id, titel, anzahl_benoetigt')
      .eq('event_id', eventId)
      .order('titel');

    if (!bedarfeDaten || bedarfeDaten.length === 0) {
      setBedarfe([]);
      setIsLoading(false);
      return;
    }

    // Bestätigte Rückmeldungen pro Bedarf laden
    const { data: rueckmeldungen } = await supabase
      .from('essensspenden_rueckmeldungen')
      .select('id, spende_id, menge, kind_identifier, anmerkung')
      .eq('event_id', eventId)
      .eq('bestaetigt', true);

    const rueckmeldungenListe = rueckmeldungen || [];

    // Bedarfe mit Summen berechnen
    const bedarfeMitSummen: Bedarf[] = bedarfeDaten.map(b => ({
      id: b.id,
      titel: b.titel,
      anzahl_benoetigt: b.anzahl_benoetigt,
      anzahlBestaetigt: rueckmeldungenListe
        .filter(r => r.spende_id === b.id)
        .reduce((s, r) => s + r.menge, 0),
    }));

    // Zuteilungs-Map aufbauen
    const map: Record<string, Zuteilung[]> = {};
    for (const b of bedarfeDaten) {
      map[b.id] = rueckmeldungenListe
        .filter(r => r.spende_id === b.id)
        .map(r => ({
          id: r.id,
          kind_identifier: r.kind_identifier,
          menge: r.menge,
          anmerkung: r.anmerkung,
        }));
    }

    setBedarfe(bedarfeMitSummen);
    setZuteilungenMap(map);
    setIsLoading(false);
  }, [eventId]);

  useEffect(() => {
    ladeBedarfe();
  }, [ladeBedarfe]);

  const handleAutoVerteilen = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/helfer/essensspenden-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Fehler bei der Auto-Verteilung');
        return;
      }

      setErgebnis(data);
      toast.success('Auto-Verteilung abgeschlossen');
      await ladeBedarfe();
      onRefresh();
    } catch (e: any) {
      toast.error('Fehler: ' + e.message);
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="animate-spin text-gray-400" size={20} />
      </div>
    );
  }

  if (bedarfe.length === 0) {
    return (
      <div className="text-sm text-slate-500 flex items-center gap-2">
        <AlertCircle size={16} />
        Keine Essensspenden-Bedarfe definiert.{' '}
        <Link href="/admin/helfer/essensspenden" className="text-orange-600 underline">
          Jetzt anlegen
        </Link>
      </div>
    );
  }

  const gesamtBenoetigt = bedarfe.reduce((s, b) => s + b.anzahl_benoetigt, 0);
  const gesamtBestaetigt = bedarfe.reduce((s, b) => s + b.anzahlBestaetigt, 0);
  const alleVoll = bedarfe.every(b => b.anzahlBestaetigt >= b.anzahl_benoetigt);

  return (
    <div className="space-y-5">
      {/* Hinweis-Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
        Klicke auf <strong>Auto-verteilen</strong>, um Überschuss-Zusagen in Lücken umzubuchen. Danach kannst du Eltern benachrichtigen — die E-Mail enthält dann auch die Essensspenden-Zuteilung.
      </div>

      {/* Ampel-Karten pro Bedarf */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {bedarfe.map(b => {
          const prozent = b.anzahl_benoetigt > 0
            ? Math.round((b.anzahlBestaetigt / b.anzahl_benoetigt) * 100)
            : 0;
          const farbe = prozent >= 100
            ? 'bg-green-50 border-green-200'
            : prozent >= 60
            ? 'bg-orange-50 border-orange-200'
            : 'bg-red-50 border-red-200';
          const textFarbe = prozent >= 100 ? 'text-green-700' : prozent >= 60 ? 'text-orange-700' : 'text-red-700';
          const balkenFarbe = prozent >= 100 ? 'bg-green-400' : prozent >= 60 ? 'bg-orange-400' : 'bg-red-400';

          return (
            <div key={b.id} className={`rounded-lg border p-4 ${farbe}`}>
              <div className="font-semibold text-slate-800 text-sm mb-1">{b.titel}</div>
              <div className={`text-2xl font-bold ${textFarbe}`}>
                {b.anzahlBestaetigt}
                <span className="text-sm font-normal text-slate-500"> / {b.anzahl_benoetigt}</span>
              </div>
              <div className="mt-2 h-1.5 bg-white/70 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${balkenFarbe}`}
                  style={{ width: `${Math.min(100, prozent)}%` }}
                />
              </div>
              <div className={`text-xs mt-1.5 ${textFarbe}`}>
                {prozent >= 100 ? '✓ Bedarf gedeckt' : `${b.anzahl_benoetigt - b.anzahlBestaetigt} fehlen noch`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-verteilen Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleAutoVerteilen}
          disabled={isRunning}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Zap size={16} />
          )}
          {isRunning ? 'Verteile…' : 'Auto-verteilen'}
        </button>

        <button
          onClick={() => { setIsLoading(true); ladeBedarfe(); }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 px-3 py-2.5 border rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} />
          Aktualisieren
        </button>

        <Link
          href="/admin/helfer/essensspenden"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 px-3 py-2.5 border rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ExternalLink size={14} />
          Detail-Verwaltung
        </Link>
      </div>

      {/* Ergebnis-Banner nach Auto-Verteilung */}
      {ergebnis && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 space-y-1">
          <div className="font-semibold">Auto-Verteilung abgeschlossen</div>
          <div>✅ {ergebnis.bestaetigt} Zusagen bestätigt</div>
          {ergebnis.umgeteilt > 0 && (
            <div>🔄 {ergebnis.umgeteilt} Zusagen umgeteilt</div>
          )}
          {ergebnis.luecken.length > 0 && (
            <div className="pt-1 border-t border-green-200 mt-1">
              <div className="font-medium text-orange-700">Verbleibende Lücken:</div>
              {ergebnis.luecken.map((l, i) => (
                <div key={i} className="text-orange-700">
                  → Für &quot;{l.titel}&quot; fehlen noch {l.fehlend} Einheiten
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detailansicht: zugeteilte Familien pro Bedarf */}
      {alleVoll || ergebnis ? (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Zugeteilte Familien
          </div>
          {bedarfe.map(b => {
            const zuteilungen = zuteilungenMap[b.id] || [];
            if (zuteilungen.length === 0) return null;
            return (
              <div key={b.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 font-semibold text-sm text-slate-700">
                  {b.titel} ({b.anzahlBestaetigt}/{b.anzahl_benoetigt})
                </div>
                <div className="divide-y divide-slate-100">
                  {zuteilungen.map(z => (
                    <div key={z.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                      <span className="text-slate-800">{z.kind_identifier}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{z.menge}×</span>
                        {z.anmerkung && z.anmerkung.startsWith('Automatisch umgeteilt') ? (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full" title={z.anmerkung}>
                            🔄 umgeteilt
                          </span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            ✅ Zusage
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
