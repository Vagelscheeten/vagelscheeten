import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import type { Database } from '@/lib/database.types';

// Schritt 1: Kind auswählen
export function KindAuswahl({ 
  kinder, 
  onKindSelected 
}: { 
  kinder: Database['public']['Tables']['kinder']['Row'][],
  onKindSelected: (kind: Database['public']['Tables']['kinder']['Row']) => void 
}) {
  const [filter, setFilter] = React.useState('');
  
  const filteredKinder = kinder.filter(kind => 
    `${kind.vorname} ${kind.nachname}`.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Input
        type="search"
        placeholder="Kind suchen..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full text-xl h-14 px-4"
      />
      <ScrollArea className="max-h-fit">
        <div className="grid grid-cols-1 gap-4 p-1"> 
          {filteredKinder.length > 0 ? (
            filteredKinder.map((kind) => (
              <Card 
                key={kind.id}
                className="w-full cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onKindSelected(kind)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-medium">{kind.vorname} {kind.nachname}</h3>
                    <p className="text-base text-muted-foreground">{kind.geschlecht}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center p-4">
              <p className="text-lg text-muted-foreground">Keine Kinder gefunden</p>
            </div>
          )}
        </div>
      </ScrollArea>
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
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numWert = parseFloat(wert);
    if (!isNaN(numWert)) {
      onErgebnisSubmit(numWert);
    }
  };

  return (
    <div className="space-y-6"> 
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2 mb-6">
            <h3 className="text-2xl font-medium">
              {kind.vorname} {kind.nachname}
            </h3>
            <p className="text-xl text-muted-foreground">
              {spiel.name}
            </p>
          </div>

          {/* Der "Zurück"-Button wurde entfernt, da er redundant mit dem "Anderes Spiel wählen"-Button ist */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label htmlFor="wert" className="text-lg font-medium block">
                {getWertLabel(spiel)}
              </label>
              <Input
                id="wert"
                type="number"
                step="any"
                value={wert}
                onChange={(e) => setWert(e.target.value)}
                className="text-3xl h-20 text-center font-bold"
                placeholder={getPlaceholder(spiel)}
                required
              />
              {spiel.einheit && (
                <p className="text-base text-muted-foreground text-center">
                  {spiel.einheit}
                </p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-20 text-xl font-bold mt-6"
              disabled={!wert}
            >
              Ergebnis speichern
            </Button>
          </form>
        </CardContent>
      </Card>

      <hr className="my-4 border-gray-300 dark:border-gray-700" />

      {/* Section 2: ErgebnisListe */}
      <div>
        {/* TODO: Ergebnisliste */}
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
