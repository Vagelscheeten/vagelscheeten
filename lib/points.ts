/**
 * Zentrale Punkteberechnungsfunktionen
 * Diese Funktionen werden in der gesamten App konsistent verwendet,
 * um sicherzustellen, dass die Ergebnisberechnung überall identisch ist.
 */

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
