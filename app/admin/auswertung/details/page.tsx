'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { PageShell } from '@/components/admin';
import {
  berechneRangePunkteProKlasse,
  istKleinerBesser,
  vergleicheNachWertungstyp,
} from '@/lib/points';

interface Kind {
  id: string;
  vorname: string;
  nachname: string;
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
  spielgruppe_id: string;
  wert_numeric: number;
}

type ViewMode = 'pro-spiel' | 'pro-kind';

export default function AuswertungDetailsPage() {
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([]);
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [spielIdsProKlasse, setSpielIdsProKlasse] = useState<Map<string, Set<string>>>(new Map());
  const [verfuegbareKlassen, setVerfuegbareKlassen] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedKlasse, setSelectedKlasse] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('pro-spiel');

  const supabase = createClient();

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: event } = await supabase
        .from('events')
        .select('id')
        .eq('ist_aktiv', true)
        .maybeSingle();
      if (!event) {
        setIsLoading(false);
        return;
      }
      const eventId = event.id;

      const [{ data: spieleData }, { data: kinderData }, { data: ergebnisseData }, { data: klasseSpieleData }] =
        await Promise.all([
          supabase.from('spiele').select('id, name, wertungstyp, einheit').order('name'),
          supabase.from('kinder').select('id, vorname, nachname, klasse').eq('event_id', eventId),
          supabase
            .from('ergebnisse')
            .select('id, kind_id, spiel_id, spielgruppe_id, wert_numeric')
            .eq('event_id', eventId),
          supabase.from('klasse_spiele').select('spiel_id, klasse:klassen!inner(name)'),
        ]);

      setSpiele((spieleData ?? []) as Spiel[]);
      setKinder((kinderData ?? []) as Kind[]);
      setErgebnisse((ergebnisseData ?? []) as Ergebnis[]);

      const map = new Map<string, Set<string>>();
      for (const row of klasseSpieleData ?? []) {
        const klasseName = (row as any).klasse?.name as string | undefined;
        if (!klasseName) continue;
        if (!map.has(klasseName)) map.set(klasseName, new Set());
        map.get(klasseName)!.add(row.spiel_id);
      }
      setSpielIdsProKlasse(map);

      const klassenMitKindern = Array.from(
        new Set((kinderData ?? []).map((k) => k.klasse).filter(Boolean) as string[]),
      ).sort();
      setVerfuegbareKlassen(klassenMitKindern);
      if (klassenMitKindern.length > 0 && !selectedKlasse) {
        setSelectedKlasse(klassenMitKindern[0]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rang+Punkte klassenweit über alle Ergebnisse vorberechnen
  const rangMap = useMemo(() => {
    const kindKlasseMap = new Map(kinder.map((k) => [k.id, k.klasse]));
    const spielWertungstypMap = new Map(spiele.map((s) => [s.id, s.wertungstyp]));
    return berechneRangePunkteProKlasse(
      ergebnisse,
      (e) => kindKlasseMap.get(e.kind_id),
      (e) => spielWertungstypMap.get(e.spiel_id),
    );
  }, [ergebnisse, kinder, spiele]);

  // Filterung auf gewählte Klasse
  const klassenKinder = useMemo(
    () => kinder.filter((k) => k.klasse === selectedKlasse),
    [kinder, selectedKlasse],
  );

  const klassenSpiele = useMemo(() => {
    const ids = spielIdsProKlasse.get(selectedKlasse);
    if (ids && ids.size > 0) return spiele.filter((s) => ids.has(s.id));
    // Fallback: aus tatsächlich erfassten Ergebnissen ableiten
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
    <PageShell
      title="Punktecheck"
      description="Detaillierte Validierung der Punkteberechnung pro Klasse"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Auswertung', href: '/admin/auswertung' },
        { label: 'Punktecheck' },
      ]}
      actions={
        <div className="flex gap-2">
          <Link
            href="/admin/auswertung"
            className="inline-flex items-center h-9 px-3.5 rounded-md border border-slate-200 hover:bg-slate-50 text-[0.85rem] font-medium transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Zurück zur Auswertung
          </Link>
          <Button variant="outline" size="sm" onClick={loadInitialData} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Neu laden
          </Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Punkteberechnung im Detail</CardTitle>
          <CardDescription>
            Rang und Punkte werden klassenweit pro Spiel berechnet. Formel:{' '}
            <span className="font-mono">11 − Rang</span> für Rang 1–10, sonst 0 Punkte. Bei
            Gleichstand erhalten Kinder denselben Rang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium mb-2">Klasse</label>
              <Select
                value={selectedKlasse}
                onValueChange={setSelectedKlasse}
                disabled={isLoading}
              >
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

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : !selectedKlasse ? (
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
        </CardContent>
      </Card>
    </PageShell>
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

  return (
    <div className="space-y-6">
      {spiele.map((spiel) => {
        const spielErgebnisse = ergebnisse
          .filter((e) => e.spiel_id === spiel.id)
          .map((e) => ({
            ...e,
            rang: rangMap.get(e.id)?.rang,
            punkte: rangMap.get(e.id)?.punkte ?? 0,
            kind: kindMap.get(e.kind_id),
          }))
          .sort((a, b) => {
            if (a.rang !== undefined && b.rang !== undefined && a.rang !== b.rang) {
              return a.rang - b.rang;
            }
            return vergleicheNachWertungstyp(a.wert_numeric, b.wert_numeric, spiel.wertungstyp);
          });

        return (
          <div key={spiel.id} className="border rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{spiel.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {spiel.wertungstyp} ·{' '}
                  {istKleinerBesser(spiel.wertungstyp) ? 'weniger ist besser' : 'mehr ist besser'}
                </p>
              </div>
              <div className="text-xs text-slate-500">
                {spielErgebnisse.length} / {kinder.length} erfasst
              </div>
            </div>
            {spielErgebnisse.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500 text-center">
                Noch keine Ergebnisse erfasst.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rang</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead className="text-right">
                      Wert {spiel.einheit ? `(${spiel.einheit})` : ''}
                    </TableHead>
                    <TableHead className="text-right">Punkte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spielErgebnisse.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium tabular-nums">{e.rang ?? '—'}</TableCell>
                      <TableCell>
                        {e.kind ? `${e.kind.vorname} ${e.kind.nachname}` : 'Unbekannt'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{e.wert_numeric}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {e.punkte}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })}
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
  if (kinder.length === 0) {
    return <div className="text-center py-8 text-slate-500">Keine Kinder in dieser Klasse.</div>;
  }
  const spielMap = new Map(spiele.map((s) => [s.id, s]));

  // Berechne Gesamtpunkte pro Kind, sortiere absteigend
  const kinderMitPunkten = kinder
    .map((kind) => {
      const kindErgebnisse = ergebnisse.filter((e) => e.kind_id === kind.id);
      const gesamtpunkte = kindErgebnisse.reduce(
        (sum, e) => sum + (rangMap.get(e.id)?.punkte ?? 0),
        0,
      );
      return { kind, kindErgebnisse, gesamtpunkte };
    })
    .sort((a, b) => b.gesamtpunkte - a.gesamtpunkte);

  return (
    <div className="space-y-4">
      {kinderMitPunkten.map(({ kind, kindErgebnisse, gesamtpunkte }) => {
        const rowsBySpielId = new Map(kindErgebnisse.map((e) => [e.spiel_id, e]));
        return (
          <div key={kind.id} className="border rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                {kind.vorname} {kind.nachname}
              </h3>
              <div className="text-sm">
                <span className="text-slate-500">Gesamtpunkte:</span>{' '}
                <span className="font-bold text-melsdorf-orange tabular-nums">
                  {gesamtpunkte}
                </span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spiel</TableHead>
                  <TableHead className="text-right">Wert</TableHead>
                  <TableHead className="w-16 text-right">Rang</TableHead>
                  <TableHead className="w-16 text-right">Punkte</TableHead>
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
  );
}
