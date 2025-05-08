'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { AlertCircle, GripVertical, Info, Loader2, Pencil, PlusCircle, Trash2, X } from "lucide-react";
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"; // Import AlertDialog components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  UniqueIdentifier,
  DragOverlay,
  pointerWithin,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy, // Or choose another strategy
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Import Tabs components from shadcn/ui
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KlassenMigrationButton from "./KlassenMigrationButton";

// Import Badge component
import { Badge } from "@/components/ui/badge";

// Interface for Spiel data based on assumed table structure
type WertungstypEnum = 
  | 'PUNKTE_ABZUG'
  | 'MENGE_MAX_ZEIT'
  | 'PUNKTE_SUMME_AUS_N'
  | 'ZEIT_MIN_STRAFE'
  | 'WEITE_MAX_AUS_N'; // Add other possible enum values from your DB

interface Spiel {
  id: string; // UUID
  name: string;
  beschreibung?: string | null;
  ziel?: string | null;
  ort?: string | null;
  regeln?: string | null;
  icon?: string | null;
  wertungstyp?: WertungstypEnum | null;
  anzahl_versuche?: number | null; 
  zeitlimit_sekunden?: number | null;
  startpunkte?: number | null;
  strafzeit_sekunden?: number | null;
  einheit?: string | null;
  created_at?: string; // Optional timestamp, keep if it exists
}

// Interface for Klasse (replacing Klassenstufe)
type Klasse = Database['public']['Tables']['klassen']['Row'];
// Add type for Event
type Event = Database['public']['Tables']['events']['Row'];

// Interface for SpielZuordnung (using new join table)
interface SpielZuordnung { // Renaming might not be strictly needed but helps clarity
  spiel_id: string;
  klasse_id: string; // Changed from klassenstufe_id
  // Could add primary key 'id' if needed
}

const ALL_GAMES_CONTAINER_ID = '__all_games__'; // Container for all available games

// Funktion, um ein passendes Icon für ein Spiel zu bestimmen
function getSpielIcon(spiel: Spiel): string {
  // Wenn ein Icon in der Datenbank gespeichert ist, dieses verwenden
  if (spiel.icon) return spiel.icon;
  
  // Ansonsten ein passendes Icon basierend auf dem Namen auswählen
  const name = spiel.name.toLowerCase();
  
  if (name.includes('schießen') || name.includes('armbrust')) return '🏹';
  if (name.includes('ball') || name.includes('werfen')) return '🎯';
  if (name.includes('fisch')) return '🐟';
  if (name.includes('glücksrad')) return '🎡';
  if (name.includes('stiefel') || name.includes('gummistiefel')) return '👢';
  if (name.includes('schatz')) return '💰';
  if (name.includes('rennen') || name.includes('roller')) return '🛴';
  if (name.includes('draht')) return '⚡';
  
  // Standardicon, falls keine Übereinstimmung gefunden wurde
  return '🎮';
}

