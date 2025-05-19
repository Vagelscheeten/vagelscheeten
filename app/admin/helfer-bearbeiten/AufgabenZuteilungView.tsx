'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ZuteilungManuellModal } from './ZuteilungManuellModal';
import { ZuteilungBearbeitenModal } from './ZuteilungBearbeitenModal';

// Typen für die Daten (ggf. anpassen/erweitern oder aus zentraler Datei importieren)
type Aufgabe = {
  id: string;
  titel: string;
  zeitfenster: 'vormittag' | 'nachmittag' | 'ganztag'; // Annahme
  anzahl_benoetigt?: number; // Annahme
  // Weitere Felder...
};

type Zuteilung = {
  id: string;
  kind_identifier: string;
  aufgabe_id: string;
  via_springer: boolean;
  kinder: { // Angenommen, wir joinen die Kinderdaten
    id: string;
    vorname: string;
    nachname: string;
    klasse: string;
  } | null;
  // Zusätzliche Felder für die Bearbeitung
  kind_id: string;
  kind_name: string;
  aufgabe_titel: string;
  // Weitere Felder, die in der Zuteilung vorhanden sein könnten
  [key: string]: any;
};

// Type for raw data coming from Supabase select with join
type SupabaseZuteilung = {
  id: string;
  kind_identifier: string;
  aufgabe_id: string;
  via_springer: boolean;
  created_at: string; // Included from '*'
  kinder: { 
    id: string;
    vorname: string;
    nachname: string;
    klasse: string;
  } | null;
};

