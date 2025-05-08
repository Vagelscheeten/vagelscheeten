'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Pencil, Save, X, Users } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { Spielgruppe, Kind, KindZuordnung } from '@/lib/types';

// Typen für die Komponente
interface GruppenVerwaltungNeuProps {
  activeEventId: string;
  selectedKlasseName: string;
}

// Typen für die DnD-Funktionalität
interface DndItemsState {
  [key: string]: Kind[];
}

export function GruppenVerwaltungNeu({ 
  activeEventId, 
  selectedKlasseName 
}: GruppenVerwaltungNeuProps) {
  const supabase = createClient();
  
  // State für Daten
  const [spielgruppen, setSpielgruppen] = useState<Spielgruppe[]>([]);
  const [alleKinderDieserKlasse, setAlleKinderDieserKlasse] = useState<Kind[]>([]);
  const [kinderZuordnungen, setKinderZuordnungen] = useState<KindZuordnung[]>([]);
  const [dndItems, setDndItems] = useState<DndItemsState>({});
  
  // State für UI-Zustände
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAutoAssigning, setIsAutoAssigning] = useState<boolean>(false);
  const [autoAssignmentDone, setAutoAssignmentDone] = useState<boolean>(false);
  const [activeGruppeId, setActiveGruppeId] = useState<string | null>(null);
  const [editingGruppeId, setEditingGruppeId] = useState<string | null>(null);
  const [newGruppeName, setNewGruppeName] = useState<string>('');
  const [editGruppeName, setEditGruppeName] = useState<string>('');
  const [draggedKind, setDraggedKind] = useState<Kind | null>(null);
  
  // State für Dialoge
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteGruppeId, setDeleteGruppeId] = useState<string>('');
  const [autoDistributeDialogOpen, setAutoDistributeDialogOpen] = useState<boolean>(false);
  
  // Sensoren für Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Daten laden
  const loadData = useCallback(async () => {
    if (!activeEventId || !selectedKlasseName) return;
    
    setIsLoading(true);
    try {
      // 1. Spielgruppen laden
      const { data: gruppenData, error: gruppenError } = await supabase
        .from('spielgruppen')
        .select('*')
        .eq('event_id', activeEventId)
        .eq('klasse', selectedKlasseName)
        .order('name');
      
      if (gruppenError) throw new Error(`Fehler beim Laden der Spielgruppen: ${gruppenError.message}`);
      
      // Wenn keine Spielgruppen existieren, erstelle eine erste Gruppe
      if (!gruppenData || gruppenData.length === 0) {
        console.log(`Keine Spielgruppen für Klasse ${selectedKlasseName} gefunden. Erstelle erste Gruppe...`);
        
        // Immer dasselbe Format für Gruppennamen verwenden: ohne Leerzeichen
        const gruppenName = `${selectedKlasseName}-1`;
        const leiterCode = `${selectedKlasseName}-leiter`;
        
        const { data: neueGruppe, error: createError } = await supabase
          .from('spielgruppen')
          .insert({
            name: gruppenName,
            klasse: selectedKlasseName,
            event_id: activeEventId,
            leiter_zugangscode: leiterCode
          })
          .select()
          .single();
          
        if (createError) {
          throw new Error(`Fehler beim Erstellen der ersten Gruppe: ${createError.message}`);
        }
        
        console.log(`Erste Gruppe erstellt: ${gruppenName}`);
        toast.success(`Erste Gruppe erstellt: ${gruppenName}`);
        
        // Setze die Spielgruppen mit der neu erstellten Gruppe
        setSpielgruppen([neueGruppe]);
        
        // 2. Alle Kinder dieser Klasse laden
        const { data: kinderData, error: kinderError } = await supabase
          .from('kinder')
          .select('*')
          .eq('event_id', activeEventId)
          .eq('klasse', selectedKlasseName);
        
        if (kinderError) throw new Error(`Fehler beim Laden der Kinder: ${kinderError.message}`);
        setAlleKinderDieserKlasse(kinderData || []);
        
        // 3. Alle Kinder der ersten Gruppe zuordnen
        if (kinderData && kinderData.length > 0 && neueGruppe) {
          console.log(`${kinderData.length} Kinder gefunden. Ordne sie der ersten Gruppe zu...`);
          
          const zuordnungen = kinderData.map(kind => ({
            kind_id: kind.id,
            spielgruppe_id: neueGruppe.id,
            event_id: activeEventId
          }));
          
          const { error: zuordnungError } = await supabase
            .from('kind_spielgruppe_zuordnung')
            .insert(zuordnungen);
          
          if (zuordnungError) {
            console.error('Fehler beim Zuordnen der Kinder:', zuordnungError);
            toast.error(`Fehler beim Zuordnen der Kinder: ${zuordnungError.message}`);
          } else {
            console.log(`${kinderData.length} Kinder wurden der Gruppe ${gruppenName} zugeordnet`);
            toast.success(`${kinderData.length} Kinder wurden der Gruppe ${gruppenName} zugeordnet`);
            
            // Lade die Zuordnungen
            const { data: zuordnungenData } = await supabase
              .from('kind_spielgruppe_zuordnung')
              .select('*')
              .eq('event_id', activeEventId)
              .eq('spielgruppe_id', neueGruppe.id);
            
            setKinderZuordnungen(zuordnungenData || []);
          }
        } else {
          setKinderZuordnungen([]);
        }
      } else {
        // Spielgruppen existieren bereits
        setSpielgruppen(gruppenData);
        
        // 2. Alle Kinder dieser Klasse laden
        const { data: kinderData, error: kinderError } = await supabase
          .from('kinder')
          .select('*')
          .eq('event_id', activeEventId)
          .eq('klasse', selectedKlasseName);
        
        if (kinderError) throw new Error(`Fehler beim Laden der Kinder: ${kinderError.message}`);
        setAlleKinderDieserKlasse(kinderData || []);
        
        // 3. Bestehende Zuordnungen laden
        const gruppenIds = gruppenData.map(g => g.id);
        const { data: zuordnungenData, error: zuordnungenError } = await supabase
          .from('kind_spielgruppe_zuordnung')
          .select('*')
          .eq('event_id', activeEventId)
          .in('spielgruppe_id', gruppenIds);
        
        if (zuordnungenError) throw new Error(`Fehler beim Laden der Zuordnungen: ${zuordnungenError.message}`);
        setKinderZuordnungen(zuordnungenData || []);
        
        // 4. Prüfe, ob alle Kinder zugeordnet sind
        if (kinderData && kinderData.length > 0) {
          const kinderOhneZuordnung = kinderData.filter(kind => 
            !zuordnungenData?.some(z => z.kind_id === kind.id)
          );
          
          if (kinderOhneZuordnung.length > 0) {
            console.log(`${kinderOhneZuordnung.length} Kinder ohne Zuordnung gefunden. Ordne sie der ersten Gruppe zu...`);
            
            const ersteGruppe = gruppenData[0];
            const zuordnungen = kinderOhneZuordnung.map(kind => ({
              kind_id: kind.id,
              spielgruppe_id: ersteGruppe.id,
              event_id: activeEventId
            }));
            
            const { error: zuordnungError } = await supabase
              .from('kind_spielgruppe_zuordnung')
              .insert(zuordnungen);
            
            if (zuordnungError) {
              console.error('Fehler beim Zuordnen der Kinder:', zuordnungError);
              toast.error(`Fehler beim Zuordnen der Kinder: ${zuordnungError.message}`);
            } else {
              console.log(`${kinderOhneZuordnung.length} Kinder wurden der Gruppe ${ersteGruppe.name} zugeordnet`);
              toast.success(`${kinderOhneZuordnung.length} Kinder wurden der Gruppe ${ersteGruppe.name} zugeordnet`);
              
              // Lade alle Zuordnungen neu
              const { data: alleZuordnungen } = await supabase
                .from('kind_spielgruppe_zuordnung')
                .select('*')
                .eq('event_id', activeEventId)
                .in('spielgruppe_id', gruppenIds);
              
              setKinderZuordnungen(alleZuordnungen || []);
            }
          }
        }
      }
      
      // Reset des Auto-Assignment-Status, wenn die Daten neu geladen werden
      setAutoAssignmentDone(true);
      
    } catch (error: any) {
      console.error('Fehler beim Laden der Daten:', error);
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeEventId, selectedKlasseName, supabase]);
  
  // Initialer Datenload
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // DnD-Items aktualisieren, wenn sich Spielgruppen oder Zuordnungen ändern
  useEffect(() => {
    updateDndState();
  }, [spielgruppen, kinderZuordnungen, alleKinderDieserKlasse]);
  
  // Die automatische Zuweisung erfolgt jetzt direkt in der loadData-Funktion
  // Dieser useEffect ist nicht mehr notwendig
  
  // DnD-State aktualisieren
  const updateDndState = () => {
    const newItems: DndItemsState = {};
    
    // Für jede Spielgruppe die zugeordneten Kinder finden
    spielgruppen.forEach(gruppe => {
      const kinderIds = kinderZuordnungen
        .filter(z => z.spielgruppe_id === gruppe.id)
        .map(z => z.kind_id);
      
      const kinderInGruppe = alleKinderDieserKlasse.filter(kind => 
        kinderIds.includes(kind.id)
      );
      
      newItems[gruppe.id] = kinderInGruppe;
    });
    
    setDndItems(newItems);
  };
  
  // Neue Gruppe hinzufügen
  const handleCreateGruppe = async () => {
    if (!activeEventId || !selectedKlasseName) return;
    
    try {
      setIsLoading(true);
      
      // Lade alle existierenden Gruppen für diese Klasse
      const { data: existingGroups, error: loadError } = await supabase
        .from('spielgruppen')
        .select('name')
        .eq('event_id', activeEventId)
        .eq('klasse', selectedKlasseName);
      
      if (loadError) {
        throw new Error(`Fehler beim Laden existierender Gruppen: ${loadError.message}`);
      }
      
      // Finde die höchste Gruppennummer durch direkten Vergleich mit allen Gruppen
      let maxNumber = 0;
      if (existingGroups && existingGroups.length > 0) {
        console.log('Alle vorhandenen Gruppen:', existingGroups.map(g => g.name));
        
        existingGroups.forEach(gruppe => {
          // Erkenne beide Formate: mit und ohne Leerzeichen
          // Format 1: "1a-1"  (ohne Leerzeichen)
          // Format 2: "1a - 1" (mit Leerzeichen)
          const matchWithoutSpaces = gruppe.name.match(new RegExp(`${selectedKlasseName}-([0-9]+)$`));
          const matchWithSpaces = gruppe.name.match(new RegExp(`${selectedKlasseName} - ([0-9]+)$`));
          
          let num = 0;
          if (matchWithoutSpaces && matchWithoutSpaces[1]) {
            num = parseInt(matchWithoutSpaces[1], 10);
            console.log(`Gruppe '${gruppe.name}' hat Nummer ${num} (Format ohne Leerzeichen)`);
          } else if (matchWithSpaces && matchWithSpaces[1]) {
            num = parseInt(matchWithSpaces[1], 10);
            console.log(`Gruppe '${gruppe.name}' hat Nummer ${num} (Format mit Leerzeichen)`);
          }
          
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        });
      }
      
      // Neue Nummer ist die höchste gefundene + 1
      const newGroupNumber = maxNumber + 1;
      const newGroupName = `${selectedKlasseName}-${newGroupNumber}`;
      const leiterCode = `${selectedKlasseName}-leiter`;
      
      console.log(`Existierende Gruppen:`, existingGroups);
      console.log(`Höchste gefundene Nummer: ${maxNumber}`);
      console.log(`Neue Gruppe wird erstellt: ${newGroupName}`);
      
      // Neue Gruppe in der Datenbank erstellen
      const { data: newGruppe, error } = await supabase
        .from('spielgruppen')
        .insert({
          name: newGroupName,
          klasse: selectedKlasseName,
          event_id: activeEventId,
          leiter_zugangscode: leiterCode
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`Gruppe "${newGroupName}" wurde erstellt.`);
      loadData();
    } catch (error: any) {
      console.error('Fehler beim Erstellen der Gruppe:', error);
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gruppe umbenennen
  const renameGruppe = async (gruppeId: string) => {
    if (!editGruppeName.trim()) {
      toast.warning("Der Gruppenname darf nicht leer sein.");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('spielgruppen')
        .update({ name: editGruppeName.trim() })
        .eq('id', gruppeId);
      
      if (error) throw error;
      
      toast.success(`Gruppe wurde umbenannt.`);
      setEditingGruppeId(null);
      setEditGruppeName('');
      loadData();
    } catch (error: any) {
      console.error('Fehler beim Umbenennen der Gruppe:', error);
      toast.error(`Fehler: ${error.message}`);
    }
  };
  
  // Dialog zum Löschen einer Gruppe öffnen
  const handleDeleteGruppeClick = (gruppeId: string) => {
    setDeleteGruppeId(gruppeId);
    setDeleteDialogOpen(true);
  };
  
  // Gruppe löschen
  const deleteGruppe = async (gruppeId: string) => {
    const gruppe = spielgruppen.find(g => g.id === gruppeId);
    if (!gruppe) return;
    
    try {
      // Zuerst alle Zuordnungen für diese Gruppe löschen
      const { error: deleteZuordnungenError } = await supabase
        .from('kind_spielgruppe_zuordnung')
        .delete()
        .eq('spielgruppe_id', gruppeId)
        .eq('event_id', activeEventId);
      
      if (deleteZuordnungenError) throw deleteZuordnungenError;
      
      // Dann die Gruppe selbst löschen
      const { error: deleteGruppeError } = await supabase
        .from('spielgruppen')
        .delete()
        .eq('id', gruppeId);
      
      if (deleteGruppeError) throw deleteGruppeError;
      
      toast.success(`Gruppe "${gruppe.name}" wurde gelöscht.`);
      loadData();
    } catch (error: any) {
      console.error('Fehler beim Löschen der Gruppe:', error);
      toast.error(`Fehler: ${error.message}`);
    }
  };
  
  // Dialog zur automatischen Verteilung öffnen
  const handleAutoDistributeClick = () => {
    if (spielgruppen.length < 2) {
      toast.warning("Bitte erstellen Sie mindestens zwei Spielgruppen, um die Kinder zu verteilen.");
      return;
    }
    
    if (alleKinderDieserKlasse.length === 0) {
      toast.info("Keine Kinder in dieser Klasse zum Verteilen vorhanden.");
      return;
    }
    
    setAutoDistributeDialogOpen(true);
  };
  
  // Kinder automatisch auf alle Gruppen verteilen
  const handleAutoDistribute = async () => {
    
    setIsLoading(true);
    toast.info("Starte automatische Verteilung...");
    
    try {
      // Kinder nach Geschlecht trennen und mischen
      const maedchen = alleKinderDieserKlasse.filter(kind => kind.geschlecht === "Mädchen");
      const jungen = alleKinderDieserKlasse.filter(kind => kind.geschlecht === "Junge");
      
      const shuffledMaedchen = [...maedchen].sort(() => Math.random() - 0.5);
      const shuffledJungen = [...jungen].sort(() => Math.random() - 0.5);
      
      console.log(`Verteile ${shuffledMaedchen.length} Mädchen und ${shuffledJungen.length} Jungen auf ${spielgruppen.length} Gruppen`);
      
      // Neue Zuordnungen erstellen
      const neueZuordnungen: { kind_id: string; spielgruppe_id: string; event_id: string }[] = [];
      const numGruppen = spielgruppen.length;
      
      // Mädchen verteilen
      shuffledMaedchen.forEach((kind, index) => {
        const gruppenIndex = index % numGruppen;
        neueZuordnungen.push({
          kind_id: kind.id,
          spielgruppe_id: spielgruppen[gruppenIndex].id,
          event_id: activeEventId
        });
      });
      
      // Jungen verteilen
      shuffledJungen.forEach((kind, index) => {
        const gruppenIndex = index % numGruppen;
        neueZuordnungen.push({
          kind_id: kind.id,
          spielgruppe_id: spielgruppen[gruppenIndex].id,
          event_id: activeEventId
        });
      });
      
      // Alte Zuordnungen löschen
      const { error: deleteError } = await supabase
        .from('kind_spielgruppe_zuordnung')
        .delete()
        .eq('event_id', activeEventId)
        .in('spielgruppe_id', spielgruppen.map(g => g.id));
      
      if (deleteError) throw new Error(`Fehler beim Löschen alter Zuordnungen: ${deleteError.message}`);
      
      // Neue Zuordnungen einfügen
      if (neueZuordnungen.length > 0) {
        const { error: insertError } = await supabase
          .from('kind_spielgruppe_zuordnung')
          .insert(neueZuordnungen);
        
        if (insertError) throw new Error(`Fehler beim Einfügen neuer Zuordnungen: ${insertError.message}`);
      }
      
      toast.success(`${neueZuordnungen.length} Kinder wurden erfolgreich auf die Gruppen verteilt.`);
      loadData();
    } catch (error: any) {
      console.error('Fehler bei der automatischen Verteilung:', error);
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Drag-and-Drop-Funktionalität
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const kindId = active.id as string;
    const kind = alleKinderDieserKlasse.find(k => k.id === kindId);
    if (kind) {
      setDraggedKind(kind);
    }
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !draggedKind) return;
    
    const kindId = active.id as string;
    const targetGruppeId = over.id as string;
    
    // Prüfen, ob das Kind bereits in dieser Gruppe ist
    const existingZuordnung = kinderZuordnungen.find(
      z => z.kind_id === kindId && z.spielgruppe_id === targetGruppeId
    );
    
    if (existingZuordnung) {
      // Kind ist bereits in dieser Gruppe, nichts zu tun
      return;
    }
    
    try {
      // Alte Zuordnung finden und löschen
      const oldZuordnung = kinderZuordnungen.find(z => z.kind_id === kindId);
      if (oldZuordnung) {
        const { error: deleteError } = await supabase
          .from('kind_spielgruppe_zuordnung')
          .delete()
          .eq('kind_id', kindId)
          .eq('event_id', activeEventId);
        
        if (deleteError) throw deleteError;
      }
      
      // Neue Zuordnung erstellen
      const { error: insertError } = await supabase
        .from('kind_spielgruppe_zuordnung')
        .insert({
          kind_id: kindId,
          spielgruppe_id: targetGruppeId,
          event_id: activeEventId
        });
      
      if (insertError) throw insertError;
      
      // Daten neu laden
      loadData();
    } catch (error: any) {
      console.error('Fehler beim Verschieben des Kindes:', error);
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setDraggedKind(null);
    }
  };
  
  // Komponente für ein Kind
  const DraggableKindItem = ({ kind }: { kind: Kind }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
      id: kind.id,
    });
    
    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      zIndex: 1000,
    } : undefined;
    
    // Geschlecht-basierte Farbcodierung
    const genderClass = kind.geschlecht === "Mädchen" 
      ? "bg-pink-100 border-pink-300" 
      : "bg-blue-100 border-blue-300";
    
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        className={`p-2 mb-2 rounded border ${genderClass} cursor-move`}
      >
        {kind.vorname} {kind.nachname}
      </div>
    );
  };
  
  // Komponente für eine Gruppe (Dropzone)
  const DroppableContainer = ({ 
    id, 
    title, 
    children 
  }: { 
    id: string; 
    title: string; 
    children: React.ReactNode 
  }) => {
    const { isOver, setNodeRef } = useDroppable({
      id,
    });
    
    const isActive = activeGruppeId === id;
    const isEditing = editingGruppeId === id;
    
    const gruppe = spielgruppen.find(g => g.id === id);
    const kinder = dndItems[id] || [];
    const kinderCount = kinder.length;
    
    // Anzahl der Jungen und Mädchen berechnen
    const jungenCount = kinder.filter(kind => kind.geschlecht === 'Junge').length;
    const maedchenCount = kinder.filter(kind => kind.geschlecht === 'Mädchen').length;
    
    return (
      <Card className={`${isOver ? 'ring-2 ring-primary' : ''} ${isActive ? 'border-primary' : ''}`}>
        <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
          {isEditing ? (
            <div className="flex w-full space-x-2">
              <Input
                value={editGruppeName}
                onChange={(e) => setEditGruppeName(e.target.value)}
                placeholder="Gruppenname"
                className="flex-grow"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={() => renameGruppe(id)}>
                <Save className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setEditingGruppeId(null);
                setEditGruppeName('');
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <CardTitle className="text-base flex items-center">
                {title} <span className="ml-2 text-xs text-muted-foreground">
                  ({kinderCount}: {jungenCount}♂ {maedchenCount}♀)
                </span>
              </CardTitle>
              <div className="flex space-x-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setEditingGruppeId(id);
                    setEditGruppeName(gruppe?.name || '');
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleDeleteGruppeClick(id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardHeader>
        <CardContent 
          ref={setNodeRef} 
          className="p-3 min-h-[100px]"
          onClick={() => setActiveGruppeId(id)}
        >
          {children}
        </CardContent>
      </Card>
    );
  };
  
  // Hauptkomponente rendern
  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingIndicator />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Spielgruppen für {selectedKlasseName}</h3>
            <div className="flex space-x-2">
              {spielgruppen.length >= 2 && (
                <Button 
                  onClick={handleAutoDistributeClick} 
                  disabled={alleKinderDieserKlasse.length === 0 || isLoading}
                  variant="outline"
                >
                  <Users className="mr-2 h-4 w-4" /> Kinder automatisch verteilen
                </Button>
              )}
              <div className="flex space-x-2 items-center">
                <Input
                  value={newGruppeName}
                  onChange={(e) => setNewGruppeName(e.target.value)}
                  placeholder="Neue Gruppe"
                  className="w-40"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateGruppe()}
                />
                <Button onClick={handleCreateGruppe} variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Gruppe erstellen
                </Button>
              </div>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {spielgruppen.map(gruppe => (
                <DroppableContainer 
                  key={gruppe.id} 
                  id={gruppe.id} 
                  title={gruppe.name}
                >
                  {dndItems[gruppe.id]?.map(kind => (
                    <DraggableKindItem key={kind.id} kind={kind} />
                  ))}
                </DroppableContainer>
              ))}
            </div>
          </DndContext>

          {spielgruppen.length === 0 && (
            <div className="text-center text-muted-foreground mt-8">
              Noch keine Gruppen erstellt. Erstellen Sie eine neue Gruppe, um Kinder zuzuordnen.
            </div>
          )}
          
          {/* Dialoge innerhalb des return-Statements */}
          {deleteDialogOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Gruppe löschen</h2>
                <p className="mb-6">Möchten Sie die Gruppe "{spielgruppen.find(g => g.id === deleteGruppeId)?.name || ''}" wirklich löschen? Alle Kinder in dieser Gruppe werden keiner Gruppe mehr zugeordnet sein.</p>
                <div className="flex justify-end space-x-2">
                  <button 
                    className="px-4 py-2 border rounded-md" 
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    Abbrechen
                  </button>
                  <button 
                    className="px-4 py-2 bg-red-600 text-white rounded-md" 
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      deleteGruppe(deleteGruppeId);
                    }}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          )}

          {autoDistributeDialogOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Kinder automatisch verteilen</h2>
                <p className="mb-6">Möchten Sie alle Kinder automatisch auf die Gruppen verteilen? Bestehende Zuordnungen werden überschrieben.</p>
                <div className="flex justify-end space-x-2">
                  <button 
                    className="px-4 py-2 border rounded-md" 
                    onClick={() => setAutoDistributeDialogOpen(false)}
                  >
                    Abbrechen
                  </button>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-md" 
                    onClick={() => {
                      setAutoDistributeDialogOpen(false);
                      handleAutoDistribute();
                    }}
                  >
                    Verteilen
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
