'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, X, AlertTriangle, CheckCircle2, Search, ChevronDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatZeitfenster,
  buildAnmeldungsIndex,
  findAnmeldungForKind,
  type AnmeldungLite,
  type KindLite,
} from '@/lib/helfer-utils';

interface AufgabeMitZuteilungen {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
  zeitfenster: string;
  zuteilungen: Zuteilung[];
}

interface Zuteilung {
  id: string;
  kind_id: string | null;
  externer_helfer_id: string | null;
  zeitfenster: string;
  manuell: boolean;
  via_springer: boolean;
  zugewiesen_am: string;
  kind?: { id: string; vorname: string; nachname: string; klasse?: string } | null;
  externe_helfer?: { id: string; name: string } | null;
}

interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  klasse?: string;
}

interface NichtZugewiesenerWunsch {
  id: string;
  kind_id: string | null;
  aufgabe_id: string | null;
  aufgabe_titel: string;
  zeitfenster: string | null;
  prioritaet: number | null;
  ist_springer: boolean;
  kind?: { vorname: string; nachname: string; klasse?: string } | null;
  zugewiesen_zu?: string | null; // Aufgabe-Titel, falls anders zugeteilt
}

interface Phase3PruefenProps {
  eventId: string;
  onRefresh: () => void;
}

interface Wunsch {
  aufgabe_titel: string | null;
  ist_springer: boolean;
  zeitfenster: string | null;
}

interface KindDetail {
  helferWuensche: { aufgabe_id: string; aufgabe_titel: string }[];
  istSpringer: boolean;
  springerZeitfenster: string | null;
  essensspenden: { titel: string; menge: number }[];
  kommentar: string | null;
  elternEmail: string | null;
  geschwister: { vorname: string; nachname: string; klasse: string }[];
}

