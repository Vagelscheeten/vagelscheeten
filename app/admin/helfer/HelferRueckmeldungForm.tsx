import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { PlusCircle, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Hier verwenden wir stattdessen Checkbox und Select für die Springer-Auswahl

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
}

interface SpendenBedarf {
  id: string;
  titel: string;
  beschreibung: string | null;
  anzahl_benoetigt: number;
}

interface Klasse {
  name: string;
  id: string | null;
}

interface Kind {
  id: string;
  vorname: string;
  nachname: string;
  klasse: string | null;
  klasse_id: string | null;
  hatRueckmeldung?: boolean; // Flag, ob das Kind bereits eine Rückmeldung hat
}

interface HelferRueckmeldungFormProps {
  aufgaben: Aufgabe[];
  onClose: () => void;
  onSuccess: () => void;
}

interface AufgabenAuswahl {
  aufgabeId: string;
  prioritaet: number;
}

interface SpendenAuswahl {
  spendeId: string;
  menge: number;
  freitext: string;
}

type ZeitfensterType = 'vormittag' | 'nachmittag' | 'beides';

export function HelferRueckmeldungForm({ aufgaben, onClose, onSuccess }: HelferRueckmeldungFormProps) {
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [kinder, setKinder] = useState<Kind[]>([]);
  const [ausgewaehlteKlasse, setAusgewaehlteKlasse] = useState<string>('');
  const [ausgewaehltesKindId, setAusgewaehltesKindId] = useState<string>('');
  const [ausgewaehlteAufgaben, setAusgewaehlteAufgaben] = useState<AufgabenAuswahl[]>([]);
  const [freitext, setFreitext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [istSpringer, setIstSpringer] = useState(false);
  const [springerZeitfenster, setSpringerZeitfenster] = useState<ZeitfensterType>('vormittag');
  
  // Essensspenden
  const [spendenBedarfe, setSpendenBedarfe] = useState<SpendenBedarf[]>([]);
  const [ausgewaehlteSpenden, setAusgewaehlteSpenden] = useState<SpendenAuswahl[]>([]);
  const [showSpendenForm, setShowSpendenForm] = useState(false);
  
  // Funktion zum Zurücksetzen des Formulars
  const resetForm = () => {
    setAusgewaehlteKlasse('');
    setAusgewaehltesKindId('');
    setAusgewaehlteAufgaben([]);
    setFreitext('');
    setIstSpringer(false);
    setSpringerZeitfenster('vormittag');
    setAusgewaehlteSpenden([]);
    setShowSpendenForm(false);
    // Scrollt das Modal möglicherweise nach oben, falls nötig
    // Optional: document.querySelector('.dialog-content-selector')?.scrollTo(0, 0);
  };

  // Alle Kinder und Essensspenden-Bedarfe laden
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      
      // Alle Kinder laden
      const { data, error } = await supabase
        .from('kinder')
        .select('id, vorname, nachname, klasse, klasse_id')
        .order('nachname, vorname');
      
      if (error) {
        console.error('Fehler beim Laden der Kinder:', error);
        toast.error('Kinder konnten nicht geladen werden.');
        setIsLoading(false);
        return;
      }
      
      // Essensspenden-Bedarfe laden
      const { data: bedarfeData, error: bedarfeError } = await supabase
        .from('essensspenden_bedarf')
        .select('*')
        .order('titel');
        
      if (bedarfeError) {
        console.error('Fehler beim Laden der Essensspenden-Bedarfe:', bedarfeError);
      } else {
        setSpendenBedarfe(bedarfeData || []);
      }
      
      // Alle vorhandenen Rückmeldungen laden, um zu prüfen, welche Kinder bereits eine Rückmeldung haben
      const { data: rueckmeldungenData, error: rueckmeldungenError } = await supabase
        .from('helfer_rueckmeldungen')
        .select('kind_id');
        
      if (rueckmeldungenError) {
        console.error('Fehler beim Laden der Rückmeldungen:', rueckmeldungenError);
      }
      
      // Set mit allen Kind-IDs erstellen, die bereits eine Rückmeldung haben
      const kinderMitRueckmeldung = new Set(
        rueckmeldungenData?.map(r => r.kind_id) || []
      );
      
      // Kinder-Daten mit dem Rückmeldungs-Flag anreichern
      const kinderMitFlag = data?.map(kind => ({
        ...kind,
        hatRueckmeldung: kinderMitRueckmeldung.has(kind.id)
      })) || [];
      
      // Kinder setzen
      setKinder(kinderMitFlag);
      
      // Eindeutige Klassen extrahieren
      const uniqueKlassen = Array.from(new Set(
        data?.map(kind => kind.klasse || 'Keine Klasse')
      )).map(klassenName => ({
        name: klassenName,
        id: data?.find(k => k.klasse === klassenName)?.klasse_id || null
      }));
      
      // Klassen nach Namen sortieren
      uniqueKlassen.sort((a, b) => a.name.localeCompare(b.name));
      
      setKlassen(uniqueKlassen);
      setIsLoading(false);
    };
    
    fetchData();
  }, []);
  
  // Filtere Kinder nach ausgewählter Klasse
  const kindernachKlasse = kinder.filter(kind => 
    ausgewaehlteKlasse ? kind.klasse === ausgewaehlteKlasse : true
  );

  // Aufgabe hinzufügen
  const handleAddAufgabe = () => {
    // Nur hinzufügen, wenn noch Aufgaben übrig sind
    const verfuegbareAufgaben = aufgaben.filter(
      aufgabe => !ausgewaehlteAufgaben.some(a => a.aufgabeId === aufgabe.id)
    );
    
    if (verfuegbareAufgaben.length > 0) {
      setAusgewaehlteAufgaben([
        ...ausgewaehlteAufgaben,
        { aufgabeId: verfuegbareAufgaben[0].id, prioritaet: 1 }
      ]);
    }
  };
  
  // Spende hinzufügen
  const handleAddSpende = () => {
    // Nur hinzufügen, wenn noch Spenden übrig sind
    const verfuegbareSpenden = spendenBedarfe.filter(
      spende => !ausgewaehlteSpenden.some(s => s.spendeId === spende.id)
    );
    
    if (verfuegbareSpenden.length > 0) {
      setAusgewaehlteSpenden([
        ...ausgewaehlteSpenden,
        { spendeId: verfuegbareSpenden[0].id, menge: 1, freitext: '' }
      ]);
    }
  };

  // Aufgabe entfernen
  const handleRemoveAufgabe = (index: number) => {
    const newAufgaben = [...ausgewaehlteAufgaben];
    newAufgaben.splice(index, 1);
    setAusgewaehlteAufgaben(newAufgaben);
  };

  // Aufgabe ändern
  const handleChangeAufgabe = (index: number, aufgabeId: string) => {
    const newAufgaben = [...ausgewaehlteAufgaben];
    newAufgaben[index].aufgabeId = aufgabeId;
    setAusgewaehlteAufgaben(newAufgaben);
  };

  // Priorität ändern
  const handleChangePrioritaet = (index: number, prioritaet: number) => {
    const newAufgaben = [...ausgewaehlteAufgaben];
    newAufgaben[index].prioritaet = prioritaet;
    setAusgewaehlteAufgaben(newAufgaben);
  };
  
  // Spende entfernen
  const handleRemoveSpende = (index: number) => {
    const newSpenden = [...ausgewaehlteSpenden];
    newSpenden.splice(index, 1);
    setAusgewaehlteSpenden(newSpenden);
  };
  
  // Spende ändern
  const handleChangeSpende = (index: number, spendeId: string) => {
    const newSpenden = [...ausgewaehlteSpenden];
    newSpenden[index].spendeId = spendeId;
    setAusgewaehlteSpenden(newSpenden);
  };
  
  // Menge ändern
  const handleChangeMenge = (index: number, menge: number) => {
    const newSpenden = [...ausgewaehlteSpenden];
    newSpenden[index].menge = menge;
    setAusgewaehlteSpenden(newSpenden);
  };
  
  // Freitext für Spende ändern
  const handleChangeSpendeFreitext = (index: number, freitext: string) => {
    const newSpenden = [...ausgewaehlteSpenden];
    newSpenden[index].freitext = freitext;
    setAusgewaehlteSpenden(newSpenden);
  };

  // Prüft, ob für ein Kind bereits eine Rückmeldung existiert
  const checkExistingRueckmeldung = async (kindId: string): Promise<boolean> => {
    const supabase = createClient();
    const { data, error, count } = await supabase
      .from('helfer_rueckmeldungen')
      .select('id', { count: 'exact' })
      .eq('kind_id', kindId);
      
    if (error) {
      console.error('Fehler beim Prüfen vorhandener Rückmeldungen:', error);
      return false; // Im Fehlerfall fortfahren, aber mit Warnung
    }
    
    return count ? count > 0 : false;
  };

  // Kernlogik zum Speichern der Rückmeldung
  const saveRueckmeldung = async (): Promise<boolean> => {
    if (!ausgewaehltesKindId) {
      toast.error('Bitte wähle ein Kind aus.');
      return false;
    }
    
    if (!istSpringer && ausgewaehlteAufgaben.length === 0) {
      toast.error('Bitte wähle mindestens eine Aufgabe aus oder wähle die Springer-Option.');
      return false;
    }
    
    if (istSpringer && !springerZeitfenster) {
      toast.error('Bitte wähle ein Zeitfenster für den Springer aus.');
      return false;
    }
    
    // Prüfen, ob für dieses Kind bereits eine Rückmeldung existiert
    const hasExistingRueckmeldung = await checkExistingRueckmeldung(ausgewaehltesKindId);
    if (hasExistingRueckmeldung) {
      toast.error('Für dieses Kind existiert bereits eine Rückmeldung. Bitte bearbeite oder lösche die vorhandene Rückmeldung.');
      return false;
    }
    
    setIsSubmitting(true);
    const supabase = createClient();
    let success = true;
    
    try {
      if (istSpringer) {
        // Springer-Rückmeldung erstellen
        const { error } = await supabase
          .from('helfer_rueckmeldungen')
          .insert({
            kind_id: ausgewaehltesKindId,
            aufgabe_id: null,  // Keine spezifische Aufgabe bei Springern
            prioritaet: 1,     // Standard-Priorität für Tracking
            ist_springer: true,
            zeitfenster: springerZeitfenster,
            freitext: freitext.trim() || null
          });
          
        if (error) throw error;
      } else {
        // Für jede ausgewählte Aufgabe einen Eintrag erstellen
        const inserts = ausgewaehlteAufgaben.map(aufgabe => ({
          kind_id: ausgewaehltesKindId,
          aufgabe_id: aufgabe.aufgabeId,
          prioritaet: aufgabe.prioritaet,
          ist_springer: false,
          zeitfenster: null, // Kein Zeitfenster für reguläre Rückmeldungen
          freitext: freitext.trim() || null
        }));

        const { error } = await supabase
          .from('helfer_rueckmeldungen')
          .insert(inserts);
        
        if (error) throw error; 
      }

      // Essensspenden speichern, falls vorhanden
      if (ausgewaehlteSpenden.length > 0) {
        // Kind-Identifier erstellen (Nachname + Klasse)
        const ausgewaehltesKind = kinder.find(k => k.id === ausgewaehltesKindId);
        if (!ausgewaehltesKind) {
          throw new Error('Kind nicht gefunden');
        }
        
        const kindIdentifier = `${ausgewaehltesKind.nachname}, ${ausgewaehltesKind.vorname} (${ausgewaehltesKind.klasse || 'Keine Klasse'})`;
        
        // Essensspenden speichern
        const spendenInserts = ausgewaehlteSpenden.map(spende => ({
          spende_id: spende.spendeId,
          kind_identifier: kindIdentifier,
          menge: spende.menge,
          freitext: spende.freitext.trim() || null
        }));
        
        const { error: spendenError } = await supabase
          .from('essensspenden_rueckmeldungen')
          .insert(spendenInserts);
          
        if (spendenError) {
          console.error('Fehler beim Speichern der Essensspenden:', spendenError);
          toast.error(`Helfer-Rückmeldung wurde gespeichert, aber es gab einen Fehler bei den Essensspenden: ${spendenError.message}`);
          success = false;
        }
      }
      
      toast.success(success ? 'Rückmeldung erfolgreich gespeichert!' : 'Rückmeldung teilweise gespeichert.');
      onSuccess(); // Parent Komponente benachrichtigen (z.B. zum Daten neu laden)
      return true; // Erfolg signalisieren

    } catch (error: any) {
      console.error('Fehler beim Speichern der Rückmeldung:', error);
      toast.error(`Fehler beim Speichern: ${error.message}`);
      return false; // Fehler signalisieren
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formular absenden (Standard: Speichern und Schließen)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await saveRueckmeldung();
    if (success) {
      // Hier müssen wir nichts aktualisieren, da das Modal geschlossen wird
      onClose(); // Standardverhalten: Modal schließen
    }
  };

  // Formular absenden (Speichern und nächste)
  const handleSaveAndNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await saveRueckmeldung();
    if (success) {
      // Kind als "hat Rückmeldung" markieren, bevor das Formular zurückgesetzt wird
      setKinder(prevKinder => 
        prevKinder.map(kind => 
          kind.id === ausgewaehltesKindId ? { ...kind, hatRueckmeldung: true } : kind
        )
      );
      resetForm(); // Formular zurücksetzen, Modal bleibt offen
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Neue Helfer-Rückmeldung erfassen</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="klasse">Klasse auswählen</Label>
              <Select
                value={ausgewaehlteKlasse}
                onValueChange={setAusgewaehlteKlasse}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Klasse auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {klassen.map((klasse) => (
                    <SelectItem key={klasse.name} value={klasse.name}>
                      {klasse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="kind">Kind auswählen</Label>
              <Select
                value={ausgewaehltesKindId}
                onValueChange={setAusgewaehltesKindId}
                disabled={!ausgewaehlteKlasse || kindernachKlasse.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!ausgewaehlteKlasse ? "Zuerst Klasse auswählen" : kindernachKlasse.length === 0 ? "Keine Kinder in dieser Klasse" : "Kind auswählen"} />
                </SelectTrigger>
                <SelectContent>
                  {kindernachKlasse.map((kind) => (
                    <SelectItem 
                      key={kind.id} 
                      value={kind.id}
                      disabled={kind.hatRueckmeldung}
                    >
                      {kind.nachname}, {kind.vorname}
                      {kind.hatRueckmeldung && " (hat bereits Rückmeldung)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Springer-Option */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="springer" 
                checked={istSpringer}
                onCheckedChange={(checked) => {
                  setIstSpringer(checked === true);
                  // Wenn Springer aktiviert wird, Aufgaben zurücksetzen
                  if (checked === true) {
                    setAusgewaehlteAufgaben([]);
                  }
                }}
              />
              <Label htmlFor="springer" className="font-medium">Ich bin Springer</Label>
            </div>
            
            {istSpringer && (
              <div className="ml-6 mt-2 space-y-4">
                <div>
                  <Label htmlFor="zeitfenster" className="block mb-2">Verfügbares Zeitfenster auswählen</Label>
                  <Select
                    value={springerZeitfenster}
                    onValueChange={(value) => setSpringerZeitfenster(value as ZeitfensterType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Zeitfenster auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vormittag">Vormittag</SelectItem>
                      <SelectItem value="nachmittag">Nachmittag</SelectItem>
                      <SelectItem value="beides">Ganztägig (beides)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-purple-50 p-3 rounded border border-purple-200">
                  <p className="text-sm">Als Springer wirst du automatisch dort eingeteilt, wo Helfer benötigt werden.</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Aufgabenauswahl - nur anzeigen, wenn nicht Springer */}
          {!istSpringer && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Aufgaben und Prioritäten</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddAufgabe}
                  disabled={ausgewaehlteAufgaben.length >= aufgaben.length}
                >
                  Aufgabe hinzufügen
                </Button>
              </div>
              
              {ausgewaehlteAufgaben.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Noch keine Aufgaben ausgewählt. Klicke auf "Aufgabe hinzufügen".
                </p>
              ) : (
                <div className="space-y-3">
                  {ausgewaehlteAufgaben.map((aufgabenAuswahl, index) => {
                    // Verfügbare Aufgaben (die aktuelle + noch nicht ausgewählte)
                    const verfuegbareAufgaben = aufgaben.filter(
                      aufgabe => 
                        aufgabe.id === aufgabenAuswahl.aufgabeId || 
                        !ausgewaehlteAufgaben.some(a => a.aufgabeId === aufgabe.id)
                    );
                  
                  return (
                    <div key={index} className="flex gap-2 items-center">
                      <Select
                        value={aufgabenAuswahl.aufgabeId}
                        onValueChange={(value) => handleChangeAufgabe(index, value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Aufgabe auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {verfuegbareAufgaben.map((aufgabe) => (
                            <SelectItem key={aufgabe.id} value={aufgabe.id}>
                              {aufgabe.titel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={aufgabenAuswahl.prioritaet.toString()}
                        onValueChange={(value) => handleChangePrioritaet(index, parseInt(value))}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Priorität" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Priorität 1</SelectItem>
                          <SelectItem value="2">Priorität 2</SelectItem>
                          <SelectItem value="3">Priorität 3</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAufgabe(index)}
                      >
                        ✕
                      </Button>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          )}
          
          {/* Essensspenden */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex justify-between items-center">
              <Label>Essensspenden (optional)</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleAddSpende}
                disabled={ausgewaehlteSpenden.length >= spendenBedarfe.length || isSubmitting}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Spende hinzufügen
              </Button>
            </div>
            
            {ausgewaehlteSpenden.length === 0 ? (
              <div className="text-center p-4 border rounded-md border-dashed">
                <p className="text-muted-foreground">Keine Spenden ausgewählt. Klicke auf "Spende hinzufügen".</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ausgewaehlteSpenden.map((spende, index) => (
                  <div key={index} className="p-4 border rounded-md relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                      onClick={() => handleRemoveSpende(index)}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`spende-${index}`}>Spendenart</Label>
                        <Select
                          value={spende.spendeId}
                          onValueChange={(value) => handleChangeSpende(index, value)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Spendenart auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {spendenBedarfe.map((bedarf) => (
                              <SelectItem 
                                key={bedarf.id} 
                                value={bedarf.id}
                                disabled={ausgewaehlteSpenden.some(
                                  (s, i) => i !== index && s.spendeId === bedarf.id
                                )}
                              >
                                {bedarf.titel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`menge-${index}`}>Menge</Label>
                        <Input
                          id={`menge-${index}`}
                          type="number"
                          min="1"
                          value={spende.menge}
                          onChange={(e) => handleChangeMenge(index, parseInt(e.target.value) || 1)}
                          disabled={isSubmitting}
                        />
                      </div>
                      
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor={`freitext-${index}`}>Anmerkungen (optional)</Label>
                        <Textarea
                          id={`freitext-${index}`}
                          placeholder="z.B. vegan, glutenfrei, etc."
                          value={spende.freitext}
                          onChange={(e) => handleChangeSpendeFreitext(index, e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="freitext">Anmerkungen (optional)</Label>
            <Textarea
              id="freitext"
              placeholder="Weitere Informationen oder Anmerkungen"
              value={freitext}
              onChange={(e) => setFreitext(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveAndNext} 
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? 'Wird gespeichert...' : 'Speichern und nächste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
