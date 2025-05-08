import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ImportDialog from './ImportDialog';
import { Trash2, Edit, Upload, ArrowUpDown } from 'lucide-react'; // Import icons

// Import Table components from shadcn/ui
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import react-table core components
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  Row,
  HeaderGroup,
  Header,
  Cell,
  ColumnFiltersState, // Import for filtering
  getFilteredRowModel, // Import for filtering
  RowSelectionState // Import for row selection
} from "@tanstack/react-table";

// Import Dialog components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Import DialogClose
} from "@/components/ui/dialog"

// Import Checkbox
import { Checkbox } from '@/components/ui/checkbox'; // Reverted to alias path
import { CheckedState } from '@radix-ui/react-checkbox'; // Import CheckedState for types
import { Badge } from '@/components/ui/badge'; // Import Badge for showing selection count

// Import AlertDialog components
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Constants for dropdown options
const KLASSEN_OPTIONEN = ["Schuli", "1a", "1b", "2a", "2b", "3a", "3b", "4a", "4b"];

// Import Types (Using the new types.ts file)
import { Kind, Spielgruppe, KindZuordnung } from '@/lib/types';

// Define correct props passed from the parent page
interface KinderVerwaltungProps {
  alleKinderDesEvents: Kind[];
  spielgruppenDieserKlasse: Spielgruppe[];
  kinderZuordnungen: KindZuordnung[];
  selectedKlasseName: string; // Ersetzt selectedKlasseId
  activeEventId: string;
  onKinderChange: () => void; // Callback to notify parent of changes
  isLoading: boolean; // Loading state from parent
}

