// Server-Side-Helper zum Aufräumen abgeleiteter Daten einer Anmeldung
// (helfer_rueckmeldungen + essensspenden_rueckmeldungen + helfer_zuteilungen via CASCADE).
//
// Wenn mehrere verifizierte Anmeldungen denselben kind_identifier teilen
// (Mehrfach-Anmeldungen vor "Als gültig markieren"), entstehen Duplikate.
// Nach jeder Lösch-Operation muss daher der Bestand neu aus den verbleibenden
// verifizierten Anmeldungen generiert werden.

import type { SupabaseClient } from '@supabase/supabase-js';

interface WeiteresKind { vorname: string; nachname: string; klasse: string }

interface AnmeldungRow {
  id: string;
  event_id: string | null;
  kind_vorname: string;
  kind_nachname: string;
  kind_klasse: string;
  weitere_kinder_json: WeiteresKind[] | null;
  helfer_aufgaben_json: { aufgabe_id: string; prioritaet?: number }[] | null;
  essensspenden_json: { spende_id: string; menge?: number }[] | null;
  ist_springer: boolean | null;
  springer_zeitfenster: string | null;
  kommentar: string | null;
  verifiziert: boolean | null;
}

export function buildKindIdentifier(a: {
  kind_vorname: string;
  kind_nachname: string;
  kind_klasse: string;
  weitere_kinder_json?: WeiteresKind[] | null;
}): string {
  let id = `${a.kind_nachname}, ${a.kind_vorname} (${a.kind_klasse})`;
  const weitere = Array.isArray(a.weitere_kinder_json) ? a.weitere_kinder_json : [];
  if (weitere.length > 0) {
    id += weitere.map((k) => ` + ${k.nachname}, ${k.vorname} (${k.klasse})`).join('');
  }
  return id;
}

// Erzeugt helfer_rueckmeldungen + essensspenden_rueckmeldungen aus einer
// verifizierten Anmeldung — analog zum Verhalten in /api/anmeldung/bestaetigen.
async function regeneriereAusAnmeldung(supabaseAdmin: SupabaseClient, a: AnmeldungRow) {
  if (!a.event_id) return;
  const kindIdentifier = buildKindIdentifier(a);

  // Optional: Kind-ID aus kinder via exakter Name-Match (für Auto-Verknüpfung)
  const { data: kindMatch } = await supabaseAdmin
    .from('kinder')
    .select('id')
    .eq('event_id', a.event_id)
    .ilike('vorname', a.kind_vorname)
    .ilike('nachname', a.kind_nachname);
  const autoKindId = kindMatch && kindMatch.length === 1 ? kindMatch[0].id : null;

  // Eltern-Kommentar aus der Anmeldung holen — die Anmeldung ist die Datenwahrheit,
  // helfer_rueckmeldungen.kommentar dient nur als Spiegel für die KI-Analyse + Anzeige.
  const elternKommentar = (a as any).kommentar?.toString().trim() || null;

  // Springer-Eintrag
  if (a.ist_springer) {
    await supabaseAdmin.from('helfer_rueckmeldungen').insert({
      event_id: a.event_id,
      kind_id: autoKindId,
      kind_name_extern: kindIdentifier,
      aufgabe_id: null,
      prioritaet: 1,
      ist_springer: true,
      zeitfenster: a.springer_zeitfenster || 'beides',
      freitext: null,
      kommentar: elternKommentar,
    });
  }

  // Aufgaben-Einträge
  const aufgaben = Array.isArray(a.helfer_aufgaben_json) ? a.helfer_aufgaben_json : [];
  for (const eintrag of aufgaben) {
    if (!eintrag?.aufgabe_id) continue;
    await supabaseAdmin.from('helfer_rueckmeldungen').insert({
      event_id: a.event_id,
      kind_id: autoKindId,
      kind_name_extern: kindIdentifier,
      aufgabe_id: eintrag.aufgabe_id,
      prioritaet: eintrag.prioritaet ?? 1,
      ist_springer: false,
      zeitfenster: null,
      freitext: null,
      kommentar: elternKommentar,
    });
  }

  // Essensspenden
  const essen = Array.isArray(a.essensspenden_json) ? a.essensspenden_json : [];
  for (const eintrag of essen) {
    if (!eintrag?.spende_id) continue;
    await supabaseAdmin.from('essensspenden_rueckmeldungen').insert({
      event_id: a.event_id,
      kind_identifier: kindIdentifier,
      spende_id: eintrag.spende_id,
      menge: eintrag.menge ?? 1,
    });
  }
}

