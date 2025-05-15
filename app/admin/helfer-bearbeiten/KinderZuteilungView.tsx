'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ZuteilungManuellModal } from './ZuteilungManuellModal';
import { ZuteilungBearbeitenModal } from './ZuteilungBearbeitenModal';
import { toast } from "sonner";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Typen (ggf. anpassen/erweitern oder aus zentraler Datei importieren)
type Klasse = {
  id: string;
  name: string;
};

type Kind = {
  id: string;
  vorname: string;
  nachname: string;
  klasse: string; // Klassenname direkt hier? Oder klassen_id? Annahme: Name
  // Wir verwenden nur die id als Identifikator
};

type Rueckmeldung = {
  id: string;
  kind_id: string;
  aufgabe_id: string | null; // Kann null sein für Springer
  prioritaet: number;
  ist_springer: boolean;
  zeitfenster: 'vormittag' | 'nachmittag' | 'beides' | null; // Für Springer
  freitext: string | null;
  helferaufgaben: { // Gejoint für Anzeige
      titel: string;
  } | null;
};

type Zuteilung = {
  id: string;
  kind_id: string; // Hinzugefügt, um auf die UUID des Kindes zu verweisen
  kind_identifier: string;
  aufgabe_id: string;
  via_springer: boolean;
  helferaufgaben: { // Gejoint für Anzeige
      titel: string;
      zeitfenster: string;
  } | null;
};

type GroupedKinder = {
    [klassenName: string]: Kind[];
}