export function Phase3Pruefen({ eventId, onRefresh }: Phase3PruefenProps) {
  const [aufgaben, setAufgaben] = useState<AufgabeMitZuteilungen[]>([]);
  const [nichtZugewiesen, setNichtZugewiesen] = useState<NichtZugewiesenerWunsch[]>([]);
  const [wuenscheByKind, setWuenscheByKind] = useState<Record<string, Wunsch[]>>({});
  const [detailsByKindId, setDetailsByKindId] = useState<Record<string, KindDetail>>({});
  const [detailModal, setDetailModal] = useState<
    | { mode: 'zuteilung'; z: Zuteilung; aufgabeTitel: string }
    | { mode: 'wunsch'; r: NichtZugewiesenerWunsch }
    | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<string | null>(null); // aufgabe_id
  const [addMode, setAddMode] = useState<'wuensche' | 'kind' | 'extern'>('wuensche');
  const [suchtext, setSuchtext] = useState('');
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [kinderLoading, setKinderLoading] = useState(false);
  const [nichtZugewiesenCollapsed, setNichtZugewiesenCollapsed] = useState(true);
  const [externerName, setExternerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pickerRueckmeldungId, setPickerRueckmeldungId] = useState<string | null>(null);
  const [pickerAufgabeId, setPickerAufgabeId] = useState<string>('');
  const [familienGesamt, setFamilienGesamt] = useState(0);
  const [springerFamilien, setSpringerFamilien] = useState(0);
  const [anmeldungsStats, setAnmeldungsStats] = useState({
    verifiziert: 0,
    nurEssen: 0,
    leer: 0,
  });
  const [wartendeExpanded, setWartendeExpanded] = useState(false);
  const [springerExpanded, setSpringerExpanded] = useState(false);
  const [springerDetails, setSpringerDetails] = useState<{
    kindId: string;
    name: string;
    klasse: string | null;
    springerZeitfenster: string;
    status: 'via_springer' | 'regulaer' | 'wartend';
    aufgabe: string | null;
  }[]>([]);

  const ladeDaten = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    const [aufgabenRes, zuteilungenRes, rueckmeldungenRes] = await Promise.all([
      supabase
        .from('helferaufgaben')
        .select('id, titel, beschreibung, bedarf, zeitfenster')
        .eq('event_id', eventId)
        .order('titel'),
      // Zuteilungen ohne Join laden — vermeidet PostgREST-INNER-JOIN-Problem
      supabase
        .from('helfer_zuteilungen')
        .select('id, aufgabe_id, kind_id, externer_helfer_id, zeitfenster, manuell, via_springer, zugewiesen_am')
        .eq('event_id', eventId),
      supabase
        .from('helfer_rueckmeldungen')
        .select(`
          id, kind_id, aufgabe_id, zeitfenster, prioritaet, ist_springer,
          kind:kinder(vorname, nachname, klasse),
          aufgabe:helferaufgaben(titel)
        `)
        .eq('event_id', eventId),
    ]);

    if (aufgabenRes.error || zuteilungenRes.error) {
      toast.error('Fehler beim Laden');
      setIsLoading(false);
      return;
    }

    // Kinder und externe Helfer separat laden und client-seitig joinen
    const rawZuteilungen = zuteilungenRes.data || [];
    const kindIds = [...new Set(rawZuteilungen.map(z => z.kind_id).filter(Boolean))];
    const externIds = [...new Set(rawZuteilungen.map(z => z.externer_helfer_id).filter(Boolean))];

    const [kinderRes, externRes] = await Promise.all([
      kindIds.length > 0
        ? supabase.from('kinder').select('id, vorname, nachname, klasse').in('id', kindIds)
        : Promise.resolve({ data: [] }),
      externIds.length > 0
        ? supabase.from('externe_helfer').select('id, name').in('id', externIds)
        : Promise.resolve({ data: [] }),
    ]);

    const kinderById = new Map((kinderRes.data || []).map(k => [k.id, k]));
    const externById = new Map((externRes.data || []).map(e => [e.id, e]));

    const zuteilungen = rawZuteilungen.map(z => ({
      ...z,
      kind: z.kind_id ? kinderById.get(z.kind_id) || null : null,
      externe_helfer: z.externer_helfer_id ? externById.get(z.externer_helfer_id) || null : null,
    }));

    const aufgabenMitZ = (aufgabenRes.data || []).map(a => ({
      ...a,
      zuteilungen: zuteilungen.filter(z => z.aufgabe_id === a.id) as Zuteilung[],
    }));

    // Zuteilungen pro Kind: kind_id → Set<aufgabe_id>
    const zuteilungenByKind = new Map<string, Set<string>>();
    // Aufgaben-Titel-Map für Anzeige
    const aufgabenTitelById = new Map((aufgabenRes.data || []).map(a => [a.id, a.titel]));
    for (const z of zuteilungen) {
      if (!z.kind_id) continue;
      if (!zuteilungenByKind.has(z.kind_id)) zuteilungenByKind.set(z.kind_id, new Set());
      zuteilungenByKind.get(z.kind_id)!.add(z.aufgabe_id);
    }

    // Rückmeldungen pro Kind gruppieren, um zu prüfen ob IRGENDEIN Wunsch erfüllt wurde
    const rmByKind = new Map<string, any[]>();
    const familienMitNormalemWunsch = new Set<string>();
    const familienMitSpringerAngebot = new Set<string>();
    for (const r of (rueckmeldungenRes.data || [])) {
      if (!r.kind_id) continue;
      if (!rmByKind.has(r.kind_id)) rmByKind.set(r.kind_id, []);
      rmByKind.get(r.kind_id)!.push(r);
      if (r.ist_springer) familienMitSpringerAngebot.add(r.kind_id);
      else familienMitNormalemWunsch.add(r.kind_id);
    }
    setFamilienGesamt(new Set([...familienMitNormalemWunsch, ...familienMitSpringerAngebot]).size);
    setSpringerFamilien(familienMitSpringerAngebot.size);

    // Springer-Details: pro Springer-Familie der Einsatz-Status
    const springerKindInfo = new Map<string, { name: string; klasse: string | null; zeitfenster: string }>();
    for (const r of (rueckmeldungenRes.data || []) as any[]) {
      if (!r.kind_id || !r.ist_springer) continue;
      if (springerKindInfo.has(r.kind_id)) continue;
      const kindObj = Array.isArray(r.kind) ? r.kind[0] : r.kind;
      springerKindInfo.set(r.kind_id, {
        name: kindObj ? `${kindObj.vorname} ${kindObj.nachname}` : 'Unbekannt',
        klasse: kindObj?.klasse || null,
        zeitfenster: r.zeitfenster || '—',
      });
    }
    const sprDetails = [...springerKindInfo.entries()].map(([kindId, info]) => {
      const zuteilung = zuteilungen.find((z) => z.kind_id === kindId);
      let status: 'via_springer' | 'regulaer' | 'wartend' = 'wartend';
      let aufgabeName: string | null = null;
      if (zuteilung) {
        aufgabeName = aufgabenTitelById.get(zuteilung.aufgabe_id) || null;
        status = zuteilung.via_springer ? 'via_springer' : 'regulaer';
      }
      return {
        kindId,
        name: info.name,
        klasse: info.klasse,
        springerZeitfenster: info.zeitfenster,
        status,
        aufgabe: aufgabeName,
      };
    });
    sprDetails.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    setSpringerDetails(sprDetails);

    // Zufriedene Kinder: mindestens ein Wunsch wurde erfüllt
    const zufriedeneKinder = new Set<string>();
    for (const [kindId, rms] of rmByKind) {
      const assigned = zuteilungenByKind.get(kindId);
      if (!assigned || assigned.size === 0) continue;
      const anyFulfilled = rms.some(r =>
        r.ist_springer || (r.aufgabe_id && assigned.has(r.aufgabe_id))
      );
      if (anyFulfilled) zufriedeneKinder.add(kindId);
    }

    // Nicht erfüllte Wünsche: Kinder ohne Zuteilung ODER mit anderer Aufgabe als gewünscht
    const nichtZugew = (rueckmeldungenRes.data || [])
      .filter(r => r.kind_id && !zufriedeneKinder.has(r.kind_id))
      .map(r => {
        const assigned = zuteilungenByKind.get(r.kind_id);
        const zugewiesenAufgabeIds = assigned ? [...assigned] : [];
        const zugewiesenTitel = zugewiesenAufgabeIds.map(id => aufgabenTitelById.get(id)).filter(Boolean).join(', ');
        return {
          id: r.id,
          kind_id: r.kind_id,
          aufgabe_id: r.aufgabe_id,
          aufgabe_titel: (Array.isArray(r.aufgabe) ? r.aufgabe[0] : r.aufgabe)?.titel || '—',
          zeitfenster: r.zeitfenster,
          prioritaet: r.prioritaet,
          ist_springer: r.ist_springer,
          kind: Array.isArray(r.kind) ? r.kind[0] : r.kind,
          zugewiesen_zu: zugewiesenTitel || null,
        };
      });

    // Wünsche pro Kind aufbauen
    const byKind: Record<string, Wunsch[]> = {};
    for (const r of (rueckmeldungenRes.data || []) as any[]) {
      if (!r.kind_id) continue;
      const aufgabe_titel = (Array.isArray(r.aufgabe) ? r.aufgabe[0] : r.aufgabe)?.titel || null;
      if (!byKind[r.kind_id]) byKind[r.kind_id] = [];
      byKind[r.kind_id].push({ aufgabe_titel, ist_springer: r.ist_springer, zeitfenster: r.zeitfenster });
    }
    setWuenscheByKind(byKind);

    // Anmeldungs-Details laden für Detail-Modal (Wünsche + Essensspenden + Kommentar pro Familie)
    const [anmeldungenRes, spendenBedarfRes, alleKinderRes] = await Promise.all([
      supabase
        .from('anmeldungen')
        .select('id, eltern_email, kind_vorname, kind_nachname, kind_klasse, weitere_kinder_json, helfer_aufgaben_json, essensspenden_json, ist_springer, springer_zeitfenster, kommentar, verifiziert, verifiziert_am, benachrichtigt_am, erstellt_am')
        .eq('event_id', eventId)
        .eq('verifiziert', true),
      supabase
        .from('essensspenden_bedarf')
        .select('id, titel')
        .eq('event_id', eventId),
      supabase
        .from('kinder')
        .select('id, vorname, nachname, klasse, geschlecht')
        .eq('event_id', eventId),
    ]);

    const anmeldungen = (anmeldungenRes.data || []) as AnmeldungLite[];
    const spendenTitel = new Map<string, string>();
    for (const s of spendenBedarfRes.data || []) spendenTitel.set(s.id, s.titel);
    const alleKinder = (alleKinderRes.data || []) as KindLite[];

    // Anmeldungs-Statistik für Personalbilanz
    let nurEssenCount = 0;
    let leerCount = 0;
    for (const a of anmeldungen) {
      const hatHelfer = Array.isArray(a.helfer_aufgaben_json) && (a.helfer_aufgaben_json as any[]).length > 0;
      const hatEssen = Array.isArray(a.essensspenden_json) && (a.essensspenden_json as any[]).length > 0;
      const istSpringer = !!a.ist_springer;
      if (hatHelfer || istSpringer) continue;
      if (hatEssen) nurEssenCount++;
      else leerCount++;
    }
    setAnmeldungsStats({
      verifiziert: anmeldungen.length,
      nurEssen: nurEssenCount,
      leer: leerCount,
    });

    const anmeldungsIdx = buildAnmeldungsIndex(anmeldungen);
    const details: Record<string, KindDetail> = {};
    for (const k of alleKinder) {
      const a = findAnmeldungForKind(k, anmeldungsIdx);
      if (!a) continue;
      const helferJson = Array.isArray(a.helfer_aufgaben_json) ? (a.helfer_aufgaben_json as any[]) : [];
      const essenJson = Array.isArray(a.essensspenden_json) ? (a.essensspenden_json as any[]) : [];
      const weitere = Array.isArray(a.weitere_kinder_json) ? a.weitere_kinder_json : [];
      details[k.id] = {
        helferWuensche: helferJson
          .filter((h) => h?.aufgabe_id)
          .map((h) => ({ aufgabe_id: h.aufgabe_id, aufgabe_titel: aufgabenTitelById.get(h.aufgabe_id) || 'Unbekannte Aufgabe' })),
        istSpringer: !!a.ist_springer,
        springerZeitfenster: a.springer_zeitfenster,
        essensspenden: essenJson
          .filter((e) => e?.spende_id)
          .map((e) => ({ titel: spendenTitel.get(e.spende_id) || 'Spende', menge: e.menge ?? 1 })),
        kommentar: a.kommentar,
        elternEmail: a.eltern_email,
        geschwister: weitere.filter((w) => w?.vorname && w?.nachname) as { vorname: string; nachname: string; klasse: string }[],
      };
    }
    setDetailsByKindId(details);

    setAufgaben(aufgabenMitZ);
    setNichtZugewiesen(nichtZugew);
    setIsLoading(false);
  }, [eventId]);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  const handleRemoveZuteilung = async (zuteilungId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('helfer_zuteilungen')
      .delete()
      .eq('id', zuteilungId);

    if (error) {
      toast.error('Fehler beim Entfernen');
    } else {
      toast.success('Zuteilung entfernt');
      ladeDaten();
      onRefresh();
    }
  };

  const sucheKinder = useCallback(async (text: string) => {
    if (!text || text.length < 2) { setKinder([]); return; }
    setKinderLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('kinder')
      .select('id, vorname, nachname, klasse')
      .eq('event_id', eventId)
      .or(`vorname.ilike.%${text}%,nachname.ilike.%${text}%`)
      .limit(20);
    setKinder(data || []);
    setKinderLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => sucheKinder(suchtext), 300);
    return () => clearTimeout(timer);
  }, [suchtext, sucheKinder]);

  const handleAddKind = async (aufgabeId: string, kind: Kind) => {
    const aufgabe = aufgaben.find(a => a.id === aufgabeId);
    if (!aufgabe) return;

    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('helfer_zuteilungen')
      .insert({
        kind_id: kind.id,
        aufgabe_id: aufgabeId,
        event_id: eventId,
        zeitfenster: aufgabe.zeitfenster,
        manuell: true,
        via_springer: false,
      });

    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else {
      toast.success(`${kind.vorname} ${kind.nachname} hinzugefügt`);
      setAddingTo(null);
      setSuchtext('');
      setKinder([]);
      ladeDaten();
      onRefresh();
    }
    setIsSaving(false);
  };

  const handleAddExtern = async (aufgabeId: string) => {
    if (!externerName.trim()) return;
    const aufgabe = aufgaben.find(a => a.id === aufgabeId);
    if (!aufgabe) return;

    setIsSaving(true);
    const supabase = createClient();

    // Externe_helfer erstellen oder finden
    const { data: existing } = await supabase
      .from('externe_helfer')
      .select('id')
      .ilike('name', externerName.trim())
      .limit(1);

    let externerId: string;

    if (existing && existing.length > 0) {
      externerId = existing[0].id;
    } else {
      const { data: newHelfer, error: insertErr } = await supabase
        .from('externe_helfer')
        .insert({ name: externerName.trim() })
        .select('id')
        .single();

      if (insertErr || !newHelfer) {
        toast.error('Fehler beim Erstellen des externen Helfers');
        setIsSaving(false);
        return;
      }
      externerId = newHelfer.id;
    }

    const { error } = await supabase
      .from('helfer_zuteilungen')
      .insert({
        externer_helfer_id: externerId,
        aufgabe_id: aufgabeId,
        event_id: eventId,
        zeitfenster: aufgabe.zeitfenster,
        manuell: true,
        via_springer: false,
      });

    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else {
      toast.success(`${externerName} hinzugefügt`);
      setAddingTo(null);
      setExternerName('');
      ladeDaten();
      onRefresh();
    }
    setIsSaving(false);
  };

  const handleManuellZuweisen = async (r: NichtZugewiesenerWunsch, aufgabeIdOverride?: string) => {
    const targetAufgabeId = aufgabeIdOverride || r.aufgabe_id;
    if (!r.kind_id || !targetAufgabeId) return;
    const aufgabe = aufgaben.find(a => a.id === targetAufgabeId);
    if (!aufgabe) return;

    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('helfer_zuteilungen').insert({
      kind_id: r.kind_id,
      aufgabe_id: targetAufgabeId,
      event_id: eventId,
      zeitfenster: aufgabe.zeitfenster,
      manuell: true,
      via_springer: r.ist_springer,
    });

    if (error) {
      toast.error('Fehler beim Zuteilen');
    } else {
      const name = r.kind ? `${r.kind.vorname} ${r.kind.nachname}` : 'Kind';
      toast.success(`${name} → ${aufgabe.titel}`);
      setPickerRueckmeldungId(null);
      setPickerAufgabeId('');
      ladeDaten();
      onRefresh();
    }
    setIsSaving(false);
  };

  // Aufgaben-Anzahl pro Kind (für Mehrfach-Zuteilungs-Markierung)
  const aufgabenProKind = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of aufgaben) {
      for (const z of a.zuteilungen) {
        if (z.kind_id) m.set(z.kind_id, (m.get(z.kind_id) || 0) + 1);
      }
    }
    return m;
  }, [aufgaben]);

  // Personalbilanz (gesamt)
  const bilanz = useMemo(() => {
    const bedarfGesamt = aufgaben.reduce((s, a) => s + a.bedarf, 0);
    const belegtGesamt = aufgaben.reduce((s, a) => s + a.zuteilungen.length, 0);
    const zugewieseneKinder = new Set<string>();
    let externeAnzahl = 0;
    let viaSpringerAnzahl = 0;
    for (const a of aufgaben) {
      for (const z of a.zuteilungen) {
        if (z.kind_id) zugewieseneKinder.add(z.kind_id);
        if (z.externe_helfer) externeAnzahl++;
        if (z.via_springer) viaSpringerAnzahl++;
      }
    }
    const luecken = Math.max(0, bedarfGesamt - belegtGesamt);
    // Helfer-Pool = Familien, die einen Helfer-Wunsch oder Springer-Bereitschaft signalisiert haben
    const helferPool = familienGesamt;
    const zugewieseneFamilien = zugewieseneKinder.size;
    const wartendeFamilien = Math.max(0, helferPool - zugewieseneFamilien);
    // Echtes Defizit nach voller Auslastung des Helfer-Pools (1 Aufgabe pro Familie)
    const defizitNachVollerAuslastung = Math.max(0, bedarfGesamt - helferPool);
    // Reserve: Familien ohne Helfer-Wunsch, die theoretisch noch angesprochen werden könnten
    const reserveNurEssen = anmeldungsStats.nurEssen;
    const reserveLeer = anmeldungsStats.leer;
    return {
      bedarfGesamt,
      belegtGesamt,
      luecken,
      zugewieseneFamilien,
      helferPool,
      wartendeFamilien,
      springerFamilien,
      externeAnzahl,
      viaSpringerAnzahl,
      defizitNachVollerAuslastung,
      verifizierteAnmeldungen: anmeldungsStats.verifiziert,
      reserveNurEssen,
      reserveLeer,
    };
  }, [aufgaben, familienGesamt, springerFamilien, anmeldungsStats]);

  // Liste der wartenden Familien (im Helfer-Pool, aber ohne Zuteilung)
  const wartendeFamilienListe = useMemo(() => {
    type Item = { kindId: string; name: string; klasse: string | null; wuensche: string[] };
    const map = new Map<string, Item>();
    for (const r of nichtZugewiesen) {
      if (!r.kind_id) continue;
      if ((aufgabenProKind.get(r.kind_id) || 0) > 0) continue; // hat schon eine Zuteilung
      if (!map.has(r.kind_id)) {
        map.set(r.kind_id, {
          kindId: r.kind_id,
          name: r.kind ? `${r.kind.vorname} ${r.kind.nachname}` : 'Unbekannt',
          klasse: r.kind?.klasse || null,
          wuensche: [],
        });
      }
      if (r.aufgabe_titel && r.aufgabe_titel !== '—') {
        map.get(r.kind_id)!.wuensche.push(r.aufgabe_titel);
      } else if (r.ist_springer) {
        map.get(r.kind_id)!.wuensche.push('Springer');
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [nichtZugewiesen, aufgabenProKind]);

  // Liste der Familien mit 2+ Aufgaben (für Banner)
  const mehrfachZugeteilte = useMemo(() => {
    const result: { kindId: string; name: string; klasse: string | null; anzahl: number; aufgabenTitel: string[] }[] = [];
    const aufgabenByKind = new Map<string, { titel: string; klasse: string | null; vorname: string; nachname: string }[]>();
    for (const a of aufgaben) {
      for (const z of a.zuteilungen) {
        if (!z.kind_id || !z.kind) continue;
        if (!aufgabenByKind.has(z.kind_id)) aufgabenByKind.set(z.kind_id, []);
        aufgabenByKind.get(z.kind_id)!.push({
          titel: a.titel,
          klasse: z.kind.klasse || null,
          vorname: z.kind.vorname,
          nachname: z.kind.nachname,
        });
      }
    }
    for (const [kindId, eintraege] of aufgabenByKind) {
      if (eintraege.length > 1) {
        const erste = eintraege[0];
        result.push({
          kindId,
          name: `${erste.vorname} ${erste.nachname}`,
          klasse: erste.klasse,
          anzahl: eintraege.length,
          aufgabenTitel: eintraege.map((e) => e.titel),
        });
      }
    }
    result.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return result;
  }, [aufgaben]);

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" size={24} /></div>;
  }

  if (aufgaben.length === 0) {
    return <div className="text-center py-10 text-slate-400 text-sm">Keine Aufgaben gefunden.</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Überprüfe die Zuteilungen pro Aufgabe. Rote Karten haben Lücken (Bedarf nicht gedeckt).
      </p>

      {/* Personalbilanz */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-slate-500" />
          <h3 className="font-semibold text-sm text-slate-800">Personalbilanz</h3>
        </div>

        {/* Top: 3 große Zahlen */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <div className="text-xs text-slate-500">Bedarf</div>
            <div className="text-2xl font-bold text-slate-800 leading-tight">{bilanz.bedarfGesamt}</div>
            <div className="text-xs text-slate-500">Helfer-Plätze gesamt</div>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${bilanz.belegtGesamt >= bilanz.bedarfGesamt ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="text-xs text-slate-500">Zugeteilt</div>
            <div className={`text-2xl font-bold leading-tight ${bilanz.belegtGesamt >= bilanz.bedarfGesamt ? 'text-green-700' : 'text-blue-700'}`}>{bilanz.belegtGesamt}</div>
            <div className="text-xs text-slate-500">
              {bilanz.viaSpringerAnzahl > 0 && `${bilanz.viaSpringerAnzahl} via Springer · `}
              {bilanz.externeAnzahl > 0 && `${bilanz.externeAnzahl} extern`}
              {bilanz.viaSpringerAnzahl === 0 && bilanz.externeAnzahl === 0 && 'alle regulär'}
            </div>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${bilanz.luecken === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="text-xs text-slate-500">Offene Plätze</div>
            <div className={`text-2xl font-bold leading-tight ${bilanz.luecken === 0 ? 'text-green-700' : 'text-red-700'}`}>{bilanz.luecken}</div>
            <div className="text-xs text-slate-500">{bilanz.luecken === 0 ? 'alles gedeckt' : 'noch zu füllen'}</div>
          </div>
        </div>

        {/* Familien-Übersicht (transparent) */}
        <div className="border-t pt-3 mb-3">
          <div className="text-xs font-semibold text-slate-600 mb-2">Familien-Übersicht (Rückmeldungen)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="bg-slate-50 rounded px-3 py-2">
              <div className="font-bold text-slate-800">{bilanz.verifizierteAnmeldungen}</div>
              <div className="text-xs text-slate-500">verifizierte Anmeldungen</div>
            </div>
            <div className="bg-blue-50 rounded px-3 py-2">
              <div className="font-bold text-blue-700">{bilanz.helferPool}</div>
              <div className="text-xs text-slate-500">
                mit Helfer-Wunsch
                {bilanz.springerFamilien > 0 && (
                  <>
                    {' · '}
                    <button
                      onClick={() => setSpringerExpanded((v) => !v)}
                      className="inline-flex items-center gap-0.5 text-purple-600 hover:underline underline-offset-2"
                    >
                      davon {bilanz.springerFamilien} Springer
                      <ChevronDown size={11} className={`transition-transform ${springerExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="bg-amber-50 rounded px-3 py-2">
              <div className="font-bold text-amber-700">{bilanz.reserveNurEssen}</div>
              <div className="text-xs text-slate-500">nur Essensspende (kein Helfer)</div>
            </div>
            <div className="bg-slate-50 rounded px-3 py-2">
              <div className="font-bold text-slate-600">{bilanz.reserveLeer}</div>
              <div className="text-xs text-slate-500">leer (weder Helfer noch Essen)</div>
            </div>
          </div>

          {/* Springer-Detail */}
          {springerExpanded && springerDetails.length > 0 && (
            <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2.5">
              <div className="text-xs font-semibold text-purple-900 mb-1.5">
                Springer-Bereitschaft im Detail
              </div>
              <ul className="text-sm space-y-1">
                {springerDetails.map((s) => {
                  const zfLabel = s.springerZeitfenster === 'vormittag'
                    ? 'vormittags'
                    : s.springerZeitfenster === 'nachmittag'
                      ? 'nachmittags'
                      : s.springerZeitfenster === 'beides'
                        ? 'ganztägig'
                        : s.springerZeitfenster;
                  return (
                    <li key={s.kindId} className="flex flex-wrap gap-x-2 items-center">
                      <span className="font-medium text-slate-800">{s.name}</span>
                      {s.klasse && <span className="text-slate-400 text-xs">({s.klasse})</span>}
                      <span className="text-xs text-slate-500">Springer {zfLabel}</span>
                      <span className="text-slate-400">→</span>
                      {s.status === 'via_springer' && (
                        <span className="inline-flex items-center gap-1">
                          <span className="bg-purple-200 text-purple-800 text-xs font-semibold px-1.5 py-0.5 rounded">als Springer</span>
                          <span className="text-slate-700">{s.aufgabe}</span>
                        </span>
                      )}
                      {s.status === 'regulaer' && (
                        <span className="inline-flex items-center gap-1">
                          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-1.5 py-0.5 rounded">über Wunsch</span>
                          <span className="text-slate-700">{s.aufgabe}</span>
                        </span>
                      )}
                      {s.status === 'wartend' && (
                        <span className="text-red-600 text-xs font-semibold">noch keine Zuteilung</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-purple-800 mt-2 leading-snug">
                <strong>Hinweis:</strong> Familien, die Springer-Bereitschaft <em>und</em> einen konkreten Wunsch angegeben haben, werden bevorzugt auf den Wunsch zugeteilt. Im Springer-Pool landen nur die ohne erfüllten Wunsch.
              </p>
            </div>
          )}
        </div>

        {/* Deckungsplan */}
        {bilanz.luecken > 0 ? (
          <div className="border-t pt-3">
            <div className="text-xs font-semibold text-slate-600 mb-2">So können die {bilanz.luecken} offenen Plätze gedeckt werden:</div>
            <ul className="text-sm space-y-1.5">
              {bilanz.wartendeFamilien > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">→</span>
                  <div className="flex-1">
                    <button
                      onClick={() => setWartendeExpanded((v) => !v)}
                      className="text-left inline-flex items-center gap-1 hover:underline underline-offset-2"
                    >
                      <strong>{bilanz.wartendeFamilien}</strong> wartende {bilanz.wartendeFamilien === 1 ? 'Familie' : 'Familien'} aus dem Helfer-Pool manuell zuweisen
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${wartendeExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <span className="text-slate-500"> (haben sich gemeldet, Wunsch-Aufgabe war voll)</span>
                    {wartendeExpanded && (
                      <ul className="mt-1.5 pl-2 space-y-0.5 text-sm text-slate-700">
                        {wartendeFamilienListe.map((w) => (
                          <li key={w.kindId} className="flex flex-wrap gap-x-2">
                            <span className="font-medium">{w.name}</span>
                            {w.klasse && <span className="text-slate-400">({w.klasse})</span>}
                            <span className="text-slate-500">
                              — Wunsch: {w.wuensche.length > 0 ? w.wuensche.join(', ') : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              )}
              {bilanz.defizitNachVollerAuslastung > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold mt-0.5">⚠</span>
                  <span>
                    <strong className="text-red-700">{bilanz.defizitNachVollerAuslastung} Plätze</strong> fehlen selbst bei voller Auslastung des Helfer-Pools (jede Familie übernimmt max. 1 Aufgabe).
                    <br />
                    <span className="text-slate-600">Optionen:</span>
                    <ul className="list-disc list-inside ml-2 text-slate-600 text-xs mt-0.5">
                      {bilanz.reserveNurEssen + bilanz.reserveLeer > 0 && (
                        <li>
                          {bilanz.reserveNurEssen + bilanz.reserveLeer} Familien ohne Helfer-Wunsch nachträglich ansprechen
                          {' '}({bilanz.reserveNurEssen} nur Essen, {bilanz.reserveLeer} leer)
                        </li>
                      )}
                      <li>Externe Helfer hinzufügen</li>
                      <li>Mehrfach-Zuteilung bei einzelnen Familien als Ausnahme</li>
                      <li>Bedarf reduzieren</li>
                    </ul>
                  </span>
                </li>
              )}
              {bilanz.defizitNachVollerAuslastung === 0 && bilanz.wartendeFamilien === 0 && (
                <li className="flex items-start gap-2 text-amber-700">
                  <Info size={14} className="mt-1 shrink-0" />
                  <span>Alle wartenden Familien zugeteilt — aber {bilanz.luecken} {bilanz.luecken === 1 ? 'Aufgabe' : 'Aufgaben'} hat noch freie Plätze. Externe Helfer oder Bedarf-Anpassung nötig.</span>
                </li>
              )}
            </ul>
          </div>
        ) : (
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 size={14} />
              <span>Alle Aufgaben sind vollständig besetzt.</span>
            </div>
          </div>
        )}
      </div>

      {/* Mehrfach-Zuteilungen */}
      {mehrfachZugeteilte.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-900 text-sm">
                {mehrfachZugeteilte.length} {mehrfachZugeteilte.length === 1 ? 'Familie' : 'Familien'} mit mehreren Aufgaben
              </div>
              <p className="text-xs text-amber-800 mt-1 mb-2">
                Doppel-Zuteilungen sollten die Ausnahme bleiben. Bitte prüfen, ob eine der Aufgaben entfernt werden kann.
              </p>
              <ul className="text-sm text-amber-900 space-y-0.5">
                {mehrfachZugeteilte.map((m) => (
                  <li key={m.kindId}>
                    <span className="font-medium">{m.name}</span>
                    {m.klasse && <span className="text-amber-700"> ({m.klasse})</span>}
                    <span className="text-amber-700"> — {m.aufgabenTitel.join(' + ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Unerfüllte Wünsche */}
      {nichtZugewiesen.length > 0 && (
        <div className="rounded-xl border border-orange-300 bg-orange-50 p-4">
          <button
            onClick={() => setNichtZugewiesenCollapsed(v => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <AlertTriangle size={18} className="text-orange-500 shrink-0" />
            <span className="font-semibold text-orange-800 text-sm leading-tight flex-1">
              {nichtZugewiesen.length} {nichtZugewiesen.length === 1 ? 'Wunsch' : 'Wünsche'} nicht erfüllt
            </span>
            <ChevronDown
              size={16}
              className={`text-orange-500 transition-transform ${nichtZugewiesenCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
          {!nichtZugewiesenCollapsed && (<>
          <p className="text-xs text-orange-700 mt-3 mb-3">
            Diese Kinder haben entweder keine Zuteilung erhalten oder wurden einer anderen als der gewünschten Aufgabe zugeteilt. Bitte manuell entscheiden.
          </p>
          <div className="space-y-2">
            {nichtZugewiesen.map(r => {
              const name = r.kind
                ? `${r.kind.nachname}, ${r.kind.vorname}`
                : 'Unbekannt';
              const klasse = r.kind?.klasse;

              const isPickerOpen = pickerRueckmeldungId === r.id;

              return (
                <div key={r.id} className="bg-white rounded-lg border border-orange-200 px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => setDetailModal({ mode: 'wunsch', r })}
                        className="text-left hover:text-blue-700 transition-colors inline-flex items-center gap-1.5"
                        title="Details der Familie anzeigen"
                      >
                        <span className="font-medium text-sm text-slate-800">{name}</span>
                        {klasse && <span className="text-xs text-slate-400">({klasse})</span>}
                        <Info size={12} className="text-slate-300" />
                      </button>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          Wunsch: {r.ist_springer ? 'Springer' : r.aufgabe_titel}
                        </span>
                        {r.zeitfenster && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {formatZeitfenster(r.zeitfenster as any)}
                          </span>
                        )}
                        {r.zugewiesen_zu ? (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            → {r.zugewiesen_zu}
                          </span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            nicht zugeteilt
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (isPickerOpen) {
                          setPickerRueckmeldungId(null);
                        } else {
                          setPickerRueckmeldungId(r.id);
                          setPickerAufgabeId(r.aufgabe_id || aufgaben[0]?.id || '');
                        }
                      }}
                      className="shrink-0 text-xs font-medium text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Manuell zuteilen
                    </button>
                  </div>

                  {/* Aufgaben-Picker */}
                  {isPickerOpen && (
                    <div className="flex items-center gap-2 pt-1 border-t border-orange-100">
                      <select
                        value={pickerAufgabeId}
                        onChange={e => setPickerAufgabeId(e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-orange-300"
                      >
                        {aufgaben.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.titel} ({formatZeitfenster(a.zeitfenster as any)})
                            {a.id === r.aufgabe_id ? ' ★' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleManuellZuweisen(r, pickerAufgabeId)}
                        disabled={!pickerAufgabeId || isSaving}
                        className="text-xs font-medium text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 size={12} className="animate-spin inline" /> : 'Zuteilen'}
                      </button>
                      <button
                        onClick={() => setPickerRueckmeldungId(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </>)}
        </div>
      )}

      {aufgaben.map(aufgabe => {
        const deckungsgrad = aufgabe.zuteilungen.length;
        const lücke = aufgabe.bedarf - deckungsgrad;
        const isOk = lücke <= 0;
        const wuenscheForAufgabe = nichtZugewiesen.filter(r => r.aufgabe_id === aufgabe.id);

        return (
          <div
            key={aufgabe.id}
            className={`rounded-xl border p-4 ${isOk ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
          >
            {/* Aufgabe Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  {isOk
                    ? <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                    : <AlertTriangle size={20} className="text-red-500 shrink-0" />
                  }
                  <span className={`font-semibold text-base leading-tight ${isOk ? 'text-green-800' : 'text-red-800'}`}>{aufgabe.titel}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 ml-6">
                  {formatZeitfenster(aufgabe.zeitfenster as any)} · {deckungsgrad}/{aufgabe.bedarf} Helfer
                  {!isOk && <span className="text-red-600 font-medium"> · {lücke} Plätze offen</span>}
                </div>
              </div>
              <button
                onClick={() => {
                  if (addingTo === aufgabe.id) {
                    setAddingTo(null);
                  } else {
                    setAddingTo(aufgabe.id);
                    setAddMode(wuenscheForAufgabe.length > 0 ? 'wuensche' : 'kind');
                  }
                }}
                className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition-colors"
              >
                <Plus size={13} />
                Hinzufügen
              </button>
            </div>

            {/* Helfer-Liste */}
            {aufgabe.zuteilungen.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {aufgabe.zuteilungen.map(z => {
                  const name = z.kind
                    ? `${z.kind.vorname} ${z.kind.nachname}`
                    : z.externe_helfer?.name || 'Ext.';
                  const klasse = z.kind?.klasse;

                  const wuensche = z.kind_id ? (wuenscheByKind[z.kind_id] || []) : [];
                  const tooltipLines: string[] = [];
                  if (wuensche.length === 0 && !z.externe_helfer) {
                    tooltipLines.push('Kein Wunsch erfasst');
                  } else {
                    for (const w of wuensche) {
                      if (w.ist_springer) {
                        tooltipLines.push(`Springer (${formatZeitfenster(w.zeitfenster as any)})`);
                      } else if (w.aufgabe_titel) {
                        const istDieseAufgabe = w.aufgabe_titel === aufgabe.titel;
                        tooltipLines.push(istDieseAufgabe ? `Wunsch: ${w.aufgabe_titel} ✓` : `Wunsch: ${w.aufgabe_titel}`);
                      }
                    }
                  }
                  const tooltip = tooltipLines.join(' · ');

                  const anzahlAufgaben = z.kind_id ? (aufgabenProKind.get(z.kind_id) || 1) : 1;
                  const hatMehrere = anzahlAufgaben > 1;

                  return (
                    <div key={z.id} className="relative">
                      <div
                        className={`flex items-center gap-1.5 rounded-full pl-3 pr-1 py-1 text-sm bg-white border ${hatMehrere ? 'border-amber-300 bg-amber-50' : z.manuell ? 'border-orange-200' : 'border-slate-200'}`}
                      >
                        <button
                          onClick={() => setDetailModal({ mode: 'zuteilung', z, aufgabeTitel: aufgabe.titel })}
                          className="inline-flex items-center gap-1.5 hover:text-blue-700 transition-colors"
                          title="Details anzeigen"
                        >
                          <span className="font-medium">{name}</span>
                          {klasse && <span className="text-slate-400 text-xs">({klasse})</span>}
                          <Info size={12} className="text-slate-300" />
                        </button>
                        {hatMehrere && (
                          <span
                            className="bg-amber-200 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded"
                            title={`Diese Familie hat ${anzahlAufgaben} Aufgaben zugeteilt`}
                          >
                            {anzahlAufgaben}×
                          </span>
                        )}
                        {z.via_springer && <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-1.5 py-0.5 rounded">S</span>}
                        {z.manuell && <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-1.5 py-0.5 rounded">M</span>}
                        <button
                          onClick={() => handleRemoveZuteilung(z.id)}
                          className="ml-0.5 text-slate-300 hover:text-red-500 transition-colors px-0.5"
                          title="Entfernen"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      {tooltip && (
                        <span className="sr-only">{tooltip}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic mb-3">Keine Helfer zugeteilt</p>
            )}

            {/* Hinzufügen-Panel */}
            {addingTo === aufgabe.id && (
              <div className="bg-white rounded-lg border p-3 mt-2 space-y-3">
                {/* Tab-Auswahl */}
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                  {wuenscheForAufgabe.length > 0 && (
                    <button
                      onClick={() => setAddMode('wuensche')}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${addMode === 'wuensche' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                    >
                      Wünsche ({wuenscheForAufgabe.length})
                    </button>
                  )}
                  <button
                    onClick={() => setAddMode('kind')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${addMode === 'kind' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                  >
                    Kind suchen
                  </button>
                  <button
                    onClick={() => setAddMode('extern')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${addMode === 'extern' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                  >
                    Extern
                  </button>
                </div>

                {addMode === 'wuensche' ? (
                  <div className="space-y-1">
                    {wuenscheForAufgabe.length === 0 ? (
                      <p className="text-xs text-slate-400">Keine unerfüllten Wünsche für diese Aufgabe.</p>
                    ) : (
                      wuenscheForAufgabe.map(r => {
                        const name = r.kind
                          ? `${r.kind.nachname}, ${r.kind.vorname}`
                          : 'Unbekannt';
                        return (
                          <button
                            key={r.id}
                            onClick={() => handleManuellZuweisen(r)}
                            disabled={isSaving || !r.kind_id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 border border-orange-100 rounded-lg flex items-center justify-between transition-colors disabled:opacity-50"
                          >
                            <span className="font-medium">{name}</span>
                            {r.kind?.klasse && <span className="text-xs text-slate-400">{r.kind.klasse}</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : addMode === 'kind' ? (
                  <div>
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Name eingeben..."
                        value={suchtext}
                        onChange={e => setSuchtext(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                    {kinderLoading && (
                      <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" /> Suche...
                      </div>
                    )}
                    {kinder.length > 0 && (
                      <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                        {kinder.map(k => (
                          <button
                            key={k.id}
                            onClick={() => handleAddKind(aufgabe.id, k)}
                            disabled={isSaving}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span>{k.nachname}, {k.vorname}</span>
                            {k.klasse && <span className="text-xs text-slate-400">{k.klasse}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Name des externen Helfers"
                      value={externerName}
                      onChange={e => setExternerName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                      onKeyDown={e => e.key === 'Enter' && handleAddExtern(aufgabe.id)}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddExtern(aufgabe.id)}
                      disabled={!externerName.trim() || isSaving}
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    </Button>
                  </div>
                )}

                <button
                  onClick={() => { setAddingTo(null); setSuchtext(''); setKinder([]); setExternerName(''); }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>
        );
      })}

      <p className="text-xs text-slate-400 flex items-center gap-2">
        <span className="bg-purple-100 text-purple-700 font-semibold px-1.5 py-0.5 rounded">S</span> = via Springer
        <span className="bg-orange-100 text-orange-700 font-semibold px-1.5 py-0.5 rounded">M</span> = manuell hinzugefügt
        · Klick auf Helfer-Name öffnet Detail-Ansicht
      </p>

      {detailModal && (
        <DetailModal
          data={detailModal}
          detail={
            detailModal.mode === 'zuteilung'
              ? (detailModal.z.kind_id ? detailsByKindId[detailModal.z.kind_id] : undefined)
              : (detailModal.r.kind_id ? detailsByKindId[detailModal.r.kind_id] : undefined)
          }
          onClose={() => setDetailModal(null)}
        />
      )}
    </div>
  );
}

function DetailModal({
  data,
  detail,
  onClose,
}: {
  data:
    | { mode: 'zuteilung'; z: Zuteilung; aufgabeTitel: string }
    | { mode: 'wunsch'; r: NichtZugewiesenerWunsch };
  detail: KindDetail | undefined;
  onClose: () => void;
}) {
  // Name + Klasse je nach Modus
  const name = data.mode === 'zuteilung'
    ? (data.z.kind ? `${data.z.kind.vorname} ${data.z.kind.nachname}` : data.z.externe_helfer?.name || 'Externer Helfer')
    : (data.r.kind ? `${data.r.kind.vorname} ${data.r.kind.nachname}` : 'Unbekannt');
  const klasse = data.mode === 'zuteilung' ? data.z.kind?.klasse : data.r.kind?.klasse;
  const zugewieseneAufgabe = data.mode === 'zuteilung' ? data.aufgabeTitel : null;

  // Status-Badges
  const statusBadges: { label: string; classes: string }[] = [];
  if (data.mode === 'zuteilung') {
    const z = data.z;
    if (z.externer_helfer_id) {
      statusBadges.push({ label: 'Externer Helfer', classes: 'bg-slate-100 text-slate-700' });
    } else if (z.manuell) {
      statusBadges.push({ label: 'Manuell zugewiesen', classes: 'bg-orange-100 text-orange-800' });
    }
    if (z.via_springer) {
      statusBadges.push({ label: 'Aus Springer-Pool', classes: 'bg-purple-100 text-purple-700' });
    }
    const wunschErfuellt = detail?.helferWuensche.some((w) => w.aufgabe_titel === zugewieseneAufgabe) ?? false;
    if (!z.externer_helfer_id && !z.manuell && !z.via_springer) {
      if (wunschErfuellt) {
        statusBadges.push({ label: 'Wunsch erfüllt', classes: 'bg-green-100 text-green-800' });
      } else if (detail?.istSpringer) {
        statusBadges.push({ label: 'Springer-Einsatz', classes: 'bg-purple-100 text-purple-700' });
      } else {
        statusBadges.push({ label: 'Anders zugeteilt', classes: 'bg-amber-100 text-amber-800' });
      }
    }
  } else {
    // Modus wunsch — Status zeigt, was mit der Familie passiert ist
    if (data.r.zugewiesen_zu) {
      statusBadges.push({ label: 'Anders zugeteilt', classes: 'bg-amber-100 text-amber-800' });
    } else {
      statusBadges.push({ label: 'Nicht zugeteilt', classes: 'bg-red-100 text-red-700' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">{name}{klasse ? <span className="text-slate-400 font-normal"> · Klasse {klasse}</span> : null}</h3>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {statusBadges.map((b, i) => (
                <span key={i} className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${b.classes}`}>{b.label}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>

        <div className="px-5 py-4 space-y-4 text-sm">
          {data.mode === 'zuteilung' && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Zugewiesene Aufgabe</div>
              <div className="font-medium text-slate-800">
                {zugewieseneAufgabe}
                {data.z.zeitfenster && <span className="text-slate-500 font-normal"> · {formatZeitfenster(data.z.zeitfenster as any)}</span>}
              </div>
            </div>
          )}

          {data.mode === 'wunsch' && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Dieser konkrete Wunsch</div>
              <div className="font-medium text-slate-800">
                {data.r.ist_springer ? 'Springer' : data.r.aufgabe_titel}
                {data.r.zeitfenster && <span className="text-slate-500 font-normal"> · {formatZeitfenster(data.r.zeitfenster as any)}</span>}
              </div>
              {data.r.zugewiesen_zu && (
                <div className="text-xs text-slate-500 mt-1">
                  Aktuelle Zuteilung der Familie: <strong>{data.r.zugewiesen_zu}</strong>
                </div>
              )}
            </div>
          )}

          {!detail && data.mode === 'zuteilung' && !data.z.externer_helfer_id && (
            <p className="text-slate-500 italic">Keine Anmeldungs-Details gefunden — vermutlich manuell zugeordnetes Kind ohne passende Anmeldung.</p>
          )}

          {detail && (
            <>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Helfer-Wünsche der Familie</div>
                {detail.helferWuensche.length === 0 && !detail.istSpringer ? (
                  <p className="text-slate-400 italic">Keine Helfer-Aufgaben gewünscht</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.istSpringer && (
                      <li className="flex items-center gap-2">
                        <span className="text-purple-600">★</span>
                        <span>Springer-Modus ({detail.springerZeitfenster || 'beides'})</span>
                      </li>
                    )}
                    {detail.helferWuensche.map((w, i) => {
                      // ✓ grün NUR dann, wenn dieser Wunsch tatsächlich zugeteilt wurde.
                      // - 'zuteilung'-Modus: ja, wenn w.aufgabe_titel der zugewiesenen Aufgabe entspricht
                      // - 'wunsch'-Modus: ja, wenn die Familie auf diese Aufgabe zugeteilt wurde (zugewiesen_zu)
                      const istZugeteilt = data.mode === 'zuteilung'
                        ? w.aufgabe_titel === zugewieseneAufgabe
                        : data.r.zugewiesen_zu === w.aufgabe_titel;
                      // Kreis-Markierung nur für die Listen-Zeile selbst (Kontext-Info, kein "zugeteilt")
                      const istBetrachteterWunsch = data.mode === 'wunsch' && !istZugeteilt && w.aufgabe_titel === data.r.aufgabe_titel;
                      return (
                        <li key={i} className="flex items-center gap-2">
                          {istZugeteilt
                            ? <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                            : istBetrachteterWunsch
                              ? <span className="w-3.5 h-3.5 rounded-full bg-amber-100 border border-amber-300 shrink-0" />
                              : <span className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0" />}
                          <span className={istZugeteilt ? 'font-medium text-slate-800' : 'text-slate-600'}>
                            {w.aufgabe_titel}
                            {istZugeteilt && <span className="text-xs text-green-700 ml-1">— zugewiesen</span>}
                            {istBetrachteterWunsch && <span className="text-xs text-amber-700 ml-1">— dieser Wunsch (nicht erfüllt)</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Essensspenden</div>
                {detail.essensspenden.length === 0 ? (
                  <p className="text-slate-400 italic">Keine</p>
                ) : (
                  <ul className="space-y-0.5">
                    {detail.essensspenden.map((e, i) => (
                      <li key={i} className="text-slate-700">{e.menge}× {e.titel}</li>
                    ))}
                  </ul>
                )}
              </div>

              {detail.kommentar && detail.kommentar.trim().length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Anmerkung der Eltern</div>
                  <div className="text-slate-700 whitespace-pre-wrap bg-amber-50 border border-amber-100 rounded p-2">{detail.kommentar}</div>
                </div>
              )}

              {detail.geschwister.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Geschwister in dieser Anmeldung</div>
                  <ul className="space-y-0.5">
                    {detail.geschwister.map((g, i) => (
                      <li key={i} className="text-slate-700">{g.vorname} {g.nachname} (Klasse {g.klasse || '–'})</li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.elternEmail && (
                <div className="text-xs text-slate-400 pt-1 border-t border-slate-100">
                  {detail.elternEmail}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
