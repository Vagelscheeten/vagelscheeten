// Plausibilitäts-Grenzen pro Wertungstyp.
// Werden sowohl im UI (als min/max-Hint) als auch im Server-Endpoint (als Validierung) genutzt.

export type Wertungstyp =
  | 'WEITE_MAX_AUS_N'
  | 'MENGE_MAX_ZEIT'
  | 'ZEIT_MIN_STRAFE'
  | 'PUNKTE_SUMME_AUS_N'
  | 'PUNKTE_ABZUG'
  | 'PUNKTE_MAX_EINZEL';

export interface WertGrenzen {
  min: number;
  max: number;
  step: number;
  einheitDefault: string;
  hinweis?: string;
}

// Die Grenzen sind großzügig gewählt — sie sollen offensichtliche Tippfehler
// (z. B. „99999 cm Weitsprung") abfangen, aber legitime Eingaben nicht behindern.
const GRENZEN: Record<Wertungstyp, WertGrenzen> = {
  WEITE_MAX_AUS_N: { min: 0, max: 1500, step: 1, einheitDefault: 'cm', hinweis: 'Realistische Weite in cm (max. 15 m)' },
  MENGE_MAX_ZEIT: { min: 0, max: 500, step: 1, einheitDefault: 'Stück', hinweis: 'Anzahl als ganze Zahl' },
  ZEIT_MIN_STRAFE: { min: 0, max: 600, step: 0.1, einheitDefault: 'Sekunden', hinweis: 'Zeit in Sekunden (max. 10 Min)' },
  PUNKTE_SUMME_AUS_N: { min: 0, max: 1000, step: 1, einheitDefault: 'Punkte' },
  PUNKTE_ABZUG: { min: 0, max: 100, step: 1, einheitDefault: 'Abzüge' },
  PUNKTE_MAX_EINZEL: { min: 0, max: 1000, step: 1, einheitDefault: 'Punkte' },
};

export function getWertGrenzen(wertungstyp: string | null | undefined): WertGrenzen {
  if (wertungstyp && wertungstyp in GRENZEN) {
    return GRENZEN[wertungstyp as Wertungstyp];
  }
  // Fallback: alles erlauben (für unbekannte Wertungstypen)
  return { min: 0, max: 99999, step: 1, einheitDefault: '' };
}

/**
 * Prüft, ob ein Wert plausibel ist. Negative Werte werden generell abgelehnt.
 * NaN/Infinity ebenfalls.
 */
export function istWertPlausibel(wert: number, wertungstyp: string | null | undefined): { ok: boolean; grund?: string } {
  if (!Number.isFinite(wert)) {
    return { ok: false, grund: 'Bitte eine gültige Zahl eingeben.' };
  }
  const { min, max } = getWertGrenzen(wertungstyp);
  if (wert < min) return { ok: false, grund: `Der Wert muss mindestens ${min} sein.` };
  if (wert > max) return { ok: false, grund: `Der Wert darf höchstens ${max} sein (Plausibilitätsgrenze).` };
  return { ok: true };
}
