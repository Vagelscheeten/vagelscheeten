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

    // 3. ALLE bestehenden Zuteilungen löschen — auch manuelle.
    // Auto-Zuteilung ist immer ein vollständiger Neustart.
    await supabase
      .from('helfer_zuteilungen')
      .delete()
      .eq('event_id', eventId);

    // Legacy-Einträge ohne event_id zusätzlich über rueckmeldung_id löschen
    const alleRueckmeldungIds = (regulaereRueckmeldungen || []).map(r => r.id);
    if (alleRueckmeldungIds.length > 0) {
      await supabase
        .from('helfer_zuteilungen')
        .delete()
        .in('rueckmeldung_id', alleRueckmeldungIds);
    }

    // 4. Fresh Start: keine bestehenden Zuteilungen, alle Belegungen bei 0
    const aufgabenBelegung: Record<string, number> = {};
    const kinderZeitfenster: Record<string, Set<string>> = {};
    const helferAufgabenAnzahl: Record<string, number> = {};

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

      // Eine Aufgabe pro Familie ist die Regel — Doppel-Zuteilungen entstehen nur durch
      // manuelle Eingriffe (oder explizite Ausnahmen, die nicht hierüber laufen).
      if ((helferAufgabenAnzahl[kindId] || 0) > 0) {
        nichtZugewieseneRueckmeldungen.push({
          id: rueckmeldung.id,
          grund: 'Helfer hat bereits eine Aufgabe',
        });
        return false;
      }

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

    // 6.2.5 Optimierungs-Pass: Multi-Wunsch-Helfer auf alternative freie Aufgaben umverteilen,
    // damit Single-Wunsch-Helfer (deren einzige Wunsch-Aufgabe voll ist) ihren Wunsch bekommen.
    //
    // Beispiel: Familie A wollte [Snackstand, Kuchenbuffet], bekam Snackstand.
    //           Familie B wollte nur [Snackstand], geht leer aus weil Snackstand voll ist.
    //           Kuchenbuffet hat Platz → wir verschieben A auf Kuchenbuffet, B bekommt Snackstand.
    {
      const ruecksByKind: Record<string, any[]> = {};
      for (const r of rueckmeldungenArray) {
        if (!r.kind_id) continue;
        (ruecksByKind[r.kind_id] = ruecksByKind[r.kind_id] || []).push(r);
      }
      // Wartende: Kinder ohne Zuteilung nach Phase 1
      const wartendeKindIds = Array.from(new Set(
        erstePhaseRueckmeldungen
          .filter((r: any) => r.kind_id && (!helferAufgabenAnzahl[r.kind_id] || helferAufgabenAnzahl[r.kind_id] === 0))
          .map((r: any) => r.kind_id),
      ));

      const passtZeitfenster = (kindId: string, neuesZf: string, altesZf: string): boolean => {
        // Simuliert: Kind verlässt altesZf, kommt zu neuesZf — gibt es nach der Verschiebung einen Konflikt?
        const zf = new Set(kinderZeitfenster[kindId] || []);
        if (altesZf === 'beides') { zf.delete('vormittag'); zf.delete('nachmittag'); } else { zf.delete(altesZf); }
        if (neuesZf === 'beides') {
          return !zf.has('vormittag') && !zf.has('nachmittag');
        }
        return !zf.has(neuesZf);
      };

      for (const wartendeKindId of wartendeKindIds) {
        if (helferAufgabenAnzahl[wartendeKindId] > 0) continue;
        const wuensche = ruecksByKind[wartendeKindId] || [];
        let zugewiesen = false;

        for (const wunsch of wuensche) {
          if (zugewiesen) break;
          const wunschAufgabe = wunsch.helferaufgaben as Aufgabe;
          const wunschAufgabeId = wunschAufgabe.id;
          // Nur dann interessant, wenn der Wunsch voll ist (sonst wäre er schon zugeteilt worden)
          if ((aufgabenBelegung[wunschAufgabeId] || 0) < wunschAufgabe.bedarf) continue;
          // Zeitfenster-Konflikt für das wartende Kind?
          const wartendZf = kinderZeitfenster[wartendeKindId] || new Set();
          if (wunschAufgabe.zeitfenster === 'beides') {
            if (wartendZf.has('vormittag') || wartendZf.has('nachmittag')) continue;
          } else if (wartendZf.has(wunschAufgabe.zeitfenster)) continue;

          // Suche ein verschiebbares Kind auf wunschAufgabe (nur aus neueZuteilungen — bestehende anrühren wir nicht)
          for (const aktuelleZuteilung of neueZuteilungen) {
            if (zugewiesen) break;
            if (aktuelleZuteilung.aufgabe_id !== wunschAufgabeId) continue;
            const verschiebbarKindId = aktuelleZuteilung.kind_id;
            // Alternative-Wünsche dieses verschiebbaren Kindes (nicht der Wunsch, auf dem es bereits ist)
            const altWuensche = (ruecksByKind[verschiebbarKindId] || []).filter(
              (r: any) => (r.helferaufgaben as Aufgabe).id !== wunschAufgabeId,
            );
            for (const altWunsch of altWuensche) {
              const altAufgabe = altWunsch.helferaufgaben as Aufgabe;
              if ((aufgabenBelegung[altAufgabe.id] || 0) >= altAufgabe.bedarf) continue;
              if (!passtZeitfenster(verschiebbarKindId, altAufgabe.zeitfenster, aktuelleZuteilung.zeitfenster)) continue;

              // Verschiebung durchführen
              const altesZf = aktuelleZuteilung.zeitfenster;
              aktuelleZuteilung.aufgabe_id = altAufgabe.id;
              aktuelleZuteilung.rueckmeldung_id = altWunsch.id;
              aktuelleZuteilung.zeitfenster = altAufgabe.zeitfenster;
              // Belegung anpassen
              aufgabenBelegung[wunschAufgabeId] = (aufgabenBelegung[wunschAufgabeId] || 0) - 1;
              aufgabenBelegung[altAufgabe.id] = (aufgabenBelegung[altAufgabe.id] || 0) + 1;
              // Zeitfenster des verschobenen Kindes anpassen
              const zfVerschoben = kinderZeitfenster[verschiebbarKindId] || new Set();
              if (altesZf === 'beides') { zfVerschoben.delete('vormittag'); zfVerschoben.delete('nachmittag'); } else { zfVerschoben.delete(altesZf); }
              if (altAufgabe.zeitfenster === 'beides') { zfVerschoben.add('vormittag'); zfVerschoben.add('nachmittag'); } else { zfVerschoben.add(altAufgabe.zeitfenster); }
              kinderZeitfenster[verschiebbarKindId] = zfVerschoben;

              // Wartendes Kind auf den freigewordenen Platz zuweisen
              neueZuteilungen.push({
                kind_id: wartendeKindId,
                aufgabe_id: wunschAufgabeId,
                rueckmeldung_id: wunsch.id,
                zeitfenster: wunschAufgabe.zeitfenster,
                manuell: false,
                event_id: eventId,
              });
              aufgabenBelegung[wunschAufgabeId] = (aufgabenBelegung[wunschAufgabeId] || 0) + 1;
              const wartendZfSet = kinderZeitfenster[wartendeKindId] || new Set();
              if (wunschAufgabe.zeitfenster === 'beides') { wartendZfSet.add('vormittag'); wartendZfSet.add('nachmittag'); } else { wartendZfSet.add(wunschAufgabe.zeitfenster); }
              kinderZeitfenster[wartendeKindId] = wartendZfSet;
              helferAufgabenAnzahl[wartendeKindId] = (helferAufgabenAnzahl[wartendeKindId] || 0) + 1;

              // nichtZugewieseneRueckmeldungen-Eintrag dieses Wunsches entfernen, falls drin
              const removeIdx = nichtZugewieseneRueckmeldungen.findIndex(n => n.id === wunsch.id);
              if (removeIdx >= 0) nichtZugewieseneRueckmeldungen.splice(removeIdx, 1);

              zugewiesen = true;
              break; // Diesen Swap nur einmal durchführen, sonst Doublette in neueZuteilungen
            }
          }
        }
      }
    }

    // Hinweis: Es gibt bewusst KEINE Phase 2 mehr, die Zweit-Aufgaben verteilt.
    // Jede Familie soll genau EINE Aufgabe bekommen. Offene Bedarfe nach diesem Lauf
    // füllt der User manuell (über Springer oder direkte Zuweisung).
    void zweitePhaseRueckmeldungen;

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
    
    // Prüfen, welche Kinder bereits zugewiesen wurden (alle in diesem Lauf)
    const zugewieseneKinder = new Set<string>();
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
