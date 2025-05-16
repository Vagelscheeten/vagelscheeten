import { useState, useEffect } from 'react';
import { ReportCard } from './ReportCard';
import { SpielData, KindData } from '../../../../types';

interface SpielStatistikProps {
  spiele: SpielData[];
  ergebnisse: any[]; // Tatsächliche Ergebnisse mit wert_numeric
  kinder: KindData[];
}

// Datenstruktur für Spielstatistiken
interface SpielStatistikDaten {
  spielId: string;
  spielName: string;
  durchschnitt: number;
  minimum: number;
  maximum: number;
  anzahlErgebnisse: number;
  einheit: string;
  wertungstyp: string;
}

// Struktur für Klassenstatistiken
interface KlassenStatistikDaten {
  spielId: string;
  spielName: string;
  einheit: string;
  wertungstyp: string;
  klassenDaten: { 
    klasse: string; 
    durchschnitt: number; 
    minimum: number; 
    maximum: number; 
    anzahl: number 
  }[];
}

export function SpielStatistik({ spiele, ergebnisse, kinder }: SpielStatistikProps) {
  // Zustandsvariablen
  const [spielStatistiken, setSpielStatistiken] = useState<SpielStatistikDaten[]>([]);
  const [klassenStatistiken, setKlassenStatistiken] = useState<KlassenStatistikDaten[]>([]);

  // Berechne Statistiken beim Laden der Komponente
  useEffect(() => {
    if (spiele.length > 0 && ergebnisse.length > 0) {
      berechneSpielStatistiken();
      berechneKlassenStatistiken();
    }
  }, [spiele, ergebnisse, kinder]);
  
  // Bestimmt die Einheit basierend auf dem Spielnamen
  const getEinheitFuerSpiel = (spielName: string): string => {
    const nameLower = spielName.toLowerCase();
    
    if (nameLower.includes('schießen') || nameLower.includes('werfen') || nameLower.includes('punkte')) {
      return 'Punkte';
    } else if (nameLower.includes('zeit') || nameLower.includes('rennen')) {
      return 'Sekunden';
    } else if (nameLower.includes('weite') || nameLower.includes('wurf')) {
      return 'Meter';
    } else {
      return 'Wert';
    }
  };
  
  // Bestimmt den Wertungstyp (niedrig oder hoch ist besser)
  const getWertungstypFuerSpiel = (spielName: string): string => {
    const nameLower = spielName.toLowerCase();
    return (nameLower.includes('zeit') || nameLower.includes('rennen')) ? 'niedrig-besser' : 'hoch-besser';
  };
  
  // Berechnet Statistiken für jedes Spiel
  const berechneSpielStatistiken = () => {
    const statistiken = spiele.map(spiel => {
      // Finde alle Ergebnisse mit gültigen Werten für dieses Spiel
      const spielErgebnisse = ergebnisse.filter(e => 
        e.spiel_id === spiel.id && 
        e.wert_numeric !== null && e.wert_numeric !== undefined
      );
      
      // Extrahiere die tatsächlichen Messwerte
      const werte = spielErgebnisse.map(e => e.wert_numeric);
      const anzahl = werte.length;
      
      // Berechne Statistiken
      const durchschnitt = anzahl > 0 ? werte.reduce((sum, w) => sum + w, 0) / anzahl : 0;
      const minimum = anzahl > 0 ? Math.min(...werte) : 0;
      const maximum = anzahl > 0 ? Math.max(...werte) : 0;
      
      // Bestimme Einheit und Wertungstyp
      const einheit = getEinheitFuerSpiel(spiel.name);
      const wertungstyp = getWertungstypFuerSpiel(spiel.name);
      
      return {
        spielId: spiel.id,
        spielName: spiel.name,
        durchschnitt: Number(durchschnitt.toFixed(2)),
        minimum,
        maximum,
        anzahlErgebnisse: anzahl,
        einheit,
        wertungstyp
      };
    });
    
    // Sortiere nach Spielname
    const sortierteStatistiken = [...statistiken].sort((a, b) => a.spielName.localeCompare(b.spielName));
    setSpielStatistiken(sortierteStatistiken);
  };
  
  // Berechnet Statistiken nach Klassen für jedes Spiel
  const berechneKlassenStatistiken = () => {
    const statistiken = spiele.map(spiel => {
      // Finde alle Ergebnisse mit gültigen Werten für dieses Spiel
      const spielErgebnisse = ergebnisse.filter(e => 
        e.spiel_id === spiel.id && 
        e.wert_numeric !== null && e.wert_numeric !== undefined
      );
      
      // Gruppiere Ergebnisse nach Klassen
      const klassenMap = new Map<string, number[]>();
      
      spielErgebnisse.forEach(ergebnis => {
        const kind = kinder.find(k => k.id === ergebnis.kind_id);
        if (kind && kind.klasse) {
          const klasse = kind.klasse;
          if (!klassenMap.has(klasse)) {
            klassenMap.set(klasse, []);
          }
          klassenMap.get(klasse)?.push(ergebnis.wert_numeric);
        }
      });
      
      // Berechne Statistiken für jede Klasse
      const klassenDaten = Array.from(klassenMap.entries()).map(([klasse, werte]) => {
        const anzahl = werte.length;
        const durchschnitt = anzahl > 0 ? werte.reduce((sum, w) => sum + w, 0) / anzahl : 0;
        const minimum = anzahl > 0 ? Math.min(...werte) : 0;
        const maximum = anzahl > 0 ? Math.max(...werte) : 0;
        
        return {
          klasse,
          durchschnitt: Number(durchschnitt.toFixed(2)),
          minimum,
          maximum,
          anzahl
        };
      });
      
      // Bestimme Einheit und Wertungstyp
      const einheit = getEinheitFuerSpiel(spiel.name);
      const wertungstyp = getWertungstypFuerSpiel(spiel.name);
      
      return {
        spielId: spiel.id,
        spielName: spiel.name,
        einheit,
        wertungstyp,
        klassenDaten
      };
    }).filter(s => s.klassenDaten.length > 0); // Nur Spiele mit Klassendaten
    
    setKlassenStatistiken(statistiken);
  };
  
  // Formatiert Werte mit Einheit
  const formatiereWert = (wert: number, einheit: string): string => {
    if (einheit === 'Meter') return `${wert.toFixed(2)} m`;
    if (einheit === 'Sekunden') return `${wert.toFixed(2)} s`;
    if (einheit === 'Punkte') return `${Math.round(wert)} Punkte`;
    return `${wert}`;
  };
  
  // Gibt den Text zurück, der erklärt, ob hohe oder niedrige Werte besser sind
  const istBesserText = (wertungstyp: string): string => 
    wertungstyp === 'niedrig-besser' ? 'Niedrige Werte sind besser' : 'Hohe Werte sind besser';

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Spielstatistiken</h2>
        <p className="text-muted-foreground">
          Detaillierte Auswertung der tatsächlichen Ergebniswerte jedes Spiels
        </p>
      </div>
      
      {/* Tatsächliche Messwerte pro Spiel */}
      <ReportCard
        title="Tatsächliche Ergebniswerte pro Spiel"
        description="Vergleich der tatsächlichen Messwerte für jedes Spiel (nicht Ranglistenpunkte)"
        onExport={() => {
          // CSV Export
          const csvContent = [
            'Spiel,Wertungstyp,Einheit,Durchschnitt,Minimum,Maximum,Anzahl Ergebnisse',
            ...spielStatistiken.map(item => 
              `${item.spielName},${istBesserText(item.wertungstyp)},${item.einheit},` +
              `${item.durchschnitt},${item.minimum},${item.maximum},${item.anzahlErgebnisse}`
            )
          ].join('\n');
          
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'ergebniswerte_pro_spiel.csv';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spiel</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wertung</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Durchschnitt</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Minimum</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Maximum</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Anzahl</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {spielStatistiken.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900">{item.spielName}</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.einheit}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">{istBesserText(item.wertungstyp)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                    {formatiereWert(item.durchschnitt, item.einheit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatiereWert(item.minimum, item.einheit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatiereWert(item.maximum, item.einheit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.anzahlErgebnisse}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportCard>
      
      {/* Leistungsvergleich nach Klassen */}
      <ReportCard
        title="Leistungsvergleich nach Klassen"
        description="Vergleich der tatsächlichen Ergebniswerte pro Klasse für jedes Spiel"
        onExport={() => {
          // CSV Export
          let csvContent = 'Spiel,Einheit,Klasse,Durchschnitt,Minimum,Maximum,Anzahl Ergebnisse\n';
          
          klassenStatistiken.forEach(spiel => {
            spiel.klassenDaten.forEach(klasse => {
              csvContent += `${spiel.spielName},${spiel.einheit},${klasse.klasse},`;
              csvContent += `${klasse.durchschnitt},${klasse.minimum},${klasse.maximum},${klasse.anzahl}\n`;
            });
          });
          
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'klassen_leistungsvergleich.csv';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
      >
        {klassenStatistiken.length === 0 ? (
          <p className="py-4 text-center text-gray-500">Keine Klassendaten verfügbar</p>
        ) : (
          <div className="space-y-8">
            {klassenStatistiken.map((spiel, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="font-medium">{spiel.spielName}</h3>
                  <p className="text-xs text-gray-500">
                    Einheit: {spiel.einheit}
                  </p>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klasse</th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Durchschnitt</th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Min</th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Max</th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Anzahl</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {spiel.klassenDaten
                      .sort((a, b) => b.durchschnitt - a.durchschnitt) // Sortiere absteigend nach Durchschnitt
                      .map((klasse, idx) => (
                        <tr key={idx} className={idx === 0 ? 'bg-green-50' : idx === 1 ? 'bg-blue-50' : idx === 2 ? 'bg-yellow-50' : ''}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{klasse.klasse}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                            {formatiereWert(klasse.durchschnitt, spiel.einheit)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatiereWert(klasse.minimum, spiel.einheit)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatiereWert(klasse.maximum, spiel.einheit)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            {klasse.anzahl}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </ReportCard>
    </div>
  );
}
