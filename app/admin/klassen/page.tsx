'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client'; // Corrected path
import { Database } from '@/lib/database.types'; // Import updated types
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input
import { Label } from '@/components/ui/label'; // Import Label
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // Import Dialog components
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'; // Import AlertDialog components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react'; // Icons for buttons
import { toast } from 'sonner'; // Corrected import from sonner library

// Define the type for a class based on the new schema
type Klasse = Database['public']['Tables']['klassen']['Row'];
// Define the type for an event
type Event = Database['public']['Tables']['events']['Row'];

export default function KlassenVerwaltungPage() {
  const supabase = createClient();
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false); // State for Add/Edit Dialog
  const [newClassName, setNewClassName] = useState(''); // State for new class name input
  const [editingKlasse, setEditingKlasse] = useState<Klasse | null>(null); // State for the class being edited
  const [isSaving, setIsSaving] = useState(false); // State for saving indicator
  const [isAlertOpen, setIsAlertOpen] = useState(false); // State for Delete Confirmation Dialog
  const [klasseToDeleteId, setKlasseToDeleteId] = useState<string | null>(null); // State for ID of class to delete
  const [isSyncingKlassen, setIsSyncingKlassen] = useState(false); // State for syncing classes from kinder table

  // Function to fetch the active event
  const fetchActiveEvent = useCallback(async () => {
    setError(null);
    try {
      const { data, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('ist_aktiv', true)
        .single(); // Expecting only one active event

      if (eventError) {
        if (eventError.code === 'PGRST116') { // code for 'no rows found'
          throw new Error('Kein aktives Event gefunden. Bitte im Event-Management ein Event aktivieren.');
        } else {
          throw eventError;
        }
      }
      if (data?.id) {
        setActiveEventId(data.id);
      } else {
        // This case should technically be covered by the error handling above,
        // but added for robustness.
        throw new Error('Aktives Event konnte nicht geladen werden (keine ID).');
      }
    } catch (err: any) { // Explicitly type err as any or Error
      console.error('Error fetching active event:', err);
      setError(`Fehler beim Laden des aktiven Events: ${err.message}`);
      toast.error(`Aktives Event nicht geladen: ${err.message}`);
      setActiveEventId(null); // Ensure activeEventId is null on error
      setLoading(false); // Stop loading if event fetch fails
    }
  }, [supabase]);

  // Function to fetch classes for the active event
  const fetchKlassen = useCallback(async () => {
    if (!activeEventId) {
      // Don't fetch classes if we don't have an active event ID
      setKlassen([]); // Clear existing classes
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: klassenError } = await supabase
        .from('klassen')
        .select('*')
        .eq('event_id', activeEventId) // Filter by active event
        .order('name', { ascending: true });

      if (klassenError) throw klassenError;
      setKlassen(data || []);
    } catch (err: any) { // Explicitly type err as any or Error
      console.error('Error fetching klassen:', err);
      setError('Fehler beim Laden der Klassen.');
      toast.error('Die Klassen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [supabase, activeEventId]);

  // Fetch active event on component mount
  useEffect(() => {
    fetchActiveEvent();
  }, [fetchActiveEvent]);

  // Fetch classes when active event ID is available
  useEffect(() => {
    if (activeEventId) {
      fetchKlassen();
    }
  }, [activeEventId, fetchKlassen]);

  // Function to handle opening the Add dialog
  const handleAddKlasseClick = () => {
    if (!activeEventId) {
      toast.error('Kann keine Klasse hinzufügen, da kein aktives Event gefunden wurde.');
      return;
    }
    setNewClassName(''); // Reset form fields
    setEditingKlasse(null); // Ensure we are in 'add' mode
    setIsDialogOpen(true); // Open the dialog
  };

  // Function to handle updating an existing class
  const handleUpdateKlasse = async () => {
    if (!editingKlasse) return;
    if (!newClassName.trim()) {
        toast.error('Klassenname darf nicht leer sein.');
        return;
    }

    setIsSaving(true);
    try {
        const { error: updateError } = await supabase
            .from('klassen')
            .update({ name: newClassName.trim() })
            .eq('id', editingKlasse.id);

        if (updateError) throw updateError;

        toast.success(`Klasse "${newClassName.trim()}" erfolgreich aktualisiert.`);
        setIsDialogOpen(false); // Close dialog on success
        fetchKlassen(); // Refresh the class list

    } catch (err: any) {
        console.error('Error updating klasse:', err);
        toast.error(`Fehler beim Aktualisieren der Klasse: ${err.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  // Function to handle saving the new class
  const handleSaveNewKlasse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission
    if (!activeEventId) {
      toast.error('Fehler: Kein aktives Event für das Speichern vorhanden.');
      return;
    }
    if (!newClassName.trim()) {
      toast.error('Klassenname darf nicht leer sein.');
      return;
    }

    setIsSaving(true);
    try {
      const { error: insertError } = await supabase
        .from('klassen')
        .insert({
          name: newClassName.trim(),
          event_id: activeEventId, // Include the active event ID
        });

      if (insertError) throw insertError;

      toast.success(`Klasse "${newClassName.trim()}" erfolgreich hinzugefügt.`);
      setIsDialogOpen(false); // Close dialog on success
      fetchKlassen(); // Refresh the class list

    } catch (err: any) {
      console.error('Error saving new klasse:', err);
      toast.error(`Fehler beim Speichern der Klasse: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Combined submit handler for the form
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingKlasse) {
        await handleUpdateKlasse();
    } else {
        await handleSaveNewKlasse(event); // Pass event for potential future use
    }
  };

  // Function to handle opening the Edit dialog
  const handleEditKlasseClick = (klasse: Klasse) => {
    setEditingKlasse(klasse);
    setNewClassName(klasse.name); // Pre-fill the input
    setIsDialogOpen(true);
  };

  // Function to trigger the delete confirmation
  const handleDeleteKlasseClick = (klasseId: string) => {
    setKlasseToDeleteId(klasseId);
    setIsAlertOpen(true);
  };

  // Function to sync classes from kinder table
  const syncKlassenFromKinder = async () => {
    if (!activeEventId) {
      toast.error('Fehler: Kein aktives Event für die Synchronisierung vorhanden.');
      return;
    }

    setIsSyncingKlassen(true);
    try {
      // 1. Get all unique classes from kinder table
      const { data: kinderKlassen, error: kinderError } = await supabase
        .from('kinder')
        .select('klasse')
        .eq('event_id', activeEventId)
        .not('klasse', 'is', null);

      if (kinderError) throw kinderError;

      // 2. Extract unique class names and filter out empty values
      const uniqueKlassen = [...new Set(kinderKlassen
        .map(k => k.klasse?.trim())
        .filter(k => k && k.length > 0))];

      // 3. Get existing classes for this event with IDs
      const { data: existingKlassen, error: existingError } = await supabase
        .from('klassen')
        .select('id, name')
        .eq('event_id', activeEventId);

      if (existingError) throw existingError;

      // 4. Find new classes that don't exist yet
      const existingNames = existingKlassen.map(k => k.name);
      const newKlassen = uniqueKlassen.filter(k => !existingNames.includes(k as string));

      // 5. Find existing classes that are no longer in the kinder table
      const classesToRemove = existingKlassen.filter(k => !uniqueKlassen.includes(k.name));

      // 6. Insert new classes
      if (newKlassen.length > 0) {
        const newKlassenObjects = newKlassen.map(name => ({
          name: name as string,
          event_id: activeEventId
        }));

        const { error: insertError } = await supabase
          .from('klassen')
          .insert(newKlassenObjects);

        if (insertError) throw insertError;

        toast.success(`${newKlassen.length} neue Klasse(n) erfolgreich importiert.`);
      }

      // 7. Remove classes that no longer exist in the kinder table
      if (classesToRemove.length > 0) {
        // Check if any of these classes have children assigned to them
        const classIdsToRemove = classesToRemove.map(k => k.id);
        
        // First, check if any of these classes have dependencies
        // This is a safety check to avoid foreign key violations
        const { data: dependencies, error: dependencyError } = await supabase
          .from('kind_spielgruppe_zuordnung')
          .select('id')
          .in('spielgruppe_id', (await supabase
            .from('spielgruppen')
            .select('id')
            .in('klasse', classesToRemove.map(k => k.name))
            .then(res => res.data?.map(g => g.id) || [])))
          .limit(1);
        
        if (dependencyError) throw dependencyError;
        
        if (dependencies && dependencies.length > 0) {
          toast.warning(`${classesToRemove.length} Klasse(n) konnten nicht entfernt werden, da ihnen noch Kinder zugeordnet sind.`);
        } else {
          // Delete the classes if no dependencies exist
          const { error: deleteError } = await supabase
            .from('klassen')
            .delete()
            .in('id', classIdsToRemove);

          if (deleteError) throw deleteError;

          toast.success(`${classesToRemove.length} nicht mehr verwendete Klasse(n) erfolgreich entfernt.`);
        }
      }

      // 8. Summary message if no changes were made
      if (newKlassen.length === 0 && classesToRemove.length === 0) {
        toast.info('Keine Änderungen notwendig. Klassenliste ist bereits aktuell.');
      }

      // 9. Refresh the class list
      fetchKlassen();

    } catch (err: any) {
      console.error('Error syncing classes from kinder:', err);
      toast.error(`Fehler bei der Synchronisierung: ${err.message}`);
    } finally {
      setIsSyncingKlassen(false);
    }
  };

  // Function to perform the actual deletion after confirmation
  const confirmDeleteKlasse = async () => {
    if (!klasseToDeleteId) return;

    // Optional: Add check for dependencies (e.g., assigned games) here later

    try {
      const { error: deleteError } = await supabase
        .from('klassen')
        .delete()
        .match({ id: klasseToDeleteId });

      if (deleteError) throw deleteError;

      toast.success('Klasse erfolgreich gelöscht.');
      fetchKlassen(); // Refresh list

    } catch (err: any) {
      console.error('Error deleting klasse:', err);
      // Provide more specific error if possible (e.g., foreign key violation)
      if (err.code === '23503') { // PostgreSQL foreign key violation code
           toast.error('Fehler: Klasse kann nicht gelöscht werden, da ihr noch Spiele zugeordnet sind.');
      } else {
           toast.error(`Fehler beim Löschen der Klasse: ${err.message}`);
      }
    } finally {
      setKlasseToDeleteId(null); // Reset the ID
      // No need to manually close dialog here, AlertDialogAction does it
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Klassen Verwalten</h1>
        <div className="flex gap-2">
          <Button 
            onClick={syncKlassenFromKinder}
            disabled={isSyncingKlassen || loading || !activeEventId}
            variant="outline"
          >
            {isSyncingKlassen ? (
              <>
                <span className="animate-spin mr-2">⟳</span> Synchronisiere...
              </>
            ) : (
              <>
                <span className="mr-2">⟳</span> Aus Kinderliste importieren
              </>
            )}
          </Button>
          <Button onClick={handleAddKlasseClick}>
            <PlusCircle className="mr-2 h-4 w-4" /> Neue Klasse
          </Button>
        </div>
      </div>

      {loading && <p>Lade Daten...</p>}
      {error && (
        <div className="text-red-500 bg-red-100 border border-red-400 p-4 rounded mb-4">
          <p><b>Fehler:</b></p>
          <p>{error}</p>
          {/* Optional: Suggest action if no active event */} 
          {!activeEventId && error.includes('Kein aktives Event') && (
             <p className="mt-2">Bitte gehe zur <a href="/admin/events" className="underline">Event-Verwaltung</a> und aktiviere ein Event.</p>
          )}
        </div>
      )}

      {/* Only show table if not loading, no error, and an active event exists */}
      {!loading && !error && activeEventId && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {klassen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center">Keine Klassen gefunden.</TableCell>
              </TableRow>
            ) : (
              klassen.map((klasse) => (
                <TableRow key={klasse.id}>
                  <TableCell>{klasse.name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEditKlasseClick(klasse)} className="mr-2">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteKlasseClick(klasse.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      {/* Add/Edit Class Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
              setEditingKlasse(null); // Reset editing state when dialog closes
          }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}> {/* Use combined submit handler */}
            <DialogHeader>
              <DialogTitle>{editingKlasse ? 'Klasse bearbeiten' : 'Neue Klasse hinzufügen'}</DialogTitle>
              <DialogDescription>
                {editingKlasse
                  ? 'Ändere den Namen der Klasse.'
                  : 'Gib den Namen für die neue Klasse ein.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="col-span-3"
                  required // HTML5 validation
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Speichern...' : (editingKlasse ? 'Änderungen speichern' : 'Speichern')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird die Klasse
              "{klassen.find(k => k.id === klasseToDeleteId)?.name ?? ''}" dauerhaft gelöscht.
              Eventuell zugeordnete Spiele müssen manuell neu zugewiesen werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setKlasseToDeleteId(null)}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteKlasse} className="bg-red-600 hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
