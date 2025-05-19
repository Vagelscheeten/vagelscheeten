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

// Neuer Typ für die PDF-Tabellenansicht und Filterung in page.tsx
export interface ZuteilungMitKindUndAufgabeDetails {
  id: string; // Zuteilungs-ID
  kind_id: string;
  aufgabe_id: string;
  via_springer: boolean;
  kind: {
    id: string; // Kind-ID
    vorname: string;
    nachname: string;
    klasse?: string;
  } | null; // Kind kann null sein, falls externe Helfer berücksichtigt werden sollen (hier eher nicht)
  helferaufgaben: {
    id: string; // Aufgaben-ID
    titel: string;
    beschreibung: string | null;
    zeitfenster: string | null;
    bereich?: string | null; // Bereich ist optional
  };
}

// Typen speziell für die PDF Generierung und Datenaggregation in page.tsx
export interface HelferRueckmeldungMitDetailsFuerPDF {
  id: string; 
  kind_id: string; 
  aufgabe_id: string;
  prioritaet: number | null;
  freitext: string | null;
  ist_springer: boolean;
  zeitfenster_wunsch: string | null; 
  aufgabe_titel: string; 
  kind_vorname?: string; 
  kind_nachname?: string;
  kind_klasse?: string;
}

export interface EssensspendeMitDetailsFuerPDF {
  id: string; 
  spende_id: string; 
  kind_identifier_original: string; 
  menge: number;
  freitext_spende: string | null; 
  spende_titel: string; 
  zugeordnetes_kind_id?: string;
  zugeordnetes_kind_vorname?: string;
  zugeordnetes_kind_nachname?: string;
  zugeordnetes_kind_klasse?: string;
}

export interface KindPdfDetails {
  id: string;
  vorname: string;
  nachname: string;
  klasse: string; 
  zugewieseneAufgaben: ZuteilungMitKindUndAufgabeDetails[]; // Bereits definierter Typ
  wuensche: HelferRueckmeldungMitDetailsFuerPDF[];
  essensspenden: EssensspendeMitDetailsFuerPDF[];
}

// Key ist der Klassenname
export interface KlassenAggregierteDaten {
  kinderDieserKlasse: KindPdfDetails[];
}

export type AlleKlassenPdfsDaten = Record<string, KlassenAggregierteDaten>;
