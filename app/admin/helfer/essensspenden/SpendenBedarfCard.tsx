'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Users } from 'lucide-react';
import { SpendenBedarfMitZuteilungen } from './types';
import { SpendenZuweisungModal } from './SpendenZuweisungModal';

interface SpendenBedarfCardProps {
  bedarf: SpendenBedarfMitZuteilungen;
  onChange: () => void;
}

export function SpendenBedarfCard({ bedarf, onChange }: SpendenBedarfCardProps) {
  const [isZuweisungModalOpen, setIsZuweisungModalOpen] = useState(false);

  // Fortschrittsbalken-Farbe basierend auf Prozent
  const getProgressColor = (prozent: number) => {
    if (prozent < 50) return 'bg-red-500';
    if (prozent < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className={`h-2 ${bedarf.farbe}`} />
        <CardHeader>
          <CardTitle>{bedarf.titel}</CardTitle>
          <CardDescription>{bedarf.beschreibung || 'Keine Beschreibung verfügbar'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Fortschritt: {bedarf.summeRueckmeldungen} von {bedarf.anzahl_benoetigt}</span>
              <span>{bedarf.prozentAbdeckung}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${getProgressColor(bedarf.prozentAbdeckung)}`} 
                style={{ width: `${bedarf.prozentAbdeckung}%` }}
              />
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <Users className="h-4 w-4 mr-1" /> Zugewiesene Spender ({bedarf.zuteilungen.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {bedarf.zuteilungen.length === 0 ? (
                <span className="text-sm text-gray-500">Noch keine Spender zugewiesen</span>
              ) : (
                bedarf.zuteilungen.map(zuteilung => (
                  <Badge 
                    key={zuteilung.id} 
                    variant="outline"
                    className="cursor-default"
                    title={zuteilung.freitext ? `Anmerkung: ${zuteilung.freitext}` : undefined}
                  >
                    {zuteilung.kind_identifier}
                    {zuteilung.menge > 1 && ` (${zuteilung.menge})`}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setIsZuweisungModalOpen(true)}
            disabled={bedarf.summeRueckmeldungen >= bedarf.anzahl_benoetigt}
          >
            <Pencil className="h-4 w-4 mr-2" /> 
            Zuweisung bearbeiten
          </Button>
        </CardFooter>
      </Card>

      {isZuweisungModalOpen && (
        <SpendenZuweisungModal
          open={isZuweisungModalOpen}
          onClose={() => setIsZuweisungModalOpen(false)}
          bedarf={bedarf}
          onSave={() => {
            onChange();
            setIsZuweisungModalOpen(false);
          }}
          verfuegbareMenge={Math.max(0, bedarf.anzahl_benoetigt - bedarf.summeRueckmeldungen)}
        />
      )}
    </>
  );
}
