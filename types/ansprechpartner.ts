export interface Ansprechpartner {
  id: string;
  bereich: string;
  name: string;
  telefonnummer: string | null;
  erstellt_am?: string;
}

export interface AufgabeAnsprechpartner {
  id: string;
  aufgabe_id: string;
  ansprechpartner_id: string;
  ansprechpartner?: Ansprechpartner;
}

export interface GeneriertesPDF {
  id: string;
  kind_id: string;
  dateiname: string;
  erstellt_am: string;
}
