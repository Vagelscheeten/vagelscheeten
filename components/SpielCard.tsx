'use client';

import React from 'react';

// Typ für ein Spiel aus der Datenbank
export interface Spiel {
  id: string;
  name: string;
  ziel?: string | null;
  ort?: string | null;
  regeln?: string | null;
  beschreibung?: string | null;
  icon?: string | null;
  created_at?: string;
  updated_at?: string;
  // Andere Felder aus der Datenbank, die wir nicht anzeigen
  wertungstyp?: string;
  anzahl_versuche?: number | null;
  zeitlimit_sekunden?: number | null;
  startpunkte?: number | null;
  strafzeit_sekunden?: number | null;
  einheit?: string | null;
}

// Funktion, um ein passendes Icon für ein Spiel zu bestimmen
export function getSpielIcon(spiel: Spiel): string {
  // Wenn ein Icon in der Datenbank gespeichert ist, dieses verwenden
  if (spiel.icon) return spiel.icon;
  
  // Ansonsten ein passendes Icon basierend auf dem Namen auswählen
  const name = spiel.name.toLowerCase();
  
  if (name.includes('schießen') || name.includes('armbrust')) return '🏹';
  if (name.includes('ball') || name.includes('werfen')) return '🎯';
  if (name.includes('fisch')) return '🐟';
  if (name.includes('glücksrad')) return '🎡';
  if (name.includes('stiefel') || name.includes('gummistiefel')) return '👢';
  if (name.includes('schatz')) return '💰';
  if (name.includes('rennen') || name.includes('roller')) return '🛴';
  if (name.includes('draht')) return '⚡';
  
  // Standardicon, falls keine Übereinstimmung gefunden wurde
  return '🎮';
}

interface SpielCardProps {
  spiel: Spiel;
  onClick: () => void;
}

const SpielCard: React.FC<SpielCardProps> = ({ spiel, onClick }) => {
  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-500 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start">
        <div className="text-4xl mr-4 text-blue-500 group-hover:scale-110 transition-transform">
          {getSpielIcon(spiel)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-500 transition-colors mb-2">
            {spiel.name}
          </h2>
          {spiel.ort && (
            <p className="text-sm text-blue-500 mb-2">
              <span className="font-medium">Ort:</span> {spiel.ort}
            </p>
          )}
        </div>
      </div>
      
      {spiel.ziel && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h3 className="text-md font-semibold text-gray-800">Ziel:</h3>
          <p className="text-gray-600">{spiel.ziel}</p>
        </div>
      )}
    </div>
  );
};

export default SpielCard;
