/* eslint-disable */
// Findet duplikate Einträge in helfer_rueckmeldungen + essensspenden_rueckmeldungen
// für das aktive Event und regeneriert sie aus den verifizierten Anmeldungen.
//
// Aufruf:
//   Dry-Run:     npx tsx --env-file=.env.local scripts/cleanup-duplicates.ts
//   Anwenden:    npx tsx --env-file=.env.local scripts/cleanup-duplicates.ts --apply
//
// Achtung: ein anschließender Recompute setzt essensspenden_rueckmeldungen.bestaetigt zurück
// auf false. Nur vor Schritt 3 (Essensspenden verteilen) ausführen — danach manuell prüfen.

import { createClient } from '@supabase/supabase-js';
import { buildKindIdentifier, regeneriereFuerIdentifier } from '../lib/anmeldungen-bereinigen';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const APPLY = process.argv.includes('--apply');

interface AnmeldungRow {
  kind_vorname: string;
  kind_nachname: string;
  kind_klasse: string;
  weitere_kinder_json: any;
  ist_springer: boolean | null;
  helfer_aufgaben_json: any;
  essensspenden_json: any;
}

async function main() {
  // 1) Aktives Event
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, name')
    .eq('ist_aktiv', true)
    .single();
  if (!event) throw new Error('Kein aktives Event');
  console.log(`Aktives Event: ${event.name} (${event.id})`);

  // 2) Erwartetes Soll pro identifier aus verifizierten Anmeldungen
  const { data: anmeldungen } = await supabaseAdmin
    .from('anmeldungen')
    .select('id, kind_vorname, kind_nachname, kind_klasse, weitere_kinder_json, ist_springer, helfer_aufgaben_json, essensspenden_json, verifiziert')
    .eq('event_id', event.id)
    .eq('verifiziert', true);

  // identifier → Anmeldungen
  const sollByIdentifier = new Map<string, AnmeldungRow[]>();
  for (const a of (anmeldungen || []) as any[]) {
    const id = buildKindIdentifier(a);
    if (!sollByIdentifier.has(id)) sollByIdentifier.set(id, []);
    sollByIdentifier.get(id)!.push(a as AnmeldungRow);
  }

  // Erwartete Anzahl helfer_rueckmeldungen + essensspenden je identifier (Summe über alle Anmeldungen mit gleichem identifier — sollte 1 sein, da "Als gültig markieren" andere löscht)
  function erwarteteCounts(rows: AnmeldungRow[]): { helfer: number; essen: number } {
    let h = 0, e = 0;
    for (const a of rows) {
      if (a.ist_springer) h += 1;
      h += Array.isArray(a.helfer_aufgaben_json) ? a.helfer_aufgaben_json.length : 0;
      e += Array.isArray(a.essensspenden_json) ? a.essensspenden_json.length : 0;
    }
    return { helfer: h, essen: e };
  }

  // 3) Ist-Stand pro identifier laden
  const { data: helferEintraege } = await supabaseAdmin
    .from('helfer_rueckmeldungen')
    .select('id, kind_name_extern')
    .eq('event_id', event.id);
  const { data: essenEintraege } = await supabaseAdmin
    .from('essensspenden_rueckmeldungen')
    .select('id, kind_identifier')
    .eq('event_id', event.id);

  const helferCount = new Map<string, number>();
  for (const r of helferEintraege || []) {
    if (!r.kind_name_extern) continue;
    helferCount.set(r.kind_name_extern, (helferCount.get(r.kind_name_extern) || 0) + 1);
  }
  const essenCount = new Map<string, number>();
  for (const r of essenEintraege || []) {
    if (!r.kind_identifier) continue;
    essenCount.set(r.kind_identifier, (essenCount.get(r.kind_identifier) || 0) + 1);
  }

  // 4) Vergleich + identifiziere problematische identifier
  const alleIdentifier = new Set<string>([
    ...sollByIdentifier.keys(),
    ...helferCount.keys(),
    ...essenCount.keys(),
  ]);

  const problemFaelle: { identifier: string; soll: { helfer: number; essen: number }; ist: { helfer: number; essen: number } }[] = [];
  for (const id of alleIdentifier) {
    const sollRows = sollByIdentifier.get(id) || [];
    const soll = erwarteteCounts(sollRows);
    const ist = { helfer: helferCount.get(id) || 0, essen: essenCount.get(id) || 0 };
    if (soll.helfer !== ist.helfer || soll.essen !== ist.essen) {
      problemFaelle.push({ identifier: id, soll, ist });
    }
  }

  if (problemFaelle.length === 0) {
    console.log('\nKeine Inkonsistenzen gefunden — alles sauber.');
    return;
  }

  console.log(`\n${problemFaelle.length} Identifier mit Abweichung:\n`);
  for (const f of problemFaelle) {
    console.log(`  ${f.identifier}`);
    console.log(`     Soll: ${f.soll.helfer} Helfer, ${f.soll.essen} Essen`);
    console.log(`     Ist:  ${f.ist.helfer} Helfer, ${f.ist.essen} Essen`);
  }

  if (!APPLY) {
    console.log('\n(Dry-Run — keine Änderungen.)\nMit --apply ausführen, um zu bereinigen.');
    return;
  }

  console.log('\nWende Bereinigung an…');
  for (const f of problemFaelle) {
    const res = await regeneriereFuerIdentifier(supabaseAdmin, event.id, f.identifier);
    console.log(`  ${f.identifier} → ${res.helferGeloescht}→${res.helferNeu} Helfer, ${res.essenGeloescht}→${res.essenNeu} Essen`);
  }
  console.log('\nFertig.');
}

main().catch((e) => { console.error(e); process.exit(1); });
