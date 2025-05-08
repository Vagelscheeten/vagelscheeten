// Typdefinitionen für die Auswertung

export interface GesamtauswertungItem {
  kind_id: string;
  kind_name: string;
  geschlecht: string;
  klasse: string;
  spielgruppe_name: string;
  gesamtpunkte: number;
  anzahl_spiele: number;
  gesamt_spiele: number;
  rang: number;
  status: string;
  ist_koenig: boolean;
  ist_koenigin: boolean;
}

export interface SpielPunktItem {
  kind_id: string;
  kind_name: string;
  spiel_id: string;
  spiel_name: string;
  wert: string;
  wert_numeric: number;
  punkte: number;
  rang: number;
  klasse: string;
  geschlecht: string;
}

export interface KlassenStatistik {
  klasse: string;
  kinder: any[];
  alleErgebnisseVorhanden: boolean;
  koenig?: {
    kind_id: string;
    punkte: number;
  };
  koenigin?: {
    kind_id: string;
    punkte: number;
  };
}

export interface GruppeSpielStatus {
  gruppe_id: string;
  gruppe_name: string;
  klasse: string;
  spiel_id: string;
  spiel_name: string;
  status: 'offen' | 'teilweise' | 'abgeschlossen' | 'fehler';
  ergebnisse_count: number;
  kinder_count: number;
}
