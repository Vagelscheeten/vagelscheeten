"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // Pfad anpassen
import { Aufgabe } from '@/lib/types'; // Pfad anpassen
import { HelferSlot } from './types';
import SlotEditorModal from './SlotEditorModal'; // Wird später implementiert
import AssignHelferModal from './AssignHelferModal'; // Neu hinzugefügt

interface SlotManagerProps {
  aufgabe: Aufgabe;
  onBack: () => void;
}

const supabase = createClient();

export default function SlotManager({ aufgabe, onBack }: SlotManagerProps) {
  const [slots, setSlots] = useState<HelferSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [errorSlots, setErrorSlots] = useState<string | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<HelferSlot | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false); // Neu
  const [selectedSlotForAssignment, setSelectedSlotForAssignment] = useState<HelferSlot | null>(null); // Neu

  async function fetchSlots() {
    setLoadingSlots(true);
    setErrorSlots(null);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('helfer_slots')
      .select('*, helfer_slot_zuteilungen(count)') // Zähle verknüpfte Zuteilungen
      .eq('aufgabe_id', aufgabe.id)
      .order('startzeit', { ascending: true });

    if (error) {
      console.error(`Fehler beim Laden der Slots für Aufgabe ${aufgabe.id}:`, error);
      setErrorSlots(error.message);
      setSlots([]);
    } else {
      const transformedData = data.map(slot => ({
        ...slot,
        assigned_helfer_count: slot.helfer_slot_zuteilungen && Array.isArray(slot.helfer_slot_zuteilungen) && slot.helfer_slot_zuteilungen.length > 0 ? slot.helfer_slot_zuteilungen[0].count : 0,
      }));
      setSlots(transformedData);
    }
    setLoadingSlots(false);
  }

  useEffect(() => {
    if (aufgabe?.id) {
      fetchSlots();
    }
  }, [aufgabe]);

  const handleAddSlot = () => {
    setEditingSlot(null);
    setShowEditorModal(true);
  };

  const handleEditSlot = (slot: HelferSlot) => {
    setEditingSlot(slot);
    setShowEditorModal(true);
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Diesen Slot wirklich löschen?')) return;

    const { error } = await supabase
      .from('helfer_slots')
      .delete()
      .eq('id', slotId);

    if (error) {
      console.error('Fehler beim Löschen des Slots:', error);
      alert(`Fehler: ${error.message}`);
    } else {
      setSlots(slots.filter(s => s.id !== slotId));
      alert('Slot erfolgreich gelöscht.');
    }
  };

  const handleModalClose = (refresh?: boolean) => {
    setShowEditorModal(false);
    setEditingSlot(null);
    if (refresh) {
      fetchSlots(); // Stellt sicher, dass auch assigned_helfer_count aktualisiert wird
    }
  };

  const handleOpenAssignModal = (slot: HelferSlot) => {
    setSelectedSlotForAssignment(slot);
    setShowAssignModal(true);
  };

  const handleAssignModalClose = (refresh?: boolean) => {
    setShowAssignModal(false);
    setSelectedSlotForAssignment(null);
    if (refresh) {
      fetchSlots(); // Um die Anzeige der Helferanzahl zu aktualisieren
    }
  };

  if (!aufgabe) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Slots für: {aufgabe.titel}</h2>
        <button 
          onClick={onBack} 
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
        >
          Zurück zur Aufgabenübersicht
        </button>
      </div>

      <button 
        onClick={handleAddSlot}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Neuen Slot hinzufügen
      </button>

      {loadingSlots && <p>Lade Slots...</p>}
      {errorSlots && <p className="text-red-500">Fehler beim Laden der Slots: {errorSlots}</p>}

      {!loadingSlots && slots.length === 0 && (
        <p>Für diese Aufgabe wurden noch keine Slots definiert.</p>
      )}

      {!loadingSlots && slots.length > 0 && (
        <ul className="space-y-3">
          {slots.map(slot => (
            <li key={slot.id} className="p-3 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-md font-semibold">{slot.beschreibung || 'Slot ohne Beschreibung'}</h3>
                  <p className="text-sm text-gray-600">
                    {slot.startzeit.substring(0, 5)} - {slot.endzeit.substring(0, 5)} Uhr
                  </p>
                  <p className="text-sm text-gray-600">
                    Helfer: {slot.assigned_helfer_count !== undefined ? slot.assigned_helfer_count : 'N/A'} / {slot.max_helfer}
                  </p>
                </div>
                <div className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-2 mt-1 md:mt-0">
                  <button 
                    onClick={() => handleEditSlot(slot)} 
                    className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-2 rounded"
                  >
                    Bearbeiten
                  </button>
                  <button 
                    onClick={() => handleOpenAssignModal(slot)} // Neu
                    className="text-sm bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded"
                  >
                    Helfer zuweisen
                  </button>
                  <button 
                    onClick={() => handleDeleteSlot(slot.id)} 
                    className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showEditorModal && (
        <SlotEditorModal 
          aufgabeId={aufgabe.id}
          slotToEdit={editingSlot}
          onClose={handleModalClose} 
        />
      )}

      {showAssignModal && selectedSlotForAssignment && (
        <AssignHelferModal
          slot={selectedSlotForAssignment}
          onClose={handleAssignModalClose}
        />
      )}
    </div>
  );
}