function KinderVerwaltung({
  alleKinderDesEvents,
  spielgruppenDieserKlasse,
  kinderZuordnungen,
  selectedKlasseName, // Ersetzt selectedKlasseId
  activeEventId,
  onKinderChange, // Use this callback when changes occur
  isLoading // Use this loading state from parent
}: KinderVerwaltungProps) {
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [geschlecht, setGeschlecht] = useState('Junge');
  const [klasse, setKlasse] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]); // State for sorting
  const [editingKind, setEditingKind] = useState<Kind | null>(null); // State for the kind being edited
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // State for edit dialog visibility
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({}); // State for row selection
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]); // State for column filters
  const [batchKlasse, setBatchKlasse] = useState<string>(''); // State for batch class update input
  const [klassenFilter, setKlassenFilter] = useState<string>(''); // State for klasse filter
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [kindToDelete, setKindToDelete] = useState<string | null>(null);

  const supabase = createClient();

  const handleDeleteClick = (kindId: string) => {
    setKindToDelete(kindId);
    setIsDeleteDialogOpen(true);
  };

  const deleteKind = async () => {
    if (!kindToDelete) return;
    
    try {
      const { error: zuordnungError } = await supabase
        .from('kind_spielgruppe_zuordnung')
        .delete()
        .eq('kind_id', kindToDelete);

      if (zuordnungError && zuordnungError.code !== '42P01') {
        throw zuordnungError;
      }

      const { error } = await supabase
        .from('kinder')
        .delete()
        .eq('id', kindToDelete);

      if (error) throw error;

      onKinderChange();
      toast.success('Kind wurde gelöscht');
    } catch (error: any) {
      console.error('Fehler beim Löschen des Kindes:', error);
      toast.error(`Fehler beim Löschen: ${error.message}`);
    } finally {
      setIsDeleteDialogOpen(false);
      setKindToDelete(null);
    }
  };

  // --- Edit Functionality --- 
  const handleEdit = (kind: Kind) => {
    setEditingKind(kind); // Set the kind to edit
    setIsEditDialogOpen(true); // Open the dialog
  };

  const handleSaveEdit = async () => {
    if (!editingKind) return;
    
    try {
      const { error } = await supabase
        .from('kinder')
        .update({
          vorname: editingKind.vorname,
          nachname: editingKind.nachname,
          geschlecht: editingKind.geschlecht,
          klasse: editingKind.klasse,
        })
        .eq('id', editingKind.id);

      if (error) throw error;
      
      // Update local state immediately for better UX
      onKinderChange();
      
      toast.success('Kind wurde aktualisiert');
      setIsEditDialogOpen(false); // Close dialog
      setEditingKind(null); // Reset editing state

    } catch (error: any) {
      console.error('Fehler beim Aktualisieren des Kindes:', error);
      toast.error(`Fehler beim Aktualisieren: ${error.message}`);
    }
  };
  // --- End Edit Functionality ---

  // --- Batch Update Function --- 
  const handleBatchUpdateKlasse = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0 || !batchKlasse) {
      toast.warning("Bitte wählen Sie Kinder aus und geben Sie eine neue Klasse ein.");
      return;
    }

    const selectedKindIds = selectedRows.map(row => row.original.id).filter(id => id !== undefined) as string[]; // Ensure IDs are strings

    if (selectedKindIds.length === 0) {
      toast.error("Konnte keine gültigen IDs für die ausgewählten Kinder finden.");
      return;
    }

    try {
      const { error } = await supabase
        .from('kinder')
        .update({ klasse: batchKlasse })
        .in('id', selectedKindIds);

      if (error) {
        throw error;
      }

      toast.success(`${selectedKindIds.length} Kind(er) erfolgreich der Klasse "${batchKlasse}" zugewiesen.`);
      onKinderChange(); // Reload data to reflect changes
      setBatchKlasse(''); // Reset dropdown
      table.resetRowSelection(); // Reset selection

    } catch (error: any) {
      console.error('Fehler beim Batch-Update der Klasse:', error);
      toast.error(`Fehler beim Aktualisieren der Klassen: ${error.message}`);
    }
  };
  // --- End Batch Update Function ---


  const columns: ColumnDef<Kind>[] = [
    // Checkbox column for row selection
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center w-8 h-8">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value: CheckedState) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Alle auswählen"
            className="w-5 h-5" // Größere Checkbox
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center w-8 h-8">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value: CheckedState) => row.toggleSelected(!!value)}
            aria-label="Zeile auswählen"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="w-5 h-5" // Größere Checkbox
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "vorname",
      // Make header clickable for sorting
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Vorname
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        return <div className="text-center">{row.getValue("vorname")}</div>
      },
    },
    {
      accessorKey: "nachname",
      // Make header clickable for sorting
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Nachname
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        return <div className="text-center">{row.getValue("nachname")}</div>
      },
    },
    {
      accessorKey: "geschlecht",
      // Make header clickable for sorting
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Geschlecht
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        return <div className="text-center">{row.getValue("geschlecht")}</div>
      },
    },
    {
      accessorKey: "klasse",
      // Make header clickable for sorting
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Klasse
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        return <div className="text-center">{row.getValue("klasse")}</div>
      },
      filterFn: 'includesString', // Enable filtering for this column
    },
    {
      id: "actions",
      header: () => <div className="text-center"></div>, // Leere Überschrift mit zentrierter Ausrichtung
      cell: ({ row }: { row: Row<Kind> }) => { // Added type annotation for row
        const kind = row.original
        return (
          <div className="flex justify-center"> 
            <Button variant="ghost" size="icon" title="Kind löschen" onClick={(e: React.MouseEvent) => { // Add type React.MouseEvent
              e.stopPropagation(); // Prevent row click from triggering edit
              handleDeleteClick(kind.id!); 
            }}> 
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  // Extrahiere alle einzigartigen Klassen aus den Kinderdaten (mit Null-Check)
  const uniqueKlassen = React.useMemo(() => {
    return [...new Set(alleKinderDesEvents
      .filter(kind => kind && kind.klasse) // Filtere Kinder ohne Klasse heraus
      .map(kind => kind.klasse))]
      .sort();
  }, [alleKinderDesEvents]);

  // Setze den Klassenfilter zurück, wenn die ausgewählte Klasse nicht mehr existiert
  // Verwende useEffect mit einer Referenz, um Endlosschleifen zu vermeiden
  const previousKlassenFilterRef = useRef(klassenFilter);
  useEffect(() => {
    // Nur ausführen, wenn sich der Filter geändert hat
    if (previousKlassenFilterRef.current !== klassenFilter) {
      previousKlassenFilterRef.current = klassenFilter;
      
      // Nur zurücksetzen, wenn der Filter nicht 'all' ist und die Klasse nicht existiert
      if (klassenFilter && 
          klassenFilter !== 'all' && 
          uniqueKlassen.length > 0 && 
          !uniqueKlassen.includes(klassenFilter)) {
        // Verwende setTimeout, um die Aktualisierung in die nächste Event-Schleife zu verschieben
        setTimeout(() => setKlassenFilter('all'), 0);
      }
    }
  }, [klassenFilter, uniqueKlassen]);

  // Filtere Kinder basierend auf dem Klassenfilter (mit Memoization)
  const filteredKinder = React.useMemo(() => {
    if (!klassenFilter || klassenFilter === 'all') {
      return alleKinderDesEvents;
    }
    return alleKinderDesEvents.filter(kind => kind && kind.klasse === klassenFilter);
  }, [alleKinderDesEvents, klassenFilter]);
    
  const table = useReactTable({
    data: filteredKinder, // Verwende die gefilterten Kinder
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters, // Handle filter changes
    getFilteredRowModel: getFilteredRowModel(), // Get filtered rows
    onRowSelectionChange: setRowSelection, // Handle selection changes
    enableRowSelection: true, // Enable row selection
    state: {
      sorting,
      columnFilters, // Pass filter state
      rowSelection, // Pass selection state
    },
  })

  const addKind = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vorname || !nachname || !klasse) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('kinder')
        .insert({
          vorname,
          nachname,
          geschlecht,
          klasse,
          event_id: activeEventId
        })
        .select()
        .single();

      if (error) throw error;

      onKinderChange();

      setVorname('');
      setNachname('');
      setGeschlecht('Junge');
      setKlasse('');
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Kindes:', error);
      toast.error('Fehler beim Hinzufügen des Kindes');
    }
  };

  const handleImportComplete = () => {
    setShowImportDialog(false);
    onKinderChange();
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div></div>
        <Button
          onClick={() => setShowImportDialog(true)}
          disabled={isLoading || !activeEventId}
          variant="default"
        >
          Kinder importieren
        </Button>
      </div>

      {showImportDialog && (
        <div className="mb-6">
          <ImportDialog
            eventId={activeEventId}
            onImportComplete={handleImportComplete}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Kind hinzufügen</CardTitle>
            <CardDescription>Füge ein einzelnes Kind hinzu</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={addKind} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vorname">Vorname</Label>
                  <Input
                    id="vorname"
                    value={vorname}
                    onChange={(e) => setVorname(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nachname">Nachname</Label>
                  <Input
                    id="nachname"
                    value={nachname}
                    onChange={(e) => setNachname(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="geschlecht">Geschlecht</Label>
                  <select
                    id="geschlecht"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={geschlecht}
                    onChange={(e) => setGeschlecht(e.target.value)}
                    required
                  >
                    <option value="Junge">Junge</option>
                    <option value="Mädchen">Mädchen</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="klasse">Klasse</Label>
                  <Input
                    id="klasse"
                    value={klasse}
                    onChange={(e) => setKlasse(e.target.value)}
                    placeholder="z.B. 2a, Schuli"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading}>
                Kind hinzufügen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kinderliste</CardTitle>
          <CardDescription>Übersicht aller erfassten Kinder</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter Dropdown */}
          <div className="flex items-center py-4 space-x-4">
            <Label htmlFor="klassen-filter" className="text-base">Nach Klasse filtern:</Label>
            <div className="relative w-[180px] md:w-[220px]">
              <select
                id="klassen-filter"
                value={klassenFilter || 'all'}
                onChange={(e) => {
                  // Verwende eine Callback-Funktion, um den aktuellsten Zustand zu erhalten
                  setKlassenFilter(e.target.value);
                }}
                className="w-full h-10 px-4 py-2 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                // Deaktiviere den Filter, wenn keine Klassen vorhanden sind
                disabled={isLoading || uniqueKlassen.length === 0}
              >
                <option value="all">Alle Klassen</option>
                {uniqueKlassen.map((klasse) => (
                  <option key={klasse} value={klasse}>
                    {klasse}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Batch Action Section */}
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <div className="flex items-center space-x-2 py-4 px-3 border rounded-md bg-muted/50 mb-4">
              <Badge variant="secondary">{table.getFilteredSelectedRowModel().rows.length} ausgewählt</Badge>
              {/* Replace Input with Select Dropdown */}
              <select
                value={batchKlasse}
                onChange={(e) => setBatchKlasse(e.target.value)}
                className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Klasse wählen --</option>
                {KLASSEN_OPTIONEN.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <Button 
                onClick={handleBatchUpdateKlasse} 
                size="sm"
                disabled={!batchKlasse} // Disable if no class is entered
              >
                Klasse für Auswahl ändern
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => table.resetRowSelection()} // Button to clear selection
              >
                Auswahl aufheben
              </Button>
            </div>
          )}

          {isLoading && alleKinderDesEvents.length === 0 ? (
            <p>Lade Kinder...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup: HeaderGroup<Kind>) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header: Header<Kind, unknown>) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            // Render the sortable header
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row: Row<Kind>) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className="cursor-pointer hover:bg-muted/50" // Add hover effect and pointer
                        onClick={() => handleEdit(row.original)} // Add onClick handler to trigger edit
                      >
                        {row.getVisibleCells().map((cell: Cell<Kind, unknown>) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        {alleKinderDesEvents.length === 0 ? "Noch keine Kinder für dieses Event erfasst." : "Keine Ergebnisse."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Kind bearbeiten</DialogTitle>
            <DialogDescription>
              Ändere die Daten für {editingKind?.vorname} {editingKind?.nachname}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Vorname */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-vorname" className="text-right">
                Vorname
              </Label>
              <Input
                id="edit-vorname"
                value={editingKind?.vorname || ''} // Handle potential undefined
                onChange={(e) => setEditingKind(prev => prev ? { ...prev, vorname: e.target.value } : null)}
                className="col-span-3"
              />
            </div>
            {/* Nachname */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-nachname" className="text-right">
                Nachname
              </Label>
              <Input
                id="edit-nachname"
                value={editingKind?.nachname || ''} // Handle potential undefined
                onChange={(e) => setEditingKind(prev => prev ? { ...prev, nachname: e.target.value } : null)}
                className="col-span-3"
              />
            </div>
            {/* Geschlecht */}
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-geschlecht" className="text-right">Geschlecht</Label>
                <Select 
                    value={editingKind?.geschlecht || undefined} // Handle potential undefined for Select
                    onValueChange={(value) => setEditingKind(prev => prev ? { ...prev, geschlecht: value as "Junge" | "Mädchen" } : null)} // Type assertion added
                >
                    <SelectTrigger id="edit-geschlecht" className="col-span-3">
                        <SelectValue placeholder="Geschlecht wählen" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Junge">Junge</SelectItem>
                        <SelectItem value="Mädchen">Mädchen</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {/* Klasse */}
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-klasse" className="text-right">
                Klasse
              </Label>
              <Input
                id="edit-klasse"
                value={editingKind?.klasse ?? ''} // Use ?? '' to handle null/undefined
                onChange={(e) => setEditingKind(prev => prev ? { ...prev, klasse: e.target.value } : null)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Abbrechen
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveEdit} disabled={isLoading}>
              {isLoading ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog für Löschbestätigung */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Möchtest du dieses Kind wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dies kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={deleteKind}>Ok</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default KinderVerwaltung;
