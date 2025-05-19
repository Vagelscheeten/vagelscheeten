import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

// Definition der Struktur für eine Rückmeldung/einen Wunsch eines Kind-Helfers zu einer Aufgabe
interface HelferIdentifikationFuerRueckmeldung {
  id: string;                      // Entspricht helfer_rueckmeldungen.id
  helferId: string;                // Entspricht helfer_rueckmeldungen.kind_id
  helferName: string;              // Erstellt aus kinder.vorname + kinder.nachname
  kindKlasse?: string;            // Aus kinder.klasse
  prioritaet: number | null;       // Aus helfer_rueckmeldungen.prioritaet
  freitext: string | null;         // Aus helfer_rueckmeldungen.freitext
  istSpringer: boolean;            // Aus helfer_rueckmeldungen.ist_springer
  zeitfensterWunsch: string | null;// Aus helfer_rueckmeldungen.zeitfenster (Wunsch-Zeitfenster)
}

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
  zeitfenster: string; // Das tatsächliche Zeitfenster der Aufgabe, aus helferaufgaben
  // Optional: has_slots: boolean | null; -> aus helferaufgaben.has_slots
  // Optional: is_game_supervisor: boolean; -> aus helferaufgaben.is_game_supervisor
  rueckmeldungen?: HelferIdentifikationFuerRueckmeldung[];
}

interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  klasse?: string;
}

interface ExternerHelfer {
  id: string; // Wird von der DB generiert, aber hier als Typ-Referenz
  name: string;
}

interface ManuelleZuteilungModalProps {
  open: boolean;
  onClose: () => void;
  aufgabe: Aufgabe; 
  onSave: () => void; 
  onExternerHelferHinzufuegen: (name: string, aufgabeId: string) => Promise<void>; 
}

interface Klasse {
  klasse: string;
  count: number;
}

