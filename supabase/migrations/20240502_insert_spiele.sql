-- Erst Klassenstufen anlegen
insert into klassenstufen (name, reihenfolge) values
  ('Schuli', 0),
  ('Klasse 1', 1),
  ('Klasse 2', 2),
  ('Klasse 3', 3),
  ('Klasse 4', 4);

-- Dann die Spiele mit ihren spezifischen Regeln
insert into spiele (name, beschreibung, wertungstyp, anzahl_versuche, zeitlimit_sekunden, startpunkte, strafzeit_sekunden, einheit) values
  (
    'Gummistiefelweitwurf',
    'Jedes Kind hat 2 Versuche. Der bessere Versuch wird gezählt.',
    'WEITE_MAX_AUS_N',
    2,
    null,
    null,
    null,
    'Meter'
  ),
  (
    'Wäsche aufhängen',
    'Teamspiel: 2 Spieler haben 1 Minute Zeit, möglichst viele Wäschestücke mit je 2 Klammern aufzuhängen.',
    'MENGE_MAX_ZEIT',
    null,
    60,
    null,
    null,
    'Stück'
  ),
  (
    'Schubkarrenlauf',
    'Zwei Kinder laufen zeitgleich. Hinweg mit Schubkarre zum vollen Wassereimer, Rückweg mit Eimer. Wasserstand unter der Linie: +10 Strafsekunden.',
    'ZEIT_MIN_STRAFE',
    1,
    null,
    null,
    10,
    'Sekunden'
  ),
  (
    'Schwamm ausdrücken',
    '2er-Teams: Schwamm in Wasser tauchen, zum Stuhl laufen, auf Stuhl mit Tüte ausdrücken. 60 Sekunden Zeit.',
    'MENGE_MAX_ZEIT',
    null,
    60,
    null,
    null,
    'Milliliter'
  ),
  (
    'Figurenwerfen',
    '3 Würfe hinter der Kreidelinie. Punkte werden addiert.',
    'PUNKTE_SUMME_AUS_N',
    3,
    null,
    null,
    null,
    'Punkte'
  ),
  (
    'Heißer Draht',
    'Start mit 10 Punkten. Pro Berührung 1 Punkt Abzug. Bei Berührung zurück zum Pausenbereich.',
    'PUNKTE_ABZUG',
    1,
    null,
    10,
    null,
    'Punkte'
  ),
  (
    'Fischstechen',
    '3 Stiche auf Zielscheibe. Alle Punkte werden addiert.',
    'PUNKTE_SUMME_AUS_N',
    3,
    null,
    null,
    null,
    'Punkte'
  ),
  (
    'Armbrustschießen',
    '3 Schüsse auf Zielscheibe. Alle Punkte werden addiert. Nur für Klasse 4!',
    'PUNKTE_SUMME_AUS_N',
    3,
    null,
    null,
    null,
    'Punkte'
  ),
  (
    'Schatzsuche',
    '45 Sekunden Zeit zum Ausbuddeln. Pro gefundenem Schatz 1 Punkt.',
    'MENGE_MAX_ZEIT',
    null,
    45,
    null,
    null,
    'Schätze'
  ),
  (
    'Roller-Rennen',
    'Zwei Kinder fahren zeitgleich durch den Parcours.',
    'ZEIT_MIN_STRAFE',
    1,
    null,
    null,
    null,
    'Sekunden'
  ),
  (
    'Bälletransport',
    '90 Sekunden Zeit. Blumentopf auf Fuß. Pro transportiertem Ball 1 Punkt.',
    'MENGE_MAX_ZEIT',
    null,
    90,
    null,
    null,
    'Bälle'
  ),
  (
    'Glücksrad',
    '3 Versuche. Punktzahlen werden addiert.',
    'PUNKTE_SUMME_AUS_N',
    3,
    null,
    null,
    null,
    'Punkte'
  );

-- Spiele den Klassenstufen zuordnen
-- Alle Spiele für Klassen 1-3
insert into klassenstufe_spiele (klassenstufe_id, spiel_id)
select k.id as klassenstufe_id, s.id as spiel_id
from klassenstufen k
cross join spiele s
where k.reihenfolge between 1 and 3  -- Klasse 1-3
and s.name != 'Armbrustschießen';    -- Kein Armbrustschießen

-- Spiele für Schulis (alles außer Armbrustschießen und evtl. schwierigere Spiele)
insert into klassenstufe_spiele (klassenstufe_id, spiel_id)
select k.id, s.id
from klassenstufen k
cross join spiele s
where k.reihenfolge = 0  -- Schuli
and s.name not in ('Armbrustschießen');

-- Spiele für Klasse 4 (alle Spiele inkl. Armbrustschießen)
insert into klassenstufe_spiele (klassenstufe_id, spiel_id)
select k.id, s.id
from klassenstufen k
cross join spiele s
where k.reihenfolge = 4;  -- Klasse 4
