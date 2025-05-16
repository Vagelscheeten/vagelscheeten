// Typdefinitionen für das Vogelschiessen-App

// Spiel-Daten
export interface SpielData {
  id: string;
  name: string;
  beschreibung?: string;
  max_punkte?: number;
  created_at?: string;
  updated_at?: string;
}

// Ergebnis-Daten
export interface ErgebnisData {
  id: string;
  kind_id: string;
  spiel_id: string;
  punkte: number;
  created_at?: string;
  updated_at?: string;
}

// Kind-Daten
export interface KindData {
  id: string;
  vorname: string;
  nachname: string;
  geschlecht: string;
  klasse?: string;
  gruppe?: string;
  created_at?: string;
  updated_at?: string;
}

// Spielgruppe-Daten
export interface SpielgruppeData {
  id: string;
  name: string;
  klasse: string;
  created_at?: string;
  updated_at?: string;
}