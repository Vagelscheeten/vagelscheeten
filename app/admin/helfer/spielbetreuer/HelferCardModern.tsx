import React from 'react';
import { Button } from '@/components/ui/button';

interface HelferCardModernProps {
  vorname: string;
  nachname: string;
  klasse?: string;
  status: 'frei' | 'springer' | 'zugewiesen';
  onZuweisen: () => void;
  onSpringer: () => void;
  onEntfernen: () => void;
}

export const HelferCardModern: React.FC<HelferCardModernProps> = ({
  vorname,
  nachname,
  klasse,
  status,
  onZuweisen,
  onSpringer,
  onEntfernen,
}) => {
  return (
    <div className={`flex flex-col rounded-xl border shadow bg-white p-4 mb-2 transition-all hover:shadow-lg ${status === 'springer' ? 'border-blue-400' : status === 'zugewiesen' ? 'border-green-400' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-semibold text-lg">{vorname} {nachname}</span>
          {klasse && <span className="ml-2 text-xs text-gray-400">({klasse})</span>}
        </div>
        {status === 'springer' && <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Springer</span>}
        {status === 'zugewiesen' && <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Zugewiesen</span>}
      </div>
      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={onZuweisen}>Zuweisen</Button>
        <Button size="sm" variant="outline" onClick={onSpringer}>Springer</Button>
        <Button size="sm" variant="destructive" onClick={onEntfernen}>Entfernen</Button>
      </div>
    </div>
  );
};