export function AufgabenZuteilungView() {
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [zuteilungen, setZuteilungen] = useState<Zuteilung[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedKind, setSelectedKind] = useState<{id: string, name: string} | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const openModal = (kindId?: string, kindName?: string) => {
    if (kindId && kindName) {
      setSelectedKind({ id: kindId, name: kindName });
    } else {
      setSelectedKind(null);
    }
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedKind(null);
  };
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<{id: string, kindName: string, aufgabeTitel: string} | null>(null);
  const [selectedZuteilung, setSelectedZuteilung] = useState<Zuteilung | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    // 1. Aufgaben laden
    const { data: aufgabenData, error: aufgabenError } = await supabase
      .from('helferaufgaben')
      .select('*')
      .order('titel', { ascending: true }); // Beispiel-Sortierung

    if (aufgabenError) {
      console.error('Fehler beim Laden der Aufgaben:', aufgabenError);
      setError('Aufgaben konnten nicht geladen werden.');
      setIsLoading(false);
      return;
    }
    setAufgaben(aufgabenData || []);

    // 2. Zuteilungen laden (mit Kinderdaten)
    const { data: zuteilungenData, error: zuteilungenError } = await supabase
      .from('helfer_zuteilungen')
      .select(`
        *,
        kinder ( id, vorname, nachname, klasse ),
        externe_helfer ( id, name )
      `);

    if (zuteilungenError) {
      console.error('Fehler beim Laden der Zuteilungen:', zuteilungenError);
      setError('Zuteilungen konnten nicht geladen werden.');
    } else {
      if (zuteilungenData) {
        console.log('Erhaltene Zuteilungen:', zuteilungenData);
      }
      // Wir müssen sicherstellen, dass kinder nicht null ist, falls der Join fehlschlägt
      try {
        // Explicitly type 'z' and the return type of map
        const validZuteilungen = (zuteilungenData || []).map((z: any): Zuteilung => {
          // Name ermitteln, entweder vom Kind oder externen Helfer
          let helferName = 'Unbekannt';
          if (z.kinder) {
            helferName = `${z.kinder.vorname} ${z.kinder.nachname}`;
          } else if (z.externer_helfer) {
            helferName = `${z.externer_helfer.name} (Extern)`;
          }

          return {
            ...z,
            kinder: z.kinder, // Kann null sein, wenn kein Kind gefunden wird
            kind_id: z.kinder?.id || '',
            kind_name: helferName,
            aufgabe_titel: '' // Wird später in der UI gesetzt
          };
        });
        setZuteilungen(validZuteilungen);
      } catch (err) {
        console.error('Fehler beim Verarbeiten der Zuteilungen:', err);
        setError('Zuteilungen konnten nicht verarbeitet werden.');
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // openModal und closeModal sind weiter oben definiert

  const openEditModal = (zuteilung: Zuteilung, aufgabeTitel: string) => {
    if (!zuteilung.kinder) {
      toast.error('Fehler: Keine Kindinformationen verfügbar');
      return;
    }
    
    // Erstelle eine neue Zuteilung mit den aktualisierten Werten
    const updatedZuteilung: Zuteilung = {
      ...zuteilung,
      kind_id: zuteilung.kinder.id,
      kind_name: `${zuteilung.kinder.vorname} ${zuteilung.kinder.nachname}`,
      aufgabe_titel: aufgabeTitel
    };
    
    setSelectedZuteilung(updatedZuteilung);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedZuteilung(null);
  };

  const handleSuccess = () => {
    toast.success('Zuteilung erfolgreich gespeichert!');
    loadData(); // Reload data to show the new assignment
  };

  const handleRemoveAssignment = async (assignmentId: string, kindName: string, aufgabeTitel: string) => {
    setPendingDeletion({ id: assignmentId, kindName, aufgabeTitel });
    setIsDeleteDialogOpen(true);
  };

  const confirmRemoveAssignment = async () => {
    if (!pendingDeletion) return;
    
    const { id: assignmentId, kindName, aufgabeTitel } = pendingDeletion;
    
    toast.loading('Entferne Zuteilung...');
    const supabase = createClient();
    try {
      const { error: deleteError } = await supabase
        .from('helfer_zuteilungen')
        .delete()
        .eq('id', assignmentId);

      if (deleteError) {
        throw deleteError;
      }

      toast.dismiss();
      toast.success('Zuteilung erfolgreich entfernt!');
      loadData(); // Daten neu laden, um die Änderung anzuzeigen
    } catch (error: any) {
      console.error("Fehler beim Entfernen der Zuteilung:", error);
      toast.dismiss();
      toast.error('Fehler beim Entfernen der Zuteilung.');
    } finally {
      setIsDeleteDialogOpen(false);
      setPendingDeletion(null);
    }
  }

  const getZuteilungenFuerAufgabe = (aufgabeId: string): Zuteilung[] => {
    return zuteilungen.filter(z => z.aufgabe_id === aufgabeId);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Laden...</div>;
  }

  if (error) {
    return <div className="text-red-600 p-4">Fehler: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openModal()}>
          <UserPlus className="mr-2 h-4 w-4" /> Neue Zuteilung
        </Button>
      </div>

      {aufgaben.length === 0 && <p>Keine Aufgaben gefunden.</p>}
      {aufgaben.map((aufgabe) => {
        const aufgabenZuteilungen = getZuteilungenFuerAufgabe(aufgabe.id);
        return (
          <Card key={aufgabe.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{aufgabe.titel} ({aufgabe.zeitfenster})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aufgabenZuteilungen.length > 0 ? (
                <ul className="space-y-2 list-disc list-inside">
                  {aufgabenZuteilungen.map((zuteilung) => (
                    <li key={zuteilung.id} className="flex justify-between items-center">
                      <span>
                        {zuteilung.kinder ? 
                          `${zuteilung.kinder.vorname} ${zuteilung.kinder.nachname} (${zuteilung.kinder.klasse || '-'})` : 
                          (zuteilung.externe_helfer ? 
                            `${zuteilung.externe_helfer.name} (Extern)` : 
                            `Unbekanntes Kind (${zuteilung.kind_identifier || 'undefined'}`
                          )
                        }
                        {zuteilung.via_springer && <Badge variant="outline" className="ml-2">Springer</Badge>}
                      </span>
                      <div className="space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditModal(zuteilung, aufgabe.titel)}
                        >Ändern</Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleRemoveAssignment(
                            zuteilung.id,
                            zuteilung.kinder ? 
                              `${zuteilung.kinder.vorname} ${zuteilung.kinder.nachname}` : 
                              zuteilung.externe_helfer ? 
                                `${zuteilung.externe_helfer.name} (Extern)` : 
                                'Unbekanntes Kind',
                            aufgabe.titel
                          )}
                        >Entfernen</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Helfer zugewiesen.</p>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="default" size="sm" onClick={() => openModal()}>
                + Manuell Zuweisen
              </Button>
            </CardFooter>
          </Card>
        );
      })}
      <ZuteilungManuellModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={handleSuccess}
        kindId={selectedKind?.id}
        kindName={selectedKind?.name}
      />
      <ZuteilungBearbeitenModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSuccess={handleSuccess}
        zuteilung={selectedZuteilung}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zuteilung wirklich entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du die Zuteilung von {pendingDeletion?.kindName} zur Aufgabe "{pendingDeletion?.aufgabeTitel}" wirklich entfernen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveAssignment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
