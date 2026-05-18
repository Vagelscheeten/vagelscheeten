import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface KommentarEintrag {
  kind_name: string;
  klasse: string;
  kommentar: string;
}

interface KiThema {
  titel: string;
  anzahl: number;
  kernpunkte: string[];
  betroffene_familien: string[];
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ verfuegbar: false });
  }

  const { kommentare } = await req.json() as { kommentare: KommentarEintrag[] };

  if (!Array.isArray(kommentare) || kommentare.length === 0) {
    return NextResponse.json({ themen: [] });
  }

  const liste = kommentare
    .map((k, i) => `[${i + 1}] ${k.kind_name} (${k.klasse}): "${k.kommentar.replace(/"/g, "'")}"`)
    .join('\n');

  const prompt = `Du analysierst freie Kommentare von Eltern, die ihre Kinder für das Melsdörper Vagelscheeten (Schul-Vogelschießen-Fest) angemeldet haben.

Deine Aufgabe: Fasse alle Kommentare zu wenigen aussagekräftigen Themen-Clustern zusammen. Typische Cluster könnten sein: Zeitfenster-Wünsche, Aufgaben-Präferenzen, Verfügbarkeits-Einschränkungen, Geschwister-Hinweise, Allergien/besondere Bedürfnisse, Lob/Dank, Sonstiges. Bilde nur die Cluster, die tatsächlich vorkommen — keine leeren Kategorien.

Ignoriere Kommentare ohne Inhalt (z.B. nur Begeisterung wie "freut sich drauf").

Pro Cluster lieferst du:
- titel: kurzer Cluster-Name
- anzahl: Zahl der zugeordneten Kommentare
- kernpunkte: 2 bis 4 prägnante Bulletpoints in Stichworten, die die wichtigsten Inhalte des Clusters wiedergeben
- betroffene_familien: Liste der Familien als "Nachname (Klasse)" — maximal 8 Namen, dann mit "…" abkürzen

Antworte NUR mit gültigem JSON in dieser Struktur:
{
  "themen": [
    {
      "titel": "...",
      "anzahl": 0,
      "kernpunkte": ["...", "..."],
      "betroffene_familien": ["..."]
    }
  ]
}

Kommentare:
${liste}`;

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'KI-Antwort konnte nicht verarbeitet werden' }, { status: 500 });
    }
    const parsed = JSON.parse(jsonMatch[0]) as { themen: KiThema[] };
    return NextResponse.json({ themen: Array.isArray(parsed.themen) ? parsed.themen : [] });
  } catch (error: any) {
    console.error('Fehler bei KI-Zusammenfassung:', error);
    return NextResponse.json(
      { error: `Fehler bei der KI-Zusammenfassung: ${error.message}` },
      { status: 500 }
    );
  }
}
