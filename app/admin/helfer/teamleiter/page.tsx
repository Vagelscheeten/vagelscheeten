'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Users, Filter, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { GroupCard } from './GroupCard';
import { HelferCard } from './HelferCard';
import { PDFViewer } from './PDFViewer';

interface Gruppe {
  id: string;
  name: string;
  leiter_zugangscode: string;
  teamleiter_id: string | null;
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
}

export default function TeamleiterPage() {
  // State Hooks
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [helfer, setHelfer] = useState<Helfer[]>([]);
  const [teamleiterAufgabeId, setTeamleiterAufgabeId] = useState<string | null>(null);
  const [zuteilungen, setZuteilungen] = useState<Record<string, string>>({});
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  
  // Filter
  const [filterText, setFilterText] = useState('');
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);
  
  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      
      try {
        // 1. Finde die Aufgabe mit dem Titel "Teamleiter" (oder ähnlich)
        const { data: aufgabenData, error: aufgabenError } = await supabase
          .from('helferaufgaben')
          .select('id, titel')
          .ilike('titel', '%teamleiter%')
          .order('titel');
        
        if (aufgabenError) {
          throw aufgabenError;
        }
        
        // Wenn keine passende Aufgabe gefunden wurde
        if (!aufgabenData || aufgabenData.length === 0) {
          toast.error('Keine Aufgabe mit "Teamleiter" im Titel gefunden. Bitte erst in der Aufgabenverwaltung einrichten.');
          setIsLoading(false);
          return;
        }
        
        // Verwende die erste gefundene Aufgabe
        const teamleiterAufgabe = aufgabenData[0];
        setTeamleiterAufgabeId(teamleiterAufgabe.id);
        
        // 2. Lade alle Helfer, die dieser Aufgabe zugewiesen sind
        const { data: helferData, error: helferError } = await supabase
          .from('helfer_zuteilungen')
          .select(`
            id,
            kind_id,
            aufgabe_id,
            kind:kinder(id, vorname, nachname, klasse)
          `)
          .eq('aufgabe_id', teamleiterAufgabe.id);
        
        if (helferError) {
          throw helferError;
        }
        
        // Daten richtig transformieren - kind ist ein Array in der Supabase-Rückgabe, aber wir benötigen ein Objekt
        const transformedHelfer = helferData?.map(helfer => ({
          ...helfer,
          kind: Array.isArray(helfer.kind) ? helfer.kind[0] : helfer.kind
        })) || [];
        
        setHelfer(transformedHelfer);
        
        // 3. Lade alle Gruppen
        const { data: gruppenData, error: gruppenError } = await supabase
          .from('spielgruppen')
          .select('*')
          .order('name');
        
        if (gruppenError) {
          throw gruppenError;
        }
        
        setGruppen(gruppenData || []);
        
        // 4. Initialisiere die Zuteilungen aus den vorhandenen Daten
        const initialZuteilungen: Record<string, string> = {};
        gruppenData?.forEach(gruppe => {
          if (gruppe.teamleiter_id) {
            initialZuteilungen[gruppe.id] = gruppe.teamleiter_id;
          }
        });
        
        setZuteilungen(initialZuteilungen);
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        toast.error('Fehler beim Laden der Daten');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Filterfunktionen für Helfer
  const filteredHelfer = helfer.filter(h => {
    const nameMatches = `${h.kind.vorname} ${h.kind.nachname}`.toLowerCase().includes(filterText.toLowerCase());
    
    // Wenn "Nur unzugeordnete anzeigen" aktiv ist, dann nur Helfer zeigen, die keiner Gruppe zugewiesen sind
    if (showOnlyUnassigned) {
      const isAssigned = Object.values(zuteilungen).includes(h.id);
      return nameMatches && !isAssigned;
    }
    
    return nameMatches;
  });
  
  // Funktion zum Zuweisen eines Teamleiters zu einer Gruppe
  const assignTeamleiter = (gruppeid: string, helferid: string) => {
    // Prüfen, ob der Helfer bereits einer anderen Gruppe zugewiesen ist
    const existingAssignment = Object.entries(zuteilungen).find(([_, hid]) => hid === helferid);
    
    if (existingAssignment) {
      // Wenn ja, Zuweisung von der alten Gruppe entfernen
      const [oldGruppeId] = existingAssignment;
      setZuteilungen(prev => ({ ...prev, [oldGruppeId]: '' }));
    }
    
    // Neue Zuweisung setzen
    setZuteilungen(prev => ({ ...prev, [gruppeid]: helferid }));
  };
  
  // Funktion zum Entfernen eines Teamleiters von einer Gruppe
  const removeTeamleiter = (gruppeid: string) => {
    setZuteilungen(prev => ({ ...prev, [gruppeid]: '' }));
  };
  
  // Funktion zum Speichern der Zuteilungen
  const saveZuteilungen = async () => {
    setIsSaving(true);
    
    try {
      const supabase = createClient();
      
      // Für jede Zuteilung ein Update in der Datenbank durchführen
      const updates = Object.entries(zuteilungen).map(async ([gruppeId, helferId]) => {
        const { error } = await supabase
          .from('spielgruppen')
          .update({ teamleiter_id: helferId || null })
          .eq('id', gruppeId);
        
        if (error) throw error;
      });
      
      await Promise.all(updates);
      
      toast.success('Teamleiter wurden erfolgreich zugewiesen');
    } catch (error) {
      console.error('Fehler beim Speichern der Zuteilungen:', error);
      toast.error('Fehler beim Speichern der Zuteilungen');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <main className="p-6">
      <div className="mb-6 bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Teamleiter Zuweisung</h1>
        <p className="text-gray-600 mb-4">
          Hier können Sie den Spielgruppen Teamleiter zuweisen. Jeder Teamleiter kann nur einer Gruppe zugewiesen werden.
        </p>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <Button 
            onClick={saveZuteilungen} 
            disabled={isSaving} 
            variant="default"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Speichern...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Änderungen speichern
              </>
            )}
          </Button>
          
          <Button 
            onClick={() => setShowPdfViewer(true)} 
            variant="secondary"
          >
            <FileText className="mr-2 h-4 w-4" /> Teamleiter-Anleitungen erstellen
          </Button>
          
          <Button 
            asChild 
            variant="outline"
          >
            <Link href="/admin/helfer">
              <Users className="mr-2 h-4 w-4" /> Zurück zur Helferverwaltung
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Filter & Suchleiste */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="Filter nach Name..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        
        <div className="flex items-center">
          <input
            id="only-unassigned"
            type="checkbox"
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            checked={showOnlyUnassigned}
            onChange={(e) => setShowOnlyUnassigned(e.target.checked)}
          />
          <label htmlFor="only-unassigned" className="ml-2 block text-sm text-gray-900">
            Nur unzugeordnete Teamleiter anzeigen
          </label>
        </div>
      </div>
      
      {/* Hauptinhalt: Gruppen und Helfer */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Linke Spalte: Gruppen */}
        <div className="w-full lg:w-1/2">
          <h2 className="text-xl font-semibold mb-4">Gruppen</h2>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : gruppen.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <p className="text-gray-500">Keine Gruppen gefunden.</p>
              <p className="text-sm text-gray-400 mt-2">
                Bitte erstellen Sie zuerst Gruppen in der Gruppenverwaltung.
              </p>
              <Button 
                asChild 
                variant="outline" 
                className="mt-4"
              >
                <Link href="/admin/gruppen">
                  <Users className="mr-2 h-4 w-4" /> Zur Gruppenverwaltung
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {gruppen.map((gruppe) => (
                <GroupCard
                  key={gruppe.id}
                  gruppe={gruppe}
                  zugewiesenerHelfer={helfer.find(h => h.id === zuteilungen[gruppe.id])}
                  onRemoveTeamleiter={() => removeTeamleiter(gruppe.id)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Rechte Spalte: Teamleiter */}
        <div className="w-full lg:w-1/2">
          <h2 className="text-xl font-semibold mb-4">Verfügbare Teamleiter</h2>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredHelfer.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <p className="text-gray-500">Keine Teamleiter gefunden.</p>
              <p className="text-sm text-gray-400 mt-2">
                Bitte weisen Sie Helfern die Teamleiter-Aufgabe in der Helferverwaltung zu.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHelfer.map((helfer) => {
                // Finde die Gruppe, der dieser Helfer zugewiesen ist
                const assignedGroupId = Object.entries(zuteilungen).find(([_, hid]) => hid === helfer.id)?.[0];
                const assignedGroup = assignedGroupId ? gruppen.find(g => g.id === assignedGroupId) : undefined;
                
                return (
                  <HelferCard
                    key={helfer.id}
                    helfer={helfer}
                    isAssigned={Object.values(zuteilungen).includes(helfer.id)}
                    assignedGroupName={assignedGroup?.name}
                    onAssign={(gruppeid) => assignTeamleiter(gruppeid, helfer.id)}
                    gruppen={gruppen}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* PDF Viewer Modal */}
      {showPdfViewer && (
        <PDFViewer
          gruppen={gruppen.map(gruppe => ({
            ...gruppe,
            teamleiter: helfer.find(h => h.id === zuteilungen[gruppe.id])?.kind
          }))}
          onClose={() => setShowPdfViewer(false)}
        />
      )}
    </main>
  );
}
