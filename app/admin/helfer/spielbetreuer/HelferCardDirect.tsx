import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, User, UserCheck, UserMinus } from 'lucide-react';

interface HelferCardDirectProps {
  id: string;
  vorname: string;
  nachname: string;
  klasse?: string;
  status: 'frei' | 'springer' | 'zugewiesen';
  spielName?: string;
  spiele: { id: string; name: string }[];
  onZuweiseZuSpiel: (helferId: string, spielId: string) => void;
  onMarkiereAlsSpringer: (helferId: string) => void;
  onFreigeben: (helferId: string) => void;
}

export const HelferCardDirect: React.FC<HelferCardDirectProps> = ({
  id,
  vorname,
  nachname,
  klasse,
  status,
  spielName,
  spiele,
  onZuweiseZuSpiel,
  onMarkiereAlsSpringer,
  onFreigeben,
}) => {
  const [showSpiele, setShowSpiele] = React.useState(false);

  // Bestimme Farben und Styles basierend auf Status
  const getBorderColor = () => {
    switch (status) {
      case 'frei': return 'border-gray-200';
      case 'springer': return 'border-blue-400';
      case 'zugewiesen': return 'border-green-400';
      default: return 'border-gray-200';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'frei': 
        return null;
      case 'springer': 
        return <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Springer</span>;
      case 'zugewiesen': 
        return <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">{spielName}</span>;
      default: 
        return null;
    }
  };

  return (
    <div className={`flex flex-col rounded-xl border-2 shadow-sm bg-white p-4 mb-3 transition-all hover:shadow-md ${getBorderColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <User className="h-5 w-5 text-gray-500 mr-2" />
          <div>
            <span className="font-semibold">{vorname} {nachname}</span>
            {klasse && <span className="ml-2 text-xs text-gray-400">({klasse})</span>}
          </div>
        </div>
        {getStatusBadge()}
      </div>
      
      <div className="flex flex-wrap gap-2 mt-2">
        {/* Aktionsbuttons basierend auf Status */}
        {status === 'frei' && (
          <>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => onMarkiereAlsSpringer(id)}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Springer
            </Button>
            
            <div className="relative flex-1">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => setShowSpiele(!showSpiele)}
              >
                Spiel zuweisen
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
              
              {showSpiele && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg">
                  {spiele.map(spiel => (
                    <button
                      key={spiel.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={() => {
                        onZuweiseZuSpiel(id, spiel.id);
                        setShowSpiele(false);
                      }}
                    >
                      {spiel.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        
        {status === 'springer' && (
          <>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => onFreigeben(id)}
            >
              <UserMinus className="h-4 w-4 mr-1" />
              Freigeben
            </Button>
            
            <div className="relative flex-1">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => setShowSpiele(!showSpiele)}
              >
                Spiel zuweisen
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
              
              {showSpiele && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg">
                  {spiele.map(spiel => (
                    <button
                      key={spiel.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={() => {
                        onZuweiseZuSpiel(id, spiel.id);
                        setShowSpiele(false);
                      }}
                    >
                      {spiel.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        
        {status === 'zugewiesen' && (
          <>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => onFreigeben(id)}
            >
              <UserMinus className="h-4 w-4 mr-1" />
              Freigeben
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => onMarkiereAlsSpringer(id)}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Springer
            </Button>
            
            <div className="relative flex-1">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => setShowSpiele(!showSpiele)}
              >
                Anderes Spiel
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
              
              {showSpiele && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg">
                  {spiele.map(spiel => (
                    <button
                      key={spiel.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={() => {
                        onZuweiseZuSpiel(id, spiel.id);
                        setShowSpiele(false);
                      }}
                    >
                      {spiel.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
