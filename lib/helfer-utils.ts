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

// ── Rückmeldungs-Status (Schritt 1: Übersicht) ────────────────────────────────

export type RueckmeldungsStatus =
  | 'komplett'
  | 'nur_helfer'
  | 'nur_essen'
  | 'leer'
  | 'unverifiziert'
  | 'fehlt';

export interface WeiteresKind {
  vorname: string;
  nachname: string;
  klasse: string;
}

export interface AnmeldungLite {
  id: string;
  eltern_email: string | null;
  kind_vorname: string;
  kind_nachname: string;
  kind_klasse: string;
  weitere_kinder_json: WeiteresKind[] | null;
  helfer_aufgaben_json: unknown[] | null;
  essensspenden_json: unknown[] | null;
  ist_springer: boolean | null;
  springer_zeitfenster: string | null;
  kommentar: string | null;
  verifiziert: boolean | null;
  verifiziert_am: string | null;
  benachrichtigt_am: string | null;
  erstellt_am: string | null;
}

export interface KindLite {
  id: string;
  vorname: string;
  nachname: string;
  klasse: string | null;
  geschlecht: string;
}

export interface KindMitStatus {
  kind: KindLite;
  status: RueckmeldungsStatus;
  anmeldung: AnmeldungLite | null;
  hasKommentar: boolean;
}

export function normalizeName(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ');
}

export function normalizeKlasse(s: string | null | undefined): string {
  if (!s) return '';
  return s.trim().toLowerCase().replace(/\s+/g, '');
}

export function firstWord(s: string | null | undefined): string {
  if (!s) return '';
  // Split bei Leerzeichen ODER Bindestrich, damit sowohl "Hedi Liv" als auch
  // "Lio-Theodor" auf "Hedi" / "Lio" reduziert werden.
  const match = s.trim().split(/[\s-]+/)[0];
  return match || '';
}

export function buildMatchKey(vorname: string, nachname: string, klasse: string | null | undefined): string {
  return `${normalizeName(vorname)}|${normalizeName(nachname)}|${normalizeKlasse(klasse)}`;
}

// Welche Anmeldung soll bei mehreren Treffern für dasselbe Kind den Status liefern?
// 1) Verifizierte schlägt unverifizierte.
// 2) Bei gleichem Verifiziert-Status: neuere (verifiziert_am, sonst erstellt_am).
function isAnmeldungBesser(neu: AnmeldungLite, alt: AnmeldungLite): boolean {
  const neuV = !!neu.verifiziert;
  const altV = !!alt.verifiziert;
  if (neuV !== altV) return neuV;
  const neuTs = neu.verifiziert_am || neu.erstellt_am || '';
  const altTs = alt.verifiziert_am || alt.erstellt_am || '';
  return neuTs > altTs;
}

function addIndexEntry(idx: Map<string, AnmeldungLite>, vorname: string, nachname: string, klasse: string | null | undefined, a: AnmeldungLite) {
  const fullKey = buildMatchKey(vorname, nachname, klasse);
  const existingFull = idx.get(fullKey);
  if (!existingFull || isAnmeldungBesser(a, existingFull)) idx.set(fullKey, a);
  // Fallback: erster Vorname (z.B. "Hedi Liv" → "Hedi"). Fängt Doppelnamen ab,
  // wenn nur der Rufname in der Anmeldung eingegeben wurde.
  const fw = firstWord(vorname);
  if (fw && normalizeName(fw) !== normalizeName(vorname)) {
    const firstKey = buildMatchKey(fw, nachname, klasse);
    const existingFirst = idx.get(firstKey);
    if (!existingFirst || isAnmeldungBesser(a, existingFirst)) idx.set(firstKey, a);
  }
}

export function buildAnmeldungsIndex(anmeldungen: AnmeldungLite[]): Map<string, AnmeldungLite> {
  const idx = new Map<string, AnmeldungLite>();
  for (const a of anmeldungen) {
    addIndexEntry(idx, a.kind_vorname, a.kind_nachname, a.kind_klasse, a);
    const weitere = Array.isArray(a.weitere_kinder_json) ? a.weitere_kinder_json : [];
    for (const w of weitere) {
      if (!w?.vorname || !w?.nachname) continue;
      addIndexEntry(idx, w.vorname, w.nachname, w.klasse, a);
    }
  }
  return idx;
}

export function findAnmeldungForKind(kind: KindLite, idx: Map<string, AnmeldungLite>): AnmeldungLite | null {
  const fullKey = buildMatchKey(kind.vorname, kind.nachname, kind.klasse);
  const hit = idx.get(fullKey);
  if (hit) return hit;
  // Fallback: kinder-Seite kann auch Doppelnamen tragen (z.B. "Hedi Liv"),
  // Anmeldung enthielt aber nur den Rufnamen.
  const fw = firstWord(kind.vorname);
  if (fw && normalizeName(fw) !== normalizeName(kind.vorname)) {
    const firstKey = buildMatchKey(fw, kind.nachname, kind.klasse);
    return idx.get(firstKey) ?? null;
  }
  return null;
}

