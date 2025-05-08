'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Users, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { HelferCardDirect } from './HelferCardDirect';
import { SpielUebersicht } from './SpielUebersicht';

// Konstanten für Container-IDs
const UNASSIGNED_CONTAINER_ID = 'unassigned';
const SPRINGER_CONTAINER_ID = 'springer';

interface Spiel {
  id: string;
  name: string;
  beschreibung: string | null;
  assigned_helpers: HelferZuteilung[];
}

interface Helfer {
  id: string;
  kind_id: string;
  aufgabe_id: string;
  kind: {
    id: string;
    vorname: string;
    nachname: string;
    klasse?: string;
  };
  via_springer: boolean;
}

interface HelferZuteilung {
  helfer_id: string;
  spiel_id: string;
  helfer?: Helfer;
}

export default function SpielbetreuerPage() {
  // State Hooks - immer am Anfang der Komponente
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [helfer, setHelfer] = useState<Helfer[]>([]);
  const [spielbetreuerAufgabeId, setSpielbetreuerAufgabeId] = useState<string | null>(null);
  const [zuteilungen, setZuteilungen] = useState<Record<string, string[]>>({});
  const [springerHelfer, setSpringerHelfer] = useState<string[]>([]);
  
  // Alle weiteren State-Hooks (Filter, etc.)
  const [filterText, setFilterText] = useState('');
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);
  
  // Alte Modal-State-Hooks (werden nicht mehr verwendet, aber für konsistente Hook-Reihenfolge beibehalten)
  const [zuweisModalOpen, setZuweisModalOpen] = useState(false);
  const [zuweisHelferId, setZuweisHelferId] = useState<string|null>(null);
  const [zuweisSpielAuswahl, setZuweisSpielAuswahl] = useState(false);
  const [zuweisSpielId, setZuweisSpielId] = useState<string|null>(null);
  
  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      
      try {
        // 1. Finde die Aufgabe mit dem Titel "Betreuer eines Spiels" (oder ähnlich)
        const { data: aufgabenData, error: aufgabenError } = await supabase
          .from('helferaufgaben')
          .select('id, titel')
          .ilike('titel', '%betreuer%spiel%')
          .order('titel');
        
        if (aufgabenError) {
          throw aufgabenError;
        }
        
        // Wenn keine passende Aufgabe gefunden wurde
        if (!aufgabenData || aufgabenData.length === 0) {
          toast.error('Keine Aufgabe mit "Betreuer eines Spiels" im Titel gefunden. Bitte erst in der Aufgabenverwaltung einrichten.');
          setIsLoading(false);
          return;
        }
        
        // Verwende die erste gefundene Aufgabe
        const spielbetreuerAufgabe = aufgabenData[0];
        
        setSpielbetreuerAufgabeId(spielbetreuerAufgabe.id);
        
        // 2. Lade alle Helfer, die dieser Aufgabe zugewiesen sind
        const { data: helferData, error: helferError } = await supabase
          .from('helfer_zuteilungen')
          .select(`
            id,
            kind_id,
            aufgabe_id,
            via_springer,
            kind:kinder(id, vorname, nachname, klasse)
          `)
          .eq('aufgabe_id', spielbetreuerAufgabe.id);
        
        if (helferError) throw helferError;
        
        // Transformiere die Daten in das richtige Format
        const transformedHelferData = helferData?.map(h => {
          // Stelle sicher, dass kind ein einzelnes Objekt ist, kein Array
          const kindData = Array.isArray(h.kind) ? h.kind[0] : h.kind;
          
          return {
            id: h.id,
            kind_id: h.kind_id,
            aufgabe_id: h.aufgabe_id,
            via_springer: h.via_springer,
            kind: {
              id: kindData?.id || '',
              vorname: kindData?.vorname || '',
              nachname: kindData?.nachname || '',
              klasse: kindData?.klasse
            }
          };
        }) || [];
        
        setHelfer(transformedHelferData);
        
        // 3. Lade alle Spiele
        const { data: spieleData, error: spieleError } = await supabase
          .from('spiele')
          .select('id, name, beschreibung')
          .order('name');
        
        if (spieleError) throw spieleError;
        
        // 4. Lade bestehende Zuteilungen
        const { data: zuteilungenData, error: zuteilungenError } = await supabase
          .from('helfer_spiel_zuteilungen')
          .select('helfer_id, spiel_id');
        
        if (zuteilungenError) throw zuteilungenError;
        
        // Initialisiere Zuteilungen
        const initialZuteilungen: Record<string, string[]> = {};
        const initialSpringer: string[] = [];
        
        // Verarbeite bestehende Zuteilungen
        if (zuteilungenData && zuteilungenData.length > 0) {
          zuteilungenData.forEach(zuteilung => {
            if (zuteilung.spiel_id === 'springer') {
              initialSpringer.push(zuteilung.helfer_id);
            } else {
              if (!initialZuteilungen[zuteilung.spiel_id]) {
                initialZuteilungen[zuteilung.spiel_id] = [];
              }
              initialZuteilungen[zuteilung.spiel_id].push(zuteilung.helfer_id);
            }
          });
        }
        
        setZuteilungen(initialZuteilungen);
        setSpringerHelfer(initialSpringer);
        
        // Bereite Spiele mit zugewiesenen Helfern vor
        const spieleMitHelfer = spieleData?.map(spiel => ({
          ...spiel,
          assigned_helpers: (zuteilungenData || [])
            .filter(z => z.spiel_id === spiel.id)
            .map(z => {
              const helfer = helferData?.find(h => h.id === z.helfer_id);
              if (!helfer) return null;
              
              // Korrigiere die kind-Eigenschaft, falls sie ein Array ist
              const korrigierterHelfer = {
                ...helfer,
                kind: Array.isArray(helfer.kind) ? helfer.kind[0] : helfer.kind
              };
              
              return {
                helfer_id: z.helfer_id,
                spiel_id: z.spiel_id,
                helfer: korrigierterHelfer
              } as HelferZuteilung;
            })
            .filter((z): z is HelferZuteilung => z !== null)
        })) || [];
        
        setSpiele(spieleMitHelfer);
      } catch (error: any) {
        console.error('Fehler beim Laden der Daten:', error);
        toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Helfer zu einem Spiel hinzufügen
  const assignHelferToSpiel = (helferId: string, spielId: string) => {
    console.log(`Weise Helfer ${helferId} dem Spiel ${spielId} zu`);
    
    // Entferne Helfer aus allen anderen Spielen und aus Springer
    const updatedZuteilungen = { ...zuteilungen };
    
    Object.keys(updatedZuteilungen).forEach(id => {
      updatedZuteilungen[id] = updatedZuteilungen[id].filter(h => h !== helferId);
    });
    
    // Füge Helfer zum ausgewählten Spiel hinzu
    if (!updatedZuteilungen[spielId]) {
      updatedZuteilungen[spielId] = [];
    }
    updatedZuteilungen[spielId].push(helferId);
    
    // Entferne aus Springer
    setSpringerHelfer(prev => prev.filter(h => h !== helferId));
    
    setZuteilungen(updatedZuteilungen);
    toast.success(`Helfer wurde dem Spiel zugewiesen`);
  };
  
  // Helfer als Springer markieren
  const assignHelferAsSpringer = (helferId: string) => {
    console.log(`Markiere Helfer ${helferId} als Springer`);
    
    // Entferne Helfer aus allen Spielen
    const updatedZuteilungen = { ...zuteilungen };
    
    Object.keys(updatedZuteilungen).forEach(id => {
      updatedZuteilungen[id] = updatedZuteilungen[id].filter(h => h !== helferId);
    });
    
    // Füge Helfer zu Springer hinzu
    setSpringerHelfer(prev => [...prev.filter(h => h !== helferId), helferId]);
    
    setZuteilungen(updatedZuteilungen);
    toast.success(`Helfer wurde als Springer markiert`);
  };
  
  // Helfer von einem Spiel entfernen
  const removeHelferFromSpiel = (helferId: string, spielId: string) => {
    console.log(`Entferne Helfer ${helferId} vom Spiel ${spielId}`);
    
    const updatedZuteilungen = { ...zuteilungen };
    
    if (updatedZuteilungen[spielId]) {
      updatedZuteilungen[spielId] = updatedZuteilungen[spielId].filter(h => h !== helferId);
    }
    
    setZuteilungen(updatedZuteilungen);
    toast.success(`Helfer wurde vom Spiel entfernt`);
  };
  
  // Helfer von Springer entfernen
  const removeHelferFromSpringer = (helferId: string) => {
    console.log(`Entferne Helfer ${helferId} von Springern`);
    setSpringerHelfer(prev => prev.filter(h => h !== helferId));
    toast.success(`Helfer ist kein Springer mehr`);
  };
  
  // Änderungen speichern
  const saveZuteilungen = async () => {
    if (!spielbetreuerAufgabeId) {
      toast.error('Keine Aufgabe als "Betreuer eines Spiels" markiert.');
      return;
    }
    
    setIsSaving(true);
    const supabase = createClient();
    
    try {
      // Alle bestehenden Zuteilungen löschen
      const { error: deleteError } = await supabase
        .from('helfer_spiel_zuteilungen')
        .delete()
        .gte('helfer_id', '0'); // Lösche alle Einträge
      
      if (deleteError) throw deleteError;
      
      // Neue Zuteilungen erstellen
      const newZuteilungen: { helfer_id: string; spiel_id: string }[] = [];
      
      // Zuteilungen für reguläre Spiele
      Object.entries(zuteilungen).forEach(([spielId, helferIds]) => {
        helferIds.forEach(helferId => {
          newZuteilungen.push({
            helfer_id: helferId,
            spiel_id: spielId
          });
        });
      });
      
      // Zuteilungen für Springer
      springerHelfer.forEach(helferId => {
        newZuteilungen.push({
          helfer_id: helferId,
          spiel_id: 'springer'
        });
      });
      
      if (newZuteilungen.length > 0) {
        const { error: insertError } = await supabase
          .from('helfer_spiel_zuteilungen')
          .insert(newZuteilungen);
        
        if (insertError) throw insertError;
      }
      
      toast.success('Zuteilungen wurden erfolgreich gespeichert.');
    } catch (error: any) {
      console.error('Fehler beim Speichern der Zuteilungen:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Funktionen, die in der useEffect und im Render verwendet werden
  // Diese müssen außerhalb von Hooks definiert werden
  function getHelferForSpiel(spielId: string) {
    const helferIds = zuteilungen[spielId] || [];
    return helfer.filter(h => helferIds.includes(h.id));
  }
  
  function getUnassignedHelfer() {
    const assignedHelferIds = [
      ...Object.values(zuteilungen).flat(),
      ...springerHelfer
    ];
    
    return helfer.filter(h => !assignedHelferIds.includes(h.id));
  }
  
  // Gibt den Status eines Helfers als String zurück (für die Anzeige)
  function getHelferStatusText(helferId: string): string {
    // Prüfe, ob Helfer ein Springer ist
    if (springerHelfer.includes(helferId)) {
      return ' (Springer)';
    }
    
    // Prüfe, ob Helfer einem Spiel zugewiesen ist
    for (const spielId in zuteilungen) {
      if (zuteilungen[spielId]?.includes(helferId)) {
        const spiel = spiele.find(s => s.id === spielId);
        return spiel ? ` (${spiel.name})` : ' (Zugewiesen)';
      }
    }
    
    // Helfer ist frei
    return ' (Frei)';
  }
  
  // Keine Drag & Drop-Funktionen mehr, stattdessen Button-basierte Aktionen
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }
  
  if (!spielbetreuerAufgabeId) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Keine Aufgabe als "Betreuer eines Spiels" markiert</h2>
          <p className="text-amber-700 mb-4">
            Um diese Funktion nutzen zu können, müssen Sie zuerst eine Helferaufgabe mit "Betreuer eines Spiels" im Titel erstellen.
          </p>
          <Button asChild>
            <Link href="/admin/helfer/aufgaben">
              <Users className="mr-2 h-4 w-4" /> Zu den Helferaufgaben
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  
  // Dieser State wurde bereits am Anfang der Komponente definiert
  // und wird hier nicht noch einmal deklariert
  
  // Helfer-Status-Funktionen
  const getHelferStatus = (helferId: string): 'frei' | 'springer' | 'zugewiesen' => {
    if (springerHelfer.includes(helferId)) {
      return 'springer';
    }
    
    for (const spielId in zuteilungen) {
      if (zuteilungen[spielId]?.includes(helferId)) {
        return 'zugewiesen';
      }
    }
    
    return 'frei';
  };
  
  const getSpielNameForHelfer = (helferId: string): string | undefined => {
    for (const spielId in zuteilungen) {
      if (zuteilungen[spielId]?.includes(helferId)) {
        const spiel = spiele.find(s => s.id === spielId);
        return spiel?.name;
      }
    }
    return undefined;
  };
  
  // Filtere Helfer basierend auf Suchtext und Status
  const filteredHelfer = helfer.filter(h => {
    const nameMatches = `${h.kind.vorname} ${h.kind.nachname}`.toLowerCase().includes(filterText.toLowerCase());
    if (!nameMatches) return false;
    
    if (showOnlyUnassigned) {
      return getHelferStatus(h.id) === 'frei';
    }
    
    return true;
  });
  
  // Bereite Spiel-Übersicht vor
  const spieleUebersicht = spiele.map(spiel => ({
    id: spiel.id,
    name: spiel.name,
    helfer: getHelferForSpiel(spiel.id).map(h => ({
      id: h.id,
      name: `${h.kind.vorname} ${h.kind.nachname}`
    })),
    maxHelfer: 2
  }));

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Spielbetreuer zuweisen</h1>
        <Button 
          onClick={saveZuteilungen} 
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird gespeichert...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Änderungen speichern
            </>
          )}
        </Button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Linke Spalte: Helfer mit direkten Aktionen */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <h2 className="text-xl font-bold flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Helfer ({filteredHelfer.length})
              </h2>
              
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-grow md:w-64">
                  <input
                    type="text"
                    placeholder="Helfer suchen..."
                    className="w-full px-3 py-2 border rounded-md"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>
                
                <Button
                  variant={showOnlyUnassigned ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOnlyUnassigned(!showOnlyUnassigned)}
                  className="whitespace-nowrap"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  {showOnlyUnassigned ? "Alle anzeigen" : "Nur freie Helfer"}
                </Button>
              </div>
            </div>
            
            {filteredHelfer.length === 0 ? (
              <div className="text-gray-500 italic p-4 text-center border rounded-md">
                Keine Helfer gefunden.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredHelfer.map(h => (
                  <HelferCardDirect
                    key={h.id}
                    id={h.id}
                    vorname={h.kind.vorname}
                    nachname={h.kind.nachname}
                    klasse={h.kind.klasse}
                    status={getHelferStatus(h.id)}
                    spielName={getSpielNameForHelfer(h.id)}
                    spiele={spiele}
                    onZuweiseZuSpiel={assignHelferToSpiel}
                    onMarkiereAlsSpringer={assignHelferAsSpringer}
                    onFreigeben={(helferId) => {
                      const status = getHelferStatus(helferId);
                      if (status === 'springer') {
                        removeHelferFromSpringer(helferId);
                      } else if (status === 'zugewiesen') {
                        // Finde das Spiel, dem der Helfer zugewiesen ist
                        for (const spielId in zuteilungen) {
                          if (zuteilungen[spielId]?.includes(helferId)) {
                            removeHelferFromSpiel(helferId, spielId);
                            break;
                          }
                        }
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Rechte Spalte: Spiele-Übersicht */}
        <div className="lg:w-1/3">
          <SpielUebersicht spiele={spieleUebersicht} />
        </div>
      </div>
    </div>
  );
}

