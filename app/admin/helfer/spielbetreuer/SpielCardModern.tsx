import React from 'react';
import { Button } from '@/components/ui/button';

interface SpielCardModernProps {
  name: string;
  helfer: { id: string; name: string }[];
  onHelferEntfernen: (id: string) => void;
  onHelferHinzufuegen: () => void;
  maxHelfer?: number;
}

export const SpielCardModern: React.FC<SpielCardModernProps> = ({
  name,
  helfer,
  onHelferEntfernen,
  onHelferHinzufuegen,
  maxHelfer = 2,
}) => {
  return (
    <div className="flex flex-col rounded-xl border shadow bg-white p-4 mb-2 transition-all hover:shadow-lg border-green-200">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-lg">{name}</span>
        <span className={`text-xs px-2 py-1 rounded ${helfer.length >= maxHelfer ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{helfer.length}/{maxHelfer} Helfer</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {helfer.length === 0 ? (
          <span className="text-gray-400 text-sm italic">Noch keine Helfer zugewiesen.</span>
        ) : (
          helfer.map(h => (
            <span key={h.id} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm">
              {h.name}
              <Button variant="ghost" size="icon" className="ml-1" onClick={() => onHelferEntfernen(h.id)}>
                ✕
              </Button>
            </span>
          ))
        )}
      </div>
      <Button size="sm" variant="outline" onClick={onHelferHinzufuegen} disabled={helfer.length >= maxHelfer}>
        Helfer hinzufügen
      </Button>
    </div>
  );
};
