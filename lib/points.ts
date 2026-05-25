/**
 * Zentrale Punkteberechnungsfunktionen
 * Diese Funktionen werden in der gesamten App konsistent verwendet,
 * um sicherzustellen, dass die Ergebnisberechnung überall identisch ist.
 */

// Wertungstypen, bei denen ein KLEINERER Wert besser ist.
// Quelle der Wahrheit für alle Sort-/Rang-Stellen.
const KLEINER_BESSER: ReadonlySet<string> = new Set([
  'ZEIT_MIN_STRAFE', // Zeit in Sekunden — weniger ist besser
  'PUNKTE_ABZUG',    // Anzahl Abzüge/Berührungen — weniger ist besser
]);

/**
 * Gibt zurück, ob bei diesem Wertungstyp ein kleinerer Wert besser ist.
 */
export function istKleinerBesser(wertungstyp: string | null | undefined): boolean {
  return !!wertungstyp && KLEINER_BESSER.has(wertungstyp);
}

/**
 * Vergleichsfunktion für `Array.sort`, die Ergebnisse für einen Wertungstyp
 * vom besten zum schlechtesten sortiert.
 */
export function vergleicheNachWertungstyp(
  a: number,
  b: number,
  wertungstyp: string | null | undefined,
): number {
  return istKleinerBesser(wertungstyp) ? a - b : b - a;
}

/**
 * Berechnet die Punkte für einen bestimmten Rang.
 * Regel: 11 - Rang = Punkte, aber nur für die ersten 10 Plätze.
 * Ab Rang 11 gibt es 0 Punkte.
 * @param rang Der Rang, für den die Punkte berechnet werden sollen
 * @returns Die entsprechende Punktzahl (0-10)
 */
export function berechnePunkteFuerRang(rang: number | undefined): number {
  // Wenn kein Rang vorhanden ist, gibt es keine Punkte
  if (rang === undefined) return 0;

  // Punkteberechnung: 11 - Rang (aber nur für Rang 1-10, danach 0 Punkte)
  return rang <= 10 ? (11 - rang) : 0;
}

/**
 * Berechnet pro Wettbewerbs-Bucket (Spiel + Klasse + Geschlecht) den Rang jedes
 * Ergebnisses. Spielgruppen sind nur eine organisatorische Aufteilung — der
 * Wettbewerb läuft klassenweit. Geschlechter werden getrennt gerankt, weil
 * König (bester Junge) und Königin (bestes Mädchen) parallel ermittelt werden.
 *
 * Gleichstand → gleicher Rang (Standard-Konkurrenz-Ranking, "1224").
 *
 * @param ergebnisse  Zu rankende Ergebnisse
 * @param bucketFuer  Funktion, die für ein Ergebnis einen Bucket-Key zurückgibt
 *                    (typisch: `${klasse}|${geschlecht}`). Wenn null/undefined,
 *                    wird das Ergebnis übersprungen.
 * @param wertungstypFuer Funktion, die für ein Ergebnis den Wertungstyp zurückgibt
 * @returns Eine Map ergebnis.id → { rang, punkte }
 */
export function berechneRangePunkteProBucket<E extends { id: string; spiel_id: string; wert_numeric: number }>(
  ergebnisse: E[],
  bucketFuer: (e: E) => string | null | undefined,
  wertungstypFuer: (e: E) => string | null | undefined,
): Map<string, { rang: number; punkte: number }> {
  // Gruppieren nach (spiel_id, bucket)
  const buckets = new Map<string, E[]>();
  for (const e of ergebnisse) {
    const bucket = bucketFuer(e);
    if (!bucket) continue;
    const key = `${e.spiel_id}__${bucket}`;
    let group = buckets.get(key);
    if (!group) {
      group = [];
      buckets.set(key, group);
    }
    group.push(e);
  }

  const result = new Map<string, { rang: number; punkte: number }>();

  for (const bucket of buckets.values()) {
    const wertungstyp = wertungstypFuer(bucket[0]);
    const sorted = [...bucket].sort((a, b) =>
      vergleicheNachWertungstyp(a.wert_numeric, b.wert_numeric, wertungstyp),
    );

    let letzterRang = 1;
    let letzterWert = sorted[0].wert_numeric;
    sorted.forEach((e, index) => {
      if (index > 0 && e.wert_numeric !== letzterWert) {
        letzterRang = index + 1;
        letzterWert = e.wert_numeric;
      }
      result.set(e.id, { rang: letzterRang, punkte: berechnePunkteFuerRang(letzterRang) });
    });
  }

  return result;
}

/**
 * Gibt eine Erklärung zur Punkteberechnung zurück.
 * @param rang Der Rang, für den die Erklärung erstellt werden soll
 * @returns Eine beschreibende Zeichenkette, die die Berechnung erklärt
 */
export function erklaerePunkteberechnung(rang: number | undefined): string {
  if (rang === undefined) {
    return 'FEHLER: Kein Rang vorhanden! Rangberechnung fehlgeschlagen.';
  }
  
  if (rang >= 11) {
    return `Rang ${rang} → 0 Punkte (Rang 11 oder schlechter)`;
  }
  
  const punkte = 11 - rang;
  return `Rang ${rang} → 11 - ${rang} = ${punkte} Punkte`;
}