// Für einen kind_identifier: lösche alle abgeleiteten Einträge, regeneriere aus
// den verbleibenden verifizierten Anmeldungen mit diesem identifier.
export async function regeneriereFuerIdentifier(
  supabaseAdmin: SupabaseClient,
  eventId: string,
  identifier: string,
): Promise<{ helferGeloescht: number; essenGeloescht: number; helferNeu: number; essenNeu: number }> {
  // 1) Bestand zählen + löschen
  const { data: alteHelfer } = await supabaseAdmin
    .from('helfer_rueckmeldungen')
    .select('id')
    .eq('event_id', eventId)
    .eq('kind_name_extern', identifier);
  const helferGeloescht = alteHelfer?.length ?? 0;
  if (helferGeloescht > 0) {
    await supabaseAdmin.from('helfer_rueckmeldungen').delete().eq('event_id', eventId).eq('kind_name_extern', identifier);
  }

  const { data: altesEssen } = await supabaseAdmin
    .from('essensspenden_rueckmeldungen')
    .select('id')
    .eq('event_id', eventId)
    .eq('kind_identifier', identifier);
  const essenGeloescht = altesEssen?.length ?? 0;
  if (essenGeloescht > 0) {
    await supabaseAdmin.from('essensspenden_rueckmeldungen').delete().eq('event_id', eventId).eq('kind_identifier', identifier);
  }

  // 2) Verbleibende verifizierte Anmeldungen mit diesem identifier finden
  const { data: anmeldungen } = await supabaseAdmin
    .from('anmeldungen')
    .select('id, event_id, kind_vorname, kind_nachname, kind_klasse, weitere_kinder_json, helfer_aufgaben_json, essensspenden_json, ist_springer, springer_zeitfenster, kommentar, verifiziert')
    .eq('event_id', eventId)
    .eq('verifiziert', true);

  const passende = (anmeldungen || []).filter((a) => buildKindIdentifier(a as AnmeldungRow) === identifier);

  let helferNeu = 0;
  let essenNeu = 0;
  for (const a of passende) {
    const row = a as AnmeldungRow;
    if (row.ist_springer) helferNeu++;
    helferNeu += Array.isArray(row.helfer_aufgaben_json) ? row.helfer_aufgaben_json.length : 0;
    essenNeu += Array.isArray(row.essensspenden_json) ? row.essensspenden_json.length : 0;
    await regeneriereAusAnmeldung(supabaseAdmin, row);
  }

  return { helferGeloescht, essenGeloescht, helferNeu, essenNeu };
}

// Löscht Anmeldungen + bereinigt die abgeleiteten Einträge für jeden betroffenen identifier.
export async function loescheAnmeldungenMitBereinigung(
  supabaseAdmin: SupabaseClient,
  ids: string[],
): Promise<{
  geloeschteAnmeldungen: number;
  betroffeneIdentifier: { eventId: string; identifier: string; helferGeloescht: number; essenGeloescht: number; helferNeu: number; essenNeu: number }[];
}> {
  if (ids.length === 0) {
    return { geloeschteAnmeldungen: 0, betroffeneIdentifier: [] };
  }

  // 1) Anmeldungen vor dem Löschen laden, um identifier + event_id zu sammeln
  const { data: zuLoeschen } = await supabaseAdmin
    .from('anmeldungen')
    .select('id, event_id, kind_vorname, kind_nachname, kind_klasse, weitere_kinder_json')
    .in('id', ids);

  // Set aus "eventId|identifier"
  const betroffen = new Map<string, { eventId: string; identifier: string }>();
  for (const a of zuLoeschen || []) {
    if (!a.event_id) continue;
    const id = buildKindIdentifier(a as AnmeldungRow);
    betroffen.set(`${a.event_id}|${id}`, { eventId: a.event_id, identifier: id });
  }

  // 2) Anmeldungen löschen
  const { error: delError } = await supabaseAdmin.from('anmeldungen').delete().in('id', ids);
  if (delError) throw delError;

  // 3) Pro identifier recompute
  const ergebnisse: { eventId: string; identifier: string; helferGeloescht: number; essenGeloescht: number; helferNeu: number; essenNeu: number }[] = [];
  for (const { eventId, identifier } of betroffen.values()) {
    const r = await regeneriereFuerIdentifier(supabaseAdmin, eventId, identifier);
    ergebnisse.push({ eventId, identifier, ...r });
  }

  return { geloeschteAnmeldungen: zuLoeschen?.length ?? 0, betroffeneIdentifier: ergebnisse };
}
