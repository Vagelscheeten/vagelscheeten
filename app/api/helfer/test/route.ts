import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST { action: 'reset' | 'seed', eventId }

// Realistische Freitext-Einträge wie sie von Eltern kommen würden
const FREITEXTE = [
  'Ich würde gerne beim Armbrustschießen als Spielbetreuer helfen',
  'Bitte als Gruppenleiter für die 2a einteilen',
  'Kann nur vormittags, muss nachmittags die kleine Schwester abholen',
  'Mein Mann (Thomas) könnte auch noch helfen, bitte melden!',
  'Gerne zusammen mit Frau Schmidt am gleichen Stand',
  'Habe letztes Jahr beim Dosenwerfen geholfen, das hat gut geklappt',
  'Bin gelernte Erzieherin, kann gut mit Kindern umgehen',
  'Bitte NICHT am Kuchenbuffet, bin leider nicht so belastbar beim Stehen',
  'Kann ab 11 Uhr da sein, vorher Arzttermin',
  'Würde gerne beim Auf- oder Abbau helfen, bin handwerklich geschickt',
  'Spreche auch Türkisch, falls das bei Elterngesprächen hilft',
  'Bitte am liebsten draußen einsetzen, nicht in der Halle',
  'Mache das zum ersten Mal, bin aber flexibel einsetzbar',
  'Habe einen Anhänger, kann beim Transport helfen',
  'Bin Ersthelfer, falls jemand am Sanitätsposten gebraucht wird',
  'Gerne beim Snackstand — kann gut Würstchen grillen ;)',
  'Würde am liebsten bei einem Spiel helfen wo mein Kind NICHT mitmacht',
  'Kann den ganzen Tag, nehme mir extra frei',
  'Bitte mit meiner Freundin (Mama von Lena, 3b) zusammen einteilen',
  'Nachmittags wäre mir lieber, vormittags habe ich Homeoffice',
];

