'use client';

import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, X } from 'lucide-react';
import {
  berechneRangePunkteProBucket,
  istKleinerBesser,
  vergleicheNachWertungstyp,
} from '@/lib/points';

interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  geschlecht: string;
  klasse: string;
}

interface Spiel {
  id: string;
  name: string;
  wertungstyp: string;
  einheit: string | null;
}

interface Ergebnis {
  id: string;
  kind_id: string;
  spiel_id: string;
  wert_numeric: number;
}

type ViewMode = 'pro-spiel' | 'pro-kind';

const istJunge = (g: string) => g === 'Junge' || g === 'männlich';
const istMaedchen = (g: string) => g === 'Mädchen' || g === 'weiblich';

export function Punktecheck({
  kinder,
  spiele,
  ergebnisse,
  spielIdsProKlasse,
}: {
  kinder: Kind[];
  spiele: Spiel[];
  ergebnisse: Ergebnis[];
  spielIdsProKlasse: Map<string, Set<string>>;
}) {
  const verfuegbareKlassen = useMemo(
    () =>
      Array.from(new Set(kinder.map((k) => k.klasse).filter(Boolean) as string[])).sort(),
    [kinder],
  );

  const [selectedKlasse, setSelectedKlasse] = useState<string>(verfuegbareKlassen[0] ?? '');
  const [viewMode, setViewMode] = useState<ViewMode>('pro-spiel');

  React.useEffect(() => {
    if (!selectedKlasse && verfuegbareKlassen.length > 0) {
      setSelectedKlasse(verfuegbareKlassen[0]);
    }
  }, [verfuegbareKlassen, selectedKlasse]);

  // Rang+Punkte klassenweit, getrennt nach Geschlecht
  const rangMap = useMemo(() => {
    const kindBucketMap = new Map(kinder.map((k) => [k.id, `${k.klasse}|${k.geschlecht}`]));
    const spielWertungstypMap = new Map(spiele.map((s) => [s.id, s.wertungstyp]));
    return berechneRangePunkteProBucket(
      ergebnisse,
      (e) => kindBucketMap.get(e.kind_id),
      (e) => spielWertungstypMap.get(e.spiel_id),
    );
  }, [ergebnisse, kinder, spiele]);

  const klassenKinder = useMemo(
    () => kinder.filter((k) => k.klasse === selectedKlasse),
    [kinder, selectedKlasse],
  );

  const klassenSpiele = useMemo(() => {
    const ids = spielIdsProKlasse.get(selectedKlasse);
    if (ids && ids.size > 0) return spiele.filter((s) => ids.has(s.id));
    const kindIds = new Set(klassenKinder.map((k) => k.id));
    const spielIdsAusErgebnissen = new Set(
      ergebnisse.filter((e) => kindIds.has(e.kind_id)).map((e) => e.spiel_id),
    );
    return spiele.filter((s) => spielIdsAusErgebnissen.has(s.id));
  }, [spielIdsProKlasse, selectedKlasse, spiele, klassenKinder, ergebnisse]);

  const klassenErgebnisse = useMemo(() => {
    const kindIds = new Set(klassenKinder.map((k) => k.id));
    return ergebnisse.filter((e) => kindIds.has(e.kind_id));
  }, [ergebnisse, klassenKinder]);

  return (
    <div>
      <div className="rounded-lg border bg-amber-50/60 px-4 py-3 mb-5 text-sm text-slate-700">
        <strong className="font-semibold">So funktioniert die Punktevergabe:</strong> Rang und
        Punkte werden klassenweit pro Spiel berechnet, dabei werden Jungen und Mädchen{' '}
        <strong>getrennt</strong> gerankt (König- und Königinnen-Wertung parallel). Formel:{' '}
        <span className="font-mono">11 − Rang</span> für Rang 1–10, sonst 0 Punkte. Bei
        Gleichstand erhalten Kinder denselben Rang.
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div className="min-w-[180px]">
          <label className="block text-sm font-medium mb-2">Klasse</label>
          <Select value={selectedKlasse} onValueChange={setSelectedKlasse}>
            <SelectTrigger>
              <SelectValue placeholder="Klasse auswählen" />
            </SelectTrigger>
            <SelectContent>
              {verfuegbareKlassen.map((klasse) => (
                <SelectItem key={klasse} value={klasse}>
                  Klasse {klasse}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-md p-1">
          <button
            onClick={() => setViewMode('pro-spiel')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'pro-spiel'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pro Spiel
          </button>
          <button
            onClick={() => setViewMode('pro-kind')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'pro-kind'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pro Kind
          </button>
        </div>
      </div>

      {!selectedKlasse ? (
        <div className="text-center py-8 text-slate-500">Bitte Klasse wählen.</div>
      ) : viewMode === 'pro-spiel' ? (
        <ProSpielView
          spiele={klassenSpiele}
          ergebnisse={klassenErgebnisse}
          kinder={klassenKinder}
          rangMap={rangMap}
        />
      ) : (
        <ProKindView
          spiele={klassenSpiele}
          ergebnisse={klassenErgebnisse}
          kinder={klassenKinder}
          rangMap={rangMap}
        />
      )}
    </div>
  );
}

// ─── Pro Spiel ────────────────────────────────────────────────────────────────

function ProSpielView({
  spiele,
  ergebnisse,
  kinder,
  rangMap,
}: {
  spiele: Spiel[];
  ergebnisse: Ergebnis[];
  kinder: Kind[];
  rangMap: Map<string, { rang: number; punkte: number }>;
}) {
  if (spiele.length === 0) {
    return <div className="text-center py-8 text-slate-500">Keine Spiele für diese Klasse.</div>;
  }
  const kindMap = new Map(kinder.map((k) => [k.id, k]));
  const jungen = kinder.filter((k) => istJunge(k.geschlecht));
  const maedchen = kinder.filter((k) => istMaedchen(k.geschlecht));

  return (
    <div className="space-y-8">
      {spiele.map((spiel) => {
        const alle = ergebnisse
          .filter((e) => e.spiel_id === spiel.id)
          .map((e) => ({
            ...e,
            rang: rangMap.get(e.id)?.rang,
            punkte: rangMap.get(e.id)?.punkte ?? 0,
            kind: kindMap.get(e.kind_id),
          }));

        const erfasstJungen = alle.filter((e) => e.kind && istJunge(e.kind.geschlecht));
        const erfasstMaedchen = alle.filter((e) => e.kind && istMaedchen(e.kind.geschlecht));

        return (
          <div key={spiel.id} className="border rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b">
              <h3 className="font-semibold text-slate-900">{spiel.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {istKleinerBesser(spiel.wertungstyp) ? 'weniger ist besser' : 'mehr ist besser'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
              <GeschlechtsTabelle
                titel="Jungen"
                farbe="text-blue-700"
                spiel={spiel}
                erfasst={erfasstJungen}
                gesamt={jungen.length}
              />
              <GeschlechtsTabelle
                titel="Mädchen"
                farbe="text-pink-700"
                spiel={spiel}
                erfasst={erfasstMaedchen}
                gesamt={maedchen.length}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GeschlechtsTabelle({
  titel,
  farbe,
  spiel,
  erfasst,
  gesamt,
}: {
  titel: string;
  farbe: string;
  spiel: Spiel;
  erfasst: Array<Ergebnis & { rang?: number; punkte: number; kind?: Kind }>;
  gesamt: number;
}) {
  const sorted = [...erfasst].sort((a, b) => {
    if (a.rang !== undefined && b.rang !== undefined && a.rang !== b.rang) return a.rang - b.rang;
    return vergleicheNachWertungstyp(a.wert_numeric, b.wert_numeric, spiel.wertungstyp);
  });

  return (
    <div>
      <div className="px-4 py-2 bg-slate-50/60 border-b flex items-center justify-between">
        <span className={`text-sm font-semibold ${farbe}`}>{titel}</span>
        <span className="text-xs text-slate-500">
          {erfasst.length} / {gesamt} erfasst
        </span>
      </div>
      {erfasst.length === 0 ? (
        <div className="px-4 py-6 text-sm text-slate-500 text-center">
          Noch keine Ergebnisse erfasst.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead className="text-right">Wert {spiel.einheit ? `(${spiel.einheit})` : ''}</TableHead>
              <TableHead className="text-right w-16">Pkt.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium tabular-nums">{e.rang ?? '—'}</TableCell>
                <TableCell>
                  {e.kind ? `${e.kind.vorname} ${e.kind.nachname}` : 'Unbekannt'}
                </TableCell>
                <TableCell className="text-right tabular-nums">{e.wert_numeric}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{e.punkte}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Pro Kind ─────────────────────────────────────────────────────────────────

function ProKindView({
  spiele,
  ergebnisse,
  kinder,
  rangMap,
}: {
  spiele: Spiel[];
  ergebnisse: Ergebnis[];
  kinder: Kind[];
  rangMap: Map<string, { rang: number; punkte: number }>;
}) {
  const [suche, setSuche] = useState('');

  if (kinder.length === 0) {
    return <div className="text-center py-8 text-slate-500">Keine Kinder in dieser Klasse.</div>;
  }

  const compute = (k: Kind) => {
    const kindErgebnisse = ergebnisse.filter((e) => e.kind_id === k.id);
    const gesamtpunkte = kindErgebnisse.reduce(
      (sum, e) => sum + (rangMap.get(e.id)?.punkte ?? 0),
      0,
    );
    return { kind: k, kindErgebnisse, gesamtpunkte };
  };

  const term = suche.trim().toLowerCase();
  const passt = (k: Kind) =>
    term === '' || `${k.vorname} ${k.nachname}`.toLowerCase().includes(term);

  const jungen = kinder
    .filter((k) => istJunge(k.geschlecht) && passt(k))
    .map(compute)
    .sort((a, b) => b.gesamtpunkte - a.gesamtpunkte);
  const maedchen = kinder
    .filter((k) => istMaedchen(k.geschlecht) && passt(k))
    .map(compute)
    .sort((a, b) => b.gesamtpunkte - a.gesamtpunkte);

  const treffer = jungen.length + maedchen.length;

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          type="search"
          placeholder="Kind suchen…"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          className="pl-9 pr-9"
        />
        {suche && (
          <button
            onClick={() => setSuche('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            aria-label="Suche löschen"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {term && (
        <p className="text-xs text-slate-500">
          {treffer === 0
            ? 'Keine Treffer.'
            : `${treffer} ${treffer === 1 ? 'Treffer' : 'Treffer'} für "${suche}"`}
        </p>
      )}

      {treffer === 0 ? null : (
        <div className="space-y-8">
          <KinderListe titel="Jungen" farbe="text-blue-700" eintraege={jungen} spiele={spiele} rangMap={rangMap} />
          <KinderListe titel="Mädchen" farbe="text-pink-700" eintraege={maedchen} spiele={spiele} rangMap={rangMap} />
        </div>
      )}
    </div>
  );
}

function KinderListe({
  titel,
  farbe,
  eintraege,
  spiele,
  rangMap,
}: {
  titel: string;
  farbe: string;
  eintraege: Array<{ kind: Kind; kindErgebnisse: Ergebnis[]; gesamtpunkte: number }>;
  spiele: Spiel[];
  rangMap: Map<string, { rang: number; punkte: number }>;
}) {
  if (eintraege.length === 0) return null;
  return (
    <div>
      <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${farbe}`}>
        {titel} ({eintraege.length})
      </h2>
      <div className="space-y-3">
        {eintraege.map(({ kind, kindErgebnisse, gesamtpunkte }, idx) => {
          const rowsBySpielId = new Map(kindErgebnisse.map((e) => [e.spiel_id, e]));
          return (
            <div key={kind.id} className="border rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">
                  <span className="text-slate-400 mr-2 tabular-nums">{idx + 1}.</span>
                  {kind.vorname} {kind.nachname}
                </h3>
                <div className="text-sm">
                  <span className="text-slate-500">Gesamtpunkte:</span>{' '}
                  <span className="font-bold text-melsdorf-orange tabular-nums">{gesamtpunkte}</span>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Spiel</TableHead>
                    <TableHead className="text-right">Wert</TableHead>
                    <TableHead className="w-16 text-right">Rang</TableHead>
                    <TableHead className="w-16 text-right">Pkt.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spiele.map((spiel) => {
                    const e = rowsBySpielId.get(spiel.id);
                    const r = e ? rangMap.get(e.id) : undefined;
                    return (
                      <TableRow key={spiel.id}>
                        <TableCell>
                          {spiel.name}
                          {!e && (
                            <span className="ml-2 text-xs text-slate-400 italic">
                              kein Ergebnis
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {e ? (
                            <>
                              {e.wert_numeric}
                              {spiel.einheit ? ` ${spiel.einheit}` : ''}
                            </>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r?.rang ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {r?.punkte ?? 0}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
