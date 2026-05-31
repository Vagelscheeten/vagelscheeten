'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Crown, Loader2, Copy } from 'lucide-react';
import { PageShell } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { berechnePunkteFuerRang, berechneRangePunkteProBucket } from '@/lib/points';
import { Punktecheck } from './_components/Punktecheck';

// Datenmodelle/Interfaces
interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  geschlecht: string; // 'Junge' oder 'Mädchen'
  klasse: string; // z.B. "1a", "2b", "Schulis"
  event_id: string;
  spielgruppe_id: string;
  spielgruppe_name: string;
  gesamtPunkte: number;
  alleErgebnisseVorhanden: boolean;
  status?: string;
  platz?: number;
}

interface Spiel {
  id: string;
  name: string;
  beschreibung: string | null;
  wertungstyp: string;
  einheit: string | null;
}

interface Spielgruppe {
  id: string;
  name: string; // z.B. '1a-1', '2b-2'
  klasse: string; // z.B. "1a", "2b", "Schulis"
  event_id: string;
}

interface KindSpielgruppeZuordnung {
  id: string;
  kind_id: string;
  spielgruppe_id: string;
  kind?: Kind;
  spielgruppe?: Spielgruppe;
}

interface Ergebnis {
  id: string;
  kind_id: string;
  spiel_id: string;
  spielgruppe_id: string;
  event_id: string;
  wert: string;
  wert_numeric: number;
  erfasst_am: string;
  kind?: Kind;
  spiel?: Spiel;
  spielgruppe?: Spielgruppe;
  rang?: number;
  punkte?: number;
}