const KOMMENTARE = [
  'Nur vormittags verfügbar',
  'Ganztägig verfügbar',
  'Habe Erfahrung von letztem Jahr',
  'Erstmalig dabei',
  'Flexibel einsetzbar',
  'Bitte nicht am Kuchenbuffet',
  'Gerne draußen',
  null, null, null, null, null, // viele ohne Kommentar
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function POST(req: NextRequest) {
  // Nur in Development erlauben
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Nicht verfügbar in Produktion' }, { status: 403 });
  }

  const supabase = await createClient();

  // Auth-Check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { action, eventId } = await req.json();

  if (!eventId) return NextResponse.json({ error: 'eventId fehlt' }, { status: 400 });

  // ── RESET ────────────────────────────────────────────────────────────────
  if (action === 'reset') {
    await supabase.from('helfer_zuteilungen').delete().eq('event_id', eventId);
    await supabase.from('essensspenden_rueckmeldungen').delete().eq('event_id', eventId);
    await supabase.from('helfer_rueckmeldungen').delete().eq('event_id', eventId);
    await supabase.from('kinder_ignoriert').delete().eq('event_id', eventId);
    await supabase.from('events').update({ essensspenden_verteilt_am: null }).eq('id', eventId);
    return NextResponse.json({ erfolg: true });
  }

  // ── SEED ─────────────────────────────────────────────────────────────────
  if (action === 'seed') {
    const [kinderRes, aufgabenRes, spendenRes] = await Promise.all([
      supabase.from('kinder').select('id, vorname, nachname, klasse').eq('event_id', eventId),
      supabase.from('helferaufgaben').select('id, titel, bedarf, zeitfenster').eq('event_id', eventId),
      supabase.from('essensspenden_bedarf').select('id').eq('event_id', eventId),
    ]);

    const kinder = kinderRes.data || [];
    const aufgaben = aufgabenRes.data || [];
    const spenden = spendenRes.data || [];

    if (kinder.length === 0 || aufgaben.length === 0) {
      return NextResponse.json({ error: 'Keine Kinder oder Aufgaben vorhanden' }, { status: 400 });
    }

    const totalBedarf = aufgaben.reduce((sum, a) => sum + a.bedarf, 0);
    const shuffledKinder = shuffle(kinder);
    const zeitfensterOptionen = ['vormittag', 'nachmittag', 'beides'];

    const rueckmeldungen: any[] = [];
    const verwendeteKinder = new Set<string>();

    const externName = (k: any) =>
      `${k.nachname}, ${k.vorname}${k.klasse ? ` (${k.klasse})` : ''}`;

    // ── Phase 1: Reguläre Wünsche (~55% der Kinder) ──────────────────────
    // Bewusst weniger als Gesamtbedarf, damit Platz für Springer bleibt
    const hauptAnzahl = Math.min(
      Math.floor(shuffledKinder.length * 0.55),
      totalBedarf - 8 // mindestens 8 Plätze für Springer freihalten
    );
    const hauptKinder = shuffledKinder.slice(0, hauptAnzahl);

    // Ungleiche Verteilung: 2-3 "beliebte" Aufgaben bekommen mehr Wünsche
    const beliebteAufgaben = aufgaben.slice(0, Math.min(3, aufgaben.length));
    const andereAufgaben = aufgaben.slice(Math.min(3, aufgaben.length));

    for (let i = 0; i < hauptKinder.length; i++) {
      const k = hauptKinder[i];
      verwendeteKinder.add(k.id);

      // 50% wünschen sich eine der beliebten Aufgaben → garantiert Überzeichnung
      const aufgabe = (Math.random() < 0.5 && beliebteAufgaben.length > 0)
        ? pick(beliebteAufgaben)
        : (andereAufgaben.length > 0 ? pick(andereAufgaben) : pick(aufgaben));

      // ~20% bekommen einen Freitext
      const hatFreitext = Math.random() < 0.20;

      rueckmeldungen.push({
        kind_id: k.id,
        aufgabe_id: aufgabe.id,
        prioritaet: 1,
        ist_springer: false,
        event_id: eventId,
        kind_name_extern: externName(k),
        kommentar: pick(KOMMENTARE),
        freitext: hatFreitext ? pick(FREITEXTE) : null,
        zeitfenster: null,
      });
    }

    // ── Phase 2: Zweitwünsche (~15% der Phase-1-Kinder) ──────────────────
    const zweitAnzahl = Math.floor(hauptKinder.length * 0.15);
    const zweitKinder = shuffle(hauptKinder).slice(0, zweitAnzahl);

    for (const k of zweitKinder) {
      const ersteAufgabeId = rueckmeldungen.find(r => r.kind_id === k.id)?.aufgabe_id;
      const pool = aufgaben.filter(a => a.id !== ersteAufgabeId);
      if (pool.length === 0) continue;

      rueckmeldungen.push({
        kind_id: k.id,
        aufgabe_id: pick(pool).id,
        prioritaet: 2,
        ist_springer: false,
        event_id: eventId,
        kind_name_extern: externName(k),
        kommentar: null,
        freitext: Math.random() < 0.3 ? pick(FREITEXTE) : null,
        zeitfenster: null,
      });
    }

    // ── Phase 3: Springer (10-12 Kinder) ─────────────────────────────────
    const springerAnzahl = Math.min(12, shuffledKinder.length - hauptAnzahl);
    const springerKinder = shuffledKinder
      .filter(k => !verwendeteKinder.has(k.id))
      .slice(0, springerAnzahl);

    for (const k of springerKinder) {
      verwendeteKinder.add(k.id);
      rueckmeldungen.push({
        kind_id: k.id,
        aufgabe_id: null,
        prioritaet: 1,
        ist_springer: true,
        zeitfenster: pick(zeitfensterOptionen),
        event_id: eventId,
        kind_name_extern: externName(k),
        kommentar: Math.random() < 0.3 ? 'Flexibel einsetzbar' : null,
        freitext: Math.random() < 0.25
          ? pick([
              'Bin für alles offen, einfach einteilen',
              'Kann überall helfen, wo es gerade brennt',
              'Egal wo, Hauptsache ich kann helfen!',
              'Kann den ganzen Tag, nehme mir extra frei',
            ])
          : null,
      });
    }

    // ── Phase 4: Reine Freitext-Einträge (ohne aufgabe_id) ──────────────
    // Eltern die nur Text geschrieben haben statt eine Aufgabe auszuwählen
    const freitextAnzahl = Math.min(5, shuffledKinder.length - verwendeteKinder.size);
    const freitextKinder = shuffledKinder
      .filter(k => !verwendeteKinder.has(k.id))
      .slice(0, freitextAnzahl);

    const pureFreitexte = [
      'Ich würde gerne beim Armbrustschießen als Spielbetreuer helfen',
      'Bitte als Gruppenleiter für die 2a einteilen, habe das schon 2x gemacht',
      'Mein Mann und ich können beim Auf- und Abbau helfen',
      'Kann nachmittags kommen, am liebsten beim Kuchenbuffet oder Getränkestand',
      'Wo auch immer Hilfe gebraucht wird — bin flexibel!',
    ];

    for (let i = 0; i < freitextKinder.length; i++) {
      const k = freitextKinder[i];
      verwendeteKinder.add(k.id);
      rueckmeldungen.push({
        kind_id: k.id,
        aufgabe_id: null,
        prioritaet: null,
        ist_springer: false,
        event_id: eventId,
        kind_name_extern: externName(k),
        kommentar: null,
        freitext: pureFreitexte[i % pureFreitexte.length],
        zeitfenster: null,
      });
    }

    // Insert rueckmeldungen
    const { error: rueckErr } = await supabase.from('helfer_rueckmeldungen').insert(rueckmeldungen);
    if (rueckErr) return NextResponse.json({ error: rueckErr.message }, { status: 500 });

    // ── Essensspenden: 40% der Kinder ────────────────────────────────────
    if (spenden.length > 0) {
      const spendenEintraege: any[] = [];
      const kinderFuerSpenden = shuffledKinder
        .filter(() => Math.random() < 0.4)
        .slice(0, 55);

      for (const k of kinderFuerSpenden) {
        const anzahl = Math.random() < 0.3 ? 2 : 1;
        const spendenShuffled = shuffle(spenden);
        for (let i = 0; i < Math.min(anzahl, spendenShuffled.length); i++) {
          spendenEintraege.push({
            spende_id: spendenShuffled[i].id,
            kind_identifier: externName(k),
            menge: 1,
            event_id: eventId,
          });
        }
      }

      if (spendenEintraege.length > 0) {
        await supabase.from('essensspenden_rueckmeldungen').insert(spendenEintraege);
      }
    }

    return NextResponse.json({
      erfolg: true,
      rueckmeldungen: rueckmeldungen.length,
      davonSpringer: springerKinder.length,
      davonFreitext: freitextKinder.length,
      essensspenden: spenden.length > 0 ? 'ja' : 'nein',
    });
  }

  return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 });
}
