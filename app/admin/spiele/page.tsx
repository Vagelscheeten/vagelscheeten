'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Pencil, PlusCircle, Trash2 } from "lucide-react";
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


// Import Tabs components from shadcn/ui
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// A — Lesbare Labels + Erklärungskarte + B — Konditionelle Felder
const WERTUNGSTYP_CONFIG: Record<WertungstypEnum, {
  label: string;
  description: string;
  example: string;
  unitExample: string;
  fields: string[];
}> = {
  WEITE_MAX_AUS_N: {
    label: 'Weitester Versuch (aus N)',
    description: 'Das Kind hat N Versuche. Der weiteste/beste Einzelversuch zählt. Mehr Distanz = besser.',
    example: 'Gummistiefelweitwurf: 3 Versuche, bester zählt',
    unitExample: 'z.B. cm, m',
    fields: ['anzahl_versuche', 'einheit'],
  },
  MENGE_MAX_ZEIT: {
    label: 'Menge in Zeitlimit',
    description: 'In einer festen Zeit so viele Einheiten wie möglich erreichen. Mehr ist besser.',
    example: 'Korbwurf: 30 Sek, so viele Treffer wie möglich',
    unitExample: 'z.B. Treffer, Körbe',
    fields: ['zeitlimit_sekunden', 'einheit'],
  },
  ZEIT_MIN_STRAFE: {
    label: 'Zeit + Strafzeit',
    description: 'Gemessene Zeit in Sekunden, plus Strafzeit für Fehler. Weniger ist besser.',
    example: 'Hindernisrennen: Zeit in Sek, +5 Sek je Fehler',
    unitExample: 'z.B. Sekunden',
    fields: ['strafzeit_sekunden', 'einheit'],
  },
  PUNKTE_SUMME_AUS_N: {
    label: 'Punktesumme (N Versuche)',
    description: 'N Versuche werden durchgeführt, alle Punkte addiert. Mehr Punkte = besser.',
    example: 'Darts: 3 Würfe, Gesamtpunktzahl zählt',
    unitExample: 'z.B. Punkte',
    fields: ['anzahl_versuche', 'einheit'],
  },
  PUNKTE_ABZUG: {
    label: 'Punkte mit Abzug',
    description: 'Startet mit einer fixen Punktzahl. Fehler ziehen Punkte ab. Mehr übrige Punkte = besser.',
    example: 'Startpunkte: 100, −5 pro Fehler',
    unitExample: 'z.B. Punkte',
    fields: ['startpunkte', 'einheit'],
  },
};

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

  // Checkbox-Toggle: Zuweisung hinzufügen oder entfernen
  const handleToggleAssignment = async (spielId: string, klasseId: string) => {
    const isAssigned = spielZuordnungen.some(z => z.spiel_id === spielId && z.klasse_id === klasseId);
    const original = [...spielZuordnungen];

    if (isAssigned) {
      setSpielZuordnungen(prev => prev.filter(z => !(z.spiel_id === spielId && z.klasse_id === klasseId)));
      const supabase = createClient();
      const { error } = await supabase.from('klasse_spiele').delete().match({ spiel_id: spielId, klasse_id: klasseId });
      if (error) {
        toast.error(`Fehler: ${error.message}`);
        setSpielZuordnungen(original);
      }
    } else {
      setSpielZuordnungen(prev => [...prev, { spiel_id: spielId, klasse_id: klasseId }]);
      const supabase = createClient();
      const { error } = await supabase.from('klasse_spiele').insert({ spiel_id: spielId, klasse_id: klasseId });
      if (error) {
        toast.error(`Fehler: ${error.message}`);
        setSpielZuordnungen(original);
      }
    }
  };

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
    <main className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Spiele Verwaltung</h1>
        <p className="text-sm text-slate-500 mt-1">Spiele anlegen und Klassen zuweisen</p>
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
                            <Badge variant="secondary">{WERTUNGSTYP_CONFIG[spiel.wertungstyp]?.label ?? spiel.wertungstyp.replace(/_/g, ' ')}</Badge>
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
              <CardTitle>Spiele zuweisen</CardTitle>
              <CardDescription>
                Wähle per Checkbox aus, welche Spiele welchen Klassen zugewiesen sind. Änderungen werden sofort gespeichert.
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
              {!isLoading && !error && klassen.length === 0 && (
                <p className="text-sm text-slate-500 py-6 text-center">
                  Keine Klassen gefunden. Bitte zuerst Klassen im Bereich „Klassen" anlegen.
                </p>
              )}
              {!isLoading && !error && spiele.length === 0 && klassen.length > 0 && (
                <p className="text-sm text-slate-500 py-6 text-center">
                  Noch keine Spiele vorhanden. Bitte zuerst Spiele im Tab „Spiele Verwalten" erstellen.
                </p>
              )}
              {!isLoading && !error && spiele.length > 0 && klassen.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 pr-8 font-medium text-slate-500 min-w-[200px] sticky left-0 bg-white">
                          Spiel
                        </th>
                        {klassen.map(klasse => {
                          const count = spielZuordnungen.filter(z => z.klasse_id === klasse.id).length;
                          return (
                            <th key={klasse.id} className="px-4 py-3 text-center min-w-[80px]">
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="font-semibold text-slate-700">{klasse.name}</span>
                                <Badge
                                  variant={count > 0 ? 'secondary' : 'outline'}
                                  className={`text-[10px] h-4 px-1.5 ${count > 0 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'text-slate-400'}`}
                                >
                                  {count} {count === 1 ? 'Spiel' : 'Spiele'}
                                </Badge>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {spiele.map(spiel => (
                        <tr key={spiel.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 pr-8 sticky left-0 bg-white hover:bg-slate-50/60">
                            <div className="flex items-center gap-2">
                              <span className="text-lg leading-none">{spiel.icon || getSpielIcon(spiel)}</span>
                              <span className="font-medium text-slate-700">{spiel.name}</span>
                            </div>
                          </td>
                          {klassen.map(klasse => {
                            const isAssigned = spielZuordnungen.some(
                              z => z.spiel_id === spiel.id && z.klasse_id === klasse.id
                            );
                            return (
                              <td key={klasse.id} className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  onChange={() => handleToggleAssignment(spiel.id, klasse.id)}
                                  className="h-4 w-4 rounded border-slate-300 cursor-pointer accent-[#F2A03D]"
                                  title={isAssigned ? `${spiel.name} aus ${klasse.name} entfernen` : `${spiel.name} zu ${klasse.name} hinzufügen`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    {/* Zusammenfassung-Zeile */}
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                        <td className="py-2 pr-8 text-xs text-slate-400 font-medium sticky left-0 bg-slate-50/50">
                          Gesamt
                        </td>
                        {klassen.map(klasse => {
                          const count = spielZuordnungen.filter(z => z.klasse_id === klasse.id).length;
                          return (
                            <td key={klasse.id} className="px-4 py-2 text-center text-xs font-semibold text-slate-500">
                              {count}/{spiele.length}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>

      {/* --- Dialogs --- */}
      {/* Create/Edit Dialog — C: scrollbares Modal mit fixem Header/Footer */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
        }
      }}>
        <DialogContent className="sm:max-w-[560px] flex flex-col max-h-[90vh] p-0 gap-0">
          {/* Fixer Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <DialogTitle>{isCreateDialogOpen ? 'Neues Spiel erstellen' : 'Spiel bearbeiten'}</DialogTitle>
            <DialogDescription>
              {isCreateDialogOpen ? 'Fülle die Details für das neue Spiel aus.' : `Ändere die Details für das Spiel "${spielToEdit?.name}".`}
            </DialogDescription>
          </DialogHeader>

          {/* Scrollbarer Body */}
          {(isCreateDialogOpen || isEditDialogOpen) && (() => {
            const wt = (isCreateDialogOpen ? newSpielData.wertungstyp : editSpielData.wertungstyp) ?? null;
            const wtConfig = wt ? WERTUNGSTYP_CONFIG[wt] : null;
            // B: Zeige Feld, wenn kein Typ gewählt (alle sichtbar) oder Typ passt
            const showField = (field: string) => !wt || (wtConfig?.fields ?? []).includes(field);
            const getVal = (field: keyof Spiel) =>
              ((isCreateDialogOpen ? newSpielData : editSpielData)[field] ?? '') as any;
            const setVal = (field: keyof Spiel, value: any) => {
              if (isCreateDialogOpen) setNewSpielData(prev => ({ ...prev, [field]: value }));
              else setEditSpielData(prev => ({ ...prev, [field]: value }));
            };
            return (
              <div className="overflow-y-auto flex-1">
                <form
                  id="spiel-form"
                  onSubmit={isCreateDialogOpen ? handleCreateSpiel : handleUpdateSpiel}
                  className="px-6 py-5 space-y-6"
                >
                  {/* D: Abschnitt Grundinfo */}
                  <div className="space-y-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Grundinfo</p>

                    <div className="grid grid-cols-4 items-start gap-3">
                      <Label htmlFor="name" className="text-right text-sm pt-2">Name *</Label>
                      <Input
                        id="name"
                        value={getVal('name')}
                        onChange={(e) => setVal('name', e.target.value)}
                        className="col-span-3"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-4 items-start gap-3">
                      <Label htmlFor="icon" className="text-right text-sm pt-2">Icon</Label>
                      <Input
                        id="icon"
                        value={getVal('icon')}
                        onChange={(e) => setVal('icon', e.target.value || null)}
                        className="col-span-3"
                        placeholder="Emoji, z.B. 🎯"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-start gap-3">
                      <Label htmlFor="ort" className="text-right text-sm pt-2">Ort</Label>
                      <Input
                        id="ort"
                        value={getVal('ort')}
                        onChange={(e) => setVal('ort', e.target.value || null)}
                        className="col-span-3"
                        placeholder="Wo findet das Spiel statt?"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-start gap-3">
                      <Label htmlFor="beschreibung" className="text-right text-sm pt-2">Beschreibung</Label>
                      <Textarea
                        id="beschreibung"
                        value={getVal('beschreibung')}
                        onChange={(e) => setVal('beschreibung', e.target.value || null)}
                        className="col-span-3"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-4 items-start gap-3">
                      <Label htmlFor="ziel" className="text-right text-sm pt-2">Ziel</Label>
                      <Textarea
                        id="ziel"
                        value={getVal('ziel')}
                        onChange={(e) => setVal('ziel', e.target.value || null)}
                        className="col-span-3"
                        rows={2}
                        placeholder="Was ist das Ziel des Spiels?"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-start gap-3">
                      <Label htmlFor="regeln" className="text-right text-sm pt-2">Spielregeln</Label>
                      <Textarea
                        id="regeln"
                        value={getVal('regeln')}
                        onChange={(e) => setVal('regeln', e.target.value || null)}
                        className="col-span-3"
                        rows={4}
                        placeholder="Beschreibe die Regeln. Verwende '- ' für Aufzählungspunkte."
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* D: Abschnitt Wertung */}
                  <div className="space-y-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Wertung</p>

                    {/* A: Wertungstyp mit lesbarem Label */}
                    <div className="grid grid-cols-4 items-start gap-3">
                      <Label htmlFor="wertungstyp" className="text-right text-sm pt-2">Typ</Label>
                      <div className="col-span-3 space-y-2">
                        <Select
                          value={wt ?? ''}
                          onValueChange={(value) => {
                            const v = value ? value as WertungstypEnum : null;
                            if (isCreateDialogOpen) setNewSpielData(prev => ({ ...prev, wertungstyp: v }));
                            else setEditSpielData(prev => ({ ...prev, wertungstyp: v }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Wertungstyp auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(WERTUNGSTYP_CONFIG) as [WertungstypEnum, typeof WERTUNGSTYP_CONFIG[WertungstypEnum]][]).map(([value, config]) => (
                              <SelectItem key={value} value={value}>{config.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* A: Erklärungskarte */}
                        {wtConfig && (
                          <div className="rounded-lg bg-orange-50 border border-orange-100 p-3 space-y-1">
                            <p className="text-xs font-semibold text-orange-700">{wtConfig.label}</p>
                            <p className="text-xs text-slate-600">{wtConfig.description}</p>
                            <p className="text-[11px] text-slate-400 italic">Beispiel: {wtConfig.example}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* B: Anz. Versuche — nur bei WEITE_MAX_AUS_N, PUNKTE_SUMME_AUS_N */}
                    {showField('anzahl_versuche') && (
                      <div className="grid grid-cols-4 items-center gap-3">
                        <Label htmlFor="anzahl_versuche" className="text-right text-sm">Anz. Versuche</Label>
                        <Input
                          id="anzahl_versuche"
                          type="number"
                          min="0"
                          value={getVal('anzahl_versuche')}
                          onChange={(e) => setVal('anzahl_versuche', e.target.value ? parseInt(e.target.value) : null)}
                          className="col-span-3"
                        />
                      </div>
                    )}

                    {/* B: Zeitlimit — nur bei MENGE_MAX_ZEIT */}
                    {showField('zeitlimit_sekunden') && (
                      <div className="grid grid-cols-4 items-center gap-3">
                        <Label htmlFor="zeitlimit_sekunden" className="text-right text-sm">Zeitlimit (sek)</Label>
                        <Input
                          id="zeitlimit_sekunden"
                          type="number"
                          min="0"
                          value={getVal('zeitlimit_sekunden')}
                          onChange={(e) => setVal('zeitlimit_sekunden', e.target.value ? parseInt(e.target.value) : null)}
                          className="col-span-3"
                        />
                      </div>
                    )}

                    {/* B: Startpunkte — nur bei PUNKTE_ABZUG */}
                    {showField('startpunkte') && (
                      <div className="grid grid-cols-4 items-center gap-3">
                        <Label htmlFor="startpunkte" className="text-right text-sm">Startpunkte</Label>
                        <Input
                          id="startpunkte"
                          type="number"
                          value={getVal('startpunkte')}
                          onChange={(e) => setVal('startpunkte', e.target.value ? parseInt(e.target.value) : null)}
                          className="col-span-3"
                        />
                      </div>
                    )}

                    {/* B: Strafzeit — nur bei ZEIT_MIN_STRAFE */}
                    {showField('strafzeit_sekunden') && (
                      <div className="grid grid-cols-4 items-center gap-3">
                        <Label htmlFor="strafzeit_sekunden" className="text-right text-sm">Strafzeit (sek)</Label>
                        <Input
                          id="strafzeit_sekunden"
                          type="number"
                          min="0"
                          value={getVal('strafzeit_sekunden')}
                          onChange={(e) => setVal('strafzeit_sekunden', e.target.value ? parseInt(e.target.value) : null)}
                          className="col-span-3"
                        />
                      </div>
                    )}

                    {/* Einheit — bei ausgewähltem Wertungstyp */}
                    {wt && (
                      <div className="grid grid-cols-4 items-center gap-3">
                        <Label htmlFor="einheit" className="text-right text-sm">Einheit</Label>
                        <Input
                          id="einheit"
                          value={getVal('einheit')}
                          onChange={(e) => setVal('einheit', e.target.value || null)}
                          className="col-span-3"
                          placeholder={wtConfig?.unitExample ?? 'z.B. cm, Punkte'}
                        />
                      </div>
                    )}
                  </div>
                </form>
              </div>
            );
          })()}

          {/* Fixer Footer */}
          <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
              }}
              disabled={isSaving || isUpdating}
            >
              Abbrechen
            </Button>
            <Button type="submit" form="spiel-form" disabled={isSaving || isUpdating}>
              {(isSaving || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {(isSaving || isUpdating) ? 'Speichern...' : (isCreateDialogOpen ? 'Spiel speichern' : 'Änderungen speichern')}
            </Button>
          </div>
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
