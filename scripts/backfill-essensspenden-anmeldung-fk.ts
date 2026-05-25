/* eslint-disable */
// Einmaliger Backfill: setzt essensspenden_rueckmeldungen.anmeldung_id basierend
// auf kind_identifier per Best-Match (Nachname + firstWord, Klasse-tolerant).
//
// Aufruf:
//   Dry-Run:   npx tsx --env-file=.env.local scripts/backfill-essensspenden-anmeldung-fk.ts
//   Anwenden:  npx tsx --env-file=.env.local scripts/backfill-essensspenden-anmeldung-fk.ts --apply

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const APPLY = process.argv.includes('--apply');

function firstWord(s: string | null | undefined): string {
  if (!s) return '';
  return s.trim().split(/[\s-]+/)[0] || '';
}

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().trim();
}

interface Anmeldung {
  id: string;
  event_id: string;
  kind_vorname: string;
  kind_nachname: string;
  kind_klasse: string;
  weitere_kinder_json: any;
}

interface Spende {
  id: string;
  event_id: string;
  kind_identifier: string | null;
  anmeldung_id: string | null;
}

async function main() {
  console.log(`Modus: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, name');
  for (const ev of events || []) {
    console.log(`\n=== Event: ${ev.name} (${ev.id}) ===`);

    const [anmeldungenRes, spendenRes] = await Promise.all([
      supabaseAdmin
        .from('anmeldungen')
        .select('id, event_id, kind_vorname, kind_nachname, kind_klasse, weitere_kinder_json')
        .eq('event_id', ev.id),
      supabaseAdmin
        .from('essensspenden_rueckmeldungen')
        .select('id, event_id, kind_identifier, anmeldung_id')
        .eq('event_id', ev.id),
    ]);

    const anmeldungen = (anmeldungenRes.data || []) as Anmeldung[];
    const spenden = (spendenRes.data || []) as Spende[];

    // Index: für jede (nachname, firstWord) → Liste der anmeldungen
    const idx = new Map<string, Anmeldung[]>();
    const addToIndex = (key: string, a: Anmeldung) => {
      if (!idx.has(key)) idx.set(key, []);
      idx.get(key)!.push(a);
    };
    for (const a of anmeldungen) {
      const eintraege: { vorname: string; nachname: string }[] = [
        { vorname: a.kind_vorname, nachname: a.kind_nachname },
      ];
      for (const w of a.weitere_kinder_json || []) {
        if (w?.vorname && w?.nachname) eintraege.push({ vorname: w.vorname, nachname: w.nachname });
      }
      const seen = new Set<string>();
      for (const e of eintraege) {
        const fw = norm(firstWord(e.vorname));
        const nn = norm(e.nachname);
        const fullKey = `${nn}|${norm(e.vorname)}`;
        const fwKey = `${nn}|${fw}`;
        if (!seen.has(fullKey)) {
          addToIndex(fullKey, a);
          seen.add(fullKey);
        }
        if (fwKey !== fullKey && !seen.has(fwKey)) {
          addToIndex(fwKey, a);
          seen.add(fwKey);
        }
      }
    }

    const idRegex = /^(.+?),\s+(.+?)\s+\((.+?)\)$/;
    let zugewiesen = 0;
    let bereitsGesetzt = 0;
    let mehrdeutig = 0;
    let kein_match = 0;
    const updates: { id: string; anmeldung_id: string }[] = [];

    for (const s of spenden) {
      if (s.anmeldung_id) {
        bereitsGesetzt++;
        continue;
      }
      if (!s.kind_identifier) {
        kein_match++;
        continue;
      }
      // Identifier kann mehrere Kinder enthalten ('A + B')
      const kinder = s.kind_identifier.split(' + ');
      const kandidaten = new Set<string>();
      for (const k of kinder) {
        const m = k.match(idRegex);
        if (!m) continue;
        const nn = norm(m[1]);
        const vn = norm(m[2]);
        const fw = norm(firstWord(m[2]));
        const candidates: Anmeldung[] = [
          ...(idx.get(`${nn}|${vn}`) || []),
          ...(idx.get(`${nn}|${fw}`) || []),
        ];
        for (const a of candidates) kandidaten.add(a.id);
      }
      if (kandidaten.size === 0) {
        kein_match++;
        console.log(`  ❌ Kein Match: '${s.kind_identifier}'`);
      } else if (kandidaten.size > 1) {
        mehrdeutig++;
        console.log(`  ⚠️ Mehrdeutig (${kandidaten.size}): '${s.kind_identifier}'`);
      } else {
        zugewiesen++;
        updates.push({ id: s.id, anmeldung_id: [...kandidaten][0] });
      }
    }

    console.log(`  Spenden gesamt: ${spenden.length}`);
    console.log(`  Bereits gesetzt: ${bereitsGesetzt}`);
    console.log(`  Eindeutig zuweisbar: ${zugewiesen}`);
    console.log(`  Mehrdeutig: ${mehrdeutig}`);
    console.log(`  Kein Match: ${kein_match}`);

    if (APPLY && updates.length > 0) {
      console.log(`  Schreibe ${updates.length} Updates …`);
      for (const u of updates) {
        const { error } = await supabaseAdmin
          .from('essensspenden_rueckmeldungen')
          .update({ anmeldung_id: u.anmeldung_id })
          .eq('id', u.id);
        if (error) console.error(`    Fehler bei ${u.id}: ${error.message}`);
      }
      console.log('  ✓ fertig');
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
