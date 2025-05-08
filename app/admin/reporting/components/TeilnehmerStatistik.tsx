'use client';

import React from 'react';
import { ReportCard } from './ReportCard';
import { SimpleBarChart } from './SimpleBarChart';

interface TeilnehmerStatistikProps {
  kinder: any[];
  ergebnisse: any[];
  klassenMap: Map<string, number>;
  kinderProKlasse: {label: string, value: number}[];
}

export function TeilnehmerStatistik({ 
  kinder, 
  ergebnisse, 
  klassenMap,
  kinderProKlasse
}: TeilnehmerStatistikProps) {
  
  // Berechne Punktedurchschnitt pro Klasse
  const berechnePunkteDurchschnittProKlasse = () => {
    return Array.from(klassenMap.keys())
      .filter(klasse => klasse)
      .map(klasse => {
        const klassenKinder = kinder.filter(k => k.klasse === klasse);
        let gesamtPunkte = 0;
        let kinderMitPunkten = 0;
        
        // Berechne die Punkte für jedes Kind in dieser Klasse
        klassenKinder.forEach(kind => {
          // Finde alle Ergebnisse dieses Kindes
          const kindErgebnisse = ergebnisse.filter(e => e.kind_id === kind.id);
          if (kindErgebnisse.length > 0) {
            // Gruppiere Ergebnisse nach Spiel
            const ergebnisseNachSpiel: Record<string, any[]> = {};
            kindErgebnisse.forEach(ergebnis => {
              if (!ergebnisseNachSpiel[ergebnis.spiel_id]) {
                ergebnisseNachSpiel[ergebnis.spiel_id] = [];
              }
              ergebnisseNachSpiel[ergebnis.spiel_id].push(ergebnis);
            });
            
            // Summiere Punkte aus allen Spielen
            let kindPunkte = 0;
            Object.values(ergebnisseNachSpiel).forEach((spielErgebnisse) => {
              if (spielErgebnisse.length > 0) {
                const punkteWerte = spielErgebnisse.map(e => {
                  return typeof e.punkte === 'number' ? e.punkte : 0;
                });
                
                if (punkteWerte.length > 0) {
                  const bestesPunkte = Math.max(...punkteWerte);
                  kindPunkte += bestesPunkte;
                }
              }
            });
            
            if (kindPunkte > 0) {
              gesamtPunkte += kindPunkte;
              kinderMitPunkten++;
            }
          }
        });
        
        const durchschnitt = kinderMitPunkten > 0 ? Math.round(gesamtPunkte / kinderMitPunkten) : 0;
        
        return {
          label: `Klasse ${klasse}`,
          value: durchschnitt
        };
      });
  };
  
  // Berechne Punktedurchschnitt pro Geschlecht
  const berechnePunkteProGeschlecht = () => {
    const jungen = kinder.filter(k => k.geschlecht === 'Junge');
    const maedchen = kinder.filter(k => k.geschlecht === 'Mädchen');
    
    let jungenPunkte = 0;
    let jungenMitPunkten = 0;
    let maedchenPunkte = 0;
    let maedchenMitPunkten = 0;
    
    // Berechne Punkte für Jungen
    jungen.forEach(kind => {
      const kindErgebnisse = ergebnisse.filter(e => e.kind_id === kind.id);
      if (kindErgebnisse.length > 0) {
        // Gruppiere Ergebnisse nach Spiel
        const ergebnisseNachSpiel: Record<string, any[]> = {};
        kindErgebnisse.forEach(ergebnis => {
          if (!ergebnisseNachSpiel[ergebnis.spiel_id]) {
            ergebnisseNachSpiel[ergebnis.spiel_id] = [];
          }
          ergebnisseNachSpiel[ergebnis.spiel_id].push(ergebnis);
        });
        
        // Summiere Punkte aus allen Spielen
        let kindPunkte = 0;
        Object.values(ergebnisseNachSpiel).forEach((spielErgebnisse) => {
          if (spielErgebnisse.length > 0) {
            const punkteWerte = spielErgebnisse.map(e => {
              return typeof e.punkte === 'number' ? e.punkte : 0;
            });
            
            if (punkteWerte.length > 0) {
              const bestesPunkte = Math.max(...punkteWerte);
              kindPunkte += bestesPunkte;
            }
          }
        });
        
        if (kindPunkte > 0) {
          jungenPunkte += kindPunkte;
          jungenMitPunkten++;
        }
      }
    });
    
    // Berechne Punkte für Mädchen
    maedchen.forEach(kind => {
      const kindErgebnisse = ergebnisse.filter(e => e.kind_id === kind.id);
      if (kindErgebnisse.length > 0) {
        // Gruppiere Ergebnisse nach Spiel
        const ergebnisseNachSpiel: Record<string, any[]> = {};
        kindErgebnisse.forEach(ergebnis => {
          if (!ergebnisseNachSpiel[ergebnis.spiel_id]) {
            ergebnisseNachSpiel[ergebnis.spiel_id] = [];
          }
          ergebnisseNachSpiel[ergebnis.spiel_id].push(ergebnis);
        });
        
        // Summiere Punkte aus allen Spielen
        let kindPunkte = 0;
        Object.values(ergebnisseNachSpiel).forEach((spielErgebnisse) => {
          if (spielErgebnisse.length > 0) {
            const punkteWerte = spielErgebnisse.map(e => {
              return typeof e.punkte === 'number' ? e.punkte : 0;
            });
            
            if (punkteWerte.length > 0) {
              const bestesPunkte = Math.max(...punkteWerte);
              kindPunkte += bestesPunkte;
            }
          }
        });
        
        if (kindPunkte > 0) {
          maedchenPunkte += kindPunkte;
          maedchenMitPunkten++;
        }
      }
    });
    
    const jungenDurchschnitt = jungenMitPunkten > 0 ? Math.round(jungenPunkte / jungenMitPunkten) : 0;
    const maedchenDurchschnitt = maedchenMitPunkten > 0 ? Math.round(maedchenPunkte / maedchenMitPunkten) : 0;
    
    return {
      jungenDurchschnitt,
      maedchenDurchschnitt,
      jungenMitPunkten,
      maedchenMitPunkten
    };
  };
  
  const punkteDurchschnittProKlasse = berechnePunkteDurchschnittProKlasse();
  const punkteProGeschlecht = berechnePunkteProGeschlecht();
  
  return (
    <div className="space-y-6">
      {/* Erste Reihe: Verteilung nach Klassen und Geschlechterverteilung */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verteilung nach Klassen */}
        <ReportCard
          title="Verteilung nach Klassen"
          description="Anzahl der Kinder pro Klasse"
          onExport={() => {
            // CSV Export
            const csvContent = [
              'Klasse,Anzahl Kinder,Prozent',
              ...Array.from(klassenMap.entries())
                .filter(([klasse]) => klasse)
                .map(([klasse, anzahl]) => {
                  const prozent = Math.round((anzahl / kinder.length) * 100);
                  return `Klasse ${klasse},${anzahl},${prozent}%`;
                })
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'verteilung_nach_klassen.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          <div className="mt-4">
            <div className="h-72">
              <SimpleBarChart 
                data={kinderProKlasse}
                height={240}
                showValues 
                showLabels
              />
            </div>
          </div>
        </ReportCard>
        
        {/* Geschlechterverteilung */}
        <ReportCard
          title="Geschlechterverteilung"
          description="Anzahl der Kinder nach Geschlecht"
          onExport={() => {
            // Berechne Geschlechterverteilung - nur Junge und Mädchen
            const jungen = kinder.filter(k => k.geschlecht === 'Junge').length;
            const maedchen = kinder.filter(k => k.geschlecht === 'Mädchen').length;
            
            // CSV Export
            const csvContent = [
              'Geschlecht,Anzahl,Prozent',
              `Junge,${jungen},${Math.round((jungen / kinder.length) * 100)}%`,
              `Mädchen,${maedchen},${Math.round((maedchen / kinder.length) * 100)}%`
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'geschlechterverteilung.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          <div className="mt-4">
            <div className="h-64">
              <div className="flex flex-col justify-center items-center h-full">
                <div className="w-full max-w-md">
                  {/* Überschriften */}
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Jungen</span>
                    <span className="font-medium">Mädchen</span>
                  </div>
                  
                  {/* Balkendiagramm */}
                  <div className="relative pt-1">
                    <div className="flex h-10 overflow-hidden text-sm font-medium">
                      {(() => {
                        const jungen = kinder.filter(k => k.geschlecht === 'Junge').length;
                        const maedchen = kinder.filter(k => k.geschlecht === 'Mädchen').length;
                        const total = jungen + maedchen;
                        
                        const jungenProzent = total > 0 ? Math.round((jungen / total) * 100) : 0;
                        const maedchenProzent = total > 0 ? Math.round((maedchen / total) * 100) : 0;
                        
                        return (
                          <>
                            <div 
                              style={{ width: `${jungenProzent}%` }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 rounded-l"
                            >
                              {jungen} ({jungenProzent}%)
                            </div>
                            <div 
                              style={{ width: `${maedchenProzent}%` }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-pink-500 rounded-r"
                            >
                              {maedchen} ({maedchenProzent}%)
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Legende */}
                  <div className="flex justify-center mt-8 space-x-8">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-500 mr-2 rounded"></div>
                      <span>Jungen</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-pink-500 mr-2 rounded"></div>
                      <span>Mädchen</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ReportCard>
      </div>
      
      {/* Zweite Reihe: Punktestatistiken nebeneinander */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Punkte pro Geschlecht */}
        <ReportCard
          title="Punkte pro Geschlecht"
          description="Durchschnittliche Punktzahl nach Geschlecht"
          onExport={() => {
            // CSV Export
            const csvContent = [
              'Geschlecht,Durchschnittliche Punkte,Anzahl Kinder mit Punkten',
              `Junge,${punkteProGeschlecht.jungenDurchschnitt},${punkteProGeschlecht.jungenMitPunkten}`,
              `Mädchen,${punkteProGeschlecht.maedchenDurchschnitt},${punkteProGeschlecht.maedchenMitPunkten}`
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'punkte_pro_geschlecht.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          <div className="mt-4">
            <div className="h-64">
              <div className="flex flex-col justify-center items-center h-full">
                <div className="w-full max-w-md">
                  <div className="text-center">
                    <div className="grid grid-cols-2 gap-8 mt-4">
                      <div className="flex flex-col items-center">
                        <div className="text-5xl font-bold text-blue-500 mb-2">{punkteProGeschlecht.jungenDurchschnitt}</div>
                        <div className="text-lg font-medium">Jungen</div>
                        <div className="text-sm text-gray-500">{punkteProGeschlecht.jungenMitPunkten} Kinder</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-5xl font-bold text-pink-500 mb-2">{punkteProGeschlecht.maedchenDurchschnitt}</div>
                        <div className="text-lg font-medium">Mädchen</div>
                        <div className="text-sm text-gray-500">{punkteProGeschlecht.maedchenMitPunkten} Kinder</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ReportCard>
        
        {/* Punktedurchschnitt pro Klasse */}
        <ReportCard
          title="Punktedurchschnitt pro Klasse"
          description="Durchschnittliche Punktzahl der Kinder pro Klasse"
          onExport={() => {
            // CSV Export
            const csvContent = [
              'Klasse,Durchschnittliche Punkte',
              ...punkteDurchschnittProKlasse.map(item => `${item.label},${item.value}`)
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'punktedurchschnitt_pro_klasse.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          <div className="mt-4">
            <div className="h-72">
              <SimpleBarChart 
                data={punkteDurchschnittProKlasse}
                height={240}
                showValues 
                showLabels
              />
            </div>
          </div>
        </ReportCard>
      </div>
    </div>
  );
}
