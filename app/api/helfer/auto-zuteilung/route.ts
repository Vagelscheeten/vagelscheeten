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
}

interface NichtZugewieseneRueckmeldung {
  id: string;
  grund: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Alle regulären Rückmeldungen abrufen (keine Springer)
    const { data: regulaereRueckmeldungen, error: rueckmeldungenError } = await supabase
      .from('helfer_rueckmeldungen')
      .select(`
        id,
        kind_id,
        aufgabe_id,
        prioritaet,
        ist_springer,
        helferaufgaben!inner(
          id,
          titel,
          zeitfenster,
          bedarf
        )
      `)
      .eq('ist_springer', false)
      .order('prioritaet', { ascending: true });  // Removed nullsLast as it's not supported

    if (rueckmeldungenError) throw rueckmeldungenError;

    // 2. Alle bestehenden Zuteilungen abrufen
    const { data: bestehendeZuteilungen, error: zuteilungenError } = await supabase
      .from('helfer_zuteilungen')
      .select('*');

    if (zuteilungenError) throw zuteilungenError;

    // 3. Aufgaben mit aktueller Belegung ermitteln
    const aufgabenBelegung: Record<string, number> = {};
    bestehendeZuteilungen?.forEach((zuteilung: Zuteilung) => {
      if (!aufgabenBelegung[zuteilung.aufgabe_id]) {
        aufgabenBelegung[zuteilung.aufgabe_id] = 0;
      }
      aufgabenBelegung[zuteilung.aufgabe_id]++;
    });

    // 4. Kinder mit Zeitfenster-Zuteilungen tracken
    const kinderZeitfenster: Record<string, Set<string>> = {};
    bestehendeZuteilungen?.forEach((zuteilung: Zuteilung) => {
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
    });

    // 5. Rückmeldungen nach Priorität sortieren (1, 2, 3, null)
    // Wir müssen hier den Typ explizit als any[] setzen, um TypeScript-Fehler zu vermeiden
    const rueckmeldungenArray = regulaereRueckmeldungen as any[] || [];
    const sortiereRueckmeldungen = [...rueckmeldungenArray].sort((a, b) => {
      // Wenn beide eine Priorität haben, nach Priorität sortieren
      if (a.prioritaet && b.prioritaet) {
        return a.prioritaet - b.prioritaet;
      }
      // Wenn nur a eine Priorität hat, a zuerst
      if (a.prioritaet && !b.prioritaet) {
        return -1;
      }
      // Wenn nur b eine Priorität hat, b zuerst
      if (!a.prioritaet && b.prioritaet) {
        return 1;
      }
      // Wenn beide keine Priorität haben, zufällig sortieren
      return Math.random() - 0.5;
    });

    // 6. Neue Zuteilungen erstellen
    const neueZuteilungen: Zuteilung[] = [];
    const nichtZugewieseneRueckmeldungen: NichtZugewieseneRueckmeldung[] = [];

    for (const rueckmeldung of sortiereRueckmeldungen) {
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
        continue;
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
        continue;
      }
      
      // Zuteilung erstellen
      neueZuteilungen.push({
        kind_id: kindId,
        aufgabe_id: aufgabeId,
        rueckmeldung_id: rueckmeldung.id,
        zeitfenster: zeitfenster,
        manuell: false
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
    // 8.1 Alle Aufgaben abrufen
    const { data: alleAufgaben, error: aufgabenError } = await supabase
      .from('helferaufgaben')
      .select('id, titel, zeitfenster, bedarf');
      
    if (aufgabenError) throw aufgabenError;
    
    // 8.2 Aktuelle Belegung nach der ersten Zuteilungsrunde aktualisieren
    const { data: aktuelleZuteilungen, error: aktuelleZuteilungenError } = await supabase
      .from('helfer_zuteilungen')
      .select('aufgabe_id');
      
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
        via_springer: true
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
      
      return true;
    };
    
    // Vormittags-Springer zuweisen
    springerRueckmeldungen.vormittag.forEach(springer => {
      weiseSpringerZu(springer, 'vormittag', offeneAufgaben.vormittag);
    });
    
    // Nachmittags-Springer zuweisen
    springerRueckmeldungen.nachmittag.forEach(springer => {
      weiseSpringerZu(springer, 'nachmittag', offeneAufgaben.nachmittag);
    });
    
    // Ganztägige Springer zuweisen - zuerst versuchen, sie vormittags einzusetzen
    springerRueckmeldungen.beides.forEach(springer => {
      // Zuerst versuchen, vormittags zuzuweisen
      if (!weiseSpringerZu(springer, 'vormittag', offeneAufgaben.vormittag)) {
        // Falls nicht möglich, nachmittags versuchen
        weiseSpringerZu(springer, 'nachmittag', offeneAufgaben.nachmittag);
      }
    });
    
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
