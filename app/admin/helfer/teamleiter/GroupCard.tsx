import React from 'react';
import { Button } from '@/components/ui/button';
import { UserX } from 'lucide-react';

interface GroupCardProps {
  gruppe: {
    id: string;
    name: string;
    leiter_zugangscode: string;
  };
  zugewiesenerHelfer?: {
    id: string;
    kind?: {
      vorname: string;
      nachname: string;
      klasse?: string;
    } | null;
    externe_helfer?: {
      id: string;
      name: string;
    } | null;
  };
  onRemoveTeamleiter: () => void;
}

export function GroupCard({ gruppe, zugewiesenerHelfer, onRemoveTeamleiter }: GroupCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-900">{gruppe.name}</h3>
          {zugewiesenerHelfer && (
            <Button 
              onClick={onRemoveTeamleiter} 
              variant="ghost" 
              size="sm" 
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <UserX className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-1">
          <span className="text-xs font-medium text-gray-500">Zugangscode: </span>
          <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{gruppe.leiter_zugangscode}</span>
        </div>
      </div>
      
      {zugewiesenerHelfer ? (
        <div className="p-4 bg-green-50">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold mr-3">
              {zugewiesenerHelfer.kind ? (
                <>
                  {zugewiesenerHelfer.kind.vorname.charAt(0)}
                  {zugewiesenerHelfer.kind.nachname.charAt(0)}
                </>
              ) : zugewiesenerHelfer.externe_helfer ? (
                zugewiesenerHelfer.externe_helfer.name.charAt(0)
              ) : '?'}
            </div>
            <div>
              <p className="font-medium text-green-800">
                {zugewiesenerHelfer.kind ? (
                  `${zugewiesenerHelfer.kind.vorname} ${zugewiesenerHelfer.kind.nachname}`
                ) : zugewiesenerHelfer.externe_helfer ? (
                  `${zugewiesenerHelfer.externe_helfer.name} (Extern)`
                ) : (
                  'Unbekannter Helfer'
                )}
              </p>
              {zugewiesenerHelfer.kind?.klasse && (
                <p className="text-xs text-green-600">Klasse: {zugewiesenerHelfer.kind.klasse}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50">
          <p className="text-sm text-gray-500 italic">Noch kein Teamleiter zugewiesen</p>
        </div>
      )}
    </div>
  );
}
