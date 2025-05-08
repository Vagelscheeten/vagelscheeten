import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  klassenOptions: FilterOption[];
  gruppenOptions: FilterOption[];
  spieleOptions?: FilterOption[];
  selectedKlasse: string;
  selectedGruppe: string;
  selectedSpiel?: string;
  onKlasseChange: (value: string) => void;
  onGruppeChange: (value: string) => void;
  onSpielChange?: (value: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function FilterBar({
  klassenOptions,
  gruppenOptions,
  spieleOptions,
  selectedKlasse,
  selectedGruppe,
  selectedSpiel = 'alle',
  onKlasseChange,
  onGruppeChange,
  onSpielChange,
  onRefresh,
  isLoading = false,
}: FilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="w-full md:w-1/4">
        <label className="block text-sm font-medium mb-2">Klasse</label>
        <Select
          value={selectedKlasse}
          onValueChange={onKlasseChange}
          disabled={isLoading || klassenOptions.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Klasse auswählen" />
          </SelectTrigger>
          <SelectContent>
            {klassenOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="w-full md:w-1/4">
        <label className="block text-sm font-medium mb-2">Gruppe</label>
        <Select
          value={selectedGruppe}
          onValueChange={onGruppeChange}
          disabled={isLoading || gruppenOptions.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Gruppe auswählen" />
          </SelectTrigger>
          <SelectContent>
            {gruppenOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {spieleOptions && onSpielChange && (
        <div className="w-full md:w-1/4">
          <label className="block text-sm font-medium mb-2">Spiel (optional)</label>
          <Select
            value={selectedSpiel}
            onValueChange={onSpielChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle Spiele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Spiele</SelectItem>
              {spieleOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {onRefresh && (
        <div className="flex items-end">
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="mb-0.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )}
    </div>
  );
}
