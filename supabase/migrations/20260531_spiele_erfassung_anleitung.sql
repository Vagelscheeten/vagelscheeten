-- Anleitung pro Spiel: was Teamleiter/Spielbetreuer genau eintragen sollen.
ALTER TABLE spiele ADD COLUMN IF NOT EXISTS erfassung_anleitung text;

COMMENT ON COLUMN spiele.erfassung_anleitung IS
  'Anleitung für Teamleiter/Spielbetreuer: was genau bei diesem Spiel als Wert einzutragen ist.';

-- Einheit korrigieren: real wird in cm eingetragen (nicht Meter)
UPDATE spiele SET einheit = 'cm' WHERE name = 'Gummistiefelweitwurf';

UPDATE spiele SET erfassung_anleitung = $a$Das Kind hat 3 Schüsse. Zähle die Punkte aller 3 Schüsse zusammen und trage die GESAMTPUNKTZAHL ein (z. B. 8 + 6 + 10 = 24). Mehr Punkte sind besser.$a$ WHERE name = 'Armbrustschießen';
UPDATE spiele SET erfassung_anleitung = $a$Trage die ANZAHL DER BÄLLE ein, die das Kind innerhalb der Zeit (90 Sek.) transportiert hat. Mehr ist besser.$a$ WHERE name = 'Bälletransport';
UPDATE spiele SET erfassung_anleitung = $a$3 Würfe. Addiere die Punkte aller 3 Würfe und trage die GESAMTPUNKTZAHL ein. Mehr ist besser.$a$ WHERE name = 'Figurenwerfen';
UPDATE spiele SET erfassung_anleitung = $a$3 Versuche. Addiere die erzielten Punkte und trage die GESAMTPUNKTZAHL ein. Mehr ist besser.$a$ WHERE name = 'Fischstechen';
UPDATE spiele SET erfassung_anleitung = $a$3 Drehungen. Addiere die erdrehten Punkte und trage die GESAMTPUNKTZAHL ein. Mehr ist besser.$a$ WHERE name = 'Glücksrad';
UPDATE spiele SET erfassung_anleitung = $a$2 Würfe. Miss die WEITESTE Wurfweite und trage sie in ZENTIMETERN als ganze Zahl ein (z. B. 680 für 6,80 m). Wichtig: in der ganzen Klasse dieselbe Einheit (cm) verwenden. Der bessere der beiden Würfe zählt — mehr ist besser.$a$ WHERE name = 'Gummistiefelweitwurf';
UPDATE spiele SET erfassung_anleitung = $a$Trage die ANZAHL DER FEHLER / BERÜHRUNGEN ein – NICHT Punkte! 0 = fehlerfrei (bestes Ergebnis). Jede Drahtberührung zählt als 1. Beispiel: 2 Berührungen → 2 eintragen. Weniger ist besser.$a$ WHERE name = 'Heißer Draht';
UPDATE spiele SET erfassung_anleitung = $a$Trage die GEFAHRENE ZEIT IN SEKUNDEN ein (Nachkommastellen erlaubt, z. B. 8.32). Weniger ist besser (schneller = besser).$a$ WHERE name = 'Roller-Rennen';
UPDATE spiele SET erfassung_anleitung = $a$Trage die ANZAHL DER GEFUNDENEN SCHÄTZE innerhalb der Zeit (45 Sek.) ein. Mehr ist besser.$a$ WHERE name = 'Schatzsuche';
UPDATE spiele SET erfassung_anleitung = $a$Trage die BENÖTIGTE ZEIT IN SEKUNDEN ein (Nachkommastellen erlaubt). Bei Regelverstößen kommen pro Verstoß 10 Sek. Strafzeit dazu – rechne diese vor dem Eintragen zur Zeit hinzu. Weniger ist besser.$a$ WHERE name = 'Schubkarrenlauf';
UPDATE spiele SET erfassung_anleitung = $a$Trage die AUSGEDRÜCKTE WASSERMENGE IN MILLILITERN (ml) ein, die das Kind in 60 Sek. geschafft hat. Mehr ist besser.$a$ WHERE name = 'Schwamm ausdrücken';
UPDATE spiele SET erfassung_anleitung = $a$Trage die ANZAHL DER AUFGEHÄNGTEN WÄSCHESTÜCKE innerhalb von 60 Sek. ein. Mehr ist besser.$a$ WHERE name = 'Wäsche aufhängen';
UPDATE spiele SET erfassung_anleitung = $a$2 Würfe. Addiere die gewürfelten Augen beider Würfe und trage die GESAMTPUNKTZAHL ein. Mehr ist besser.$a$ WHERE name = 'Würfeln';
