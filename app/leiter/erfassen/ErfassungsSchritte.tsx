import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import type { Database } from '@/lib/database.types';
import { getWertGrenzen, istWertPlausibel } from '@/lib/ergebnis-limits';
import { toast } from 'sonner';

// Schritt 1: Kind auswählen — Listen-Style, mobile-dicht
export function KindAuswahl({
  kinder,
  onKindSelected,
}: {
  kinder: Database['public']['Tables']['kinder']['Row'][];
  onKindSelected: (kind: Database['public']['Tables']['kinder']['Row']) => void;
}) {
  const [filter, setFilter] = React.useState('');

  const filteredKinder = kinder.filter((kind) =>
    `${kind.vorname} ${kind.nachname}`.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      {kinder.length > 6 && (
        <Input
          type="search"
          placeholder="Kind suchen…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full text-base h-11"
        />
      )}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
        {filteredKinder.length > 0 ? (
          filteredKinder.map((kind) => (
            <button
              key={kind.id}
              onClick={() => onKindSelected(kind)}
              className="w-full text-left flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 active:bg-melsdorf-orange/10 transition-colors"
            >
              <span className="font-medium text-slate-900 text-base">
                {kind.vorname} {kind.nachname}
              </span>
              <span className="text-slate-300 text-lg shrink-0">›</span>
            </button>
          ))
        ) : (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            Keine Treffer
          </div>
        )}
      </div>
    </div>
  );
}

// Schritt 2: Spiel auswählen
export function SpielAuswahl({
  spiele,
  onSpielSelected,
  onBack
}: {
  spiele: Database['public']['Tables']['spiele']['Row'][],
  onSpielSelected: (spiel: Database['public']['Tables']['spiele']['Row']) => void,
  onBack?: () => void
}) {
  return (
    <div className="space-y-4">
      {onBack && (
        <Button
          variant="ghost"
          className="mb-4 text-lg py-6 px-4"
          onClick={onBack}
        >
          ← Zurück zur Kindauswahl
        </Button>
      )}
      <ScrollArea className="max-h-fit">
        <div className="grid grid-cols-1 gap-4">
          {spiele.map((spiel) => (
            <Card 
              key={spiel.id} 
              className="w-full cursor-pointer hover:bg-accent transition-colors"
              onClick={() => onSpielSelected(spiel)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col space-y-2">
                  <h3 className="text-xl font-medium">{spiel.name}</h3>
                  <p className="text-base text-muted-foreground">
                    {spiel.beschreibung || 'Keine Beschreibung'}
                  </p>
                  {spiel.zeitlimit_sekunden && (
                    <p className="text-sm font-medium mt-2">
                      {spiel.zeitlimit_sekunden} Sekunden Zeit. {spiel.einheit && `Pro ${spiel.einheit} 1 Punkt.`}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Schritt 3: Ergebnis erfassen
export function ErgebnisErfassung({
  kind,
  spiel,
  onErgebnisSubmit,
  onBack
}: {
  kind: Database['public']['Tables']['kinder']['Row'],
  spiel: Database['public']['Tables']['spiele']['Row'],
  onErgebnisSubmit: (wert: number) => void,
  onBack?: () => void  // Optional gemacht, da redundant mit "Anderes Spiel wählen"-Button
}) {
  const [wert, setWert] = React.useState('');
  const grenzen = getWertGrenzen(spiel.wertungstyp);
  const aktuellerNumWert = parseFloat(wert);
  const liveCheck = wert !== '' && !isNaN(aktuellerNumWert)
    ? istWertPlausibel(aktuellerNumWert, spiel.wertungstyp)
    : { ok: true };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numWert = parseFloat(wert);
    if (isNaN(numWert)) {
      toast.error('Bitte eine gültige Zahl eingeben.');
      return;
    }
    const plaus = istWertPlausibel(numWert, spiel.wertungstyp);
    if (!plaus.ok) {
      toast.error(plaus.grund || 'Wert nicht plausibel.');
      return;
    }
    onErgebnisSubmit(numWert);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900 leading-tight">
            {kind.vorname} {kind.nachname}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{spiel.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="wert" className="text-sm font-medium text-slate-700 block">
            {getWertLabel(spiel)}
          </label>
          <Input
            id="wert"
            type="number"
            inputMode="decimal"
            step="any"
            value={wert}
            onChange={(e) => setWert(e.target.value)}
            className={`text-4xl h-20 text-center font-bold ${
              !liveCheck.ok ? 'border-red-500 focus-visible:ring-red-300' : ''
            }`}
            placeholder={getPlaceholder(spiel)}
            required
            autoFocus
          />
          <p className="text-xs text-slate-500 text-center">
            {spiel.einheit || grenzen.einheitDefault}
          </p>
          {!liveCheck.ok && (
            <p className="text-sm text-red-600 text-center font-medium">{liveCheck.grund}</p>
          )}

          <Button
            type="submit"
            className="w-full h-14 text-lg font-bold"
            disabled={!wert || !liveCheck.ok}
          >
            Speichern
          </Button>
        </form>
      </div>
    </div>
  );
}

// Hilfsfunktionen
function getWertLabel(spiel: Database['public']['Tables']['spiele']['Row']): string {
  switch (spiel.wertungstyp) {
    case 'WEITE_MAX_AUS_N':
      return `Weite (beste aus ${spiel.anzahl_versuche} Versuchen)`;
    case 'MENGE_MAX_ZEIT':
      return `Anzahl in ${spiel.zeitlimit_sekunden} Sekunden`;
    case 'ZEIT_MIN_STRAFE':
      return 'Zeit (Sekunden)';
    case 'PUNKTE_SUMME_AUS_N':
      return `Punkte (Summe aus ${spiel.anzahl_versuche} Versuchen)`;
    case 'PUNKTE_ABZUG':
      return 'Abzüge';
    case 'PUNKTE_MAX_EINZEL':
      return 'Punkte';
    default:
      return 'Wert';
  }
}

function getPlaceholder(spiel: Database['public']['Tables']['spiele']['Row']): string {
  switch (spiel.wertungstyp) {
    case 'WEITE_MAX_AUS_N':
      return 'Weite in cm';
    case 'MENGE_MAX_ZEIT':
      return 'Anzahl';
    case 'ZEIT_MIN_STRAFE':
      return 'Sekunden';
    case 'PUNKTE_SUMME_AUS_N':
    case 'PUNKTE_MAX_EINZEL':
      return 'Punkte';
    case 'PUNKTE_ABZUG':
      return 'Abzüge';
    default:
      return 'Wert eingeben';
  }
}
