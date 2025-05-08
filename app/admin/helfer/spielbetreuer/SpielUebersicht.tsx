import React from 'react';
import { Users } from 'lucide-react';

interface SpielUebersichtProps {
  spiele: {
    id: string;
    name: string;
    helfer: {
      id: string;
      name: string;
    }[];
    maxHelfer?: number;
  }[];
}

export const SpielUebersicht: React.FC<SpielUebersichtProps> = ({ spiele }) => {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Users className="h-5 w-5 mr-2" />
        Spiele-Übersicht
      </h2>
      
      <div className="space-y-4">
        {spiele.map(spiel => {
          const helferCount = spiel.helfer.length;
          const maxHelfer = spiel.maxHelfer || 2;
          const isComplete = helferCount >= maxHelfer;
          
          return (
            <div key={spiel.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{spiel.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${isComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {helferCount}/{maxHelfer} Helfer
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {spiel.helfer.length === 0 ? (
                  <span className="text-sm text-gray-400 italic">Keine Helfer zugewiesen</span>
                ) : (
                  spiel.helfer.map(helfer => (
                    <span 
                      key={helfer.id} 
                      className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      {helfer.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
