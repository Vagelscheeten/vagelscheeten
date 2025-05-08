// Typdefinitionen für PDF-Generierung

export interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  klasse?: string;
}

export interface HelferSlot {
  id: string;
  beschreibung: string | null;
  startzeit: string; // Format: HH:MM:SS
  endzeit: string;   // Format: HH:MM:SS
  max_helfer: number;
}

export interface Helferaufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  zeitfenster: string | null;
  bereich?: string | null;
}

export interface SlotZuteilung {
  slot_id: string;
  zuteilung_id: string;
  slot: HelferSlot;
}

export interface Zuteilung {
  id: string;
  aufgabe_id: string;
  via_springer: boolean;
  helferaufgaben: Helferaufgabe;
  slots?: SlotZuteilung[]; // Optionale Slot-Zuteilungen
}

export interface Ansprechpartner {
  id: string;
  bereich: string;
  name: string;
  telefonnummer: string | null;
}

// Typdefinitionen für Essensspenden
export interface SpendenBedarf {
  id: string;
  titel: string;
  beschreibung: string | null;
  anzahl_benoetigt: number;
  created_at: string;
}

export interface SpendenRueckmeldung {
  id: string;
  spende_id: string;
  kind_identifier: string;
  menge: number;
  freitext: string | null;
  erstellt_am: string;
  spende?: SpendenBedarf; // Für JOIN-Abfragen
}