export default function AuswertungAdmin() {
  // Aktiver Tab/Sektion
  const [activeTab, setActiveTab] = useState('live');
  
  // Daten aus der Datenbank
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [spielgruppen, setSpielgruppen] = useState<Spielgruppe[]>([]);
  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([]);
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [kinderSpielgruppenZuordnungen, setKinderSpielgruppenZuordnungen] = useState<KindSpielgruppeZuordnung[]>([]);
  // Klassen-Name → Set zugewiesener Spiel-IDs (aus klasse_spiele)
  const [spielIdsProKlasse, setSpielIdsProKlasse] = useState<Map<string, Set<string>>>(new Map());
  // (spielgruppe_id, spiel_id) → abgeschlossen-Eintrag aus spielgruppe_spiel_status
  const [abgeschlossenePaare, setAbgeschlossenePaare] = useState<Set<string>>(new Set());
  
  // Filter für Live-Zwischenstand
  const [verfuegbareKlassen, setVerfuegbareKlassen] = useState<string[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<string | null>(null);
  const [selectedGruppeId, setSelectedGruppeId] = useState<string>('');
  const [filteredGruppen, setFilteredGruppen] = useState<Spielgruppe[]>([]);
  
  // Aktives Event (Scoping-Quelle für alle Queries)
  const [activeEvent, setActiveEvent] = useState<{ id: string; jahr: number } | null>(null);

  // State und Berechnete Daten
  const [isLoading, setIsLoading] = useState(true);
  const [liveZwischenstand, setLiveZwischenstand] = useState<{
    kinder: any[];
    fortschritt: { abgeschlossen: number; gesamt: number };
  }>({ kinder: [], fortschritt: { abgeschlossen: 0, gesamt: 0 } });
  const [gesamtauswertungDaten, setGesamtauswertungDaten] = useState<any[]>([]);
  const [isLoadingGesamtauswertung, setIsLoadingGesamtauswertung] = useState(true);

  const supabase = createClient();

  // Lädt ALLE Ergebnisse eines Events seitenweise.
  // Notwendig, weil Supabase/PostgREST pro Query max. 1000 Zeilen liefert –
  // bei >1000 Ergebnissen würden sonst Kinder ohne Punkte erscheinen.
  const ladeAlleErgebnisse = async (eventId: string): Promise<Ergebnis[]> => {
    const SEITE = 1000;
    let von = 0;
    const alle: Ergebnis[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase
        .from('ergebnisse')
        .select('*')
        .eq('event_id', eventId)
        .order('id', { ascending: true })
        .range(von, von + SEITE - 1);
      if (error) throw error;
      const batch = data || [];
      alle.push(...batch);
      if (batch.length < SEITE) break;
      von += SEITE;
    }
    return alle;
  };

  // Lade Daten beim ersten Rendern
  useEffect(() => {
    const loadData = async () => {
      await loadInitialData();
      await loadGesamtauswertung();
    };
    loadData();
  }, []);

  // Aktualisiere gefilterte Gruppen, wenn sich die Klasse ändert
  useEffect(() => {
    if (selectedKlasse !== null) {
      const filtered = spielgruppen.filter(gruppe => gruppe.klasse === selectedKlasse);
      setFilteredGruppen(filtered);
      
      if (filtered.length > 0 && (!selectedGruppeId || !filtered.some(g => g.id === selectedGruppeId))) {
        setSelectedGruppeId(filtered[0].id);
      }
    }
  }, [selectedKlasse, spielgruppen]);

  // Lade Live-Zwischenstand, wenn sich die ausgewählte Gruppe ändert
  useEffect(() => {
    if (selectedGruppeId) {
      loadLiveZwischenstand(selectedGruppeId);
    }
  }, [selectedGruppeId]);

  // Daten laden und verarbeiten
  const loadInitialData = async () => {
    setIsLoading(true);
    
    try {
      // Aktives Event ermitteln — Quelle für das Event-Scoping aller Queries
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, jahr, koenigspaare_einzelmodus')
        .eq('ist_aktiv', true)
        .maybeSingle();

      if (eventError) throw eventError;
      if (!eventData) {
        setActiveEvent(null);
        setSpiele([]);
        setSpielgruppen([]);
        setKinder([]);
        setKinderSpielgruppenZuordnungen([]);
        setErgebnisse([]);
        setIsLoading(false);
        return;
      }
      setActiveEvent(eventData);
      const eventId = eventData.id;

      // Lade Spiele
      const { data: spieleData, error: spieleError } = await supabase
        .from('spiele')
        .select('*')
        .order('name');

      if (spieleError) throw spieleError;
      setSpiele(spieleData || []);

      // Lade Spielgruppen des aktiven Events
      const { data: gruppenData, error: gruppenError } = await supabase
        .from('spielgruppen')
        .select('*')
        .eq('event_id', eventId)
        .order('name');

      if (gruppenError) throw gruppenError;
      setSpielgruppen(gruppenData || []);

      // Lade Kinder des aktiven Events
      const { data: kinderData, error: kinderError } = await supabase
        .from('kinder')
        .select('*')
        .eq('event_id', eventId);

      if (kinderError) throw kinderError;
      setKinder(kinderData || []);

      // Lade Kinder-Spielgruppen-Zuordnungen (nur für Gruppen des aktiven Events)
      const gruppenIds = (gruppenData ?? []).map((g) => g.id);
      const { data: zuordnungData, error: zuordnungError } = gruppenIds.length > 0
        ? await supabase
            .from('kind_spielgruppe_zuordnung')
            .select('*')
            .in('spielgruppe_id', gruppenIds)
        : { data: [], error: null };

      if (zuordnungError) throw zuordnungError;
      setKinderSpielgruppenZuordnungen(zuordnungData || []);

      // Lade Ergebnisse des aktiven Events (seitenweise, da >1000 möglich)
      const ergebnisseData = await ladeAlleErgebnisse(eventId);
      setErgebnisse(ergebnisseData);

      // Lade Spiel-Zuweisungen pro Klasse aus der DB (einmalig)
      const { data: klasseSpieleData, error: klasseSpieleError } = await supabase
        .from('klasse_spiele')
        .select('spiel_id, klasse:klassen!inner(name)');
      if (klasseSpieleError) throw klasseSpieleError;
      const spielMap = new Map<string, Set<string>>();
      for (const row of klasseSpieleData ?? []) {
        const klasseName = (row as any).klasse?.name as string | undefined;
        if (!klasseName) continue;
        if (!spielMap.has(klasseName)) spielMap.set(klasseName, new Set());
        spielMap.get(klasseName)!.add(row.spiel_id);
      }
      setSpielIdsProKlasse(spielMap);

      // Lade abgeschlossene (Spielgruppe, Spiel)-Paare
      const { data: statusData, error: statusError } = await supabase
        .from('spielgruppe_spiel_status')
        .select('spielgruppe_id, spiel_id')
        .eq('event_id', eventId);
      if (statusError) throw statusError;
      const statusSet = new Set<string>(
        (statusData ?? []).map((s) => `${s.spielgruppe_id}|${s.spiel_id}`),
      );
      setAbgeschlossenePaare(statusSet);

      // Bestimme verfügbare Klassen und setze eine Standardauswahl
      const klassen = [...new Set(gruppenData?.map(g => g.klasse) || [])];
      setVerfuegbareKlassen(klassen.sort());

      if (klassen.length > 0) {
        setSelectedKlasse(klassen[0]);
      }

    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Lade Live-Zwischenstand für eine Spielgruppe
  const loadLiveZwischenstand = (gruppeId: string) => {
    try {
      const gruppe = spielgruppen.find(g => g.id === gruppeId);
      if (!gruppe) {
        console.error(`Gruppe mit ID ${gruppeId} nicht gefunden`);
        return;
      }

      // Klasse der gewählten Gruppe
      const klasse = gruppe.klasse;

      // Alle Ergebnisse der Klasse — Basis für die klassenweite Rangberechnung
      const klassenGruppenIds = new Set(
        spielgruppen.filter((g) => g.klasse === klasse).map((g) => g.id),
      );
      const klassenErgebnisse = ergebnisse.filter((e) => klassenGruppenIds.has(e.spielgruppe_id));

      // Nur Ergebnisse + Kinder der ausgewählten Gruppe für die Anzeige
      const gruppenErgebnisse = klassenErgebnisse.filter((e) => e.spielgruppe_id === gruppeId);
      let gruppenKinder = kinder.filter((k) => k.spielgruppe_id === gruppeId);

      // Fallback, falls Kinder keine direkte Gruppen-Verknüpfung haben
      if (gruppenKinder.length === 0 && gruppenErgebnisse.length > 0) {
        const kindIds = new Set(gruppenErgebnisse.map((e) => e.kind_id));
        gruppenKinder = kinder.filter((k) => kindIds.has(k.id));
      }

      // Spiele für diese Klasse ermitteln
      const spieleFuerKlasse = ermittleSpieleProKlasse(klasse, ergebnisse, spiele);

      // Rang klassenweit pro Spiel, getrennt nach Geschlecht (König/Königin parallel)
      const kindBucketMap = new Map(kinder.map((k) => [k.id, `${k.klasse}|${k.geschlecht}`]));
      const spielWertungstypMap = new Map(spiele.map((s) => [s.id, s.wertungstyp]));
      const rangMap = berechneRangePunkteProBucket(
        klassenErgebnisse,
        (e) => kindBucketMap.get(e.kind_id),
        (e) => spielWertungstypMap.get(e.spiel_id),
      );

      // Abgeschlossene Spiele dieser Gruppe (aus spielgruppe_spiel_status)
      const abgeschlosseneSpielIds = new Set<string>();
      for (const spiel of spieleFuerKlasse) {
        if (abgeschlossenePaare.has(`${gruppeId}|${spiel.id}`)) {
          abgeschlosseneSpielIds.add(spiel.id);
        }
      }

      // Gesamtpunkte pro Kind in der Gruppe — nur aus abgeschlossenen Spielen
      const kinderMitPunkten = gruppenKinder.map((kind) => {
        const alleKindErgebnisse = gruppenErgebnisse.filter(
          (e) => e.kind_id === kind.id && abgeschlosseneSpielIds.has(e.spiel_id),
        );
        const gesamtPunkte = alleKindErgebnisse.reduce(
          (sum, e) => sum + (rangMap.get(e.id)?.punkte ?? 0),
          0,
        );
        const anzahlErgebnisse = new Set(alleKindErgebnisse.map((e) => e.spiel_id)).size;

        return {
          ...kind,
          gesamtPunkte,
          anzahlErgebnisse,
          gesamt_spiele: spieleFuerKlasse.length,
        };
      });

      // Sortiere nach Gesamtpunkten (absteigend)
      const sortierteKinder = [...kinderMitPunkten].sort((a, b) => b.gesamtPunkte - a.gesamtPunkte);

      // Fortschritt: Anzahl wirklich abgeschlossener Spiele dieser Gruppe
      const abgeschlosseneSpiele = abgeschlosseneSpielIds.size;
      const gesamtSpiele = spieleFuerKlasse.length;

      setLiveZwischenstand({
        kinder: sortierteKinder,
        fortschritt: {
          abgeschlossen: abgeschlosseneSpiele,
          gesamt: gesamtSpiele
        }
      });
    } catch (error) {
      console.error('Fehler beim Laden des Zwischenstands:', error);
    }
  };
  
  // Ermittelt die Spiele, die einer bestimmten Klasse zugewiesen sind.
  // Quelle: einmalig geladene spielIdsProKlasse-Map (klasse_spiele aus DB).
  // Fallback: falls keine Zuweisung in DB, leite aus tatsächlichen Ergebnissen ab.
  const ermittleSpieleProKlasse = (
    klasse: string,
    alleErgebnisse: Ergebnis[],
    verfuegbareSpiele: Spiel[],
    spielMap: Map<string, Set<string>> = spielIdsProKlasse,
  ): Spiel[] => {
    const zugewieseneIds = spielMap.get(klasse);
    if (zugewieseneIds && zugewieseneIds.size > 0) {
      return verfuegbareSpiele.filter((s) => zugewieseneIds.has(s.id));
    }

    // Fallback: aus tatsächlich erfassten Ergebnissen ableiten
    const klassenGruppenIds = new Set(
      spielgruppen.filter((g) => g.klasse === klasse).map((g) => g.id),
    );
    const spielIdsAusErgebnissen = new Set(
      alleErgebnisse.filter((e) => klassenGruppenIds.has(e.spielgruppe_id)).map((e) => e.spiel_id),
    );
    return verfuegbareSpiele.filter((s) => spielIdsAusErgebnissen.has(s.id));
  };
  
  // Berechnet Punkte für eine Reihe von Ergebnissen.
  // Pro (Kind, Spiel) gibt es genau einen Datensatz (Mehrfachversuche werden vor dem
  // Speichern bereits aggregiert), daher reicht eine einfache Summe der Rangpunkte.
  const berechnePunkteFuerErgebnisse = (ergebnisse: Ergebnis[], _spieleData: Spiel[]): number => {
    if (ergebnisse.length === 0) return 0;
    return ergebnisse.reduce((sum, e) => sum + berechnePunkteFuerRang(e.rang), 0);
  };

  // Lade Gesamtauswertung und berechne die Punkte direkt im Frontend
  const loadGesamtauswertung = async () => {
    try {
      setIsLoadingGesamtauswertung(true);

      // Einzelmodus: bei true wird bei Punktgleichstand nur EIN König/eine Königin
      // angezeigt (eingefrorene Siegerehrung). Default true = sicher (nicht versehentlich
      // mehrere anzeigen), wird unten aus dem aktiven Event aktualisiert.
      let einzelmodus = activeEvent?.koenigspaare_einzelmodus ?? true;

      // Lade alle benötigten Daten, falls sie noch nicht geladen wurden
      let spieleData = spiele;
      let kinderData = kinder;
      let ergebnisseData = ergebnisse;
      let zuordnungData = kinderSpielgruppenZuordnungen;
      let gruppenData = spielgruppen;
      
      if (spieleData.length === 0 || kinderData.length === 0 || ergebnisseData.length === 0) {
        // Aktives Event ermitteln — alle Fallback-Queries sind darauf gescopt
        let eventId = activeEvent?.id;
        if (!eventId) {
          const { data: ev } = await supabase
            .from('events')
            .select('id, jahr, koenigspaare_einzelmodus')
            .eq('ist_aktiv', true)
            .maybeSingle();
          if (ev) {
            setActiveEvent(ev);
            eventId = ev.id;
            einzelmodus = ev.koenigspaare_einzelmodus ?? true;
          }
        }
        if (!eventId) {
          setIsLoadingGesamtauswertung(false);
          return;
        }

        // Lade Spiele, falls noch nicht geladen
        if (spieleData.length === 0) {
          const { data: neueSpiele, error: spieleError } = await supabase
            .from('spiele')
            .select('*')
            .order('name');

          if (spieleError) throw spieleError;
          spieleData = neueSpiele || [];
        }

        // Lade Kinder, falls noch nicht geladen
        if (kinderData.length === 0) {
          const { data: neueKinder, error: kinderError } = await supabase
            .from('kinder')
            .select('*')
            .eq('event_id', eventId);

          if (kinderError) throw kinderError;
          kinderData = neueKinder || [];
        }

        // Lade Ergebnisse, falls noch nicht geladen (seitenweise, da >1000 möglich)
        if (ergebnisseData.length === 0) {
          ergebnisseData = await ladeAlleErgebnisse(eventId);
        }

        // Lade Spielgruppen (vor Zuordnungen, damit wir die IDs haben)
        if (gruppenData.length === 0) {
          const { data: neueGruppen, error: gruppenError } = await supabase
            .from('spielgruppen')
            .select('*')
            .eq('event_id', eventId);

          if (gruppenError) throw gruppenError;
          gruppenData = neueGruppen || [];
        }

        // Lade Zuordnungen (nur für Gruppen des aktiven Events)
        if (zuordnungData.length === 0) {
          const gruppenIds = gruppenData.map((g) => g.id);
          if (gruppenIds.length > 0) {
            const { data: neueZuordnungen, error: zuordnungError } = await supabase
              .from('kind_spielgruppe_zuordnung')
              .select('*')
              .in('spielgruppe_id', gruppenIds);

            if (zuordnungError) throw zuordnungError;
            zuordnungData = neueZuordnungen || [];
          }
        }
      }
      
      // Berechne Ränge für jedes Spiel innerhalb jeder Klasse
      const ergebnisseMitRang = berechneRaenge(ergebnisseData, kinderData, spieleData);
      
      // Gruppiere Kinder nach Klassen und berechne Gesamtpunkte
      const kinderMitGruppen = kinderData.map(kind => {
        const zuordnung = zuordnungData.find(z => z.kind_id === kind.id);
        const spielgruppe = zuordnung ? gruppenData.find(g => g.id === zuordnung.spielgruppe_id) : null;
        
        return {
          ...kind,
          spielgruppe_name: spielgruppe ? spielgruppe.name : 'Keine Gruppe',
          klasse: kind.klasse
        };
      });
      
      // Bestimme die Spiele pro Klasse (über bereits geladene spielIdsProKlasse-Map)
      const spieleProKlasse = new Map<string, Spiel[]>();
      const eindeutigeKlassen = [...new Set(kinderMitGruppen.map(kind => kind.klasse))];
      for (const klasse of eindeutigeKlassen) {
        spieleProKlasse.set(klasse, ermittleSpieleProKlasse(klasse, ergebnisseData, spieleData));
      }
      
      // Berechne Gesamtpunkte für jedes Kind
      const kinderMitPunkten = kinderMitGruppen.map(kind => {
        const kindErgebnisse = ergebnisseMitRang.filter(e => e.kind_id === kind.id);
        const gesamtpunkte = berechnePunkteFuerErgebnisse(kindErgebnisse, spieleData);
        const spieleFuerKlasse = spieleProKlasse.get(kind.klasse) || [];
        const gesamtSpiele = spieleFuerKlasse.length;
        const anzahlSpiele = new Set(kindErgebnisse.map(e => e.spiel_id)).size;
        
        // Bestimme den Status basierend auf der tatsächlichen Anzahl der Spiele für diese Klasse
        let status = 'unvollständig';
        
        // Wenn keine Spiele für die Klasse vorgesehen sind oder alle Spiele absolviert wurden
        if (gesamtSpiele === 0 || anzahlSpiele >= gesamtSpiele) {
          status = 'vollständig';
        }
        
        return {
          kind_id: kind.id,
          kind_name: `${kind.vorname} ${kind.nachname}`,
          geschlecht: kind.geschlecht,
          klasse: kind.klasse,
          spielgruppe_name: kind.spielgruppe_name,
          gesamtpunkte,
          anzahl_spiele: anzahlSpiele,
          gesamt_spiele: gesamtSpiele,
          status
        };
      });
      
      // Berechne Rang pro Kind innerhalb jeder Klasse
      const klassenMap = new Map();
      kinderMitPunkten.forEach(kind => {
        if (!klassenMap.has(kind.klasse)) {
          klassenMap.set(kind.klasse, []);
        }
        klassenMap.get(kind.klasse).push(kind);
      });
      
      interface GesamtauswertungItem {
        id: string;
        kind_id: string;
        kind_name: string;
        klasse: string;
        geschlecht: string;
        spielgruppe_name: string;
        gesamtpunkte: number;
        rang: number;
        status: 'koenig' | 'koenigin' | 'vollständig' | 'unvollständig';
        anzahl_spiele: number;
        gesamt_spiele: number;
        ist_koenig: boolean;
        ist_koenigin: boolean;
      }

      const ergebnis: GesamtauswertungItem[] = [];
      klassenMap.forEach((kinderInKlasse, klasse) => {
        // Sortiere Kinder nach Punkten (absteigend)
        const sortierteKinder = [...kinderInKlasse].sort((a, b) => 
          b.gesamtpunkte - a.gesamtpunkte || b.anzahl_spiele - a.anzahl_spiele
        );
        
        // Füge Rang hinzu
        sortierteKinder.forEach((kind, index) => {
          const rang = index + 1;
          
          // Bestimme König und Königin
          const maennlicheKinder = sortierteKinder.filter(k => k.geschlecht === 'männlich' || k.geschlecht === 'Junge');
          const weiblicheKinder = sortierteKinder.filter(k => k.geschlecht === 'weiblich' || k.geschlecht === 'Mädchen');
          const istJungeK = kind.geschlecht === 'männlich' || kind.geschlecht === 'Junge';
          const istMaedchenK = kind.geschlecht === 'weiblich' || kind.geschlecht === 'Mädchen';

          let istKoenig: boolean;
          let istKoenigin: boolean;
          if (einzelmodus) {
            // Eingefroren: genau EIN König / EINE Königin (erster der Sortierung) — Siegerehrung bleibt unverändert
            istKoenig = istJungeK && maennlicheKinder.length > 0 && maennlicheKinder[0].kind_id === kind.kind_id;
            istKoenigin = istMaedchenK && weiblicheKinder.length > 0 && weiblicheKinder[0].kind_id === kind.kind_id;
          } else {
            // Bei Punktgleichstand mehrere: alle Kinder mit der Höchstpunktzahl ihres Geschlechts
            const maxJunge = maennlicheKinder.length > 0 ? maennlicheKinder[0].gesamtpunkte : 0;
            const maxMaedchen = weiblicheKinder.length > 0 ? weiblicheKinder[0].gesamtpunkte : 0;
            istKoenig = istJungeK && maxJunge > 0 && kind.gesamtpunkte === maxJunge;
            istKoenigin = istMaedchenK && maxMaedchen > 0 && kind.gesamtpunkte === maxMaedchen;
          }

          ergebnis.push({
            ...kind,
            rang,
            ist_koenig: istKoenig,
            ist_koenigin: istKoenigin
          });
        });
      });
      
      setGesamtauswertungDaten(ergebnis);
    } catch (error) {
      console.error('Fehler beim Laden der Gesamtauswertung:', error);
    } finally {
      setIsLoadingGesamtauswertung(false);
    }
  };
  
  // Hilfsfunktion zum Berechnen der Ränge — klassenweit pro Geschlecht.
  // Spielgruppen sind nur organisatorisch; König (bester Junge) und Königin
  // (bestes Mädchen) werden parallel ermittelt, daher Trennung nach Geschlecht.
  const berechneRaenge = (ergebnisseData: Ergebnis[], kinderData: Kind[], spieleData: Spiel[]): Ergebnis[] => {
    const kindBucketMap = new Map(kinderData.map(k => [k.id, `${k.klasse}|${k.geschlecht}`]));
    const spielWertungstypMap = new Map(spieleData.map(s => [s.id, s.wertungstyp]));

    const rangMap = berechneRangePunkteProBucket(
      ergebnisseData,
      (e) => kindBucketMap.get(e.kind_id),
      (e) => spielWertungstypMap.get(e.spiel_id),
    );

    return ergebnisseData.map((e) => {
      const r = rangMap.get(e.id);
      return r ? { ...e, rang: r.rang, punkte: r.punkte } : e;
    });
  };

  // Königspaare als Text in die Zwischenablage kopieren (zum Weiterleiten)
  const kopiereKoenigspaare = async () => {
    if (gesamtauswertungDaten.length === 0) {
      toast.error('Keine Daten zum Kopieren vorhanden.');
      return;
    }
    const klassen = [...new Set(gesamtauswertungDaten.map((i) => i.klasse))].sort();
    const zeilen: string[] = [
      `Königspaare Vogelschießen ${activeEvent?.jahr ?? ''}`.trim(),
      '',
    ];
    klassen.forEach((klasse) => {
      const klassenDaten = gesamtauswertungDaten.filter((i) => i.klasse === klasse);
      const koenige = klassenDaten.filter((i) => i.ist_koenig);
      const koeniginnen = klassenDaten.filter((i) => i.ist_koenigin);
      const fmt = (arr: any[]) =>
        arr.length === 0 ? '—' : arr.map((k) => `${k.kind_name} (${k.gesamtpunkte} Punkte)`).join(', ');
      zeilen.push(`Klasse ${klasse}`);
      zeilen.push(`${koenige.length > 1 ? 'Könige' : 'König'}: ${fmt(koenige)}`);
      zeilen.push(`${koeniginnen.length > 1 ? 'Königinnen' : 'Königin'}: ${fmt(koeniginnen)}`);
      zeilen.push('');
    });
    const text = zeilen.join('\n').trim();
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Königspaare in die Zwischenablage kopiert.');
    } catch {
      toast.error('Kopieren fehlgeschlagen. Bitte manuell markieren und kopieren.');
    }
  };

  // UI-Darstellung
  return (
    <PageShell
      title="Auswertung & Ergebnisse"
      description="Live-Zwischenstand, Punktecheck und Königspaare."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Auswertung' }]}
    >
      <Tabs defaultValue="live" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="live">Live-Zwischenstand</TabsTrigger>
          <TabsTrigger value="punktecheck">Punktecheck</TabsTrigger>
          <TabsTrigger value="auswertung">Königspaare</TabsTrigger>
        </TabsList>
        
        {/* 1. Tab: Live-Zwischenstand */}
        <TabsContent value="live">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Live-Zwischenstand</CardTitle>
              <CardDescription>Aktuelle Ergebnisse nach Gruppe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="w-full md:w-1/2">
                  <Label htmlFor="klasse-select" className="mb-2">Klasse</Label>
                  <Select 
                    value={selectedKlasse || ''} 
                    onValueChange={(value) => setSelectedKlasse(value)}
                  >
                    <SelectTrigger id="klasse-select">
                      <SelectValue placeholder="Klasse auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {verfuegbareKlassen.map((klasse) => (
                        <SelectItem key={klasse} value={klasse}>
                          {klasse}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/2">
                  <Label htmlFor="gruppe-select" className="mb-2">Gruppe</Label>
                  <Select 
                    value={selectedGruppeId} 
                    onValueChange={setSelectedGruppeId}
                    disabled={filteredGruppen.length === 0}
                  >
                    <SelectTrigger id="gruppe-select">
                      <SelectValue placeholder="Gruppe auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredGruppen.map(gruppe => (
                        <SelectItem key={gruppe.id} value={gruppe.id}>
                          {gruppe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Fortschrittsanzeige */}
              {selectedGruppeId && (
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span>Spielefortschritt:</span>
                    <span>{liveZwischenstand.fortschritt.abgeschlossen} von {liveZwischenstand.fortschritt.gesamt} Spielen</span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ 
                        width: `${liveZwischenstand.fortschritt.gesamt > 0 ? 
                          (liveZwischenstand.fortschritt.abgeschlossen / liveZwischenstand.fortschritt.gesamt) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Tabelle mit Kindern und Punkten */}
              {liveZwischenstand.kinder.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Punkte</TableHead>
                        <TableHead>Spiele</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Bester Junge / bestes Mädchen der Gruppe ermitteln (Liste ist nach Punkten sortiert)
                        const istJunge = (k: any) => k.geschlecht === 'Junge' || k.geschlecht === 'männlich';
                        const istMaedchen = (k: any) => k.geschlecht === 'Mädchen' || k.geschlecht === 'weiblich';
                        const koenigId = liveZwischenstand.kinder.find(istJunge)?.id;
                        const koeniginId = liveZwischenstand.kinder.find(istMaedchen)?.id;
                        return liveZwischenstand.kinder.map((kind, index) => (
                          <TableRow key={kind.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              {kind.vorname} {kind.nachname}
                              {kind.id === koenigId && <Crown className="inline-block ml-2 text-yellow-500 h-4 w-4" />}
                              {kind.id === koeniginId && <Crown className="inline-block ml-2 text-pink-500 h-4 w-4" />}
                            </TableCell>
                            <TableCell>{kind.gesamtPunkte}</TableCell>
                            <TableCell>{kind.anzahlErgebnisse} / {kind.gesamt_spiele || liveZwischenstand.fortschritt.gesamt}</TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  {isLoading ? 'Lade Daten...' : 'Keine Ergebnisse für diese Gruppe vorhanden.'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 2. Tab: Punktecheck — pro Spiel oder pro Kind */}
        <TabsContent value="punktecheck">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Punktecheck</CardTitle>
              <CardDescription>
                Detaillierte Nachvollziehbarkeit der Punkteberechnung pro Klasse
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <Punktecheck
                  kinder={kinder}
                  spiele={spiele}
                  ergebnisse={ergebnisse}
                  spielIdsProKlasse={spielIdsProKlasse}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 3. Tab: Abschlussauswertung — König & Königin pro Klasse */}
        <TabsContent value="auswertung">
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center gap-3">
                <div>
                  <CardTitle>Abschlussauswertung Vogelschießen {activeEvent?.jahr ?? ''}</CardTitle>
                  <CardDescription>König und Königin pro Klasse</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={kopiereKoenigspaare}
                  disabled={gesamtauswertungDaten.length === 0}
                  className="gap-2 shrink-0"
                >
                  <Copy className="h-4 w-4" />
                  Kopieren
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingGesamtauswertung ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : gesamtauswertungDaten.length === 0 ? (
                <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
                  Keine Ergebnisse gefunden. Bitte stelle sicher, dass Ergebnisse vorhanden sind.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...new Set(gesamtauswertungDaten.map(item => item.klasse))].sort().map(klasse => {
                    const klassenDaten = gesamtauswertungDaten.filter(item => item.klasse === klasse);
                    const koenige = klassenDaten.filter(item => item.ist_koenig);
                    const koeniginnen = klassenDaten.filter(item => item.ist_koenigin);

                    return (
                      <div key={klasse} className="bg-yellow-50 border rounded-lg p-5">
                        <h3 className="text-base font-semibold text-slate-800 mb-3">Klasse {klasse}</h3>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <Crown className="text-yellow-500 h-7 w-7 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs uppercase tracking-wider text-slate-500">
                                {koenige.length > 1 ? 'Könige' : 'König'}
                              </div>
                              {koenige.length === 0 ? (
                                <div className="font-semibold text-slate-900">—</div>
                              ) : (
                                <div className="space-y-1">
                                  {koenige.map(k => (
                                    <div key={k.kind_id}>
                                      <div className="font-semibold text-slate-900 truncate">{k.kind_name}</div>
                                      <div className="text-xs text-slate-500">{k.gesamtpunkte} Punkte</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Crown className="text-pink-500 h-7 w-7 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs uppercase tracking-wider text-slate-500">
                                {koeniginnen.length > 1 ? 'Königinnen' : 'Königin'}
                              </div>
                              {koeniginnen.length === 0 ? (
                                <div className="font-semibold text-slate-900">—</div>
                              ) : (
                                <div className="space-y-1">
                                  {koeniginnen.map(k => (
                                    <div key={k.kind_id}>
                                      <div className="font-semibold text-slate-900 truncate">{k.kind_name}</div>
                                      <div className="text-xs text-slate-500">{k.gesamtpunkte} Punkte</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