export default function SpieleVerwaltung() {
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [klassen, setKlassen] = useState<Klasse[]>([]); // Renamed from klassenstufen
  const [spielZuordnungen, setSpielZuordnungen] = useState<SpielZuordnung[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true); // Separate loading for event
  const [error, setError] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  // State for tracking the currently dragged item's ID (for DragOverlay)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // State for the Create New Game Dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSpielData, setNewSpielData] = useState<Partial<Spiel>>({ name: '' }); 
  const [isSaving, setIsSaving] = useState(false);

  // State for the Edit Game Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [spielToEdit, setSpielToEdit] = useState<Spiel | null>(null);
  const [editSpielData, setEditSpielData] = useState<Partial<Spiel>>({}); 
  const [isUpdating, setIsUpdating] = useState(false);

  // State for Delete Confirmation
  const [spielToDelete, setSpielToDelete] = useState<Spiel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Function to fetch the active event
  const fetchActiveEvent = useCallback(async () => {
    setIsLoadingEvent(true);
    setError(null);
    const supabase = createClient();
    try {
      const { data, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('ist_aktiv', true)
        .single();

      if (eventError) {
        if (eventError.code === 'PGRST116') {
          throw new Error('Kein aktives Event gefunden. Bitte im Event-Management ein Event aktivieren.');
        } else {
          throw eventError;
        }
      }
      if (data?.id) {
        setActiveEventId(data.id);
      } else {
        throw new Error('Aktives Event konnte nicht geladen werden (keine ID).');
      }
    } catch (err: any) {
      console.error('Error fetching active event:', err);
      setError(`Fehler beim Laden des aktiven Events: ${err.message}`);
      toast.error(`Aktives Event nicht geladen: ${err.message}`);
      setActiveEventId(null);
    } finally {
      setIsLoadingEvent(false);
    }
  }, []);

  // Function to fetch games (wrapped in useCallback)
  const fetchData = useCallback(async () => {
    if (!activeEventId) {
        setIsLoading(false);
        return; // Don't fetch if no active event
    }
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      // Fetch spiele and all zuordnungen first
      const [spieleRes, klassenRes, zuordnungenRes] = await Promise.all([
        supabase.from('spiele').select('*').order('name', { ascending: true }),
        // Fetch klassen for the active event
        supabase.from('klassen').select('*').eq('event_id', activeEventId).order('name', { ascending: true }),
        // Fetch only assignments for the active event
        supabase.from('klasse_spiele').select('spiel_id, klasse_id')
      ]);

      // Check for errors in each response
      if (spieleRes.error) throw spieleRes.error;
      if (klassenRes.error) throw klassenRes.error;
      if (zuordnungenRes.error) throw zuordnungenRes.error;

      // Set simple states
      setSpiele(spieleRes.data || []);
      setKlassen(klassenRes.data || []);

      // Filterung der Zuordnungen nach Klassen des aktuellen Events
      const currentEventKlassenIds = new Set(klassenRes.data?.map(k => k.id) || []);
      const filteredZuordnungen = (zuordnungenRes.data || []).filter(z => 
          currentEventKlassenIds.has(z.klasse_id)
      );
      setSpielZuordnungen(filteredZuordnungen);

    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      const errorMessage = `Fehler beim Laden der Daten: ${error.message}`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [activeEventId]); // Depend on activeEventId

  // Fetch Active Event on Mount
  useEffect(() => {
    fetchActiveEvent();
  }, [fetchActiveEvent]);

  // Fetch Game Data once Active Event is known
  useEffect(() => {
    if (activeEventId) {
        fetchData();
    }
     // Clear data if active event becomes null
    else if (!isLoadingEvent) { // Avoid clearing while event is still loading
        setSpiele([]);
        setKlassen([]);
        setSpielZuordnungen([]);
        setIsLoading(false); // Ensure loading state is reset
    }
  }, [activeEventId, fetchData, isLoadingEvent]);

  // Function to handle creating a new game
  const handleCreateSpiel = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Explicitly check if name exists and is not just whitespace
    if (!newSpielData.name || !newSpielData.name.trim()) {
      toast.error("Der Spielname darf nicht leer sein.");
      setIsSaving(false); // Also need to reset saving state here
      return;
    }
    setIsSaving(true); // Set saving state
    const supabase = createClient();
    
    // Prepare data, ensuring numeric fields are numbers or null
    const dataToInsert = {
      name: newSpielData.name!.trim(), // Use non-null assertion, check above guarantees it exists
      beschreibung: newSpielData.beschreibung?.trim() || null,
      ziel: newSpielData.ziel?.trim() || null,
      ort: newSpielData.ort?.trim() || null,
      regeln: newSpielData.regeln?.trim() || null,
      icon: newSpielData.icon?.trim() || null,
      wertungstyp: newSpielData.wertungstyp || null,
      anzahl_versuche: newSpielData.anzahl_versuche ? Number(newSpielData.anzahl_versuche) : null,
      zeitlimit_sekunden: newSpielData.zeitlimit_sekunden ? Number(newSpielData.zeitlimit_sekunden) : null,
      startpunkte: newSpielData.startpunkte ? Number(newSpielData.startpunkte) : null,
      strafzeit_sekunden: newSpielData.strafzeit_sekunden ? Number(newSpielData.strafzeit_sekunden) : null,
      einheit: newSpielData.einheit?.trim() || null,
    };

    const { data, error: insertError } = await supabase
      .from('spiele')
      .insert(dataToInsert)
      .select() // Select the inserted data to confirm
      .single(); // Expecting a single row back

    setIsSaving(false);

    if (insertError) {
      console.error("Error creating spiel:", insertError);
      toast.error(`Spiel konnte nicht erstellt werden: ${insertError.message}`);
    } else if (data) {
      toast.success(`Spiel "${data.name}" erfolgreich erstellt!`);
      setIsCreateDialogOpen(false); // Close dialog on success
      // Reset form fields
      setNewSpielData({ name: '' });
      fetchData(); // Refresh all data (including spiele)
    }
  };

  // --- Edit Spiel Functions ---
  const openEditDialog = (spiel: Spiel) => {
    setSpielToEdit(spiel);
    // Populate editSpielData with current values, handling nulls/undefined for form display
    setEditSpielData({
      name: spiel.name ?? '',
      beschreibung: spiel.beschreibung ?? '',
      ziel: spiel.ziel ?? '',
      ort: spiel.ort ?? '',
      regeln: spiel.regeln ?? '',
      icon: spiel.icon ?? '',
      wertungstyp: spiel.wertungstyp ?? null,
      // Use undefined or '' for optional number inputs to avoid '0' display issues if null
      anzahl_versuche: spiel.anzahl_versuche ?? undefined, 
      zeitlimit_sekunden: spiel.zeitlimit_sekunden ?? undefined,
      startpunkte: spiel.startpunkte ?? undefined,
      strafzeit_sekunden: spiel.strafzeit_sekunden ?? undefined,
      einheit: spiel.einheit ?? '',
    });
    setIsUpdating(false); // Reset update state when opening
    setIsEditDialogOpen(true);
  };

  const handleUpdateSpiel = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Explicitly check if spielToEdit exists and name exists and is not just whitespace
    if (!spielToEdit || !editSpielData.name || !editSpielData.name.trim()) {
      toast.error("Der Spielname darf nicht leer sein.");
      setIsUpdating(false); // Reset updating state here
      return;
    }
    setIsUpdating(true);
    const supabase = createClient();
    
    // Prepare data, ensuring numeric fields are numbers or null
    const dataToUpdate = {
      name: editSpielData.name!.trim(), // Use non-null assertion, check above guarantees it exists
      beschreibung: editSpielData.beschreibung?.trim() || null,
      ziel: editSpielData.ziel?.trim() || null,
      ort: editSpielData.ort?.trim() || null,
      regeln: editSpielData.regeln?.trim() || null,
      icon: editSpielData.icon?.trim() || null,
      wertungstyp: editSpielData.wertungstyp || null,
      anzahl_versuche: editSpielData.anzahl_versuche ? Number(editSpielData.anzahl_versuche) : null,
      zeitlimit_sekunden: editSpielData.zeitlimit_sekunden ? Number(editSpielData.zeitlimit_sekunden) : null,
      startpunkte: editSpielData.startpunkte ? Number(editSpielData.startpunkte) : null,
      strafzeit_sekunden: editSpielData.strafzeit_sekunden ? Number(editSpielData.strafzeit_sekunden) : null,
      einheit: editSpielData.einheit?.trim() || null,
    };

    const { data, error: updateError } = await supabase
      .from('spiele')
      .update(dataToUpdate)
      .eq('id', spielToEdit.id)
      .select()
      .single();

    setIsUpdating(false);

    if (updateError) {
      console.error("Error updating spiel:", updateError);
      toast.error(`Spiel konnte nicht aktualisiert werden: ${updateError.message}`);
    } else if (data) {
      toast.success(`Spiel "${data.name}" erfolgreich aktualisiert!`);
      setIsEditDialogOpen(false);
      setSpielToEdit(null);
      fetchData(); // Refresh all data
    }
  };

  // --- Delete Spiel Functions ---
  const openDeleteDialog = (spiel: Spiel) => {
    setSpielToDelete(spiel);
  };

  const handleDeleteSpiel = async () => {
    if (!spielToDelete) return;

    setIsDeleting(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from('spiele')
      .delete()
      .eq('id', spielToDelete.id);

    setIsDeleting(false);

    if (deleteError) {
      console.error("Error deleting spiel:", deleteError);
      toast.error(`Spiel konnte nicht gelöscht werden: ${deleteError.message}`);
    } else {
      toast.success(`Spiel "${spielToDelete.name}" erfolgreich gelöscht!`);
      setSpielToDelete(null); // Close the dialog by resetting the state
      fetchData(); // Refresh all data
    }
  };

  // --- Drag and Drop Handlers --- //

  // Function to handle drag start - Sets the activeId for the overlay
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    // Wichtig: Wir setzen die activeId auf die ID des Spiels, das der Benutzer tatsächlich angeklickt hat
    // Dadurch wird sichergestellt, dass immer die angeklickte Karte an der Maus hängt
    setActiveId(active.id);
  };

  // Central logic for updating state after drag ends - NEEDS COMPLETE REWRITE for M:N
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null); // Reset activeId regardless of outcome

    // Ensure we have a valid drop target (over) and it's not the original container
    if (!over || !active) {
      return; // No valid drop target
    }

    const activeSpielId = active.id.toString();
    const targetContainerId = over.id.toString();

    // --- Check 1: Prevent dropping onto the 'All Games' list itself --- 
    if (targetContainerId === ALL_GAMES_CONTAINER_ID) {
      // Maybe show a message? For now, just return.
      console.log("Cannot drop onto the 'All Games' list.");
      return;
    }

    // --- Check 2: Verify the target is a valid Klasse ID --- 
    const targetKlasse = klassen.find(k => k.id === targetContainerId);
    if (!targetKlasse) {
      console.error(`Invalid drop target container ID: ${targetContainerId}`);
      toast.error("Ungültiges Ziel zum Ablegen des Spiels.");
      return;
    }

    // --- Check 3: Prevent adding if the game is already assigned to this Klasse --- 
    const isAlreadyAssigned = spielZuordnungen.some(
      z => z.spiel_id === activeSpielId && z.klasse_id === targetContainerId
    );

    if (isAlreadyAssigned) {
      const spielName = spiele.find(s => s.id === activeSpielId)?.name ?? 'Dieses Spiel';
      toast.info(`"${spielName}" ist bereits der Stufe "${targetKlasse.name}" zugewiesen.`);
      return;
    }

    // --- Add the new assignment --- 
    const spielToAdd = spiele.find(s => s.id === activeSpielId);
    if (!spielToAdd) {
      console.error(`Dragged Spiel with ID ${activeSpielId} not found in state.`);
      toast.error("Fehler: Gezogenes Spiel nicht gefunden.");
      return;
    }

    const newAssignment: SpielZuordnung = {
      spiel_id: activeSpielId,
      klasse_id: targetContainerId,
    };

    // Optimistic UI Update
    const originalZuordnungen = [...spielZuordnungen];
    setSpielZuordnungen(prev => [...prev, newAssignment]);
    toast.success(`"${spielToAdd.name}" zur Stufe "${targetKlasse.name}" hinzugefügt.`);

    // Add to Database
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from('klasse_spiele')
      .insert({ 
        spiel_id: newAssignment.spiel_id, 
        klasse_id: newAssignment.klasse_id
      });

    if (insertError) {
      console.error('Error adding spiel assignment:', insertError);
      toast.error(`Fehler beim Hinzufügen von "${spielToAdd.name}": ${insertError.message}`);
      // Revert optimistic UI update
      setSpielZuordnungen(originalZuordnungen);
    }
  }, [spiele, klassen, spielZuordnungen]); // Add dependencies as needed

  // Function to remove a Spiel assignment from a Klasse
  const handleRemoveAssignment = async (spielIdToRemove: string, klasseIdToRemove: string) => {
    const spielName = spiele.find(s => s.id === spielIdToRemove)?.name ?? 'Unbekanntes Spiel';
    const stufeName = klassen.find(k => k.id === klasseIdToRemove)?.name ?? 'Unbekannte Stufe';

    // Optimistic UI update: Remove the assignment from the local state
    const originalZuordnungen = [...spielZuordnungen];
    setSpielZuordnungen(prev => prev.filter(z => !(z.spiel_id === spielIdToRemove && z.klasse_id === klasseIdToRemove)));
    toast.success(`Zuordnung von "${spielName}" zu Stufe "${stufeName}" entfernt.`);

    // Remove from database
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from('klasse_spiele')
      .delete()
      .match({ 
        spiel_id: spielIdToRemove, 
        klasse_id: klasseIdToRemove
      });

    if (deleteError) {
      console.error('Error removing spiel assignment:', deleteError);
      toast.error(`Fehler beim Entfernen der Zuordnung von "${spielName}": ${deleteError.message}`);
      // Revert optimistic UI update on error
      setSpielZuordnungen(originalZuordnungen);
    }
  };

  // --- Helper Components --- //

  // --- Draggable Spiel Item Component (for M:N) ---
  interface DraggableSpielItemProps {
    spiel: Spiel;
    mode: 'manage' | 'assign'; // Determine which actions to show
    onEdit?: (spiel: Spiel) => void; // Optional: Used in 'manage' mode
    onDelete?: (spiel: Spiel) => void; // Optional: Used in 'manage' mode
    onRemoveAssignment?: () => void; // Optional: Used in 'assign' mode
  }

  function DraggableSpielItem({ spiel, mode, onEdit, onDelete, onRemoveAssignment }: DraggableSpielItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isOver } = useSortable({ id: spiel.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isOver ? 0.5 : 1,
      zIndex: isOver ? 100 : 'auto',
      cursor: isOver ? 'grabbing' : undefined, // Cursor only changes while dragging
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-card p-2 rounded-md shadow-sm border flex justify-between items-center touch-manipulation ${isOver ? 'ring-2 ring-primary' : ''} hover:bg-accent/50 hover:shadow-md transition-all duration-150`}
      >
        <div className="flex items-center flex-grow min-w-0 space-x-2">
          {/* Make the Grip the drag handle */} 
          <button {...listeners} {...attributes} className="cursor-grab p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded">
            <GripVertical size={16} />
          </button>
          <span className="font-medium truncate" title={spiel.name}>{spiel.name}</span>
        </div>
        <div className="flex-shrink-0 flex items-center space-x-1">
          {mode === 'manage' && onEdit && onDelete && (
            <div className="flex space-x-1">
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onEdit(spiel)} title="Bearbeiten">
                <Pencil size={14} />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => onDelete(spiel)} title="Löschen">
                <Trash2 size={14} />
              </Button>
            </div>
          )}
          {mode === 'assign' && onRemoveAssignment && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onRemoveAssignment} title="Zuweisung aufheben">
              <X size={16} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // --- Droppable Container Component (for M:N) ---
  interface DroppableContainerProps {
    id: string;
    title: string;
    items: Spiel[];
    isMasterList: boolean;
    containerMode: 'manage' | 'assign'; // Explicitly set mode for items within this container
    onEdit?: (spiel: Spiel) => void; // Optional: Used in 'manage' mode
    onDelete?: (spiel: Spiel) => void; // Optional: Used in 'manage' mode
    onRemoveAssignment?: (spielId: string, containerId: string) => void; // Optional: Used in 'assign' mode
  }

  function DroppableContainer({ 
    id, 
    title, 
    items, 
    isMasterList, 
    containerMode, // Receive the container mode
    onEdit, // Now optional
    onDelete, // Now optional
    onRemoveAssignment // Now optional
  }: DroppableContainerProps) {
    const { setNodeRef, isOver } = useDroppable({ id });
    const itemIds = useMemo(() => items.map(item => item.id), [items]);

    return (
      <div
        ref={setNodeRef}
        className={`min-w-[280px] max-w-[350px] p-3 rounded-lg flex flex-col flex-shrink-0 ${isMasterList ? 'bg-background border' : 'bg-muted'} ${isOver ? 'ring-2 ring-primary outline-none shadow-lg transition-all duration-200' : 'transition-all duration-200'}`}
      >
        <h3 className={`font-semibold mb-3 px-1 sticky top-0 z-10 py-1 ${isMasterList ? 'bg-background' : 'bg-muted'}`}>{title}</h3>
        
        {/* Unterschiedliche Darstellung je nach Container-Typ */}
        {isMasterList ? (
          // Für den Master-Container (verfügbare Spiele) die normale Darstellung mit Drag-Karten
          <SortableContext id={id.toString()} items={itemIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 overflow-y-auto flex-grow min-h-[150px]"> {/* Scrollable area */} 
              {items.length > 0 ? (
                items.map(spiel => (
                  <DraggableSpielItem
                    key={spiel.id}
                    spiel={spiel}
                    mode={containerMode}
                    onEdit={onEdit ? () => onEdit(spiel) : undefined}
                    onDelete={onDelete ? () => onDelete(spiel) : undefined}
                  />
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-4">
                  Keine Spiele gefunden.
                </div>
              )}
            </div>
          </SortableContext>
        ) : (
          // Für Klassen-Container eine kompakte Liste mit Text-Einträgen
          <div className="space-y-1 overflow-y-auto flex-grow min-h-[150px]">
            {items.length > 0 ? (
              <ul className="divide-y divide-muted-foreground/20">
                {items.map(spiel => (
                  <li key={spiel.id} className="py-1.5 px-1 flex justify-between items-center group hover:bg-accent/30 rounded-sm">
                    <span className="text-sm font-medium truncate">{spiel.name}</span>
                    {onRemoveAssignment && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => onRemoveAssignment(spiel.id, id)}
                        title="Zuweisung entfernen"
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-4">
                {isOver ? "Spiel hier ablegen..." : "Keine Spiele zugewiesen."}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- Render Logic --- //

  if (isLoading) {
    return (
      <main className="p-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Lade Spieldaten...</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Spiele Verwaltung</h1>
      </div>

      <Tabs defaultValue="zuweisen" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="verwalten">Spiele Verwalten</TabsTrigger>
          <TabsTrigger value="zuweisen">Spiele Zuweisen</TabsTrigger>
        </TabsList>

        <TabsContent value="verwalten">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Spiele Verwalten</CardTitle>
              <CardDescription>Erstelle, bearbeite oder lösche Spiele.</CardDescription>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm"> 
                <PlusCircle className="mr-2 h-4 w-4" /> Neues Spiel
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isLoading && !error && spiele.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Ort</TableHead>
                      <TableHead className="hidden md:table-cell">Ziel</TableHead>
                      <TableHead className="hidden lg:table-cell">Wertungstyp</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spiele.map((spiel) => (
                      <TableRow key={spiel.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{spiel.icon || getSpielIcon(spiel)}</span>
                            <span>{spiel.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell truncate max-w-xs" title={spiel.ort ?? ''}>
                          {spiel.ort ?? '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell truncate max-w-xs" title={spiel.ziel ?? ''}>
                          {spiel.ziel ?? '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {spiel.wertungstyp ? (
                            <Badge variant="secondary">{spiel.wertungstyp.replace(/_/g, ' ')}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(spiel)} title="Bearbeiten">
                            <Pencil size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => openDeleteDialog(spiel)} title="Löschen">
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!isLoading && !error && spiele.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Noch keine Spiele erstellt.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zuweisen">
          <Card>
            <CardHeader>
              <CardTitle>Spiele Zuweisen</CardTitle>
              <CardDescription>
                Ziehe Spiele aus der Liste "Alle verfügbaren Spiele" auf die gewünschte Klasse.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Fehler beim Laden</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {!isLoading && !error && (
                <>
                  {/* Header mit Hinweis und Import-Button */}
                  <div className="mb-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <Info className="h-5 w-5 mr-2 text-primary" />
                      <p className="text-sm">Spiele können per Drag & Drop mehreren Klassen zugewiesen werden.</p>
                    </div>
                    <KlassenMigrationButton onSuccess={fetchData} />
                  </div>
                  
                  <DndContext
                    sensors={sensors}
                    collisionDetection={pointerWithin} // Use pointerWithin for better accuracy with nested containers
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Spieleliste oben als horizontaler Container */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold mb-4">Verfügbare Spiele ({spiele.length})</h3>
                      <div className="bg-background border rounded-lg p-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          {spiele.map(spiel => (
                            <DraggableSpielItem
                              key={spiel.id}
                              spiel={spiel}
                              mode="assign"
                              onEdit={() => openEditDialog(spiel)}
                              onDelete={() => openDeleteDialog(spiel)}
                            />
                          ))}
                          {spiele.length === 0 && (
                            <div className="text-sm text-muted-foreground p-2">Keine Spiele gefunden.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Klassen darunter in einem Grid */}
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">Klassen ({klassen.length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {klassen.map((klasse) => {
                          const assignedSpielIds = spielZuordnungen
                            .filter(z => z.klasse_id === klasse.id)
                            .map(z => z.spiel_id);
                          const itemsInContainer = spiele.filter(s => assignedSpielIds.includes(s.id));
                          const count = itemsInContainer.length;

                          return (
                            <DroppableContainer
                              key={klasse.id}
                              id={klasse.id}
                              title={`${klasse.name} (${count} Spiele)`} // Add count here
                              items={itemsInContainer}
                              isMasterList={false}
                              containerMode="assign" // All containers in this tab are assign mode
                              // No onEdit/onDelete for assignment lists
                              onRemoveAssignment={handleRemoveAssignment} // Pass the main remove handler
                            />
                          );
                        })}
                      </div>
                    </div>

                    <DragOverlay>
                      {activeId ? (
                        (() => {
                          const activeSpiel = spiele.find(s => s.id === activeId);
                          return activeSpiel ? (
                            <DraggableSpielItem spiel={activeSpiel} mode="assign" />
                          ) : null;
                        })()
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>

      {/* --- Dialogs --- */} 
      {/* Create/Edit Dialog */} 
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isCreateDialogOpen ? 'Neues Spiel erstellen' : 'Spiel bearbeiten'}</DialogTitle>
            <DialogDescription>
              {isCreateDialogOpen ? 'Fülle die Details für das neue Spiel aus.' : `Ändere die Details für das Spiel "${spielToEdit?.name}".`}
            </DialogDescription>
          </DialogHeader>
          {(isCreateDialogOpen || isEditDialogOpen) && (
            <form onSubmit={isCreateDialogOpen ? handleCreateSpiel : handleUpdateSpiel} className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name*
                </Label>
                <Input
                  id="name"
                  value={isCreateDialogOpen ? newSpielData.name : editSpielData.name ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isCreateDialogOpen) {
                      setNewSpielData(prev => ({ ...prev, name: value }));
                    } else {
                      setEditSpielData(prev => ({ ...prev, name: value }));
                    }
                  }}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="beschreibung" className="text-right">
                  Beschreibung
                </Label>
                <Textarea
                  id="beschreibung"
                  value={isCreateDialogOpen ? newSpielData.beschreibung ?? '' : editSpielData.beschreibung ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isCreateDialogOpen) {
                      setNewSpielData(prev => ({ ...prev, beschreibung: value || null }));
                    } else {
                      setEditSpielData(prev => ({ ...prev, beschreibung: value || null }));
                    }
                  }}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ziel" className="text-right">
                  Ziel
                </Label>
                <Textarea
                  id="ziel"
                  value={isCreateDialogOpen ? newSpielData.ziel ?? '' : editSpielData.ziel ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isCreateDialogOpen) {
                      setNewSpielData(prev => ({ ...prev, ziel: value || null }));
                    } else {
                      setEditSpielData(prev => ({ ...prev, ziel: value || null }));
                    }
                  }}
                  className="col-span-3"
                  rows={2}
                  placeholder="Was ist das Ziel des Spiels?"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ort" className="text-right">
                  Ort
                </Label>
                <Input
                  id="ort"
                  value={isCreateDialogOpen ? newSpielData.ort ?? '' : editSpielData.ort ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isCreateDialogOpen) {
                      setNewSpielData(prev => ({ ...prev, ort: value || null }));
                    } else {
                      setEditSpielData(prev => ({ ...prev, ort: value || null }));
                    }
                  }}
                  className="col-span-3"
                  placeholder="Wo findet das Spiel statt?"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="regeln" className="text-right">
                  Spielregeln
                </Label>
                <Textarea
                  id="regeln"
                  value={isCreateDialogOpen ? newSpielData.regeln ?? '' : editSpielData.regeln ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isCreateDialogOpen) {
                      setNewSpielData(prev => ({ ...prev, regeln: value || null }));
                    } else {
                      setEditSpielData(prev => ({ ...prev, regeln: value || null }));
                    }
                  }}
                  className="col-span-3"
                  rows={4}
                  placeholder="Beschreibe die Regeln des Spiels. Verwende '- ' für Aufzählungspunkte."
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="icon" className="text-right">
                  Icon (Emoji)
                </Label>
                <Input
                  id="icon"
                  value={isCreateDialogOpen ? newSpielData.icon ?? '' : editSpielData.icon ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isCreateDialogOpen) {
                      setNewSpielData(prev => ({ ...prev, icon: value || null }));
                    } else {
                      setEditSpielData(prev => ({ ...prev, icon: value || null }));
                    }
                  }}
                  className="col-span-3"
                  placeholder="Emoji für das Spiel, z.B. 🎯"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="wertungstyp" className="text-right">
                  Wertungstyp
                </Label>
                <Select
                  value={isCreateDialogOpen ? newSpielData.wertungstyp ?? '' : editSpielData.wertungstyp ?? ''}
                  onValueChange={(value) => {
                    const wertungstypValue = value ? value as WertungstypEnum : null;
                    if (isCreateDialogOpen) {
                      setNewSpielData(prev => ({ ...prev, wertungstyp: wertungstypValue }));
                    } else {
                      setEditSpielData(prev => ({ ...prev, wertungstyp: wertungstypValue }));
                    }
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Wertungstyp auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUNKTE_ABZUG">Punkte Abzug</SelectItem>
                    <SelectItem value="MENGE_MAX_ZEIT">Menge Max Zeit</SelectItem>
                    <SelectItem value="PUNKTE_SUMME_AUS_N">Punkte Summe aus N</SelectItem>
                    <SelectItem value="ZEIT_MIN_STRAFE">Zeit Min Strafe</SelectItem>
                    <SelectItem value="WEITE_MAX_AUS_N">Weite Max aus N</SelectItem>
                    {/* Add other WertungstypEnum values here if needed */}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="anzahl_versuche" className="text-right">
                  Anz. Versuche
                </Label>
                <Input
                  id="anzahl_versuche"
                  type="number"
                  min="0"
                  value={isCreateDialogOpen ? newSpielData.anzahl_versuche ?? '' : editSpielData.anzahl_versuche ?? ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    if (isCreateDialogOpen) {
                      setNewSpielData(prev => ({ ...prev, anzahl_versuche: value }));
                    } else {
                      setEditSpielData(prev => ({ ...prev, anzahl_versuche: value }));
                    }
                  }}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="zeitlimit_sekunden" className="text-right">
                  Zeitlimit (sek)
                </Label>
                <Input
                  id="zeitlimit_sekunden"
                  type="number"
                  min="0"
                  value={isCreateDialogOpen ? newSpielData.zeitlimit_sekunden ?? '' : editSpielData.zeitlimit_sekunden ?? ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    if (isCreateDialogOpen) {
                      setNewSpielData(prev => ({ ...prev, zeitlimit_sekunden: value }));
                    } else {
                      setEditSpielData(prev => ({ ...prev, zeitlimit_sekunden: value }));
                    }
                  }}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startpunkte" className="text-right">
                  Startpunkte
                </Label>
                <Input
                  id="startpunkte"
                  type="number"
                  // Allow negative numbers if needed, remove min="0"
                  value={isCreateDialogOpen ? newSpielData.startpunkte ?? '' : editSpielData.startpunkte ?? ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    if (isCreateDialogOpen) {
                      setNewSpielData(prev => ({ ...prev, startpunkte: value }));
                    } else {
                      setEditSpielData(prev => ({ ...prev, startpunkte: value }));
                    }
                  }}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="strafzeit_sekunden" className="text-right">
                  Strafzeit (sek)
                </Label>
                <Input
                  id="strafzeit_sekunden"
                  type="number"
                  min="0"
                  value={isCreateDialogOpen ? newSpielData.strafzeit_sekunden ?? '' : editSpielData.strafzeit_sekunden ?? ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    if (isCreateDialogOpen) {
                      setNewSpielData(prev => ({ ...prev, strafzeit_sekunden: value }));
                    } else {
                      setEditSpielData(prev => ({ ...prev, strafzeit_sekunden: value }));
                    }
                  }}
                  className="col-span-3"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                }} disabled={isSaving || isUpdating}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSaving || isUpdating}>
                  {(isSaving || isUpdating) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {(isSaving || isUpdating) ? 'Speichern...' : (isCreateDialogOpen ? 'Spiel speichern' : 'Änderungen speichern')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* --- Delete Spiel AlertDialog --- */}
      {spielToDelete && (
        <AlertDialog open={!!spielToDelete} onOpenChange={(open: boolean) => !open && setSpielToDelete(null)}> {/* Controlled AlertDialog */}
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Spiel wirklich löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Möchtest du das Spiel "{spielToDelete?.name}" wirklich unwiderruflich löschen?
                Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSpielToDelete(null)} disabled={isDeleting}>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSpiel} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isDeleting ? 'Löschen...' : 'Endgültig löschen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </main>
  );
}
