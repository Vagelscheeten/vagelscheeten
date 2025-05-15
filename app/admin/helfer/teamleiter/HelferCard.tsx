import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, UserPlus } from 'lucide-react';

interface HelferCardProps {
  helfer: {
    id: string;
    kind: {
      vorname: string;
      nachname: string;
      klasse?: string;
    };
  };
  isAssigned: boolean;
  assignedGroupName?: string; // Name der zugewiesenen Gruppe
  gruppen: Array<{
    id: string;
    name: string;
  }>;
  onAssign: (gruppeid: string) => void;
}

export function HelferCard({ helfer, isAssigned, assignedGroupName, gruppen, onAssign }: HelferCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  return (
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${isAssigned ? 'border-l-4 border-green-500' : ''}`}>
      <div className="p-3 flex justify-between items-center">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${isAssigned ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
            {helfer.kind.vorname.charAt(0)}
            {helfer.kind.nachname.charAt(0)}
          </div>
          <div>
            <p className="font-medium">
              {helfer.kind.vorname} {helfer.kind.nachname}
              {isAssigned && assignedGroupName && (
                <span className="ml-2 text-xs font-normal text-green-600">
                  (Gruppe: {assignedGroupName})
                </span>
              )}
            </p>
            {helfer.kind.klasse && (
              <p className="text-xs text-gray-600">Klasse: {helfer.kind.klasse}</p>
            )}
          </div>
        </div>
        
        <Button
          onClick={() => setShowDropdown(!showDropdown)}
          variant="ghost"
          size="sm"
          disabled={gruppen.length === 0}
        >
          <span className="mr-1">Zuweisen</span>
          {showDropdown ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {showDropdown && (
        <div className="p-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">
            Gruppe auswählen:
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {gruppen.map((gruppe) => (
              <button
                key={gruppe.id}
                onClick={() => {
                  onAssign(gruppe.id);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 flex items-center"
              >
                <UserPlus className="h-3 w-3 mr-2 text-gray-500" />
                {gruppe.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
