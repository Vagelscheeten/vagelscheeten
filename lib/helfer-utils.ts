// Typen und Utilities für den Helfer-Workflow

export type Zeitfenster = 'vormittag' | 'nachmittag' | 'beides';

export interface HelferAufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
  zeitfenster: Zeitfenster;
  event_id: string;
}

export interface HelferRueckmeldung {
  id: string;
  kind_id: string | null;
  aufgabe_id: string | null;
  prioritaet: number;
  freitext: string | null;
  kommentar: string | null;
  kind_name_extern: string | null;
  ist_springer: boolean;
  zeitfenster: Zeitfenster | null;
  erstellt_am: string;
  event_id: string;
  kind?: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  } | null;
  aufgabe?: HelferAufgabe | null;
}

export interface HelferZuteilung {
  id: string;
  kind_id: string | null;
  aufgabe_id: string;
  event_id: string;
  zeitfenster: Zeitfenster;
  manuell: boolean;
  via_springer: boolean;
  zugewiesen_am: string;
  externer_helfer_id: string | null;
  kind?: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  } | null;
  aufgabe?: HelferAufgabe | null;
  externe_helfer?: {
    id: string;
    name: string;
  } | null;
}

export interface ExternerHelfer {
  id: string;
  name: string;
}

// Ermittelt den Anzeige-Namen einer Rückmeldung
export function getRueckmeldungName(r: HelferRueckmeldung): string {
  if (r.kind) {
    return `${r.kind.nachname}, ${r.kind.vorname}`;
  }
  if (r.kind_name_extern) {
    return r.kind_name_extern;
  }
  return 'Unbekannt';
}

// Ermittelt den Anzeige-Namen einer Zuteilung
export function getZuteilungName(z: HelferZuteilung): string {
  if (z.kind) {
    return `${z.kind.nachname}, ${z.kind.vorname}`;
  }
  if (z.externe_helfer) {
    return z.externe_helfer.name;
  }
  return 'Externer Helfer';
}

// Zeitfenster leserlich formatieren
export function formatZeitfenster(z: Zeitfenster | null | undefined): string {
  if (!z) return '-';
  switch (z) {
    case 'vormittag': return 'Vormittag';
    case 'nachmittag': return 'Nachmittag';
    case 'beides': return 'Ganztags';
  }
}

// Datum formatieren
export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

// Phase berechnen aus Datenlage
export type WorkflowPhase = 0 | 1 | 2 | 3 | 4 | 5;

export function berechnePhase(
  anzahlRueckmeldungen: number,
  anzahlZuteilungen: number,
  anzahlBenachrichtigt: number
): WorkflowPhase {
  if (anzahlRueckmeldungen === 0) return 0;
  if (anzahlZuteilungen === 0) return 1;
  if (anzahlBenachrichtigt === 0) return 3;
  return 5;
}