// Spiegelbildlicher Index für `kinder` — erlaubt, von einem Anmeldungs-Eintrag
// aus zu prüfen, ob ein passendes Kind in der Klassenliste existiert.
export function buildKinderIndex(kinder: KindLite[]): Map<string, KindLite> {
  const idx = new Map<string, KindLite>();
  for (const k of kinder) {
    const full = buildMatchKey(k.vorname, k.nachname, k.klasse);
    if (!idx.has(full)) idx.set(full, k);
    const fw = firstWord(k.vorname);
    if (fw && normalizeName(fw) !== normalizeName(k.vorname)) {
      const firstKey = buildMatchKey(fw, k.nachname, k.klasse);
      if (!idx.has(firstKey)) idx.set(firstKey, k);
    }
  }
  return idx;
}

export function findKindInIndex(
  vorname: string,
  nachname: string,
  klasse: string | null | undefined,
  idx: Map<string, KindLite>,
): KindLite | null {
  const full = idx.get(buildMatchKey(vorname, nachname, klasse));
  if (full) return full;
  const fw = firstWord(vorname);
  if (fw && normalizeName(fw) !== normalizeName(vorname)) {
    return idx.get(buildMatchKey(fw, nachname, klasse)) ?? null;
  }
  return null;
}

export interface AnmeldungsKindEintrag {
  vorname: string;
  nachname: string;
  klasse: string;
  istHaupt: boolean;
  matched: KindLite | null;
}

// Liefert alle Anmeldungen, die zu einem gegebenen Kind matchen (Haupt- ODER Geschwistereintrag).
export function findAllAnmeldungenForKind(kind: KindLite, anmeldungen: AnmeldungLite[]): AnmeldungLite[] {
  const treffer: AnmeldungLite[] = [];
  for (const a of anmeldungen) {
    const eintraege: { vorname: string; nachname: string; klasse: string | null | undefined }[] = [
      { vorname: a.kind_vorname, nachname: a.kind_nachname, klasse: a.kind_klasse },
    ];
    const weitere = Array.isArray(a.weitere_kinder_json) ? a.weitere_kinder_json : [];
    for (const w of weitere) {
      if (!w?.vorname || !w?.nachname) continue;
      eintraege.push({ vorname: w.vorname, nachname: w.nachname, klasse: w.klasse });
    }
    const passt = eintraege.some((e) => {
      if (
        normalizeName(e.vorname) === normalizeName(kind.vorname)
        && normalizeName(e.nachname) === normalizeName(kind.nachname)
        && normalizeKlasse(e.klasse) === normalizeKlasse(kind.klasse)
      ) return true;
      // first-word fallback in beide Richtungen
      const eFirst = firstWord(e.vorname);
      const kFirst = firstWord(kind.vorname);
      if (
        normalizeName(e.nachname) === normalizeName(kind.nachname)
        && normalizeKlasse(e.klasse) === normalizeKlasse(kind.klasse)
        && (normalizeName(eFirst) === normalizeName(kind.vorname)
          || normalizeName(e.vorname) === normalizeName(kFirst)
          || normalizeName(eFirst) === normalizeName(kFirst))
      ) return true;
      return false;
    });
    if (passt) treffer.push(a);
  }
  return treffer;
}

export function listAnmeldungsKinder(a: AnmeldungLite, idx: Map<string, KindLite>): AnmeldungsKindEintrag[] {
  const list: AnmeldungsKindEintrag[] = [
    {
      vorname: a.kind_vorname,
      nachname: a.kind_nachname,
      klasse: a.kind_klasse,
      istHaupt: true,
      matched: findKindInIndex(a.kind_vorname, a.kind_nachname, a.kind_klasse, idx),
    },
  ];
  const weitere = Array.isArray(a.weitere_kinder_json) ? a.weitere_kinder_json : [];
  for (const w of weitere) {
    if (!w?.vorname || !w?.nachname) continue;
    list.push({
      vorname: w.vorname,
      nachname: w.nachname,
      klasse: w.klasse || '',
      istHaupt: false,
      matched: findKindInIndex(w.vorname, w.nachname, w.klasse, idx),
    });
  }
  return list;
}

export function deriveStatus(kind: KindLite, idx: Map<string, AnmeldungLite>): KindMitStatus {
  const anmeldung = findAnmeldungForKind(kind, idx);
  const hasKommentar = !!anmeldung?.kommentar?.trim();

  if (!anmeldung) {
    return { kind, status: 'fehlt', anmeldung: null, hasKommentar: false };
  }
  if (!anmeldung.verifiziert) {
    return { kind, status: 'unverifiziert', anmeldung, hasKommentar };
  }

  const helferLen = Array.isArray(anmeldung.helfer_aufgaben_json) ? anmeldung.helfer_aufgaben_json.length : 0;
  const essenLen = Array.isArray(anmeldung.essensspenden_json) ? anmeldung.essensspenden_json.length : 0;
  const istSpringer = !!anmeldung.ist_springer;
  const hatHelfer = helferLen > 0 || istSpringer;
  const hatEssen = essenLen > 0;

  let status: RueckmeldungsStatus;
  if (!hatHelfer && !hatEssen) status = 'leer';
  else if (hatHelfer && !hatEssen) status = 'nur_helfer';
  else if (!hatHelfer && hatEssen) status = 'nur_essen';
  else status = 'komplett';

  return { kind, status, anmeldung, hasKommentar };
}

export const STATUS_LABELS: Record<RueckmeldungsStatus, string> = {
  komplett: 'Komplett',
  nur_helfer: 'Nur Helfer',
  nur_essen: 'Nur Essen',
  leer: 'Leer',
  unverifiziert: 'Unverifiziert',
  fehlt: 'Keine Rückmeldung',
};
