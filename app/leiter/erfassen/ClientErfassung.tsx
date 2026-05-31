'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Database } from '@/lib/database.types'; // Korrekter Import der Datenbanktypen
import { KindAuswahl, SpielAuswahl, ErgebnisErfassung } from './ErfassungsSchritte';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { WifiOff, RefreshCw, AlertTriangle, MoreVertical, ChevronLeft, LogOut, MapPin, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LeiterChatSheet from '@/app/leiter/chat/LeiterChatSheet';
import { armChatSound, unlockChatSound, playChatSound } from '@/lib/chatSound';
import { SpielAnleitung } from '@/components/SpielAnleitung';
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
  logoutAction: () => Promise<void>;
}

type Schritt = 'spiel' | 'kind' | 'ergebnis';

export default function ClientErfassung({
  spielgruppe,
  kinder: initialKinder,
  logoutAction,
}: ClientErfassungProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  // ----- Orga-Chat -----
  const chatLastSeenKey = `chat_last_seen_leiter_${spielgruppe.id}`;
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const prevChatUnreadRef = useRef<number | null>(null);

  // Audio-Ton einmalig für spätere Wiedergabe vorbereiten (entsperrt bei erster Geste)
  useEffect(() => {
    armChatSound();
  }, []);

  const markChatGelesen = useCallback(() => {
    try {
      localStorage.setItem(chatLastSeenKey, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setChatUnread(0);
  }, [chatLastSeenKey]);

  // Ungelesene Chat-Nachrichten zählen (nur solange das Sheet geschlossen ist)
  useEffect(() => {
    if (chatOpen) return;
    let stop = false;
    const check = async () => {
      if (!isOnline) return;
      try {
        const res = await fetch('/api/leiter/chat', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        let lastSeen: string | null = null;
        try {
          lastSeen = localStorage.getItem(chatLastSeenKey);
        } catch {
          /* ignore */
        }
        if (!lastSeen) {
          // Erstkontakt: alles bisherige als gesehen markieren
          const jetzt = new Date().toISOString();
          try {
            localStorage.setItem(chatLastSeenKey, jetzt);
          } catch {
            /* ignore */
          }
          lastSeen = jetzt;
        }
        const seen = new Date(lastSeen).getTime();
        const liste = (json.nachrichten ?? []) as Array<{ absender_name: string; created_at: string }>;
        const cnt = liste.filter(
          (n) => n.absender_name !== spielgruppe.name && new Date(n.created_at).getTime() > seen,
        ).length;
        if (!stop) {
          setChatUnread(cnt);
          // Ton, wenn neue ungelesene Nachrichten dazugekommen sind
          if (prevChatUnreadRef.current !== null && cnt > prevChatUnreadRef.current) {
            playChatSound();
          }
          prevChatUnreadRef.current = cnt;
        }
      } catch {
        /* ignore */
      }
    };
    void check();
    const id = setInterval(check, 20000);
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);
    return () => {
      stop = true;
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [chatOpen, isOnline, chatLastSeenKey, spielgruppe.name]);

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

  const renderSchritt = () => {
    switch (schritt) {
      case 'spiel':
        if (loadingSpiele) {
          return <div className="text-center py-12 text-slate-500">Lade Spiele…</div>;
        }
        const offeneSpiele = spiele.filter(s => s.status !== 'abgeschlossen');
        const abgeschlosseneSpiele = spiele.filter(s => s.status === 'abgeschlossen');
        return (
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 px-1">
                Wähle ein Spiel
              </p>
              <div className="space-y-2">
                {offeneSpiele.map(spiel => {
                  const count = ergebnisCounts.get(spiel.id) || 0;
                  return (
                    <div
                      key={spiel.id}
                      className="flex items-stretch bg-white border border-slate-200 rounded-xl hover:border-melsdorf-orange/60 hover:bg-melsdorf-orange/5 transition-all"
                    >
                      <button
                        onClick={() => handleSpielSelected(spiel)}
                        className="flex-1 min-w-0 text-left px-4 py-3 active:scale-[0.99] transition-transform"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-base text-slate-900 truncate">{spiel.name}</div>
                            {spiel.ort ? (
                              <div className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1">
                                <MapPin size={11} className="shrink-0" />
                                {spiel.ort}
                              </div>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">
                            {count} Erg.
                          </div>
                        </div>
                      </button>
                      <SpielAnleitung spiel={spiel} className="px-3 self-center" />
                    </div>
                  );
                })}
                {offeneSpiele.length === 0 && (
                  <p className="text-sm text-slate-500 italic py-4 text-center">
                    Alle Spiele sind abgeschlossen.
                  </p>
                )}
              </div>
            </div>

            {abgeschlosseneSpiele.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 px-1">
                  Abgeschlossen ({abgeschlosseneSpiele.length})
                </p>
                <div className="space-y-2">
                  {abgeschlosseneSpiele.map(spiel => {
                    const count = ergebnisCounts.get(spiel.id) || 0;
                    return (
                      <div
                        key={spiel.id}
                        className="flex items-stretch bg-green-50 border border-green-200 rounded-xl"
                      >
                        <button
                          onClick={() => handleErgebnisseAnzeigen(spiel)}
                          className="flex-1 min-w-0 text-left px-4 py-3 active:scale-[0.99] transition-transform"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-base text-slate-900 truncate">{spiel.name}</div>
                              <div className="text-xs text-green-700 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span>✓ Abgeschlossen · {count} Ergebnisse</span>
                                {spiel.ort && (
                                  <span className="inline-flex items-center gap-1 text-slate-500">
                                    <MapPin size={11} className="shrink-0" />
                                    {spiel.ort}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                        <SpielAnleitung spiel={spiel} className="px-3 self-center" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'kind':
        if (loadingErgebnisse) {
          return <div className="text-center py-12 text-slate-500">Lade Ergebnisse…</div>;
        }
        const offeneKinder = kinder.filter(k => !vorhandeneErgebnisse.has(k.id));
        const erfassteKinder = kinder.filter(k => vorhandeneErgebnisse.has(k.id));
        return (
          <div className="space-y-5">
            {ausgewaehltesSpiel?.status !== 'abgeschlossen' && offeneKinder.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 px-1">
                  Offen ({offeneKinder.length})
                </p>
                <KindAuswahl
                  kinder={offeneKinder}
                  onKindSelected={handleKindSelected}
                />
              </div>
            )}

            {erfassteKinder.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 px-1">
                  Erfasst ({erfassteKinder.length})
                </p>
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {erfassteKinder.map(kind => (
                    <div key={kind.id} className="flex items-center justify-between px-4 py-3 gap-3">
                      <span className="font-medium text-slate-900 truncate">
                        {kind.vorname} {kind.nachname}
                      </span>
                      {editingKindId === kind.id ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 px-2 py-1 text-base border border-slate-300 rounded"
                            step="any"
                            autoFocus
                          />
                          <Button size="sm" onClick={() => handleEditSave(kind.id)}>OK</Button>
                          <Button size="sm" variant="outline" onClick={handleEditCancel}>×</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-melsdorf-orange tabular-nums">
                            {vorhandeneErgebnisse.get(kind.id)}
                            {ausgewaehltesSpiel?.einheit ? ` ${ausgewaehltesSpiel.einheit}` : ''}
                          </span>
                          {ausgewaehltesSpiel?.status !== 'abgeschlossen' && (
                            <button
                              onClick={() => handleEditStart(kind.id, vorhandeneErgebnisse.get(kind.id) || 0)}
                              className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
                            >
                              ändern
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spiel abschließen — unten, sekundär */}
            {ausgewaehltesSpiel?.status !== 'abgeschlossen' && (
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={handleSpielAbschliessen}
                  className="w-full text-sm py-3 rounded-lg border border-red-200 text-red-700 bg-red-50/50 hover:bg-red-100 active:scale-[0.99] transition-all font-medium"
                >
                  Spiel für diese Gruppe abschließen
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  Danach sind keine Änderungen mehr möglich.
                </p>
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
          />
        );

      default:
        return <div>Unbekannter Schritt</div>;
    }
  };

  // Header-Texte je nach Schritt
  const headerTitel =
    schritt === 'spiel'
      ? 'Spielauswahl'
      : ausgewaehltesSpiel?.name || '';
  const zeigeZurueck = schritt !== 'spiel';

  return (
    <div className="min-h-screen bg-pastel-yellow/30">
      {/* Sticky Top-Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        {(!isOnline || queueLen > 0) && (
          <div
            className={`px-4 py-1.5 flex items-center gap-2 text-[12px] ${
              !isOnline
                ? 'bg-amber-100 text-amber-900'
                : 'bg-blue-50 text-blue-900'
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff size={13} className="shrink-0" />
                <span className="font-medium">Keine Verbindung</span>
                <span className="hidden sm:inline">— Eingaben werden zwischengespeichert.</span>
              </>
            ) : (
              <>
                {flushing ? (
                  <RefreshCw size={13} className="shrink-0 animate-spin" />
                ) : (
                  <AlertTriangle size={13} className="shrink-0" />
                )}
                <span className="font-medium">{queueLen} warten auf Übertragung</span>
                {!flushing && (
                  <button
                    onClick={() => flushQueue()}
                    className="ml-auto underline underline-offset-2 font-medium"
                  >
                    Jetzt
                  </button>
                )}
              </>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 px-3 h-12">
          {zeigeZurueck ? (
            <button
              onClick={schritt === 'ergebnis' ? handleBack : handleNeuesSpiel}
              className="-ml-1 p-2 text-slate-700 hover:text-slate-900 active:scale-95 transition-transform"
              aria-label="Zurück"
            >
              <ChevronLeft size={22} />
            </button>
          ) : (
            <div className="w-7 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-sans font-semibold text-slate-900 truncate leading-tight">
              {headerTitel}
            </div>
            <div className="text-[13px] text-slate-500 leading-tight mt-0.5">
              Gruppe {spielgruppe.name}
            </div>
          </div>
          <button
            onClick={() => {
              unlockChatSound();
              setChatOpen(true);
              markChatGelesen();
            }}
            className="relative shrink-0 p-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform"
            aria-label="Orga-Chat"
          >
            <MessageCircle size={20} />
            {chatUnread > 0 && (
              <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-melsdorf-red text-white text-[9px] font-semibold leading-none">
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            )}
          </button>
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform"
              aria-label="Mehr"
            >
              <MoreVertical size={20} />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px] overflow-hidden">
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-slate-50"
                    >
                      <LogOut size={14} />
                      Abmelden
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Inhalt */}
      <div className="px-3 py-4 max-w-2xl mx-auto pb-24">
        {renderSchritt()}
      </div>

      {/* Bestätigungsdialog für Spielabschluss */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Spiel abschließen?</DialogTitle>
            <DialogDescription>
              <strong>{ausgewaehltesSpiel?.name}</strong> für Gruppe <strong>{spielgruppe.name}</strong> wirklich abschließen?
              <br />
              <br />
              Nach dem Abschluss kannst Du keine Ergebnisse mehr ändern.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleSpielAbschliessenConfirm}>
              Ja, abschließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Orga-Chat */}
      <LeiterChatSheet
        open={chatOpen}
        onOpenChange={setChatOpen}
        gruppenname={spielgruppe.name}
        isOnline={isOnline}
        onGelesen={markChatGelesen}
      />
    </div>
  );
}
