import { NextRequest, NextResponse } from 'next/server';

interface FreitextEntry {
  id: string;
  freitext: string;
  aufgabe_titel: string;
  aufgabe_id: string;
  aufgabe_zeitfenster: string | null;
  kind_name: string;
  zeitfenster: string | null;
}

interface Aufgabe {
  id: string;
  titel: string;
  zeitfenster: string;
}

interface KiHinweis {
  id: string;
  aktion: 'ignorieren' | 'hinweis' | 'zeitfenster_anpassen' | 'aufgabe_wechseln' | 'springer_erkennen';
  hinweis: string;
  begruendung: string;
  empfohlenes_zeitfenster: 'vormittag' | 'nachmittag' | 'beides' | null;
  empfohlene_aufgabe_id: string | null;
  empfohlene_aufgabe_titel?: string | null;
}

import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // Auth-Check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  const { freitexte, aufgaben } = await req.json() as {
    freitexte: FreitextEntry[];
    aufgaben: Aufgabe[];
  };

  if (!freitexte || freitexte.length === 0) {
    return NextResponse.json({ error: 'Keine Freitexte übergeben' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'KI-Analyse nicht verfügbar: ANTHROPIC_API_KEY nicht konfiguriert.' },
      { status: 503 }
    );
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    const zeitfensterLabel = (z: string) => z === 'vormittag' ? 'nur vormittags' : z === 'nachmittag' ? 'nur nachmittags' : 'ganztägig';

    const aufgabenListe = (aufgaben || [])
      .map(a => `  - "${a.titel}" (ID: ${a.id}, ${zeitfensterLabel(a.zeitfenster)})`)
      .join('\n');

    const freitextListe = freitexte
      .map(f => [
        `ID: ${f.id}`,
        `Kind: ${f.kind_name}`,
        `Eingetragene Aufgabe: "${f.aufgabe_titel}" (ID: ${f.aufgabe_id})`,
        `Zeitfenster der Aufgabe: ${f.aufgabe_zeitfenster ? zeitfensterLabel(f.aufgabe_zeitfenster) : 'nicht angegeben'}`,
        `Freitext der Eltern: "${f.freitext}"`,
      ].join('\n'))
      .join('\n\n---\n\n');

    const prompt = `Du analysierst Freitexte von Eltern, die ihr Kind für Helferaufgaben beim Melsdörper Vagelscheeten (Schul-Vogelschießen-Fest) angemeldet haben.

Verfügbare Aufgaben:
${aufgabenListe}

WICHTIG — Aufgaben-Erkennung: Eltern verwenden oft andere Begriffe als die offiziellen Aufgabennamen (z.B. "Gruppenleiter" statt "Teamleiter", "Kuchenbuffet" statt dem offiziellen Namen). Wenn du im Freitext eine Aufgabe erkennst — auch über Synonyme, Umschreibungen oder umgangssprachliche Begriffe — ordne sie der passenden Aufgabe aus der obigen Liste zu und verwende "aufgabe_wechseln" mit der korrekten Aufgaben-ID.

Für jeden Freitext prüfst du:
1. Signalisiert der Text, dass die Person flexibel/überall einsetzbar ist und als "Springer" (= flexible Hilfskraft ohne feste Aufgabe) eingetragen werden sollte? Typische Formulierungen: "egal wo", "überall helfen", "flexibel einsetzbar", "wo es gerade brennt", "wo Hilfe gebraucht wird", "macht alles", "bin für alles offen" — aber auch indirekte Formulierungen, die Flexibilität ohne konkreten Aufgabenwunsch ausdrücken.
2. Enthält der Text einen konkreten Zeitwunsch, der vom Zeitfenster der eingetragenen Aufgabe abweicht?
   - KONFLIKT: Wenn die Aufgabe ein festes Zeitfenster hat (z.B. "nur vormittags") und der Freitext das Gegenteil wünscht (z.B. "nachmittags") → Das ist ein KONFLIKT. Verwende aktion "hinweis" und erkläre den Widerspruch. Verwende NICHT "zeitfenster_anpassen", denn das Zeitfenster der Aufgabe lässt sich nicht ändern.
   - ANPASSUNG: "zeitfenster_anpassen" nur verwenden, wenn die Aufgabe ganztägig ist und der Freitext eine Einschränkung auf vormittag oder nachmittag signalisiert.
3. Deutet der Text darauf hin, dass eine andere Aufgabe aus der obigen Liste besser geeignet wäre?
4. Gibt es sonstige handlungsrelevante Informationen (besondere Fähigkeiten, Einschränkungen, Anmerkungen)?

WICHTIG: Ignoriere Freitexte, die nur Begeisterung, allgemeine Freude oder nichts Konkretes ausdrücken (z.B. "macht das sehr gerne", "freut sich drauf", "ist dabei").

Antworte mit einem JSON-Array. Für ignorierte Einträge: aktion = "ignorieren" (kein hinweis/begruendung nötig).
Für alle anderen: erkläre in "begruendung" auf Deutsch, was du im Text erkannt hast und warum du diese Schlussfolgerung ziehst.

Aktionen:
- "ignorieren": Kein Handlungsbedarf
- "springer_erkennen": Person möchte flexibel eingesetzt werden (als Springer markieren). Setze empfohlenes_zeitfenster auf den erkannten Zeitwunsch oder "beides".
- "zeitfenster_anpassen": Konkreter Zeitwunsch weicht ab. NUR verwenden wenn die Aufgabe ganztägig ("beides") ist!
- "aufgabe_wechseln": Andere Aufgabe empfohlen
- "hinweis": Sonstige relevante Information oder KONFLIKT (z.B. Zeitwunsch unvereinbar mit Aufgabe)

Format:
[
  {
    "id": "<ID>",
    "aktion": "ignorieren" | "hinweis" | "zeitfenster_anpassen" | "aufgabe_wechseln" | "springer_erkennen",
    "hinweis": "<Kurze Zusammenfassung, max 80 Zeichen, nur bei nicht-ignorieren>",
    "begruendung": "<Erklärung warum, nur bei nicht-ignorieren>",
    "empfohlenes_zeitfenster": null | "vormittag" | "nachmittag" | "beides",
    "empfohlene_aufgabe_id": null | "<ID aus der Aufgabenliste>"
  }
]

Hier sind die Einträge:

${freitextListe}

Antworte NUR mit dem JSON-Array, kein anderer Text.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16384,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'KI-Antwort konnte nicht verarbeitet werden' }, { status: 500 });
    }

    const alle: KiHinweis[] = JSON.parse(jsonMatch[0]);

    // Aufgabentitel anreichern — alle zurückgeben, keiner wird gefiltert
    const hinweise = alle.map(h => ({
      ...h,
      empfohlene_aufgabe_titel: h.empfohlene_aufgabe_id
        ? (aufgaben || []).find(a => a.id === h.empfohlene_aufgabe_id)?.titel ?? null
        : null,
    }));

    return NextResponse.json({ hinweise });
  } catch (error: any) {
    console.error('Fehler bei KI-Analyse:', error);
    return NextResponse.json(
      { error: `Fehler bei der KI-Analyse: ${error.message}` },
      { status: 500 }
    );
  }
}
