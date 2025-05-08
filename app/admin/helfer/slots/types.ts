// Definiert die Struktur für einen Helfer-Slot
export interface HelferSlot {
  id: string; // UUID
  aufgabe_id: string; // UUID, Referenz zur Aufgabe
  beschreibung: string;
  startzeit: string; // ISO 8601 Datums-String
  endzeit: string; // ISO 8601 Datums-String
  max_helfer: number;
  created_at: string; // ISO 8601 Datums-String
  assigned_helfer_count?: number; // Anzahl der aktuell zugewiesenen Helfer
}

// Definiert die Struktur für die Zuteilung eines Helfers zu einem Slot
export interface HelferSlotZuteilung {
  id: string; // UUID
  slot_id: string; // UUID, Referenz zum Slot
  zuteilung_id: string; // UUID, Referenz zur ursprünglichen Helfer-Aufgaben-Zuteilung
  kommentar?: string; // Optionaler Kommentar
  erstellt_am: string; // ISO 8601 Datums-String
}

// Erweiterte Typen für die Anzeige und Bearbeitung, falls benötigt
export interface AufgabeMitSlots {
  id: string; // Aufgaben-ID
  name: string; // Aufgabenname
  slots: HelferSlot[];
  // Weitere Aufgabendetails könnten hier hinzugefügt werden
}

export interface SlotMitZuteilungen extends HelferSlot {
  zuteilungen: HelferSlotZuteilung[];
  // Optional: Anzahl der bereits zugewiesenen Helfer für schnellen Zugriff
  zugewiesene_helfer_anzahl?: number;
}
