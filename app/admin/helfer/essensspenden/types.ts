export interface SpendenBedarf {
  id: string;
  titel: string;
  beschreibung: string | null;
  anzahl_benoetigt: number;
  event_id: string | null;
  created_at: string;
}

export interface SpendenBedarfMitSumme extends SpendenBedarf {
  summeRueckmeldungen: number;
  prozentAbdeckung: number;
}

export interface SpendenRueckmeldung {
  id: string;
  spende_id: string;
  kind_identifier: string;
  menge: number;
  freitext: string | null;
  erstellt_am: string;
  spende?: SpendenBedarf;
}