export function KinderZuteilungView() {
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [rueckmeldungen, setRueckmeldungen] = useState<Rueckmeldung[]>([]);
  const [zuteilungen, setZuteilungen] = useState<Zuteilung[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledKindId, setPrefilledKindId] = useState<string | undefined>(undefined);
  const [prefilledKindName, setPrefilledKindName] = useState<string | undefined>(undefined);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedZuteilung, setSelectedZuteilung] = useState<{
    id: string;
    kind_id: string;
    kind_identifier: string;
    kind_name: string;
    aufgabe_id: string;
    aufgabe_titel: string;
    via_springer: boolean;
  } | null>(null);
  // Modal für Entfernen einer Zuteilung
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteAssignment, setPendingDeleteAssignment] = useState<{
    id: string;
    kindName: string;
    aufgabeTitel: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      // 1. Klassen laden
      const { data: klassenData, error: klassenError } = await supabase
        .from('klassen')
        .select('id, name')
        .order('name', { ascending: true });
      if (klassenError) throw new Error(`Klassen laden: ${klassenError.message}`);
      setKlassen(klassenData || []);

      // 2. Kinder laden (mit Klasse)
      const { data: kinderData, error: kinderError } = await supabase
        .from('kinder')
        .select('id, vorname, nachname, klasse') // Wir verwenden nur die id als Identifikator
        .order('klasse', { ascending: true })
        .order('nachname', { ascending: true });
      if (kinderError) throw new Error(`Kinder laden: ${kinderError.message}`);
      setKinder(kinderData || []);

      // 3. Rückmeldungen laden (mit Aufgaben-Titel)
      const { data: rueckmeldungenData, error: rueckmeldungenError } = await supabase
        .from('helfer_rueckmeldungen')
        .select(`
          *,
          helferaufgaben ( titel )
        `);
      if (rueckmeldungenError) throw new Error(`Rückmeldungen laden: ${rueckmeldungenError.message}`);
      setRueckmeldungen(rueckmeldungenData || []);

      // 4. Zuteilungen laden (mit Aufgaben-Titel und Zeitfenster)
      const { data: zuteilungenData, error: zuteilungenError } = await supabase
        .from('helfer_zuteilungen')
        .select(`
          *,
          helferaufgaben ( titel, zeitfenster )
        `);
       if (zuteilungenError) throw new Error(`Zuteilungen laden: ${zuteilungenError.message}`);
       setZuteilungen(zuteilungenData || []);

    } catch (err: any) {
       console.error('Fehler beim Laden der Daten für Kinder-Ansicht:', err);
       setError(err.message || 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
       setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openModal = (kindId?: string) => {
    if (kindId) {
      // Finde das Kind anhand der ID, um den Namen zu erhalten
      const kind = kinder.find(k => k.id === kindId);
      setPrefilledKindId(kindId);
      setPrefilledKindName(kind ? `${kind.vorname} ${kind.nachname}` : undefined);
    } else {
      setPrefilledKindId(undefined);
      setPrefilledKindName(undefined);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPrefilledKindId(undefined);
    setPrefilledKindName(undefined);
  };

  const openEditModal = (zuteilung: Zuteilung, kindName: string, kindIdentifier: string) => {
    if (!zuteilung.helferaufgaben) {
      toast.error('Aufgaben-Informationen fehlen.');
      return;
    }
    setSelectedZuteilung({
      id: zuteilung.id,
      kind_id: zuteilung.kind_id,
      kind_identifier: kindIdentifier,
      kind_name: kindName, // Hier wird bereits der vollständige Name übergeben
      aufgabe_id: zuteilung.aufgabe_id,
      aufgabe_titel: zuteilung.helferaufgaben.titel || 'Unbekannte Aufgabe',
      via_springer: zuteilung.via_springer
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedZuteilung(null);
  };

  const handleSuccess = () => {
    toast.success('Zuteilung erfolgreich gespeichert!');
    loadData(); // Reload data
  };

  const handleRemoveAssignment = (assignmentId: string, kindName: string, aufgabeTitel: string) => {
    setPendingDeleteAssignment({ id: assignmentId, kindName, aufgabeTitel });
    setIsDeleteModalOpen(true);
  };

  // Wird nach Bestätigung im Modal ausgeführt
  const confirmRemoveAssignment = async () => {
    if (!pendingDeleteAssignment) return;
    toast.loading('Entferne Zuteilung...');
    const supabase = createClient();
    try {
      const { error: deleteError } = await supabase
        .from('helfer_zuteilungen')
        .delete()
        .eq('id', pendingDeleteAssignment.id);
      if (deleteError) {
        throw deleteError;
      }
      toast.dismiss();
      toast.success('Zuteilung erfolgreich entfernt!');
      loadData();
    } catch (error: any) {
      console.error("Fehler beim Entfernen der Zuteilung:", error);
      toast.dismiss();
      toast.error('Fehler beim Entfernen der Zuteilung.');
    } finally {
      setIsDeleteModalOpen(false);
      setPendingDeleteAssignment(null);
    }
  };

  const cancelRemoveAssignment = () => {
    setIsDeleteModalOpen(false);
    setPendingDeleteAssignment(null);
  };
  
  // Funktion zum Öffnen des Reset-Modals
  const openResetModal = () => {
    setIsResetModalOpen(true);
  };
  
  // Funktion zum Schließen des Reset-Modals
  const closeResetModal = () => {
    setIsResetModalOpen(false);
  };
  
  // Funktion zum Löschen aller Zuteilungen (ohne Rückmeldungen zu beeinträchtigen)
  const handleResetAllAssignments = async () => {
    setIsResetting(true);
    const supabase = createClient();
    
    try {
      console.log('Starte Zurücksetzen aller Zuteilungen...');
      
      // 1. Zuerst die Anzahl der zu löschenden Zuteilungen abrufen
      const { count, error: countError } = await supabase
        .from('helfer_zuteilungen')
        .select('*', { count: 'exact', head: true });
        
      if (countError) throw countError;
      
      if (count === 0) {
        closeResetModal();
        toast('Keine Zuteilungen gefunden', {
          description: 'Es gibt keine Zuteilungen zum Zurücksetzen.',
        });
        return;
      }
      
      console.log(`Es werden ${count} Zuteilungen gelöscht.`);
      
      // 2. Zuerst alle IDs abrufen, dann löschen
      const { data: zuLoeschendeZuteilungen, error: selectError } = await supabase
        .from('helfer_zuteilungen')
        .select('id');
        
      if (selectError) throw selectError;
      
      // 3. Alle Einträge mit den abgerufenen IDs löschen
      const { error: deleteError } = await supabase
        .from('helfer_zuteilungen')
        .delete()
        .in('id', zuLoeschendeZuteilungen.map(z => z.id));
      
      if (deleteError) {
        console.error('Fehler beim Löschen der Zuteilungen:', deleteError);
        throw deleteError;
      }
      
      console.log(`Erfolgreich ${zuLoeschendeZuteilungen.length} Zuteilungen gelöscht.`);
      
      // 4. Bestätigen, dass die Rückmeldungen noch vorhanden sind
      const { count: countAfterDelete } = await supabase
        .from('helfer_rueckmeldungen')
        .select('*', { count: 'exact', head: true });
      
      console.log(`Verbleibende Rückmeldungen: ${countAfterDelete}`);
      
      closeResetModal();
      toast.success(`Erfolgreich zurückgesetzt`, {
        description: `Es wurden ${count} Zuteilungen gelöscht.`,
      });
      
      // 4. Daten neu laden
      loadData();
    } catch (error: any) {
      console.error("Fehler beim Zurücksetzen aller Zuteilungen:", error);
      toast.error('Fehler beim Zurücksetzen', {
        description: error.message || 'Ein unerwarteter Fehler ist aufgetreten.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Hilfsfunktionen zum Filtern der Daten pro Kind
  const getRueckmeldungenFuerKind = (kindId: string): Rueckmeldung[] => {
    return rueckmeldungen.filter(r => r.kind_id === kindId);
  };

  // Diese Funktion verbindet die identifier-Spalte aus der kinder-Tabelle 
  // mit der kind_identifier-Spalte aus der helfer_zuteilungen-Tabelle
  const getZuteilungFuerKind = (kindId: string): Zuteilung | null => {
    return zuteilungen.find(z => z.kind_id === kindId) || null;
  };

  // Kinder nach Klasse gruppieren
  const groupedKinder = kinder.reduce((acc, kind) => {
    const klasse = kind.klasse || 'Ohne Klasse';
    if (!acc[klasse]) {
      acc[klasse] = [];
    }
    acc[klasse].push(kind);
    return acc;
  }, {} as GroupedKinder);

  if (isLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Laden...</div>;
  }

  return (
    <>
      {error && (
        <div className="text-red-600 p-4">Fehler: {error}</div>
      )}
      
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-medium">Helfer-Zuteilungen</h3>
        <Button
  variant="destructive"
  onClick={openResetModal}
  className="flex items-center gap-2 font-semibold text-white bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-400 focus:outline-none shadow-md"
>
  <Trash2 className="h-4 w-4" />
  Alle Zuteilungen zurücksetzen
</Button>
      </div>
      
      <Accordion type="multiple" className="w-full space-y-4">
        {klassen.map((klasse) => (
          <AccordionItem value={klasse.id} key={klasse.id}>
            <AccordionTrigger className="text-lg font-medium bg-muted px-4 py-2 rounded hover:bg-muted/80">
              Klasse {klasse.name} ({groupedKinder[klasse.name]?.length || 0} Kinder)
            </AccordionTrigger>
            <AccordionContent className="pt-4 px-1">
              {groupedKinder[klasse.name] && groupedKinder[klasse.name].length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedKinder[klasse.name].map((kind) => {
                     const kindRueckmeldungen = getRueckmeldungenFuerKind(kind.id);
                     const kindZuteilung = getZuteilungFuerKind(kind.id);
                     return (
                      <Card key={kind.id}>
                        <CardHeader>
                          <CardTitle>{kind.vorname} {kind.nachname}</CardTitle>
                          <CardDescription>ID: {kind.id}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-sm mb-1">Rückmeldungen:</h4>
                            {kindRueckmeldungen.length > 0 ? (
                               <ul className="list-disc list-inside text-sm space-y-1">
                                 {kindRueckmeldungen.map(r => (
                                   <li key={r.id}>
                                     {r.ist_springer
                                       ? `Springer (${r.zeitfenster})`
                                       : `${r.helferaufgaben?.titel ?? 'Unbekannte Aufgabe'} (Prio ${r.prioritaet})`
                                     }
                                     {r.freitext && <span className="text-xs italic"> - "{r.freitext}"</span>}
                                   </li>
                                 ))}
                               </ul>
                            ) : <p className="text-sm text-muted-foreground">Keine</p>}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-1">Aktuelle Zuteilung:</h4>
                            {kindZuteilung ? (
                              <div className="flex flex-col gap-1">
                                <div className="text-sm font-medium break-words mb-2 flex items-center">
                                  <span className="flex-1 min-w-0">
                                    {kindZuteilung.helferaufgaben?.titel ?? 'Unbekannte Aufgabe'}
                                    {kindZuteilung.via_springer && (
                                      <Badge variant="outline" className="ml-2">Springer</Badge>
                                    )}
                                  </span>
                                </div>
                                <div className="flex flex-row justify-end gap-2 mt-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="font-semibold"
                                    onClick={() => openEditModal(
                                      kindZuteilung,
                                      `${kind.vorname} ${kind.nachname}`,
                                      kind.id
                                    )}
                                  >
                                    Ändern
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="font-semibold text-white bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-400 focus:outline-none shadow-md"
                                    onClick={() => handleRemoveAssignment(
                                      kindZuteilung.id,
                                      `${kind.vorname} ${kind.nachname}`,
                                      kindZuteilung.helferaufgaben?.titel ?? 'Unbekannte Aufgabe'
                                    )}
                                  >
                                    Entfernen
                                  </Button>
                                </div>
                              </div>
                            ) : (
                               <div className="text-sm text-muted-foreground flex items-center justify-between">
                                  <span>Keine Zuteilung</span>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => openModal(kind.id)} // Pass identifier to modal
                                  >+ Zuweisen</Button>
                               </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                     );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground px-4">Keine Kinder in dieser Klasse gefunden.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
         {/* Ggf. Abschnitt für Kinder ohne Klasse */}
         {groupedKinder['Ohne Klasse'] && groupedKinder['Ohne Klasse'].length > 0 && (
             <AccordionItem value="ohne-klasse">
                <AccordionTrigger className="text-lg font-medium bg-muted px-4 py-2 rounded hover:bg-muted/80">
                      Ohne Klasse ({groupedKinder['Ohne Klasse'].length} Kinder)
                </AccordionTrigger>
                <AccordionContent className="pt-4 px-1">
                   {/* Render logic similar to above for kinder['Ohne Klasse'] */}
                   <p className="text-sm text-muted-foreground px-4">Anzeige für Kinder ohne Klasse...</p>
                </AccordionContent>
             </AccordionItem>
         )}
      </Accordion>
      <ZuteilungManuellModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={handleSuccess}
        initialKindIdentifier={prefilledKindId} // Für Abwärtskompatibilität
        kindId={prefilledKindId}
        kindName={prefilledKindName}
      />
      <ZuteilungBearbeitenModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSuccess={handleSuccess}
        zuteilung={selectedZuteilung}
      />
      
      {/* Modal für Entfernen einer einzelnen Zuteilung */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Zuteilung entfernen
            </DialogTitle>
            <DialogDescription>
              {pendingDeleteAssignment && (
                <>
                  Möchtest du die Zuteilung von <b>{pendingDeleteAssignment.kindName}</b> zur Aufgabe <b>"{pendingDeleteAssignment.aufgabeTitel}"</b> wirklich entfernen?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={cancelRemoveAssignment}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemoveAssignment}
              className="!bg-red-600 !text-white !hover:bg-red-700 !shadow-md"
            >
              Entfernen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Reset-Bestätigungsmodal */}
      <AlertDialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>Möchtest du wirklich <span className="font-bold">alle Zuteilungen</span> zurücksetzen?</div>
                <div className="text-destructive">
                  Achtung: Diese Aktion kann nicht rückgängig gemacht werden!
                </div>
                <div className="text-sm text-muted-foreground">
                  Die Rückmeldungen der Eltern bleiben dabei unberührt.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleResetAllAssignments();
              }}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird zurückgesetzt...
                </>
              ) : (
                'Ja, alle Zuteilungen zurücksetzen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
