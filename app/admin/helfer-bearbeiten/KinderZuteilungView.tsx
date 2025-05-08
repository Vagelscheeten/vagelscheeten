'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ZuteilungManuellModal } from './ZuteilungManuellModal';
import { ZuteilungBearbeitenModal } from './ZuteilungBearbeitenModal';
import { toast } from 'react-hot-toast';

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
                              <div className="text-sm flex items-center justify-between">
                                  <span>
                                      {kindZuteilung.helferaufgaben?.titel ?? 'Unbekannte Aufgabe'}
                                      {kindZuteilung.via_springer && <Badge variant="outline" className="ml-2">Springer</Badge>}
                                  </span>
                                  <div className="space-x-1">
                                      <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => openEditModal(
                                        kindZuteilung, 
                                        `${kind.vorname} ${kind.nachname}`, 
                                        kind.id
                                      )}
                                    >Ändern</Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => handleRemoveAssignment(
                                        kindZuteilung.id,
                                        `${kind.vorname} ${kind.nachname}`,
                                        kindZuteilung.helferaufgaben?.titel ?? 'Unbekannte Aufgabe'
                                      )}
                                    >Entfernen</Button>
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
    </>
  );
}
