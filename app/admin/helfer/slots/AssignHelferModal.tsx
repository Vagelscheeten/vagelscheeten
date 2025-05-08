"use client";

import { useState, useEffect, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { HelferSlot } from './types';

interface HelferZuteilung {
  id: string;
  aufgabe_id: string;
  kind_id: string;
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
  via_springer: boolean;
}

interface AssignHelferModalProps {
  slot: HelferSlot;
  onClose: (refresh?: boolean) => void;
}

const supabase = createClient();

export default function AssignHelferModal({ slot, onClose }: AssignHelferModalProps) {
  const [aufgabenZuteilungen, setAufgabenZuteilungen] = useState<HelferZuteilung[]>([]);
  const [slotZuteilungIds, setSlotZuteilungIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      // 1. Lade alle Helfer, die der Aufgabe zugewiesen sind
      const { data: aufgabenZuteilungenData, error: aufgabenError } = await supabase
        .from('helfer_zuteilungen')
        .select(`
          id, 
          aufgabe_id,
          kind_id,
          via_springer,
          kind:kinder (id, vorname, nachname, klasse)
        `)
        .eq('aufgabe_id', slot.aufgabe_id);

      if (aufgabenError) {
        console.error('Fehler beim Laden der Aufgaben-Zuteilungen:', aufgabenError);
        setError('Zugewiesene Helfer konnten nicht geladen werden.');
        setLoading(false);
        return;
      }

      // 2. Lade Zuteilungen für diesen spezifischen Slot
      const { data: slotZuteilungenData, error: slotZuteilungenError } = await supabase
        .from('helfer_slot_zuteilungen')
        .select('zuteilung_id')
        .eq('slot_id', slot.id);

      if (slotZuteilungenError) {
        console.error('Fehler beim Laden der Slot-Zuteilungen:', slotZuteilungenError);
        setError('Slot-Zuweisungen konnten nicht geladen werden.');
        setLoading(false);
        return;
      }

      // Speichere die geladenen Daten - mit Typenkorrektur
      const typedZuteilungen = (aufgabenZuteilungenData || []).map(z => {
        // Stelle sicher, dass kind ein einzelnes Objekt ist, kein Array
        return {
          ...z,
          kind: Array.isArray(z.kind) ? z.kind[0] : z.kind
        } as HelferZuteilung;
      });
      setAufgabenZuteilungen(typedZuteilungen);
      setSlotZuteilungIds((slotZuteilungenData || []).map(z => z.zuteilung_id));
      setLoading(false);
    }

    fetchData();
  }, [slot.id, slot.aufgabe_id]);

  const handleToggleHelferSlot = async (zuteilungId: string) => {
    setSaving(true);
    setError(null);
    const isAssigned = slotZuteilungIds.includes(zuteilungId);

    if (isAssigned) {
      // Helfer vom Slot entfernen
      const { error: deleteError } = await supabase
        .from('helfer_slot_zuteilungen')
        .delete()
        .match({ slot_id: slot.id, zuteilung_id: zuteilungId });
      
      if (deleteError) {
        console.error('Fehler beim Entfernen des Helfers vom Slot:', deleteError);
        setError(deleteError.message);
      } else {
        setSlotZuteilungIds(prev => prev.filter(id => id !== zuteilungId));
      }
    } else {
      // Prüfen, ob maximale Anzahl Helfer erreicht ist
      if (slotZuteilungIds.length >= slot.max_helfer) {
        setError(`Maximale Anzahl von ${slot.max_helfer} Helfern für diesen Slot erreicht.`);
        setSaving(false);
        return;
      }

      // Helfer zum Slot hinzufügen
      const { error: insertError } = await supabase
        .from('helfer_slot_zuteilungen')
        .insert({ 
          slot_id: slot.id, 
          zuteilung_id: zuteilungId 
        });
      
      if (insertError) {
        console.error('Fehler beim Hinzufügen des Helfers zum Slot:', insertError);
        setError(insertError.message);
      } else {
        setSlotZuteilungIds(prev => [...prev, zuteilungId]);
      }
    }
    setSaving(false);
  };

  // Filtere Zuteilungen für die Anzeige
  const availableZuteilungen = aufgabenZuteilungen.filter(z => !slotZuteilungIds.includes(z.id));
  const assignedZuteilungen = aufgabenZuteilungen.filter(z => slotZuteilungIds.includes(z.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-semibold mb-1">Helfer zuweisen für:</h2>
        <p className='text-md mb-4 font-medium'>{slot.beschreibung || 'Unbenannter Slot'}</p>
        <p className='text-sm text-gray-600 mb-1'>({slot.startzeit.substring(0, 5)} - {slot.endzeit.substring(0, 5)} Uhr)</p>
        <p className='text-sm text-gray-700 mb-4'>Plätze: {slotZuteilungIds.length} / {slot.max_helfer}</p>

        {loading && <p>Lade Helferinformationen...</p>}
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        <div className="grid grid-cols-2 gap-4 overflow-y-auto flex-grow mb-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Verfügbare Helfer</h3>
            {availableZuteilungen.length === 0 && !loading && <p className="text-sm text-gray-500">Keine weiteren Helfer verfügbar.</p>}
            <ul className="space-y-2">
              {availableZuteilungen.map(zuteilung => (
                <li key={zuteilung.id} className="flex justify-between items-center p-2 border rounded-md">
                  <span>
                    {zuteilung.kind.vorname} {zuteilung.kind.nachname}
                    {zuteilung.kind.klasse && <span className='text-xs text-gray-500'> ({zuteilung.kind.klasse})</span>}
                    {zuteilung.via_springer && <span className='text-xs ml-1 px-1 bg-blue-100 text-blue-800 rounded'>Springer</span>}
                  </span>
                  <button 
                    onClick={() => handleToggleHelferSlot(zuteilung.id)}
                    className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded disabled:bg-gray-300"
                    disabled={saving || slotZuteilungIds.length >= slot.max_helfer}
                  >
                    Zuweisen
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Zugewiesene Helfer ({slotZuteilungIds.length})</h3>
            {assignedZuteilungen.length === 0 && !loading && <p className="text-sm text-gray-500">Noch keine Helfer zugewiesen.</p>}
            <ul className="space-y-2">
              {assignedZuteilungen.map(zuteilung => (
                <li key={zuteilung.id} className="flex justify-between items-center p-2 border rounded-md bg-green-50">
                  <span>
                    {zuteilung.kind.vorname} {zuteilung.kind.nachname}
                    {zuteilung.kind.klasse && <span className='text-xs text-gray-500'> ({zuteilung.kind.klasse})</span>}
                    {zuteilung.via_springer && <span className='text-xs ml-1 px-1 bg-blue-100 text-blue-800 rounded'>Springer</span>}
                  </span>
                  <button 
                    onClick={() => handleToggleHelferSlot(zuteilung.id)}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded disabled:bg-gray-300"
                    disabled={saving}
                  >
                    Entfernen
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end mt-auto pt-4 border-t">
          <button
            type="button"
            onClick={() => onClose(true)} // Schließen und Refresh der Slot-Liste auslösen
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={saving}
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