export function ManuelleZuteilungModal({ 
  open, 
  onClose, 
  aufgabe,
  onSave,
  onExternerHelferHinzufuegen,
}: ManuelleZuteilungModalProps) {
  const [selectedKindId, setSelectedKindId] = useState<string>('');
  const [selectedKlasse, setSelectedKlasse] = useState<string>('');
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRueckmeldungen, setCurrentRueckmeldungen] = useState<HelferIdentifikationFuerRueckmeldung[]>([]);
  const [isExternerHelferTab, setIsExternerHelferTab] = useState(false);
  const [neuerHelferName, setNeuerHelferName] = useState('');
  const [isAddingHelfer, setIsAddingHelfer] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!open) {
        setSelectedKlasse('');
        setSelectedKindId('');
        setNeuerHelferName(''); 
        setIsExternerHelferTab(false); 
        return;
      }
      
      setIsLoading(true);
      setCurrentRueckmeldungen([]); // Reset für den Fall, dass die Aufgabe wechselt

      const supabase = createClient();

      // 1. Kinderdaten laden (bleibt wie gehabt)
      const { data: kinderData, error: kinderError } = await supabase
        .from('kinder')
        .select('id, vorname, nachname, klasse');

      if (kinderError) {
        console.error('Fehler beim Laden der Kinder:', kinderError);
        toast.error('Kinder konnten nicht geladen werden.');
        setKinder([]);
        setKlassen([]);
      } else {
        setKinder(kinderData || []);
        // Klassen-Logik (bleibt wie gehabt)
        const klassenCounts = (kinderData || []).reduce((acc, kind) => {
          const klasse = kind.klasse || 'Ohne Klasse';
          acc[klasse] = (acc[klasse] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        setKlassen(Object.entries(klassenCounts).map(([klasse, count]) => ({ klasse, count })).sort((a, b) => a.klasse.localeCompare(b.klasse)));
      }

      // 2. Bestehende Zuteilungen für diese Aufgabe laden (bleibt wie gehabt)
      const { data: zuteilungenData, error: zuteilungenError } = await supabase
        .from('helfer_zuteilungen')
        .select('kind_id')
        .eq('aufgabe_id', aufgabe.id);

      let zugewieseneKinderIds: string[] = [];
      if (zuteilungenError) {
        console.error('Fehler beim Laden der Zuteilungen:', zuteilungenError);
        // Fehlerbehandlung optional, da es primär um verfügbare Kinder geht
      } else {
        zugewieseneKinderIds = (zuteilungenData || []).map(z => z.kind_id).filter(id => id != null) as string[];
      }

      // 3. Rückmeldungen (Wünsche) für diese Aufgabe laden
      const { data: rueckmeldungenData, error: rueckmeldungenError } = await supabase
        .from('helfer_rueckmeldungen')
        .select(`
          id,
          kind_id,
          prioritaet,
          freitext,
          ist_springer,
          zeitfenster,
          kinder (id, vorname, nachname, klasse)
        `)
        .eq('aufgabe_id', aufgabe.id)
        .not('kind_id', 'is', null); // Nur Rückmeldungen mit einer gültigen kind_id

      if (rueckmeldungenError) {
        console.error('Fehler beim Laden der Rückmeldungen:', rueckmeldungenError);
        toast.error('Wünsche für diese Aufgabe konnten nicht geladen werden.');
        setCurrentRueckmeldungen([]);
      } else {
        const verarbeiteteRueckmeldungen = (rueckmeldungenData || []).map(r => {
          // Behandeln von r.kinder, das laut Lint-Fehler ein Array sein könnte,
          // obwohl es für einen direkten FK-Join ein Objekt sein sollte.
          const kindCandidate = r.kinder as any; // Temporär als 'any' für die Prüfung
          let kindDetails: Kind | null = null;

          if (kindCandidate) {
            if (Array.isArray(kindCandidate) && kindCandidate.length > 0) {
              kindDetails = kindCandidate[0] as Kind; // Nimm das erste Element, wenn es ein Array ist
            } else if (!Array.isArray(kindCandidate)) {
              kindDetails = kindCandidate as Kind; // Nimm das Objekt direkt, wenn es kein Array ist
            }
          }

          return {
            id: r.id,
            helferId: r.kind_id!, // kind_id sollte hier nicht null sein wegen .not('kind_id', 'is', null)
            helferName: kindDetails ? `${kindDetails.vorname} ${kindDetails.nachname}` : 'Unbekanntes Kind',
            kindKlasse: kindDetails?.klasse,
            prioritaet: r.prioritaet,
            freitext: r.freitext,
            istSpringer: r.ist_springer,
            zeitfensterWunsch: r.zeitfenster,
          } as HelferIdentifikationFuerRueckmeldung;
        }).filter(r => r.helferId); // Sicherstellen, dass nur gültige Einträge bleiben
        setCurrentRueckmeldungen(verarbeiteteRueckmeldungen);
      }

      setIsLoading(false);
    };
    
    fetchData();
  }, [open, aufgabe]);
  
  const filteredKinder = useMemo(() => {
    if (!selectedKlasse || selectedKlasse === "all") return kinder;
    return kinder.filter(kind => kind.klasse === selectedKlasse);
  }, [kinder, selectedKlasse]);

  const handleSubmitKind = async () => {
    if (!selectedKindId) {
      toast.error('Bitte wähle ein Kind aus');
      return;
    }
    
    setIsSubmitting(true);
    const supabase = createClient();
    
    try {
      const { data: existingZuteilung, error: checkError } = await supabase
        .from('helfer_zuteilungen')
        .select('id')
        .eq('kind_id', selectedKindId)
        .eq('aufgabe_id', aufgabe.id)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingZuteilung) {
        toast.error('Dieses Kind ist bereits für diese Aufgabe eingeteilt');
        setIsSubmitting(false); // Wichtig: Submitting-Status zurücksetzen
        return;
      }
      
      const { error } = await supabase
        .from('helfer_zuteilungen')
        .insert([{
          kind_id: selectedKindId,
          aufgabe_id: aufgabe.id,
          zeitfenster: aufgabe.zeitfenster || 'Nicht angegeben',
          via_springer: false
        }]);
        
      if (error) throw error;
      
      toast.success('Helfer:in wurde erfolgreich zugewiesen');
      onSave(); // Ruft Refresh-Logik in der Elternkomponente auf
      onClose();
    } catch (error: any) {
      console.error('Fehler beim Zuweisen des Kindes:', error);
      toast.error(`Fehler beim Zuweisen: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExternerHelferAndAssign = async () => {
    if (!neuerHelferName.trim()) {
      toast.error('Bitte geben Sie einen Namen für den externen Helfer ein.');
      return;
    }
    setIsAddingHelfer(true);
    try {
      await onExternerHelferHinzufuegen(neuerHelferName, aufgabe.id);
      toast.success(`Externer Helfer "${neuerHelferName}" hinzugefügt und zugewiesen.`);
      setNeuerHelferName(''); 
      onSave(); 
      onClose(); 
    } catch (error: any) {
      console.error('Fehler beim Hinzufügen des externen Helfers:', error);
      toast.error(`Fehler: ${error.message || 'Externer Helfer konnte nicht hinzugefügt werden.'}`);
    } finally {
      setIsAddingHelfer(false);
    }
  };

  // Reset form when modal is closed or aufgabe changes
  useEffect(() => {
    if (!open) {
      setSelectedKlasse('');
      setSelectedKindId('');
      setNeuerHelferName(''); 
      setIsExternerHelferTab(false); 
    }
  }, [open, aufgabe]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kind manuell zuweisen: {aufgabe.titel}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {!isLoading && currentRueckmeldungen.length > 0 && (
            <div className="mb-6 p-4 border rounded-md bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-blue-700 mb-2">Gewünscht von:</h4>
              <ul className="space-y-1 text-sm text-blue-600">
                {currentRueckmeldungen.map(wunsch => (
                  <li key={wunsch.id}>
                    <strong>{wunsch.helferName}</strong> ({wunsch.kindKlasse || 'N/A'}) 
                    {wunsch.prioritaet && `(Priorität: ${wunsch.prioritaet})`}
                    {wunsch.freitext && ` - "${wunsch.freitext}"`}
                    {wunsch.istSpringer && ` (Springer)`}
                    {wunsch.zeitfensterWunsch && ` (Wunsch-Zeit: ${wunsch.zeitfensterWunsch})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Tabs 
            value={isExternerHelferTab ? "extern" : "kind"} 
            onValueChange={(value) => setIsExternerHelferTab(value === "extern")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="kind">Kind auswählen</TabsTrigger>
              <TabsTrigger value="extern">Externer Helfer</TabsTrigger>
            </TabsList>

            <TabsContent value="kind" className="pt-4">
              <div className="space-y-2">
                <Label htmlFor="klasse">Klasse auswählen</Label>
                <Select 
                  value={selectedKlasse} 
                  onValueChange={(value) => {
                    setSelectedKlasse(value);
                    setSelectedKindId(''); 
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger id="klasse" className="w-full">
                    <SelectValue placeholder="Klasse auswählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">Alle Klassen</SelectItem>
                    {isLoading ? (
                      <SelectItem value="loading" disabled>Laden...</SelectItem>
                    ) : klassen.length === 0 ? (
                      <SelectItem value="empty" disabled>Keine Klassen</SelectItem>
                    ) : (
                      klassen.map(k => (
                        <SelectItem key={k.klasse} value={k.klasse}>
                          {k.klasse} ({k.count})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="kind">Kind auswählen</Label>
                <Select 
                  value={selectedKindId} 
                  onValueChange={setSelectedKindId} 
                  disabled={isLoading || !selectedKlasse || filteredKinder.length === 0}
                >
                  <SelectTrigger id="kind" className="w-full">
                    <SelectValue placeholder="Kind auswählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {isLoading ? (
                      <SelectItem value="loading" disabled>Laden...</SelectItem>
                    ) : filteredKinder.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        {selectedKlasse && selectedKlasse !== "all" ? "Keine Kinder in dieser Klasse" : "Keine Kinder verfügbar"}
                      </SelectItem>
                    ) : (
                      filteredKinder.map(kind => (
                        <SelectItem key={kind.id} value={kind.id}>
                          {kind.vorname} {kind.nachname} {kind.klasse ? `(${kind.klasse})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="extern" className="pt-4 space-y-2">
              <div>
                <Label htmlFor="externer-helfer-name">Name des externen Helfers</Label>
                <Input
                  id="externer-helfer-name"
                  type="text"
                  placeholder="Vorname Nachname"
                  value={neuerHelferName}
                  onChange={(e) => setNeuerHelferName(e.target.value)}
                  className="mt-1"
                  disabled={isLoading || isAddingHelfer}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting || isAddingHelfer}>
            Abbrechen
          </Button>
          <Button 
            onClick={isExternerHelferTab ? handleAddExternerHelferAndAssign : handleSubmitKind} 
            disabled={isSubmitting || isAddingHelfer || (isExternerHelferTab ? !neuerHelferName.trim() : !selectedKindId)} 
          >
            {isSubmitting || isAddingHelfer ? 'Wird gespeichert...' : 
             (isExternerHelferTab ? 'Helfer hinzufügen & Zuweisen' : 'Zuweisen')} 
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ManuelleZuteilungModal;
