'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Database } from '@/lib/database.types'; // Korrekter Import der Datenbanktypen
import { KindAuswahl, SpielAuswahl, ErgebnisErfassung } from './ErfassungsSchritte';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClientErfassungProps {
  spielgruppe: Database['public']['Tables']['spielgruppen']['Row'];
  kinder: Database['public']['Tables']['kinder']['Row'][];
}

type Schritt = 'spiel' | 'kind' | 'ergebnis';

export default function ClientErfassung({
  spielgruppe,
  kinder: initialKinder,
}: ClientErfassungProps) {
  // ALLE STATES ZUERST!
  const [refreshKey, setRefreshKey] = useState(0);
  const [schritt, setSchritt] = React.useState<Schritt>('spiel');
  // Erweitere den Spieltyp um die Status-Eigenschaften
  type SpielMitStatus = Database['public']['Tables']['spiele']['Row'] & {
    status?: 'offen' | 'abgeschlossen';
    abgeschlossen_am?: string | null;
    abgeschlossen_von_gruppe_id?: string | null;
  };
  
  const [spiele, setSpiele] = useState<SpielMitStatus[]>([]);
  const [kinder, setKinder] = useState<Database['public']['Tables']['kinder']['Row'][]>(initialKinder);
  const [ausgewaehltesSpiel, setAusgewaehltesSpiel] = useState<SpielMitStatus | null>(null);
  const [ausgewaehltesKind, setAusgewaehltesKind] = React.useState<Database['public']['Tables']['kinder']['Row'] | null>(null);
  const [vorhandeneErgebnisse, setVorhandeneErgebnisse] = React.useState<Map<string, number>>(new Map());
  const [ergebnisCounts, setErgebnisCounts] = useState<Map<string, number>>(new Map());
  const [loadingSpiele, setLoadingSpiele] = React.useState<boolean>(true);
  const [loadingErgebnisse, setLoadingErgebnisse] = React.useState<boolean>(false);
  const [editingKindId, setEditingKindId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState<string>('');
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Offline-/Verbindungs-State
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [queueLen, setQueueLen] = useState(0);
  const [flushing, setFlushing] = useState(false);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabase = createClient();

  // ----- Offline-Queue -----
  type QueueItem =
    | { id: string; type: 'ergebnis'; payload: { spielId: string; kindId: string; wert: number }; createdAt: number; attempts: number }
    | { id: string; type: 'spielAbschliessen'; payload: { spielId: string }; createdAt: number; attempts: number };

  const queueKey = `leiter_save_queue_${spielgruppe.id}`;
  const readQueue = useCallback((): QueueItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(queueKey) || '[]');
    } catch {
      return [];
    }
  }, [queueKey]);
  const writeQueue = useCallback(
    (items: QueueItem[]) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(queueKey, JSON.stringify(items));
      setQueueLen(items.length);
    },
    [queueKey],
  );

  const callApi = useCallback(async (item: QueueItem): Promise<void> => {
    const url = item.type === 'ergebnis' ? '/api/leiter/ergebnis' : '/api/leiter/spiel-status';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err: any = new Error(data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
  }, []);

  const flushQueue = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    let items = readQueue();
    if (items.length === 0) return;
    setFlushing(true);
    try {
      for (const item of [...items]) {
        try {
          await callApi(item);
          items = items.filter((q) => q.id !== item.id);
          writeQueue(items);
        } catch (e: any) {
          // Bei 4xx (Validierungsfehler): aus Queue raus, sonst läuft das ewig
          if (e?.status && e.status >= 400 && e.status < 500) {
            items = items.filter((q) => q.id !== item.id);
            writeQueue(items);
            toast.error(`Eintrag verworfen: ${e.message}`);
          } else {
            // Netz/Server-Fehler → in Queue lassen, später nochmal
            item.attempts++;
            writeQueue(items);
            break;
          }
        }
      }
    } finally {
      setFlushing(false);
      // Reload Ergebnis-Counts wenn Queue leer ist (UI synchron halten)
      if (items.length === 0) setRefreshKey((r) => r + 1);
    }
  }, [callApi, readQueue, writeQueue]);

  const enqueue = useCallback(
    (item: Omit<QueueItem, 'id' | 'createdAt' | 'attempts'>) => {
      const items = readQueue();
      const full: QueueItem = {
        ...(item as any),
        id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}-${Math.random()}`),
        createdAt: Date.now(),
        attempts: 0,
      };
      items.push(full);
      writeQueue(items);
    },
    [readQueue, writeQueue],
  );

  // Connectivity-Listener
  useEffect(() => {
    setQueueLen(readQueue().length);
    const onOnline = () => {
      setIsOnline(true);
      flushQueue();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    // Initial Flush versuchen, falls Queue beim Start nicht leer ist
    if (navigator.onLine) flushQueue();
    // Periodisch erneut versuchen (z. B. nach kurzen Verbindungs-Aussetzern, die kein offline-Event auslösen)
    const interval = setInterval(() => {
      if (navigator.onLine && readQueue().length > 0) flushQueue();
    }, 15000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, [flushQueue, readQueue]);

  // Save mit Online-Versuch + Fallback in Queue
  const saveErgebnis = useCallback(
    async (payload: { spielId: string; kindId: string; wert: number }): Promise<{ ok: boolean; queued?: boolean; error?: string }> => {
      const item: QueueItem = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}`),
        type: 'ergebnis',
        payload,
        createdAt: Date.now(),
        attempts: 0,
      };
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueue({ type: 'ergebnis', payload });
        return { ok: true, queued: true };
      }
      try {
        await callApi(item);
        return { ok: true };
      } catch (e: any) {
        if (e?.status && e.status >= 400 && e.status < 500) {
          return { ok: false, error: e.message };
        }
        enqueue({ type: 'ergebnis', payload });
        return { ok: true, queued: true };
      }
    },
    [callApi, enqueue],
  );

  const saveSpielAbschliessen = useCallback(
    async (payload: { spielId: string }): Promise<{ ok: boolean; queued?: boolean; error?: string }> => {
      const item: QueueItem = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}`),
        type: 'spielAbschliessen',
        payload,
        createdAt: Date.now(),
        attempts: 0,
      };
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueue({ type: 'spielAbschliessen', payload });
        return { ok: true, queued: true };
      }
      try {
        await callApi(item);
        return { ok: true };
      } catch (e: any) {
        if (e?.status && e.status >= 400 && e.status < 500) {
          return { ok: false, error: e.message };
        }
        enqueue({ type: 'spielAbschliessen', payload });
        return { ok: true, queued: true };
      }
    },
    [callApi, enqueue],
  );

  // Lade die Spiele und setze die Leiter-Gruppe in der Datenbank-Session
  React.useEffect(() => {
    const init = async () => {
      // Zuerst die Leiter-Gruppe setzen
      await supabase.rpc('set_leiter_gruppe', {
        gruppe: spielgruppe.name
      });

      // Zuerst die Klasse der Spielgruppe ermitteln
      // Wir nehmen die Klasse des ersten Kindes in der Gruppe, da alle Kinder in einer Gruppe
      // aus der gleichen Klasse kommen sollten
      let klasseId = null;
      
      // Prüfen, ob die Kinder eine klasse_id haben
      if (kinder.length > 0 && 'klasse_id' in kinder[0] && kinder[0].klasse_id) {
        klasseId = kinder[0].klasse_id;
      } else {
        // Wenn kein Kind eine Klasse hat, versuchen wir die Klasse aus dem Namen der Spielgruppe zu ermitteln
        // Spielgruppenname hat oft das Format "[Klassenname]-[Nummer]", z.B. "1a-1"
        const klassenMatch = spielgruppe.name.match(/^([^-]+)-\d+$/);
        if (klassenMatch && klassenMatch[1]) {
          const klassenName = klassenMatch[1];
          
          // Suche die Klasse mit diesem Namen
          const { data: klassenData, error: klassenError } = await supabase
            .from('klassen')
            .select('id')
            .eq('name', klassenName)
            .eq('event_id', spielgruppe.event_id)
            .single();
            
          if (!klassenError && klassenData) {
            klasseId = klassenData.id;
          }
        }
      }
      
      let rawData;
      let error;
      
      // Wenn wir eine Klasse gefunden haben, laden wir nur die Spiele, die dieser Klasse zugewiesen wurden
      if (klasseId) {
        console.log(`Lade Spiele für Klasse mit ID ${klasseId}`);
        
        // Zuerst die Spiel-IDs für diese Klasse abrufen
        const { data: spielZuordnungen, error: zuordnungError } = await supabase
          .from('klasse_spiele')
          .select('spiel_id')
          .eq('klasse_id', klasseId);
          
        if (zuordnungError) {
          console.error('Fehler beim Laden der Spielzuordnungen:', zuordnungError);
          error = zuordnungError;
        } else if (spielZuordnungen && spielZuordnungen.length > 0) {
          // Extrahiere die Spiel-IDs aus den Zuordnungen
          const spielIds = spielZuordnungen.map(z => z.spiel_id);
          
          // Lade die Spiele mit diesen IDs
          const { data: spieleData, error: spieleError } = await supabase
            .from('spiele')
            .select('*')
            .in('id', spielIds)
            .order('name');
            
          rawData = spieleData;
          error = spieleError;
        } else {
          console.log('Keine Spielzuordnungen für diese Klasse gefunden');
          rawData = [];
        }
      } else {
        // Fallback: Wenn keine Klasse gefunden wurde, laden wir alle Spiele des Events
        console.log('Keine Klasse gefunden, lade alle Spiele des Events');
        const result = await supabase
          .from('spiele')
          .select('*')
          .order('name');
          
        rawData = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Fehler beim Laden der Spiele:', error);
        toast.error('Fehler beim Laden der Spiele');
        return;
      }

      if (!rawData) return;

      // Lade den Status für jedes Spiel für diese Gruppe
      const statusMap = new Map<string, { status: 'offen' | 'abgeschlossen', abgeschlossen_am: string | null }>();
      
      // Hole alle Spielstatus-Einträge für diese Gruppe
      const { data: statusData, error: statusError } = await supabase
        .from('spielgruppe_spiel_status')
        .select('*')
        .eq('spielgruppe_id', spielgruppe.id)
        .eq('event_id', spielgruppe.event_id);
      
      if (statusError) {
        console.error('Fehler beim Laden der Spielstatus:', statusError);
      } else if (statusData) {
        // Fülle die Status-Map
        statusData.forEach(status => {
          statusMap.set(status.spiel_id, {
            status: 'abgeschlossen',
            abgeschlossen_am: status.abgeschlossen_am
          });
        });
      }

      // Konvertiere die Daten und bestimme den effektiven Status für DIESE Gruppe
      const data = rawData ? rawData.map(spiel => {
        // Status aus der Map holen oder 'offen' als Standard
        const spielStatus = statusMap.get(spiel.id) || { status: 'offen', abgeschlossen_am: null };
        
        return {
          ...spiel,
          status: spielStatus.status,
          abgeschlossen_am: spielStatus.abgeschlossen_am,
          abgeschlossen_von_gruppe_id: spielStatus.status === 'abgeschlossen' ? spielgruppe.id : null
        } as SpielMitStatus;
      }) : [];

      setSpiele(data);

      // Lade Ergebnisanzahl für jedes Spiel
      const counts = new Map<string, number>();
      for (const spiel of data) {
        const { count, error: countError } = await supabase
          .from('ergebnisse')
          .select('*', { count: 'exact', head: true }) // Nur die Anzahl abfragen
          .eq('spiel_id', spiel.id)
          .eq('spielgruppe_id', spielgruppe.id);
        
        if (countError) {
           console.warn(`Fehler beim Zählen der Ergebnisse für Spiel ${spiel.id}:`, countError);
        } else {
            counts.set(spiel.id, count ?? 0);
        }
      }
      setErgebnisCounts(counts);
      setLoadingSpiele(false);
    };

    init();
  }, [spielgruppe.name, spielgruppe.id, spielgruppe.event_id, supabase, refreshKey]);


  // Lade vorhandene Ergebnisse, wenn ein Spiel ausgewählt ist
  React.useEffect(() => {
    if (schritt === 'kind' && ausgewaehltesSpiel) {
      const fetchErgebnisse = async () => {
        setLoadingErgebnisse(true);
        const { data, error } = await supabase
          .from('ergebnisse')
          .select('kind_id, wert_numeric, erfasst_am')
          .eq('spiel_id', ausgewaehltesSpiel.id)
          .eq('spielgruppe_id', spielgruppe.id)
          .eq('event_id', spielgruppe.event_id);

        if (error) {
          console.error('Fehler beim Laden der vorhandenen Ergebnisse:', error);
          toast.error('Konnte vorhandene Ergebnisse nicht laden.');
          setVorhandeneErgebnisse(new Map());
        } else if (data) {
          const ergebnisMap = new Map<string, number>();
          data.forEach(e => {
            ergebnisMap.set(e.kind_id, e.wert_numeric);
          });
          console.log('Geladene Ergebnisse für Detailansicht:', data);
          console.log('Erstellte Ergebnis-Map:', ergebnisMap);
          console.log('Ergebnis-Map Größe:', ergebnisMap.size);
          setVorhandeneErgebnisse(ergebnisMap);
        }
        setLoadingErgebnisse(false);
      };
      fetchErgebnisse();
    } else {
      // Zurücksetzen, wenn kein Spiel ausgewählt ist oder anderer Schritt
      setVorhandeneErgebnisse(new Map());
    }
  }, [schritt, ausgewaehltesSpiel, supabase, spielgruppe.id, spielgruppe.event_id]);

  // Spiele für die Auswahl vorbereiten und sortieren (offene zuerst)
  const spieleOptions = useMemo(() => {
    return spiele
      .filter((spiel) => spiel.status !== 'abgeschlossen')
      .map((spiel) => ({
        value: spiel.id,
        label: spiel.name,
        status: spiel.status,
        abgeschlossen_am: spiel.abgeschlossen_am
      }));
  }, [spiele]);

  const handleSpielSelected = (spiel: Database['public']['Tables']['spiele']['Row']) => {
    setAusgewaehltesSpiel(spiel);
    setSchritt('kind');
    // Reset wird durch useEffect beim Laden der Ergebnisse handled
  };

  const handleKindSelected = (kind: Database['public']['Tables']['kinder']['Row']) => {
    setAusgewaehltesKind(kind);
    setSchritt('ergebnis');
  };

  const handleBack = () => {
    if (schritt === 'ergebnis') {
      setSchritt('kind');
      setAusgewaehltesKind(null);
    } else if (schritt === 'kind') {
      setSchritt('spiel');
      setAusgewaehltesSpiel(null);
    }
  };

  const handleNeuesSpiel = () => {
    setAusgewaehltesSpiel(null);
    setAusgewaehltesKind(null);
    setVorhandeneErgebnisse(new Map());
    setSchritt('spiel');
  };

  const handleErgebnisseAnzeigen = async (spiel: Database['public']['Tables']['spiele']['Row']) => {
    console.log('handleErgebnisseAnzeigen aufgerufen für Spiel:', spiel);
    console.log('Verwendete Spielgruppe ID:', spielgruppe.id);

    // Lade die Ergebnisse für das Spiel
    const { data: ergebnisse, error } = await supabase
      .from('ergebnisse')
      .select('*')
      .eq('spiel_id', spiel.id)
      .eq('spielgruppe_id', spielgruppe.id)
      .eq('event_id', spielgruppe.event_id);

    console.log('Ergebnisse von Supabase:', ergebnisse);
    if (error) {
      console.error('Fehler beim Laden der Ergebnisse:', error);
      toast.error('Fehler beim Laden der Ergebnisse');
      return;
    }

    if (!ergebnisse || ergebnisse.length === 0) {
      console.log('Keine Ergebnisse gefunden für dieses Spiel/Gruppe.');
      // Optional: Setze Ergebnisse zurück oder zeige eine Nachricht an
      // setVorhandeneErgebnisse(new Map()); // Optional: Leere Map setzen
      // toast.info('Für dieses Spiel wurden noch keine Ergebnisse erfasst.'); // Optional: Info-Toast
      // return; // Entscheiden, ob hier abgebrochen werden soll
    }

    // Setze die Ergebnisse und zeige sie an
    const ergebnisMap = new Map(ergebnisse.map(e => [e.kind_id, e.wert_numeric]));
    console.log('Erstellte Ergebnis-Map:', ergebnisMap);
    setVorhandeneErgebnisse(ergebnisMap);
    setAusgewaehltesSpiel(spiel);
    setSchritt('kind');
    console.log('Schritt gesetzt auf "kind"');
  };

  const handleSpielAbschliessen = async () => {
    if (!ausgewaehltesSpiel) return;
    setDialogOpen(true);
  };

  const handleSpielAbschliessenConfirm = async () => {
    if (!ausgewaehltesSpiel) return;

    const aktuellesSpiel = ausgewaehltesSpiel;
    const res = await saveSpielAbschliessen({ spielId: aktuellesSpiel.id });

    if (!res.ok) {
      toast.error('Fehler beim Abschließen: ' + res.error);
      setDialogOpen(false);
      return;
    }

    setSpiele(prevSpiele =>
      prevSpiele.map(s =>
        s.id === aktuellesSpiel.id
          ? { ...s, status: 'abgeschlossen', abgeschlossen_am: new Date().toISOString() }
          : s,
      ),
    );

    if (res.queued) {
      toast.warning(`${aktuellesSpiel.name} offline abgeschlossen — wird übertragen sobald online`);
    } else {
      toast.success(`${aktuellesSpiel.name} für Gruppe ${spielgruppe.name} abgeschlossen.`);
      setRefreshKey(prev => prev + 1);
    }
    setSchritt('spiel');
    setAusgewaehltesSpiel(null);
    setVorhandeneErgebnisse(new Map());
    setDialogOpen(false);
  };

  const handleEditStart = (kindId: string, currentValue: number) => {
    setEditingKindId(kindId);
    setEditValue(currentValue.toString());
  };

  const handleEditCancel = () => {
    setEditingKindId(null);
    setEditValue('');
  };

  const handleEditSave = async (kindId: string) => {
    const numValue = parseFloat(editValue);
    if (isNaN(numValue)) {
      toast.error('Bitte gib eine gültige Zahl ein');
      return;
    }
    if (!ausgewaehltesSpiel) return;

    // Vorheriger Wert für Rollback
    const previousValue = vorhandeneErgebnisse.get(kindId);

    setVorhandeneErgebnisse(prev => {
      const next = new Map(prev);
      next.set(kindId, numValue);
      return next;
    });

    const res = await saveErgebnis({
      spielId: ausgewaehltesSpiel.id,
      kindId,
      wert: numValue,
    });

    if (!res.ok) {
      setVorhandeneErgebnisse(prev => {
        const next = new Map(prev);
        if (previousValue !== undefined) next.set(kindId, previousValue);
        else next.delete(kindId);
        return next;
      });
      toast.error('Fehler beim Speichern', { description: res.error });
      return;
    }

    if (res.queued) {
      toast.warning('Offline gespeichert — wird übertragen sobald online');
    } else {
      toast.success('Ergebnis aktualisiert');
    }
    setEditingKindId(null);
    setEditValue('');
  };

  const handleErgebnisSubmit = async (wert: number) => {
    if (!ausgewaehltesKind || !ausgewaehltesSpiel) return;

    // Optimistic Update: lokal direkt speichern, damit der Leiter sieht dass der Wert ankam
    setVorhandeneErgebnisse(prev => {
      const next = new Map(prev);
      next.set(ausgewaehltesKind.id, wert);
      return next;
    });

    const res = await saveErgebnis({
      spielId: ausgewaehltesSpiel.id,
      kindId: ausgewaehltesKind.id,
      wert,
    });

    if (!res.ok) {
      // Server-Validierung schlug fehl → Rollback
      setVorhandeneErgebnisse(prev => {
        const next = new Map(prev);
        next.delete(ausgewaehltesKind.id);
        return next;
      });
      toast.error('Fehler beim Speichern', {
        description: res.error || 'Bitte versuche es noch einmal.',
      });
      return;
    }

    if (res.queued) {
      toast.warning('Offline gespeichert', {
        description: `${ausgewaehltesKind.vorname} ${ausgewaehltesKind.nachname}: ${wert} ${ausgewaehltesSpiel.einheit || ''} — wird übertragen sobald Verbindung besteht.`,
      });
    } else {
      toast.success('Ergebnis gespeichert!', {
        description: `${ausgewaehltesKind.vorname} ${ausgewaehltesKind.nachname}: ${wert} ${ausgewaehltesSpiel.einheit || ''}`,
      });
    }
    setSchritt('kind');
    setAusgewaehltesKind(null);
  };

  // Rendere den aktuellen Schritt
  const renderSchritt = () => {
    switch (schritt) {
      case 'spiel':
        if (loadingSpiele) {
          return <div className="text-center py-8">Lade Spiele...</div>;
        }
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Spiel auswählen</h2>
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              {spiele
                .filter(spiel => spiel.status !== 'abgeschlossen')
                .map(spiel => (
                  <Card 
                    key={spiel.id} 
                    className="w-full cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSpielSelected(spiel)}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col space-y-3">
                        <h3 className="text-xl font-semibold">{spiel.name}</h3>
                        <p className="text-base text-muted-foreground">
                          {spiel.beschreibung || 'Keine Beschreibung'}
                        </p>
                        {spiel.zeitlimit_sekunden && (
                          <p className="text-sm font-medium">
                            {spiel.zeitlimit_sekunden} Sekunden Zeit. {spiel.einheit && `Pro ${spiel.einheit} 1 Punkt.`}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-base font-medium">{ergebnisCounts.get(spiel.id) || 0} Ergebnisse</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {/* Abgeschlossene Spiele */}
              {spiele.filter(spiel => spiel.status === 'abgeschlossen').length > 0 && (
                <div className="col-span-full mt-8">
                  <h3 className="text-lg font-medium mb-4">Abgeschlossene Spiele</h3>
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                    {spiele
                      .filter(spiel => spiel.status === 'abgeschlossen')
                      .map(spiel => (
                        <Card 
                          key={spiel.id} 
                          className="w-full cursor-pointer hover:bg-accent/10 transition-colors opacity-80"
                          onClick={() => handleErgebnisseAnzeigen(spiel)}
                        >
                          <CardContent className="p-6">
                            <div className="flex flex-col space-y-3">
                              <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold">{spiel.name}</h3>
                                <span className="text-sm bg-muted px-3 py-1 rounded-full">
                                  Abgeschlossen
                                </span>
                              </div>
                              <p className="text-base text-muted-foreground">
                                {spiel.beschreibung || 'Keine Beschreibung'}
                              </p>
                              {spiel.zeitlimit_sekunden && (
                                <p className="text-sm font-medium">
                                  {spiel.zeitlimit_sekunden} Sekunden Zeit. {spiel.einheit && `Pro ${spiel.einheit} 1 Punkt.`}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-base font-medium">{ergebnisCounts.get(spiel.id) || 0} Ergebnisse</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'kind':
        if (loadingErgebnisse) {
          return <div className="text-center py-8">Lade Ergebnisse...</div>;
        }
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {ausgewaehltesSpiel?.name} - Kind auswählen
              </h2>
              <div className="space-x-2">
                {/* "Zurück"-Button entfernt, da redundant mit "Anderes Spiel wählen" */}
                {ausgewaehltesSpiel?.status !== 'abgeschlossen' && (
                  <Button 
                    variant="destructive" 
                    onClick={handleSpielAbschliessen}
                    // Immer aktiviert, unabhängig von der Anzahl der Ergebnisse
                  >
                    Spiel abschließen
                  </Button>
                )}
              </div>
            </div>

            {/* Kinderliste für neue Ergebnisse - ZUERST anzeigen */}
            {ausgewaehltesSpiel?.status !== 'abgeschlossen' && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">Neues Ergebnis erfassen</h3>
                <KindAuswahl
                  kinder={kinder.filter(kind => !vorhandeneErgebnisse.has(kind.id))}
                  onKindSelected={handleKindSelected}
                />
              </div>
            )}

            {/* Vorhandene Ergebnisse anzeigen - DANACH anzeigen */}
            {vorhandeneErgebnisse.size > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium mb-2">Erfasste Ergebnisse</h3>
                <div className="space-y-2">
                  {kinder
                    .filter(kind => vorhandeneErgebnisse.has(kind.id))
                    .map(kind => (
                      <div key={kind.id} className="flex justify-between items-center p-2 border-b">
                        <span>{kind.vorname} {kind.nachname}</span>
                        {editingKindId === kind.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 p-1 border rounded"
                              step="any"
                            />
                            <Button size="sm" onClick={() => handleEditSave(kind.id)}>
                              Speichern
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleEditCancel}>
                              Abbrechen
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {vorhandeneErgebnisse.get(kind.id)} {ausgewaehltesSpiel?.einheit || ''}
                            </span>
                            {ausgewaehltesSpiel?.status !== 'abgeschlossen' && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleEditStart(kind.id, vorhandeneErgebnisse.get(kind.id) || 0)}
                              >
                                Bearbeiten
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'ergebnis':
        if (!ausgewaehltesKind || !ausgewaehltesSpiel) {
          return <div>Fehler: Kein Kind oder Spiel ausgewählt</div>;
        }
        return (
          <ErgebnisErfassung
            kind={ausgewaehltesKind}
            spiel={ausgewaehltesSpiel}
            onErgebnisSubmit={handleErgebnisSubmit}
            // onBack-Prop entfernt, da redundant mit "Anderes Spiel wählen"-Button
          />
        );
      default:
        return <div>Unbekannter Schritt</div>;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {(!isOnline || queueLen > 0) && (
        <div
          className={`sticky top-0 z-30 -mx-4 mb-4 px-4 py-2 flex items-center gap-2 text-sm shadow-sm ${
            !isOnline
              ? 'bg-amber-100 border-b border-amber-300 text-amber-900'
              : 'bg-blue-50 border-b border-blue-300 text-blue-900'
          }`}
        >
          {!isOnline ? (
            <>
              <WifiOff size={16} className="shrink-0" />
              <span className="font-medium">Keine Verbindung.</span>
              <span>Deine Eingaben werden gespeichert und übertragen, sobald wieder Empfang da ist.</span>
            </>
          ) : (
            <>
              {flushing ? (
                <RefreshCw size={16} className="shrink-0 animate-spin" />
              ) : (
                <AlertTriangle size={16} className="shrink-0" />
              )}
              <span className="font-medium">{queueLen} Eingabe{queueLen === 1 ? '' : 'n'} warten auf Übertragung.</span>
              {!flushing && (
                <button
                  onClick={() => flushQueue()}
                  className="ml-auto underline underline-offset-2 font-medium"
                >
                  Jetzt versuchen
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Ergebniserfassung: {spielgruppe.name}
        </h1>
        {schritt !== 'spiel' && (
          <Button variant="outline" onClick={handleNeuesSpiel}>
            Anderes Spiel wählen
          </Button>
        )}
      </div>

      {renderSchritt()}

      {/* Bestätigungsdialog für Spielabschluss */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Spiel abschließen</DialogTitle>
            <DialogDescription>
              Möchtest du das Spiel &quot;{ausgewaehltesSpiel?.name}&quot; wirklich abschließen?
              <br />
              <br />
              <strong>Achtung:</strong> Nach dem Abschluss können keine weiteren Ergebnisse mehr erfasst werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleSpielAbschliessenConfirm}>
              Spiel abschließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
