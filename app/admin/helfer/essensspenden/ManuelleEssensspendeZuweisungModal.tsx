import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { SpendenBedarfMitSumme } from './types';

interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  klasse?: string;
}

interface ManuelleEssensspendeZuweisungModalProps {
  open: boolean;
  onClose: () => void;
  alleBedarfe: SpendenBedarfMitSumme[];
  vorausgewaehlterBedarfId?: string;
  eventId: string;
  onSave: () => void;
}

interface Klasse {
  klasse: string;
  count: number;
}

export function ManuelleEssensspendeZuweisungModal({
  open,
  onClose,
  alleBedarfe,
  vorausgewaehlterBedarfId,
  eventId,
  onSave,
}: ManuelleEssensspendeZuweisungModalProps) {
  const [selectedBedarfId, setSelectedBedarfId] = useState<string>(vorausgewaehlterBedarfId || '');
  const [selectedKindId, setSelectedKindId] = useState<string>('');
  const [selectedKlasse, setSelectedKlasse] = useState<string>('');
  const [menge, setMenge] = useState<number>(1);
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zugewieseneKinderMap, setZugewieseneKinderMap] = useState<Record<string, string[]>>({});

  const selectedBedarf = alleBedarfe.find(b => b.id === selectedBedarfId);
  const verfuegbareMenge = selectedBedarf
    ? Math.max(0, selectedBedarf.anzahl_benoetigt - selectedBedarf.summeRueckmeldungen)
    : 0;

  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;

      setIsLoading(true);
      const supabase = createClient();

      try {
        const { data, error } = await supabase
          .from('kinder')
          .select('id, vorname, nachname, klasse')
          .eq('event_id', eventId)
          .order('nachname');

        if (error) throw error;
        setKinder(data || []);

        const klassenMap = new Map<string, number>();
        data?.forEach(kind => {
          if (kind.klasse) {
            const count = klassenMap.get(kind.klasse) || 0;
            klassenMap.set(kind.klasse, count + 1);
          }
        });

        const klassenArray = Array.from(klassenMap.entries()).map(([klasse, count]) => ({
          klasse,
          count
        }));
        klassenArray.sort((a, b) => a.klasse.localeCompare(b.klasse));
        setKlassen(klassenArray);

        // Zugewiesene Kinder pro Bedarf laden
        const { data: rueckmeldungen, error: rueckmeldungenError } = await supabase
          .from('essensspenden_rueckmeldungen')
          .select('kind_identifier, spende_id')
          .eq('event_id', eventId);

        if (rueckmeldungenError) throw rueckmeldungenError;

        const map: Record<string, string[]> = {};
        rueckmeldungen?.forEach(r => {
          if (!map[r.spende_id]) map[r.spende_id] = [];
          map[r.spende_id].push(r.kind_identifier);
        });
        setZugewieseneKinderMap(map);
      } catch (error: any) {
        console.error('Fehler beim Laden der Daten:', error);
        toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, eventId]);

  const filteredKinder = useMemo(() => {
    if (!selectedKlasse || selectedKlasse === "all") return kinder;
    return kinder.filter(kind => kind.klasse === selectedKlasse);
  }, [kinder, selectedKlasse]);

  const zugewieseneKinder = selectedBedarfId ? (zugewieseneKinderMap[selectedBedarfId] || []) : [];

  const isKindBereitsZugewiesen = (kind: Kind): boolean => {
    const kindIdentifier = `${kind.nachname}, ${kind.vorname}${kind.klasse ? ` (${kind.klasse})` : ''}`;
    return zugewieseneKinder.includes(kindIdentifier);
  };

  const verfuegbareKinder = filteredKinder.filter(kind => !isKindBereitsZugewiesen(kind));

  const handleSubmit = async () => {
    if (!selectedBedarfId || !selectedBedarf) {
      toast.error('Bitte wähle eine Spendenart aus');
      return;
    }

    if (!selectedKindId) {
      toast.error('Bitte wähle ein Kind aus');
      return;
    }

    if (menge <= 0) {
      toast.error('Die Menge muss größer als 0 sein');
      return;
    }

    if (menge > verfuegbareMenge) {
      toast.error(`Es sind nur noch ${verfuegbareMenge} Einheiten verfügbar`);
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const selectedKind = kinder.find(kind => kind.id === selectedKindId);
      if (!selectedKind) throw new Error('Kind nicht gefunden');

      const kindIdentifier = `${selectedKind.nachname}, ${selectedKind.vorname}${selectedKind.klasse ? ` (${selectedKind.klasse})` : ''}`;

      const { data: existingRueckmeldung, error: checkError } = await supabase
        .from('essensspenden_rueckmeldungen')
        .select('id')
        .eq('kind_identifier', kindIdentifier)
        .eq('spende_id', selectedBedarfId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRueckmeldung) {
        toast.error('Dieses Kind ist bereits für diese Essensspende eingetragen');
        return;
      }

      const { error } = await supabase
        .from('essensspenden_rueckmeldungen')
        .insert([{
          kind_identifier: kindIdentifier,
          spende_id: selectedBedarfId,
          menge: menge,
          event_id: eventId
        }]);

      if (error) throw error;

      toast.success('Essensspende wurde erfolgreich zugewiesen');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Fehler beim Zuweisen:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Essensspende manuell zuweisen</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Spendenart auswählen */}
          <div className="space-y-2">
            <Label htmlFor="spendenart">Spendenart</Label>
            <Select
              value={selectedBedarfId}
              onValueChange={(value) => {
                setSelectedBedarfId(value);
                setSelectedKindId('');
                setMenge(1);
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="spendenart" className="w-full">
                <SelectValue placeholder="Spendenart auswählen" />
              </SelectTrigger>
              <SelectContent>
                {alleBedarfe.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.titel} ({b.summeRueckmeldungen}/{b.anzahl_benoetigt})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Klasse */}
          <div className="space-y-2">
            <Label htmlFor="klasse">Klasse auswählen</Label>
            <Select
              value={selectedKlasse}
              onValueChange={(value) => {
                setSelectedKlasse(value);
                setSelectedKindId('');
              }}
              disabled={isLoading || !selectedBedarfId}
            >
              <SelectTrigger id="klasse" className="w-full">
                <SelectValue placeholder="Klasse auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Klassen</SelectItem>
                {klassen.map(klasse => (
                  <SelectItem key={klasse.klasse} value={klasse.klasse}>
                    {klasse.klasse} ({klasse.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kind */}
          <div className="space-y-2">
            <Label htmlFor="kind">Kind auswählen</Label>
            <Select
              value={selectedKindId}
              onValueChange={setSelectedKindId}
              disabled={isLoading || !selectedBedarfId}
            >
              <SelectTrigger id="kind" className="w-full">
                <SelectValue placeholder="Kind auswählen" />
              </SelectTrigger>
              <SelectContent>
                {verfuegbareKinder.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    {!selectedBedarfId ? 'Erst Spendenart wählen' : 'Keine verfügbaren Kinder'}
                  </SelectItem>
                ) : (
                  verfuegbareKinder.map(kind => (
                    <SelectItem key={kind.id} value={kind.id}>
                      {kind.nachname}, {kind.vorname}
                      {kind.klasse && ` (${kind.klasse})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Menge */}
          <div className="space-y-2">
            <Label htmlFor="menge">Menge</Label>
            <Input
              id="menge"
              type="number"
              min="1"
              max={verfuegbareMenge || undefined}
              value={menge}
              onChange={(e) => setMenge(parseInt(e.target.value) || 1)}
              disabled={isLoading || !selectedBedarfId}
            />
            {selectedBedarf && (
              <p className="text-sm text-gray-500">
                Verfügbar: {verfuegbareMenge} von {selectedBedarf.anzahl_benoetigt}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedBedarfId || !selectedKindId || menge <= 0 || menge > verfuegbareMenge}
          >
            {isSubmitting ? 'Wird zugewiesen...' : 'Zuweisen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
