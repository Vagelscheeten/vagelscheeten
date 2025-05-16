import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import type { Database } from '@/types/database';

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
    <div className="space-y-4">
      <Input
        type="search"
        placeholder="Kind suchen..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full text-lg"
      />
      <ScrollArea className="max-h-fit">
        {/* Zurück zu grid-cols-1 */}
        <div className="grid grid-cols-1 gap-2 p-1"> 
          {filteredKinder.map((kind) => (
            <Button
              key={kind.id}
              variant="outline"
              // Zurück zum ursprünglichen Listen-Style
              className="w-full h-16 text-left flex flex-col items-start justify-center p-4" 
              onClick={() => onKindSelected(kind)}
            >
              <span className="text-lg font-medium">{kind.vorname} {kind.nachname}</span> 
              <span className="text-sm text-muted-foreground">{kind.geschlecht}</span> 
            </Button>
          ))}
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
          className="mb-4"
          onClick={onBack}
        >
          ← Zurück zur Kindauswahl
        </Button>
      )}
      <ScrollArea className="max-h-fit">
        <div className="grid grid-cols-1 gap-2">
          {spiele.map((spiel) => (
            <Button
              key={spiel.id}
              variant="outline"
              className="w-full h-auto text-left flex flex-col items-start justify-center p-4"
              onClick={() => onSpielSelected(spiel)}
            >
              <span className="text-lg font-medium">{spiel.name}</span>
              <span className="text-sm text-muted-foreground">
                {spiel.beschreibung || 'Keine Beschreibung'}
              </span>
            </Button>
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
  onBack: () => void
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
    <div className="space-y-4"> 
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 mb-4">
            <h3 className="text-lg font-medium">
              {kind.vorname} {kind.nachname}
            </h3>
            <p className="text-muted-foreground">
              {spiel.name}
            </p>
          </div>

          {onBack && (
            <Button
              type="button"
              variant="ghost"
              className="mb-2"
              onClick={onBack}
            >
              ← Zurück
            </Button>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="wert" className="text-sm font-medium">
                {getWertLabel(spiel)}
              </label>
              <Input
                id="wert"
                type="number"
                step="any"
                value={wert}
                onChange={(e) => setWert(e.target.value)}
                className="text-2xl h-16 text-center"
                placeholder={getPlaceholder(spiel)}
                required
              />
              {spiel.einheit && (
                <p className="text-sm text-muted-foreground text-center">
                  {spiel.einheit}
                </p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-16 text-lg"
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
      return 'Beste Weite';
    case 'MENGE_MAX_ZEIT':
      return 'Anzahl';
    case 'ZEIT_MIN_STRAFE':
      return 'Sekunden';
    case 'PUNKTE_SUMME_AUS_N':
    case 'PUNKTE_ABZUG':
    case 'PUNKTE_MAX_EINZEL':
      return 'Punkte';
    default:
      return 'Wert';
  }
}
