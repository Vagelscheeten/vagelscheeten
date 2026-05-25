/* eslint-disable */
// Einmaliger Backfill: für jede verifizierte Anmeldung die zugehörigen
// kinder.id-Einträge ermitteln und in anmeldungs_kinder eintragen.
//
// Match-Logik: über lib/helfer-utils (firstWord-Fallback bei Doppelnamen).
//
// Aufruf:
//   Dry-Run:   npx tsx --env-file=.env.local scripts/backfill-anmeldungs-kinder.ts
//   Anwenden:  npx tsx --env-file=.env.local scripts/backfill-anmeldungs-kinder.ts --apply

import { createClient } from '@supabase/supabase-js';
import { buildKinderIndex, findKindInIndex, type KindLite } from '../lib/helfer-utils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(`Modus: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  const { data: events } = await supabaseAdmin.from('events').select('id, name');
  for (const ev of events || []) {
    console.log(`\n=== Event: ${ev.name} (${ev.id}) ===`);

    const [anmeldungenRes, kinderRes] = await Promise.all([
      supabaseAdmin
        .from('anmeldungen')
        .select('id, kind_vorname, kind_nachname, kind_klasse, weitere_kinder_json, verifiziert')
        .eq('event_id', ev.id),
      supabaseAdmin
        .from('kinder')
        .select('id, vorname, nachname, klasse, geschlecht')
        .eq('event_id', ev.id),
    ]);

    const anmeldungen = anmeldungenRes.data || [];
    const kinder = (kinderRes.data || []) as KindLite[];
    const idx = buildKinderIndex(kinder);

    let totalEintraege = 0;
    let totalHaupt = 0;
    let totalGeschwister = 0;
    let unmatchedHaupt = 0;
    let unmatchedGeschwister = 0;
    const inserts: { anmeldung_id: string; kind_id: string; ist_haupt: boolean }[] = [];

    for (const a of anmeldungen) {
      // Hauptkind
      const haupt = findKindInIndex(a.kind_vorname, a.kind_nachname, a.kind_klasse, idx);
      if (haupt) {
        inserts.push({ anmeldung_id: a.id, kind_id: haupt.id, ist_haupt: true });
        totalHaupt++;
      } else {
        unmatchedHaupt++;
        console.log(`  ❌ Hauptkind nicht gefunden: ${a.kind_vorname} ${a.kind_nachname} (${a.kind_klasse}) — Anmeldung ${a.id}`);
      }

      // Geschwister
      const weitere = Array.isArray(a.weitere_kinder_json) ? (a.weitere_kinder_json as any[]) : [];
      for (const w of weitere) {
        if (!w?.vorname || !w?.nachname) continue;
        const geschwister = findKindInIndex(w.vorname, w.nachname, w.klasse, idx);
        if (geschwister) {
          // Duplikate (z.B. wenn Hauptkind == Geschwister) vermeiden
          if (haupt && geschwister.id === haupt.id) continue;
          if (inserts.some((i) => i.anmeldung_id === a.id && i.kind_id === geschwister.id)) continue;
          inserts.push({ anmeldung_id: a.id, kind_id: geschwister.id, ist_haupt: false });
          totalGeschwister++;
        } else {
          unmatchedGeschwister++;
          console.log(`  ❌ Geschwister nicht gefunden: ${w.vorname} ${w.nachname} (${w.klasse}) — Anmeldung ${a.id} (${a.kind_vorname} ${a.kind_nachname})`);
        }
      }
    }
    totalEintraege = totalHaupt + totalGeschwister;

    console.log(`  Anmeldungen: ${anmeldungen.length}`);
    console.log(`  Hauptkind-Verknüpfungen: ${totalHaupt} (${unmatchedHaupt} ohne Match)`);
    console.log(`  Geschwister-Verknüpfungen: ${totalGeschwister} (${unmatchedGeschwister} ohne Match)`);
    console.log(`  Junction-Einträge gesamt: ${totalEintraege}`);

    if (APPLY && inserts.length > 0) {
      console.log(`  Schreibe ${inserts.length} Einträge …`);
      // In Batches einfügen (Supabase limit ~1000/batch)
      const batchSize = 500;
      let written = 0;
      for (let i = 0; i < inserts.length; i += batchSize) {
        const batch = inserts.slice(i, i + batchSize);
        const { error } = await supabaseAdmin
          .from('anmeldungs_kinder')
          .upsert(batch, { onConflict: 'anmeldung_id,kind_id' });
        if (error) {
          console.error(`    Fehler bei Batch ${i / batchSize + 1}: ${error.message}`);
        } else {
          written += batch.length;
        }
      }
      console.log(`  ✓ ${written}/${inserts.length} geschrieben`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
