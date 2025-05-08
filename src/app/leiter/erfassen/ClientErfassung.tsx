'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Database } from '@/types/database'; // Haupt-Typ importieren
import { KindAuswahl, SpielAuswahl, ErgebnisErfassung } from './ErfassungsSchritte';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
  const [spiele, setSpiele] = useState<Database['public']['Tables']['spiele']['Row'][]>([]);
  const [kinder, setKinder] = useState<Database['public']['Tables']['kinder']['Row'][]>(initialKinder);
  const [ausgewaehltesSpiel, setAusgewaehltesSpiel] = useState<Database['public']['Tables']['spiele']['Row'] | null>(null);
  const [ausgewaehltesKind, setAusgewaehltesKind] = React.useState<Database['public']['Tables']['kinder']['Row'] | null>(null);
  const [vorhandeneErgebnisse, setVorhandeneErgebnisse] = React.useState<Map<string, number>>(new Map());
  const [ergebnisCounts, setErgebnisCounts] = useState<Map<string, number>>(new Map());
  const [loadingSpiele, setLoadingSpiele] = React.useState<boolean>(true);
  const [loadingErgebnisse, setLoadingErgebnisse] = React.useState<boolean>(false);
  const [editingKindId, setEditingKindId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState<string>('');
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const supabase = createClient();

  // Lade die Spiele und setze die Leiter-Gruppe in der Datenbank-Session
  React.useEffect(() => {
    const init = async () => {
      // Zuerst die Leiter-Gruppe setzen
      await supabase.rpc('set_leiter_gruppe', {
        gruppe: spielgruppe.name
      });

      // Dann die Spiele laden
      const { data: rawData, error } = await supabase
        .from('spiele')
        .select(`
          *,
          event_spiele!inner(event_id)
        `)
        .eq('event_spiele.event_id', spielgruppe.event_id)
        .order('name');

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
      const data = rawData.map(spiel => {
        // Status aus der Map holen oder 'offen' als Standard
        const spielStatus = statusMap.get(spiel.id) || { status: 'offen', abgeschlossen_am: null };
        
        return {
          ...spiel,
          status: spielStatus.status,
          abgeschlossen_am: spielStatus.abgeschlossen_am,
          abgeschlossen_von_gruppe_id: spielStatus.status === 'abgeschlossen' ? spielgruppe.id : null
        } as Database['public']['Tables']['spiele']['Row'] & {
          status: 'offen' | 'abgeschlossen';
          abgeschlossen_am: string | null;
          abgeschlossen_von_gruppe_id: string | null;
        };
      });

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
           console.warn(`[useEffect] Fehler beim Zählen der Ergebnisse für Spiel ${spiel.id}:`, countError);
        } else {
            counts.set(spiel.id, count ?? 0);
        }
      }
      setErgebnisCounts(counts);

    };

    init();
  }, [spielgruppe.name, schritt, refreshKey]);


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
  }, [schritt, ausgewaehltesSpiel, supabase, spielgruppe.id]);

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

    try {
      // Neuen Eintrag in spielgruppe_spiel_status erstellen
      const { error } = await supabase
        .from('spielgruppe_spiel_status')
        .insert({ 
          spiel_id: ausgewaehltesSpiel.id, 
          spielgruppe_id: spielgruppe.id,
          event_id: spielgruppe.event_id
          // abgeschlossen_am wird durch DB default gesetzt
        });

      if (error) {
        // Fehlerbehandlung: Was wenn der Eintrag schon existiert (Constraint)?
        if (error.code === '23505') { // Unique violation
          console.warn('Spiel wurde bereits von dieser Gruppe abgeschlossen.');
          // Kein Fehler anzeigen, da es nur ein erneuter Versuch war?
        } else {
          throw error; // Anderen Fehler werfen
        }
      } else {
         toast.success(`${ausgewaehltesSpiel.name} für Gruppe ${spielgruppe.name} abgeschlossen.`);
          
        // Lokalen Status aktualisieren für sofortiges UI-Feedback
        setSpiele(prevSpiele => 
        prevSpiele.map(s => 
          s.id === ausgewaehltesSpiel.id 
            ? { ...s, status: 'abgeschlossen', abgeschlossen_am: new Date().toISOString() } // Zeitstempel setzen
            : s
        )
      );
      // Nach Erfolg Übersicht aktualisieren
      setRefreshKey(prev => prev + 1);
      setSchritt('spiel');
      setAusgewaehltesSpiel(null);
      setVorhandeneErgebnisse(new Map());
    }
  } catch (error: any) {
      console.error('Fehler beim Abschließen des Spiels:', error);
      toast.error('Fehler beim Abschließen des Spiels: ' + error.message);
    } finally {
      setDialogOpen(false);
    }
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

    try {
      const { error } = await supabase
        .from('ergebnisse')
        .update({ 
          wert_numeric: numValue,
          erfasst_am: new Date().toISOString()
        })
        .eq('kind_id', kindId)
        .eq('spiel_id', ausgewaehltesSpiel.id)
        .eq('spielgruppe_id', spielgruppe.id)
        .eq('event_id', spielgruppe.event_id);

      if (error) throw error;

      // Aktualisiere die lokale Map
      setVorhandeneErgebnisse(prev => {
        const next = new Map(prev);
        next.set(kindId, numValue);
        return next;
      });

      toast.success('Ergebnis aktualisiert');
      setEditingKindId(null);
      setEditValue('');

    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      toast.error('Fehler beim Speichern der Änderung');
    }
  };

  const handleErgebnisSubmit = async (wert: number) => {
    if (!ausgewaehltesKind || !ausgewaehltesSpiel) return;

    try {
      const { error } = await supabase
        .from('ergebnisse')
        .upsert({
          // Provide columns for the unique constraint to identify the row
          kind_id: ausgewaehltesKind.id,
          spiel_id: ausgewaehltesSpiel.id,
          // Provide columns to insert/update
          spielgruppe_id: spielgruppe.id, // Make sure this is included on insert/update
          event_id: spielgruppe.event_id, // Wichtig: Event-ID hinzufügen
          wert_numeric: wert,
          erfasst_am: new Date().toISOString(),
          // 'id' column is usually omitted for upsert unless you want to force a specific ID on insert
        }, {
          onConflict: 'kind_id, spiel_id' // Zurück zu ursprünglichem Conflict target
        })
        .select(); // Explizit anfordern, keine Daten zurückzugeben

      if (error) throw error; // Throw error to be caught below

      // Success handling remains the same
      // Aktualisiere die lokale Map der Ergebnisse
      setVorhandeneErgebnisse(prev => {
        const next = new Map(prev);
        next.set(ausgewaehltesKind.id, wert);
        return next;
      });

      toast.success('Ergebnis gespeichert!', {
        description: `${ausgewaehltesKind.vorname} ${ausgewaehltesKind.nachname}: ${wert} ${ausgewaehltesSpiel.einheit || ''}`
      });
      setSchritt('kind');
      setAusgewaehltesKind(null);

    } catch (error) {
      console.error('Fehler beim Speichern (Upsert):', error);
      toast.error('Fehler beim Speichern', {
        // @ts-ignore
        description: error.message || 'Bitte versuche es noch einmal.'
      });
    }
  };

  // Filtere Kinder basierend auf vorhandenen Ergebnissen
  const verbleibendeKinder = kinder.filter(k => !vorhandeneErgebnisse.has(k.id));
  const kinderMitErgebnissen = kinder.filter(k => vorhandeneErgebnisse.has(k.id));
  const alleKinderErfasst = verbleibendeKinder.length === 0;

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase || !spielgruppe) return;
      setLoadingSpiele(true);

      try {
        // 1. Alle Spiele holen (Filter nach Klassenstufe entfernt, Sortierung entfernt)
        const { data: spieleData, error: spieleError } = await supabase
          .from('spiele')
          .select('*');

        if (spieleError) throw spieleError;
        if (!spieleData) throw new Error('Keine Spiele gefunden.');

        // 2. Status-Einträge für DIESE Gruppe und DIESES Event holen
        const { data: statusData, error: statusError } = await supabase
          .from('spielgruppe_spiel_status')
          .select('spiel_id, abgeschlossen_am')
          .eq('spielgruppe_id', spielgruppe.id)
          .eq('event_id', spielgruppe.event_id);

        if (statusError) throw statusError;

        // 3. Status-Daten in eine Map für schnellen Zugriff umwandeln (spiel_id -> abgeschlossen_am)
        const abgeschlosseneSpieleMap = new Map<string, string>();
        statusData?.forEach(status => {
          abgeschlosseneSpieleMap.set(status.spiel_id, status.abgeschlossen_am);
        });

        // 4. Spiele-Daten mit Status kombinieren
        const kombinierteSpiele = spieleData.map(spiel => {
          const abgeschlossenAm = abgeschlosseneSpieleMap.get(spiel.id);
          const status: 'offen' | 'abgeschlossen' = abgeschlossenAm ? 'abgeschlossen' : 'offen';
          
          return {
            ...spiel,
            status: status, 
            abgeschlossen_am: abgeschlossenAm || null // Zeitstempel hinzufügen
          } as Database['public']['Tables']['spiele']['Row'] & {
            status: 'offen' | 'abgeschlossen';
            abgeschlossen_am: string | null; 
          };
        });

        setSpiele(kombinierteSpiele);

        // 5. Ergebnisanzahl für jedes Spiel laden (wie zuvor)
        const counts = new Map<string, number>();
        for (const spiel of kombinierteSpiele) {
          const { count, error: countError } = await supabase
            .from('ergebnisse')
            .select('*', { count: 'exact', head: true }) // Nur die Anzahl abfragen
            .eq('spiel_id', spiel.id)
            .eq('spielgruppe_id', spielgruppe.id)
            .eq('event_id', spielgruppe.event_id);
          
          if (countError) {
             console.warn(`Fehler beim Zählen der Ergebnisse für Spiel ${spiel.id}:`, countError);
          } else {
              console.log(`Ergebnisse für Spiel ${spiel.id} in der Übersicht:`, count);
              counts.set(spiel.id, count ?? 0);
          }
        }
        setErgebnisCounts(counts);

      } catch (error) {
        console.error('Fehler beim Laden der Spiele:', error);
        toast.error('Fehler beim Laden der Spiele');
      } finally {
        setLoadingSpiele(false); // Ladezustand hier beenden
      }

    };

    fetchData();
  }, [spielgruppe.name, schritt, refreshKey]);

  return (
    <div className="space-y-2">
      {schritt === 'spiel' && (
        <div className="space-y-8"> {/* Mehr Abstand zwischen den Gruppen */}
          <h1 className="text-2xl font-bold text-center">Spiel auswählen</h1>
          
          {/* Gruppe: Offene Spiele */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Offene Spiele</h2>
            <div className="grid grid-cols-2 gap-4">
              {spiele
                .filter((spiel) => spiel.status !== 'abgeschlossen')
                .map((spiel) => (
                  <button
                    key={spiel.id}
                    onClick={() => handleErgebnisseAnzeigen(spiel)}
                    className={`
                      w-full h-28 text-center border rounded-lg 
                      flex flex-col justify-center items-center p-3 
                      hover:bg-gray-100 dark:hover:bg-gray-800 
                      transition-colors duration-150 shadow-md 
                      border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 /* Styling für Offen */
                      ${loadingErgebnisse ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    disabled={loadingErgebnisse}
                  >
                    <div className="font-semibold text-base mb-1 line-clamp-2">{spiel.name}</div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">Offen</div>
                  </button>
              ))}
              {/* Hinweis, falls keine offenen Spiele da sind */}
              {spiele.filter((spiel) => spiel.status === 'offen').length === 0 && (
                <p className="col-span-2 text-sm text-muted-foreground text-center py-4">Keine offenen Spiele mehr.</p>
              )}
            </div>
          </div>

          {/* Gruppe: Abgeschlossene Spiele */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Abgeschlossene Spiele</h2>
            <div className="grid grid-cols-2 gap-4">
              {spiele
                .filter((spiel) => spiel.status === 'abgeschlossen')
                .map((spiel) => (
                  <button
                    key={spiel.id}
                    onClick={() => handleErgebnisseAnzeigen(spiel)}
                    className={`
                      w-full h-28 text-center border rounded-lg 
                      flex flex-col justify-center items-center p-3 
                      hover:bg-gray-100 dark:hover:bg-gray-800 
                      transition-colors duration-150 shadow-md 
                      border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 /* Styling für Abgeschlossen */
                      ${loadingErgebnisse ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    disabled={loadingErgebnisse}
                  >
                    <div className="font-semibold text-base mb-1 line-clamp-2">{spiel.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {ergebnisCounts.get(spiel.id) ?? 0} von {kinder.length} Kindern erfasst
                    </div>
                  </button>
              ))}
              {/* Hinweis, falls keine abgeschlossenen Spiele da sind */}
              {spiele.filter((spiel) => spiel.status === 'abgeschlossen').length === 0 && (
                <p className="col-span-2 text-sm text-muted-foreground text-center py-4">Noch keine Spiele abgeschlossen.</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {schritt === 'kind' && ausgewaehltesSpiel && (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{ausgewaehltesSpiel.name}</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleNeuesSpiel}
            >
              Anderes Spiel
            </Button>
          </div>

          {ausgewaehltesSpiel.status === 'offen' && (
            <>
              {alleKinderErfasst ? (
                <div className="p-4 text-center space-y-4">
                  <p className="text-muted-foreground">
                    Alle Kinder für dieses Spiel erfasst!
                  </p>
                  <Button 
                    onClick={handleNeuesSpiel}
                    className="w-full"
                  >
                    Nächstes Spiel auswählen
                  </Button>
                </div>
              ) : (
                <KindAuswahl 
                  kinder={verbleibendeKinder} 
                  onKindSelected={handleKindSelected}
                />
              )}
            </>
          )}

          <div className="mt-2">
            <hr className="border-gray-200 dark:border-gray-700 mb-2" />

            <div className="flex items-center justify-between mb-1 mt-1">
              <h3 className="text-lg font-semibold">Ergebnisse für {ausgewaehltesSpiel.name}</h3>
              {ausgewaehltesSpiel.status === 'offen' && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleSpielAbschliessen}
                >
                  ✓ Spiel abschließen
                </Button>
              )}
              {ausgewaehltesSpiel.status === 'abgeschlossen' && (
                <div className="text-sm text-muted-foreground">
                  {vorhandeneErgebnisse.size} von {kinder.length} Kindern erfasst
                </div>
              )}
            </div>
            {loadingErgebnisse ? (
              <div className="text-gray-500">Lade Ergebnisse...</div>
            ) : (
              <div className="space-y-1">
                {kinderMitErgebnissen.map((kind) => (
                  <div key={kind.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="font-medium">{kind.vorname} {kind.nachname}</span>
                    <div className="flex items-center gap-2">
                      {editingKindId === kind.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 px-2 py-1 border rounded"
                            autoFocus
                          />
                          <span className="text-sm text-gray-600">
                            {ausgewaehltesSpiel.einheit || ''}
                          </span>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleEditSave(kind.id)}
                          >
                            OK
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEditCancel}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="bg-white px-3 py-1 rounded border">
                            {vorhandeneErgebnisse.get(kind.id)} {ausgewaehltesSpiel.einheit || ''}
                          </div>
                          {ausgewaehltesSpiel.status === 'offen' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditStart(kind.id, vorhandeneErgebnisse.get(kind.id)!)}
                            >
                              ✎
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground text-center">
            {vorhandeneErgebnisse.size} von {kinder.length} Kindern erfasst
          </div>
        </div>
      )}
      
      {schritt === 'ergebnis' && ausgewaehltesKind && ausgewaehltesSpiel && (
        <ErgebnisErfassung 
          kind={ausgewaehltesKind}
          spiel={ausgewaehltesSpiel}
          onErgebnisSubmit={handleErgebnisSubmit}
          onBack={handleBack}
        />
      )}

      {/* Dialog zum Bestätigen des Spielabschlusses */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Spiel abschließen</DialogTitle>
            <DialogDescription className="sr-only">
              Dialog zum Abschließen eines Spiels
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4" id="dialog-description" aria-describedby="dialog-description">
            <div>
              {kinder.length - vorhandeneErgebnisse.size > 0 ? (
                <>
                  Es fehlen noch Ergebnisse von {kinder.length - vorhandeneErgebnisse.size} Kindern.
                  Möchtest du das Spiel trotzdem abschließen?
                </>
              ) : (
                'Möchtest du dieses Spiel wirklich abschließen?'
              )}
            </div>
            <div className="font-medium text-destructive">
              Diese Aktion kann nicht rückgängig gemacht werden!
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="default"
              onClick={handleSpielAbschliessenConfirm}
            >
              Ja, Spiel abschließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
