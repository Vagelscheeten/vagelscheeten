import React, { useMemo } from 'react';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
}

interface Rueckmeldung {
  id: string;
  kind_id: string;
  aufgabe_id: string;
  prioritaet: number;
  freitext: string | null;
  kind?: {
    vorname: string;
    nachname: string;
    klasse?: string;
  };
}

interface AufgabenStatistik extends Aufgabe {
  rueckmeldungen: {
    gesamt: number;
    prio1: number;
    prio2: number;
    prio3: number;
  };
  deckungsgrad: number;
  interessierte: Array<{
    name: string;
    klasse?: string;
    prioritaet: number;
  }>;
}

interface AuswertungViewProps {
  aufgaben: Aufgabe[];
  rueckmeldungen: Rueckmeldung[];
  isLoading: boolean;
}

export function AuswertungView({ 
  aufgaben, 
  rueckmeldungen,
  isLoading
}: AuswertungViewProps) {
  // Aufgaben mit Statistiken anreichern
  const aufgabenMitStatistik = useMemo(() => {
    return aufgaben.map(aufgabe => {
      // Rückmeldungen für diese Aufgabe filtern
      const aufgabenRueckmeldungen = rueckmeldungen.filter(r => r.aufgabe_id === aufgabe.id);
      
      // Anzahl nach Priorität zählen
      const prio1 = aufgabenRueckmeldungen.filter(r => r.prioritaet === 1).length;
      const prio2 = aufgabenRueckmeldungen.filter(r => r.prioritaet === 2).length;
      const prio3 = aufgabenRueckmeldungen.filter(r => r.prioritaet === 3).length;
      const gesamt = aufgabenRueckmeldungen.length;
      
      // Deckungsgrad berechnen (in Prozent)
      const deckungsgrad = Math.min(100, Math.round((gesamt / aufgabe.bedarf) * 100));
      
      // Liste der Interessierten erstellen
      const interessierte = aufgabenRueckmeldungen.map(r => ({
        name: r.kind ? `${r.kind.nachname}, ${r.kind.vorname}` : 'Unbekannt',
        klasse: r.kind?.klasse,
        prioritaet: r.prioritaet
      }));
      
      // Nach Priorität sortieren
      interessierte.sort((a, b) => a.prioritaet - b.prioritaet);
      
      return {
        ...aufgabe,
        rueckmeldungen: {
          gesamt,
          prio1,
          prio2,
          prio3
        },
        deckungsgrad,
        interessierte
      };
    });
  }, [aufgaben, rueckmeldungen]);
  
  // Top 5 beliebteste Aufgaben (nach Prio 1)
  const topAufgaben = useMemo(() => {
    return [...aufgabenMitStatistik]
      .filter(a => a.rueckmeldungen.prio1 > 0)
      .sort((a, b) => b.rueckmeldungen.prio1 - a.rueckmeldungen.prio1)
      .slice(0, 5);
  }, [aufgabenMitStatistik]);
  
  // Aufgaben ohne Rückmeldungen
  const aufgabenOhneRueckmeldungen = useMemo(() => {
    return aufgabenMitStatistik.filter(a => a.rueckmeldungen.gesamt === 0);
  }, [aufgabenMitStatistik]);
  
  // Hilfsfunktion für die Deckungsgrad-Farbe
  const getDeckungsgradColor = (deckungsgrad: number) => {
    if (deckungsgrad < 50) return 'bg-red-500';
    if (deckungsgrad < 100) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  // Hilfsfunktion für die Prioritäts-Badge
  const getPriorityBadge = (prioritaet: number) => {
    let color;
    switch (prioritaet) {
      case 1:
        color = "bg-green-100 text-green-800 border-green-300";
        break;
      case 2:
        color = "bg-yellow-100 text-yellow-800 border-yellow-300";
        break;
      case 3:
        color = "bg-red-100 text-red-800 border-red-300";
        break;
      default:
        color = "bg-gray-100 text-gray-800 border-gray-300";
    }
    
    return (
      <Badge variant="outline" className={`ml-2 ${color}`}>
        Prio {prioritaet}
      </Badge>
    );
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 w-full bg-gray-200 animate-pulse rounded-md" />
        <div className="h-12 w-full bg-gray-200 animate-pulse rounded-md" />
        <div className="h-12 w-full bg-gray-200 animate-pulse rounded-md" />
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Aufgabenübersicht (Heatmap) */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Aufgabenübersicht</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aufgabenMitStatistik.map((aufgabe) => (
            <TooltipProvider key={aufgabe.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{aufgabe.titel}</CardTitle>
                      <CardDescription>
                        {aufgabe.bedarf} Helfer:innen benötigt
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Rückmeldungen: {aufgabe.rueckmeldungen.gesamt}</span>
                          <span className="text-muted-foreground">
                            {aufgabe.deckungsgrad}% abgedeckt
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${getDeckungsgradColor(aufgabe.deckungsgrad)}`} 
                            style={{ width: `${aufgabe.deckungsgrad}%` }}
                          ></div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {aufgabe.rueckmeldungen.prio1 > 0 && (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                              {aufgabe.rueckmeldungen.prio1}× Prio 1
                            </Badge>
                          )}
                          {aufgabe.rueckmeldungen.prio2 > 0 && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              {aufgabe.rueckmeldungen.prio2}× Prio 2
                            </Badge>
                          )}
                          {aufgabe.rueckmeldungen.prio3 > 0 && (
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                              {aufgabe.rueckmeldungen.prio3}× Prio 3
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="w-64 p-0">
                  <div className="p-3">
                    <h4 className="font-medium mb-2">Interessierte Helfer:innen</h4>
                    {aufgabe.interessierte.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Keine Rückmeldungen</p>
                    ) : (
                      <ul className="space-y-1">
                        {aufgabe.interessierte.map((person, index) => (
                          <li key={index} className="text-sm flex items-center">
                            <span>
                              {person.name}
                              {person.klasse && ` (${person.klasse})`}
                            </span>
                            {getPriorityBadge(person.prioritaet)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
      
      {/* Aufgaben ohne Rückmeldungen */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Aufgaben ohne Rückmeldungen</h3>
        {aufgabenOhneRueckmeldungen.length === 0 ? (
          <p className="text-muted-foreground">Alle Aufgaben haben mindestens eine Rückmeldung</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aufgabenOhneRueckmeldungen.map((aufgabe) => (
              <Card key={aufgabe.id} className="border-l-4 border-l-red-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{aufgabe.titel}</CardTitle>
                  <CardDescription>
                    {aufgabe.bedarf} Helfer:innen benötigt
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">0 Rückmeldungen</span>
                      <span className="text-muted-foreground">
                        0% abgedeckt
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div 
                        className="h-2.5 rounded-full bg-red-500" 
                        style={{ width: '0%' }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
