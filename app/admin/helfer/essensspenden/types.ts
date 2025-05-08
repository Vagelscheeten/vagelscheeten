// Grundlegende Typen für die Essensspenden-Verwaltung

export interface SpendenBedarf {
  id: string;
  titel: string;
  beschreibung: string | null;
  anzahl_benoetigt: number;
  created_at: string;
}

// Erweiterte SpendenBedarf-Schnittstelle mit berechneten Werten
export interface SpendenBedarfMitSumme extends SpendenBedarf {
  summeRueckmeldungen: number;
  prozentAbdeckung: number;
}

// Erweiterte Schnittstelle mit Zuteilungen und Farbe für die Karten
export interface SpendenBedarfMitZuteilungen extends SpendenBedarf {
  summeRueckmeldungen: number;
  prozentAbdeckung: number;
  zuteilungen: SpendenRueckmeldung[];
  farbe: string;
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

// Interface für die Zuteilungstabelle nach Kind
export interface KindMitSpenden {
  kind_identifier: string;
  wuensche: string[]; // Titel der gewünschten Spenden
  zugewiesen: string[]; // Titel der zugewiesenen Spenden
  anzahl: number; // Anzahl der zugewiesenen Spenden
  rueckmeldungen: SpendenRueckmeldung[];
}

// Interface für die Matrix-Darstellung
export interface SpendenMatrixItem {
  kind_identifier: string;
  spenden: {
    [spendeId: string]: {
      gewuenscht: boolean;
      zugewiesen: boolean;
      titel: string;
    }
  }
}
