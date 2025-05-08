'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedZuteilung, setSelectedZuteilung] = useState<{
    id: string;
    kind_id: string;
    kind_identifier: string;
    kind_name: string;
    aufgabe_id: string;
    aufgabe_titel: string;
    via_springer: boolean;
  } | null>(null);

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
        kinder ( id, vorname, nachname, klasse )
      `);

    if (zuteilungenError) {
      console.error('Fehler beim Laden der Zuteilungen:', zuteilungenError);
      setError('Zuteilungen konnten nicht geladen werden.');
    } else {
      // Wir müssen sicherstellen, dass kinder nicht null ist, falls der Join fehlschlägt
      // Explicitly type 'z' and the return type of map
      const validZuteilungen = (zuteilungenData || []).map((z: SupabaseZuteilung): Zuteilung => ({
           ...z,
           kinder: z.kinder // Kann null sein, wenn kein Kind gefunden wird
       }));
      setZuteilungen(validZuteilungen);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openEditModal = (zuteilung: Zuteilung, aufgabeTitel: string) => {
    if (!zuteilung.kinder) {
      toast.error('Kind-Informationen fehlen.');
      return;
    }
    setSelectedZuteilung({
      id: zuteilung.id,
      kind_id: zuteilung.kinder.id,
      kind_identifier: zuteilung.kind_identifier,
      kind_name: `${zuteilung.kinder.vorname} ${zuteilung.kinder.nachname}`,
      aufgabe_id: zuteilung.aufgabe_id,
      aufgabe_titel: aufgabeTitel,
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
    loadData(); // Reload data to show the new assignment
  };

  const handleRemoveAssignment = async (assignmentId: string, kindName: string, aufgabeTitel: string) => {
    if (window.confirm(`Möchtest du die Zuteilung von ${kindName} zur Aufgabe "${aufgabeTitel}" wirklich entfernen?`)) {
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
      }
    }
  };

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
                        {zuteilung.kinder ? `${zuteilung.kinder.vorname} ${zuteilung.kinder.nachname} (${zuteilung.kinder.klasse})` : `Unbekanntes Kind (${zuteilung.kind_identifier})`}
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
                            zuteilung.kinder ? `${zuteilung.kinder.vorname} ${zuteilung.kinder.nachname}` : 'Unbekanntes Kind',
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
      />
      <ZuteilungBearbeitenModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSuccess={handleSuccess}
        zuteilung={selectedZuteilung}
      />
    </div>
  );
}
