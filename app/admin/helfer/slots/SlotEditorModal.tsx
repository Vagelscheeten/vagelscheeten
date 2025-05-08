"use client";

import { useState, useEffect, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { HelferSlot } from './types';

interface SlotEditorModalProps {
  aufgabeId: string;
  slotToEdit?: HelferSlot | null;
  onClose: (refresh?: boolean) => void;
}

const supabase = createClient();

export default function SlotEditorModal({ aufgabeId, slotToEdit, onClose }: SlotEditorModalProps) {
  const [beschreibung, setBeschreibung] = useState('');
  const [startzeit, setStartzeit] = useState(''); // Format: HH:MM
  const [endzeit, setEndzeit] = useState('');   // Format: HH:MM
  const [maxHelfer, setMaxHelfer] = useState<number | string>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slotToEdit) {
      setBeschreibung(slotToEdit.beschreibung || '');
      // Nehme die ersten 5 Zeichen (HH:MM) direkt aus den Zeitstrings
      setStartzeit(slotToEdit.startzeit ? slotToEdit.startzeit.substring(0, 5) : '');
      setEndzeit(slotToEdit.endzeit ? slotToEdit.endzeit.substring(0, 5) : '');
      setMaxHelfer(slotToEdit.max_helfer || 1);
    } else {
      // Standardwerte für neuen Slot
      setBeschreibung('');
      setStartzeit('');
      setEndzeit('');
      setMaxHelfer(1);
    }
  }, [slotToEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    if (!beschreibung || !startzeit || !endzeit || !maxHelfer) {
        setError('Bitte füllen Sie alle Pflichtfelder aus.');
        setIsSaving(false);
        return;
    }

    const slotData = {
      aufgabe_id: aufgabeId,
      beschreibung,
      startzeit: startzeit, // Direkt HH:MM aus dem State verwenden
      endzeit: endzeit,     // Direkt HH:MM aus dem State verwenden
      max_helfer: Number(maxHelfer),
    };

    let result;
    if (slotToEdit?.id) {
      // Update existing slot
      result = await supabase
        .from('helfer_slots')
        .update(slotData)
        .eq('id', slotToEdit.id);
    } else {
      // Create new slot
      result = await supabase
        .from('helfer_slots')
        .insert(slotData);
    }

    if (result.error) {
      console.error('Fehler beim Speichern des Slots:', result.error);
      setError(result.error.message);
    } else {
      onClose(true); // Schließen und Refresh auslösen
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {slotToEdit ? 'Slot bearbeiten' : 'Neuen Slot erstellen'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="beschreibung" className="block text-sm font-medium text-gray-700">Beschreibung*</label>
            <input
              type="text"
              id="beschreibung"
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startzeit" className="block text-sm font-medium text-gray-700">Startzeit* (HH:MM)</label>
              <input
                type="time"
                id="startzeit"
                value={startzeit}
                onChange={(e) => setStartzeit(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="endzeit" className="block text-sm font-medium text-gray-700">Endzeit* (HH:MM)</label>
              <input
                type="time"
                id="endzeit"
                value={endzeit}
                onChange={(e) => setEndzeit(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="maxHelfer" className="block text-sm font-medium text-gray-700">Maximale Helfer*</label>
            <input
              type="number"
              id="maxHelfer"
              value={maxHelfer}
              onChange={(e) => setMaxHelfer(e.target.valueAsNumber || e.target.value)}
              min="1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => onClose(false)} // Schließen ohne Refresh
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isSaving}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isSaving}
            >
              {isSaving ? 'Speichert...' : (slotToEdit ? 'Änderungen speichern' : 'Slot erstellen')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
