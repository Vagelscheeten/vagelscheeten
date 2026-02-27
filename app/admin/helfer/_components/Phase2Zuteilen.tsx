'use client';

import { useState } from 'react';
import { Loader2, Play, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Phase2ZuteilenProps {
  eventId: string;
  anzahlRueckmeldungen: number;
  anzahlZuteilungen: number;
  onRefresh: () => void;
}

interface ZuteilungsErgebnis {
  erfolg: boolean;
  anzahlZugewiesen: number;
  anzahlRegulaeZugewiesen: number;
  anzahlSpringerZugewiesen: number;
  nichtZugewiesen: { id: string; grund: string }[];
  fehler?: string;
}

export function Phase2Zuteilen({ eventId, anzahlRueckmeldungen, anzahlZuteilungen, onRefresh }: Phase2ZuteilenProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [ergebnis, setErgebnis] = useState<ZuteilungsErgebnis | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleAutoZuteilung = async () => {
    setConfirming(false);
    setIsRunning(true);
    setErgebnis(null);

    try {
      const res = await fetch('/api/helfer/auto-zuteilung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });

      const data: ZuteilungsErgebnis = await res.json();
      setErgebnis(data);

      if (data.erfolg) {
        toast.success(`${data.anzahlZugewiesen} Zuteilungen erstellt`);
        onRefresh();
      } else {
        toast.error(data.fehler || 'Fehler bei der Zuteilung');
      }
    } catch (e: any) {
      toast.error('Fehler bei der Anfrage');
    } finally {
      setIsRunning(false);
    }
  };

  const hatZuteilungen = anzahlZuteilungen > 0;

  return (
    <div className="space-y-6">
      {/* Info-Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Wie funktioniert die Auto-Zuteilung?</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>Phase 1: Alle Helfer ohne bisherige Zuteilung erhalten zuerst eine Aufgabe</li>
            <li>Phase 2: Helfer mit mehreren Rückmeldungen erhalten ggf. weitere Aufgaben</li>
            <li>Springer werden auf verbleibende offene Plätze verteilt</li>
            <li>Zeitfenster-Konflikte werden automatisch vermieden</li>
          </ul>
        </div>
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Offene Rückmeldungen</div>
          <div className="text-2xl font-bold text-slate-900">{anzahlRueckmeldungen}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Bestehende Zuteilungen</div>
          <div className={`text-2xl font-bold ${hatZuteilungen ? 'text-amber-600' : 'text-slate-900'}`}>
            {anzahlZuteilungen}
          </div>
          {hatZuteilungen && (
            <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle size={11} />
              Werden ersetzt
            </div>
          )}
        </div>
      </div>

      {/* Warnung wenn bereits Zuteilungen existieren */}
      {hatZuteilungen && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Achtung: {anzahlZuteilungen} bestehende Zuteilungen werden ersetzt!</p>
            <p className="mt-1">Die Auto-Zuteilung löscht alle bisherigen automatischen Zuteilungen und erstellt sie komplett neu. Manuell gesetzte Zuteilungen (aus Schritt 3) bleiben erhalten.</p>
          </div>
        </div>
      )}

      {/* Aktion */}
      {!confirming ? (
        <Button
          onClick={() => hatZuteilungen ? setConfirming(true) : handleAutoZuteilung()}
          disabled={isRunning || anzahlRueckmeldungen === 0}
          className="w-full gap-2"
          size="lg"
        >
          {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          Auto-Zuteilung starten
        </Button>
      ) : (
        <div className="bg-slate-50 border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800">Zuteilung wirklich neu starten?</p>
          <p className="text-sm text-slate-600">
            Die {anzahlZuteilungen} bestehenden automatischen Zuteilungen werden gelöscht und für alle {anzahlRueckmeldungen} Rückmeldungen neu berechnet. Manuelle Zuteilungen bleiben erhalten.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleAutoZuteilung} disabled={isRunning} className="gap-2">
              {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Ja, jetzt zuteilen
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      {/* Ergebnis */}
      {ergebnis && (
        <div className={`rounded-xl border p-5 ${ergebnis.erfolg ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {ergebnis.erfolg ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={18} className="text-green-600" />
                <h3 className="font-semibold text-green-800">Zuteilung abgeschlossen</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <StatBox label="Gesamt" value={ergebnis.anzahlZugewiesen} color="green" />
                <StatBox label="Regulär" value={ergebnis.anzahlRegulaeZugewiesen} color="green" />
                <StatBox label="Springer" value={ergebnis.anzahlSpringerZugewiesen} color="green" />
              </div>
              {ergebnis.nichtZugewiesen.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-2">
                    {ergebnis.nichtZugewiesen.length} Rückmeldungen konnten nicht zugeteilt werden:
                  </p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    {ergebnis.nichtZugewiesen.slice(0, 5).map(n => (
                      <li key={n.id}>• {n.grund}</li>
                    ))}
                    {ergebnis.nichtZugewiesen.length > 5 && (
                      <li>... und {ergebnis.nichtZugewiesen.length - 5} weitere</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              <p className="text-red-700 text-sm">{ergebnis.fehler}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: 'green' }) {
  return (
    <div className="bg-white rounded-lg border border-green-100 p-3 text-center">
      <div className="text-xl font-bold text-green-700">{value}</div>
      <div className="text-xs text-green-600">{label}</div>
    </div>
  );
}
