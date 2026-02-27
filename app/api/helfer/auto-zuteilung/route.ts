import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';

// Definieren der Typen für die Datenstrukturen
type Aufgabe = {
  id: string;
  titel: string;
  zeitfenster: string;
  bedarf: number;
};

interface Rueckmeldung {
  id: string;
  kind_id: string;
  aufgabe_id: string | null;
  prioritaet?: number;
  ist_springer: boolean;
  zeitfenster?: string;
  helferaufgaben?: Aufgabe;
  kind?: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
}

interface Zuteilung {
  id?: string;
  kind_id: string;
  aufgabe_id: string;
  rueckmeldung_id?: string;
  zeitfenster: string;
  manuell: boolean;
  via_springer?: boolean;
  zugewiesen_am?: string;
  event_id?: string;
}

interface NichtZugewieseneRueckmeldung {
  id: string;
  grund: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth-Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ erfolg: false, fehler: 'Nicht autorisiert' }, { status: 401 });
    }

    const { eventId } = await req.json();

    if (!eventId) {
      return NextResponse.json({ erfolg: false, fehler: 'eventId fehlt' }, { status: 400 });
    }

    // 1. Alle regulären Rückmeldungen abrufen (keine Springer)
    const { data: regulaereRueckmeldungen, error: rueckmeldungenError } = await supabase
      .from('helfer_rueckmeldungen')
      .select(`
        id,
        kind_id,
        aufgabe_id,
        ist_springer,
        helferaufgaben!inner(
          id,
          titel,
          zeitfenster,
          bedarf
        )
      `)
      .eq('event_id', eventId)
      .eq('ist_springer', false)
      .order('erstellt_am', { ascending: true });

    if (rueckmeldungenError) throw rueckmeldungenError;

    // 2. Essensspenden-Verteilung zurücksetzen (muss nach neuer Helferzuteilung erneut erfolgen)
    await supabase
      .from('events')
      .update({ essensspenden_verteilt_am: null })
      .eq('id', eventId);

    // 3. Alte nicht-manuelle Zuteilungen löschen (fresh start)
    // 2a. Zuteilungen mit korrekter event_id löschen
    await supabase
      .from('helfer_zuteilungen')
      .delete()
      .eq('event_id', eventId)
      .eq('manuell', false);

    // 2b. Legacy-Einträge ohne event_id löschen (über rueckmeldung_id identifizieren)
    const alleRueckmeldungIds = (regulaereRueckmeldungen || []).map(r => r.id);
    if (alleRueckmeldungIds.length > 0) {
      await supabase
        .from('helfer_zuteilungen')
        .delete()
        .in('rueckmeldung_id', alleRueckmeldungIds)
        .eq('manuell', false);
    }

    // 3. Verbleibende Zuteilungen laden (nur noch manuelle)
    const { data: bestehendeZuteilungen, error: zuteilungenError } = await supabase
      .from('helfer_zuteilungen')
      .select('*')
      .eq('event_id', eventId);

    if (zuteilungenError) throw zuteilungenError;

    // 4. Aufgaben mit aktueller Belegung ermitteln (aus manuellen Zuteilungen)
    const aufgabenBelegung: Record<string, number> = {};
    bestehendeZuteilungen?.forEach((zuteilung: Zuteilung) => {
      if (!aufgabenBelegung[zuteilung.aufgabe_id]) {
        aufgabenBelegung[zuteilung.aufgabe_id] = 0;
      }
      aufgabenBelegung[zuteilung.aufgabe_id]++;
    });

    // 5. Kinder mit Zeitfenster-Zuteilungen tracken und Anzahl der Aufgaben pro Kind
    const kinderZeitfenster: Record<string, Set<string>> = {};
    const helferAufgabenAnzahl: Record<string, number> = {};
    
    bestehendeZuteilungen?.forEach((zuteilung: Zuteilung) => {
      // Zeitfenster tracken
      if (!kinderZeitfenster[zuteilung.kind_id]) {
        kinderZeitfenster[zuteilung.kind_id] = new Set();
      }
      
      // Wenn die Aufgabe "beides" als Zeitfenster hat, blockiert sie beide Zeitfenster
      if (zuteilung.zeitfenster === 'beides') {
        kinderZeitfenster[zuteilung.kind_id].add('vormittag');
        kinderZeitfenster[zuteilung.kind_id].add('nachmittag');
      } else {
        kinderZeitfenster[zuteilung.kind_id].add(zuteilung.zeitfenster);
      }
      
      // Anzahl der Aufgaben pro Kind tracken
      if (!helferAufgabenAnzahl[zuteilung.kind_id]) {
        helferAufgabenAnzahl[zuteilung.kind_id] = 0;
      }
      helferAufgabenAnzahl[zuteilung.kind_id]++;
    });

    // 6. Rückmeldungen zufällig mischen (Fairness — kein Vorteil durch frühe Anmeldung)
    const rueckmeldungenArray = regulaereRueckmeldungen as any[] || [];
    const sortiereRueckmeldungen = [...rueckmeldungenArray].sort(() => Math.random() - 0.5);

    // 7. Neue Zuteilungen erstellen
    const neueZuteilungen: Zuteilung[] = [];
    const nichtZugewieseneRueckmeldungen: NichtZugewieseneRueckmeldung[] = [];

    // 7.1 Rückmeldungen in zwei Phasen aufteilen: Helfer ohne Aufgaben und Helfer mit Aufgaben
    const erstePhaseRueckmeldungen = sortiereRueckmeldungen.filter(r =>
      !helferAufgabenAnzahl[r.kind_id] || helferAufgabenAnzahl[r.kind_id] === 0
    );

    const zweitePhaseRueckmeldungen = sortiereRueckmeldungen.filter(r =>
      helferAufgabenAnzahl[r.kind_id] && helferAufgabenAnzahl[r.kind_id] > 0
    );
    
    
    // Funktion zum Zuweisen einer Rückmeldung
    const weiseRueckmeldungZu = (rueckmeldung: any): boolean => {
      // Rückmeldungen ohne kind_id überspringen (ungültige Daten)
      if (!rueckmeldung.kind_id) return false;

      // Sicherstellen, dass helferaufgaben ein Objekt ist
      const aufgabe = rueckmeldung.helferaufgaben as unknown as Aufgabe;
      const aufgabeId = aufgabe.id;
      const zeitfenster = aufgabe.zeitfenster;
      const kindId = rueckmeldung.kind_id;
      
      // Prüfen, ob die Aufgabe noch Kapazität hat
      const aktuelleBelegung = aufgabenBelegung[aufgabeId] || 0;
      if (aktuelleBelegung >= aufgabe.bedarf) {
        nichtZugewieseneRueckmeldungen.push({
          id: rueckmeldung.id,
          grund: 'Aufgabe bereits voll belegt'
        });
        return false;
      }
      
      // Prüfen, ob das Kind in diesem Zeitfenster bereits zugewiesen ist
      const kindZeitfenster = kinderZeitfenster[kindId] || new Set();
      
      let zeitfensterKollision = false;
      
      if (zeitfenster === 'beides') {
        // Wenn die Aufgabe ganztägig ist, prüfen ob Kind bereits vormittags oder nachmittags zugewiesen ist
        zeitfensterKollision = kindZeitfenster.has('vormittag') || kindZeitfenster.has('nachmittag');
      } else {
        // Sonst prüfen, ob Kind bereits in diesem Zeitfenster oder ganztägig zugewiesen ist
        zeitfensterKollision = kindZeitfenster.has(zeitfenster);
      }
      
      if (zeitfensterKollision) {
        nichtZugewieseneRueckmeldungen.push({
          id: rueckmeldung.id,
          grund: 'Kind bereits im selben Zeitfenster zugewiesen'
        });
        return false;
      }
      
      // Zuteilung erstellen
      neueZuteilungen.push({
        kind_id: kindId,
        aufgabe_id: aufgabeId,
        rueckmeldung_id: rueckmeldung.id,
        zeitfenster: zeitfenster,
        manuell: false,
        event_id: eventId
      });
      
      // Belegung aktualisieren
      if (!aufgabenBelegung[aufgabeId]) {
        aufgabenBelegung[aufgabeId] = 0;
      }
      aufgabenBelegung[aufgabeId]++;
      
      // Kind-Zeitfenster aktualisieren
      if (!kinderZeitfenster[kindId]) {
        kinderZeitfenster[kindId] = new Set();
      }
      
      if (zeitfenster === 'beides') {
        kinderZeitfenster[kindId].add('vormittag');
        kinderZeitfenster[kindId].add('nachmittag');
      } else {
        kinderZeitfenster[kindId].add(zeitfenster);
      }
      
      // Aufgabenanzahl des Helfers aktualisieren
      if (!helferAufgabenAnzahl[kindId]) {
        helferAufgabenAnzahl[kindId] = 0;
      }
      helferAufgabenAnzahl[kindId]++;
      
      return true;
    };
    
    // 6.2 Erste Phase: Allen Helfern ohne Aufgabe mindestens eine Aufgabe zuweisen
    for (const rueckmeldung of erstePhaseRueckmeldungen) {
      weiseRueckmeldungZu(rueckmeldung);
    }
    
    // 6.3 Zweite Phase: Weitere Aufgaben zuweisen, nachdem alle mindestens eine haben
    // Prüfen, ob es noch Helfer gibt, die keine Aufgabe haben (und eine haben möchten)
    const helferOhneAufgabe = erstePhaseRueckmeldungen.filter(r => 
      !helferAufgabenAnzahl[r.kind_id] || helferAufgabenAnzahl[r.kind_id] === 0
    ).length;
    
    // Nur wenn alle Helfer der ersten Phase mindestens eine Aufgabe haben ODER alle verbleibenden Plätze gefüllt werden müssen
    if (helferOhneAufgabe === 0) {
      for (const rueckmeldung of zweitePhaseRueckmeldungen) {
        weiseRueckmeldungZu(rueckmeldung);
      }
    } else {
    }

    // 7. Neue Zuteilungen in die Datenbank einfügen
    let anzahlRegulaeZugewiesen = 0;
    
    if (neueZuteilungen.length > 0) {
      const { data: insertedData, error: insertError } = await supabase
        .from('helfer_zuteilungen')
        .insert(neueZuteilungen)
        .select();
        
      if (insertError) throw insertError;
      
      anzahlRegulaeZugewiesen = insertedData?.length || 0;
    }
    
    // 8. Springer-Zuteilungen verarbeiten
    // 8.1 Alle Aufgaben abrufen (nur für das aktive Event!)
    const { data: alleAufgaben, error: aufgabenError } = await supabase
      .from('helferaufgaben')
      .select('id, titel, zeitfenster, bedarf')
      .eq('event_id', eventId);
      
    if (aufgabenError) throw aufgabenError;
    
    // 8.2 Aktuelle Belegung nach der ersten Zuteilungsrunde aktualisieren
    const { data: aktuelleZuteilungen, error: aktuelleZuteilungenError } = await supabase
      .from('helfer_zuteilungen')
      .select('aufgabe_id')
      .eq('event_id', eventId);

    if (aktuelleZuteilungenError) throw aktuelleZuteilungenError;
    
    // Belegung pro Aufgabe zählen
    const aktuelleBelegung: Record<string, number> = {};
    aktuelleZuteilungen?.forEach(zuteilung => {
      if (!aktuelleBelegung[zuteilung.aufgabe_id]) {
        aktuelleBelegung[zuteilung.aufgabe_id] = 0;
      }
      aktuelleBelegung[zuteilung.aufgabe_id]++;
    });
    
    // 8.3 Offene Aufgaben mit Bedarf ermitteln
    const offeneAufgaben: Record<string, any[]> = {
      vormittag: [],
      nachmittag: []
    };
    
    alleAufgaben?.forEach(aufgabe => {
      // Belegung und offene Plätze ermitteln
      const belegung = aktuelleBelegung[aufgabe.id] || 0;
      const offenePlaetze = aufgabe.bedarf - belegung;
      
      // Nur Aufgaben mit offenen Plätzen berücksichtigen
      if (offenePlaetze > 0) {
        if (aufgabe.zeitfenster === 'vormittag' || aufgabe.zeitfenster === 'beides') {
          offeneAufgaben.vormittag.push({
            ...aufgabe,
            offenePlaetze
          });
        }
        
        if (aufgabe.zeitfenster === 'nachmittag' || aufgabe.zeitfenster === 'beides') {
          offeneAufgaben.nachmittag.push({
            ...aufgabe,
            offenePlaetze
          });
        }
      }
    });
    
    // Nach Anzahl offener Plätze absteigend sortieren
    offeneAufgaben.vormittag.sort((a, b) => b.offenePlaetze - a.offenePlaetze);
    offeneAufgaben.nachmittag.sort((a, b) => b.offenePlaetze - a.offenePlaetze);
    
    // 8.4 Nicht zugewiesene Springer-Rückmeldungen finden
    const springerRueckmeldungen: Record<string, any[]> = {
      vormittag: [],
      nachmittag: [],
      beides: []
    };
    
    // Alle Springer-Rückmeldungen abrufen
    const { data: alleSpringerRueckmeldungen, error: springerError } = await supabase
      .from('helfer_rueckmeldungen')
      .select(`
        id,
        kind_id,
        zeitfenster,
        ist_springer,
        kind:kinder(id, vorname, nachname, klasse)
      `)
      .eq('event_id', eventId)
      .eq('ist_springer', true);
      
    if (springerError) throw springerError;
    
    // Prüfen, welche Springer bereits zugewiesen wurden
    const zugewieseneKinder = new Set<string>();
    bestehendeZuteilungen?.forEach(zuteilung => {
      zugewieseneKinder.add(zuteilung.kind_id);
    });
    neueZuteilungen.forEach(zuteilung => {
      zugewieseneKinder.add(zuteilung.kind_id);
    });
    
    // Springer nach Zeitfenster sortieren
    alleSpringerRueckmeldungen?.forEach(springer => {
      // Springer ohne kind_id überspringen (ungültige Daten)
      if (!springer.kind_id) return;
      // Nur Springer berücksichtigen, die noch nicht zugewiesen wurden
      if (zugewieseneKinder.has(springer.kind_id)) return;
      
      if (springer.zeitfenster === 'vormittag') {
        springerRueckmeldungen.vormittag.push(springer);
      } else if (springer.zeitfenster === 'nachmittag') {
        springerRueckmeldungen.nachmittag.push(springer);
      } else if (springer.zeitfenster === 'beides') {
        springerRueckmeldungen.beides.push(springer);
      }
    });
    
    // 8.5 Springer auf offene Aufgaben verteilen
    const springerZuteilungen: Zuteilung[] = [];
    const zugewieseneSpringer: Record<string, boolean> = {}; // Tracking für zugewiesene Springer
    
    // 8.5.1 Springer in zwei Phasen aufteilen: Ohne und mit Aufgaben
    const erstePhaseVormittagsSpringer = springerRueckmeldungen.vormittag.filter(springer => 
      !helferAufgabenAnzahl[springer.kind_id] || helferAufgabenAnzahl[springer.kind_id] === 0
    );
    
    const erstePhaseNachmittagsSpringer = springerRueckmeldungen.nachmittag.filter(springer => 
      !helferAufgabenAnzahl[springer.kind_id] || helferAufgabenAnzahl[springer.kind_id] === 0
    );
    
    const erstePhaseGanztagsSpringer = springerRueckmeldungen.beides.filter(springer => 
      !helferAufgabenAnzahl[springer.kind_id] || helferAufgabenAnzahl[springer.kind_id] === 0
    );
    
    const zweitePhaseVormittagsSpringer = springerRueckmeldungen.vormittag.filter(springer => 
      helferAufgabenAnzahl[springer.kind_id] && helferAufgabenAnzahl[springer.kind_id] > 0
    );
    
    const zweitePhaseNachmittagsSpringer = springerRueckmeldungen.nachmittag.filter(springer => 
      helferAufgabenAnzahl[springer.kind_id] && helferAufgabenAnzahl[springer.kind_id] > 0
    );
    
    const zweitePhaseGanztagsSpringer = springerRueckmeldungen.beides.filter(springer => 
      helferAufgabenAnzahl[springer.kind_id] && helferAufgabenAnzahl[springer.kind_id] > 0
    );
    
    // Funktion zum Zuweisen eines Springers zu einer Aufgabe
    const weiseSpringerZu = (springer: any, zeitfenster: string, aufgabenListe: any[]) => {
      // Wenn keine offenen Aufgaben mehr vorhanden sind, abbrechen
      if (aufgabenListe.length === 0) return false;
      
      // Erste offene Aufgabe wählen (die mit den meisten offenen Plätzen)
      const zielAufgabe = aufgabenListe[0];
      
      // Springer dieser Aufgabe zuweisen
      springerZuteilungen.push({
        kind_id: springer.kind_id,
        aufgabe_id: zielAufgabe.id,
        rueckmeldung_id: springer.id,
        zeitfenster: zeitfenster,
        manuell: false,
        via_springer: true,
        event_id: eventId
      });
      
      // Springer als zugewiesen markieren
      zugewieseneSpringer[springer.id] = true;
      
      // Offene Plätze aktualisieren
      zielAufgabe.offenePlaetze--;
      
      // Wenn Aufgabe voll ist, aus der Liste entfernen
      if (zielAufgabe.offenePlaetze <= 0) {
        const index = aufgabenListe.indexOf(zielAufgabe);
        aufgabenListe.splice(index, 1);
      } else {
        // Neu sortieren nach offenen Plätzen
        aufgabenListe.sort((a, b) => b.offenePlaetze - a.offenePlaetze);
      }
      
      // Aufgabenanzahl des Helfers aktualisieren
      if (!helferAufgabenAnzahl[springer.kind_id]) {
        helferAufgabenAnzahl[springer.kind_id] = 0;
      }
      helferAufgabenAnzahl[springer.kind_id]++;
      
      return true;
    };
    
    // Erste Phase: Zuerst allen Springern ohne Aufgabe eine Aufgabe zuweisen
    
    // Vormittags-Springer zuweisen (erste Phase)
    erstePhaseVormittagsSpringer.forEach(springer => {
      weiseSpringerZu(springer, 'vormittag', offeneAufgaben.vormittag);
    });
    
    // Nachmittags-Springer zuweisen (erste Phase)
    erstePhaseNachmittagsSpringer.forEach(springer => {
      weiseSpringerZu(springer, 'nachmittag', offeneAufgaben.nachmittag);
    });
    
    // Ganztägige Springer zuweisen (erste Phase)
    erstePhaseGanztagsSpringer.forEach(springer => {
      // Zuerst versuchen, vormittags zuzuweisen
      if (!weiseSpringerZu(springer, 'vormittag', offeneAufgaben.vormittag)) {
        // Falls nicht möglich, nachmittags versuchen
        weiseSpringerZu(springer, 'nachmittag', offeneAufgaben.nachmittag);
      }
    });
    
    // Zweite Phase: Weiteren Springern zusätzliche Aufgaben zuweisen
    
    // Prüfen, ob alle Springer der ersten Phase eine Aufgabe erhalten haben
    const springerOhneAufgabe = [...erstePhaseVormittagsSpringer, ...erstePhaseNachmittagsSpringer, ...erstePhaseGanztagsSpringer]
      .filter(springer => !zugewieseneSpringer[springer.id]).length;
      
    if (springerOhneAufgabe === 0) {
      
      // Vormittags-Springer zuweisen (zweite Phase)
      zweitePhaseVormittagsSpringer.forEach(springer => {
        weiseSpringerZu(springer, 'vormittag', offeneAufgaben.vormittag);
      });
      
      // Nachmittags-Springer zuweisen (zweite Phase)
      zweitePhaseNachmittagsSpringer.forEach(springer => {
        weiseSpringerZu(springer, 'nachmittag', offeneAufgaben.nachmittag);
      });
      
      // Ganztägige Springer zuweisen (zweite Phase)
      zweitePhaseGanztagsSpringer.forEach(springer => {
        // Zuerst versuchen, vormittags zuzuweisen
        if (!weiseSpringerZu(springer, 'vormittag', offeneAufgaben.vormittag)) {
          // Falls nicht möglich, nachmittags versuchen
          weiseSpringerZu(springer, 'nachmittag', offeneAufgaben.nachmittag);
        }
      });
    } else {
    }
    
    // 8.6 Springer-Zuteilungen in die Datenbank einfügen
    let anzahlSpringerZugewiesen = 0;
    
    if (springerZuteilungen.length > 0) {
      const { data: insertedSpringerData, error: insertSpringerError } = await supabase
        .from('helfer_zuteilungen')
        .insert(springerZuteilungen)
        .select();
        
      if (insertSpringerError) throw insertSpringerError;
      
      anzahlSpringerZugewiesen = insertedSpringerData?.length || 0;
    }
    
    // 8.7 Nicht zugewiesene Springer zu den nicht zugewiesenen Rückmeldungen hinzufügen
    [...springerRueckmeldungen.vormittag, ...springerRueckmeldungen.nachmittag, ...springerRueckmeldungen.beides].forEach(springer => {
      if (!zugewieseneSpringer[springer.id]) {
        nichtZugewieseneRueckmeldungen.push({
          id: springer.id,
          grund: 'Keine offene Aufgabe im passenden Zeitfenster gefunden'
        });
      }
    });
    
    // Ergebnis zusammenstellen
    const ergebnis = { 
      erfolg: true, 
      anzahlRegulaeZugewiesen, 
      anzahlSpringerZugewiesen,
      anzahlZugewiesen: anzahlRegulaeZugewiesen + anzahlSpringerZugewiesen,
      nichtZugewiesen: nichtZugewieseneRueckmeldungen 
    };

    return NextResponse.json(ergebnis);
  } catch (error: any) {
    console.error('Fehler bei der automatischen Zuteilung:', error);
    return NextResponse.json(
      { erfolg: false, fehler: error.message || 'Ein unbekannter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
