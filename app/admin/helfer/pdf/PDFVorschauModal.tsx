'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Typen aus der types.ts-Datei importieren
import type { Kind, Helferaufgabe, Zuteilung, Ansprechpartner, SpendenRueckmeldung, SpendenBedarf } from './types';

interface PDFVorschauModalProps {
  isOpen: boolean;
  onClose: () => void;
  kindId: string;
}

// Wir importieren die Funktionen dynamisch, um Probleme mit zirkulären Abhängigkeiten zu vermeiden
const generatePDF = async (kindId: string) => {
  try {
    // Dynamischer Import mit Fehlerbehandlung
    const pdfGeneratorModule = await import('./pdfGenerator');
    if (!pdfGeneratorModule || !pdfGeneratorModule.generatePDF) {
      throw new Error('PDF-Generator-Modul konnte nicht geladen werden');
    }
    return pdfGeneratorModule.generatePDF(kindId);
  } catch (error) {
    console.error('Fehler beim Importieren des PDF-Generators:', error);
    throw new Error('PDF-Generator konnte nicht geladen werden: ' + (error instanceof Error ? error.message : String(error)));
  }
};

// Ansprechpartner-Schnittstelle wird aus der types.ts-Datei importiert

export function PDFVorschauModal({ isOpen, onClose, kindId }: PDFVorschauModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [kind, setKind] = useState<Kind | null>(null);
  const [zuteilungen, setZuteilungen] = useState<Zuteilung[]>([]);
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);
  const [essensspenden, setEssensspenden] = useState<SpendenRueckmeldung[]>([]);
  const supabase = createClient();
  
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !kindId) return;
      
      setIsLoading(true);
      
      try {
        console.log(`Lade Daten für PDF-Vorschau, Kind-ID: ${kindId}`);
        
        // Kind-Daten laden
        const { data: kindData, error: kindError } = await createClient()
          .from('kinder')
          .select('id, vorname, nachname, klasse')
          .eq('id', kindId)
          .single();
          
        if (kindError) {
          console.error('Fehler beim Laden der Kind-Daten:', kindError);
          throw new Error(`Fehler beim Laden der Kind-Daten: ${kindError.message}`);
        }
        
        if (!kindData) {
          throw new Error(`Keine Daten für Kind mit ID ${kindId} gefunden`);
        }
        
        setKind(kindData);
        console.log('Kind-Daten geladen:', kindData);
        
        // Zuteilungen laden
        const { data: zuteilungenData, error: zuteilungenError } = await createClient()
          .from('helfer_zuteilungen')
          .select('id, aufgabe_id')
          .eq('kind_id', kindId);
          
        if (zuteilungenError) {
          console.error('Fehler beim Laden der Zuteilungen:', zuteilungenError);
          throw new Error(`Fehler beim Laden der Zuteilungen: ${zuteilungenError.message}`);
        }
        
        console.log(`${zuteilungenData.length} Zuteilungen gefunden`);
        
        // Aufgaben separat laden
        const aufgabenIds = zuteilungenData.map(z => z.aufgabe_id);
        
        if (aufgabenIds.length === 0) {
          console.warn('Keine Aufgaben-IDs gefunden');
          setZuteilungen([]);
          return;
        }
        
        const { data: aufgabenData, error: aufgabenError } = await createClient()
          .from('helferaufgaben')
          .select('id, titel, beschreibung, zeitfenster')
          .in('id', aufgabenIds);
          
        if (aufgabenError) {
          console.error('Fehler beim Laden der Aufgaben:', aufgabenError);
          throw new Error(`Fehler beim Laden der Aufgaben: ${aufgabenError.message}`);
        }
        
        console.log(`${aufgabenData.length} Aufgaben geladen`);
        
        // Aufgaben in Map umwandeln für schnellen Zugriff
        const aufgabenMap = aufgabenData.reduce((acc, aufgabe) => {
          acc[aufgabe.id] = aufgabe;
          return acc;
        }, {} as Record<string, any>);
        
        // Zuteilungen transformieren
        const transformedZuteilungen: Zuteilung[] = zuteilungenData.map(z => {
          const aufgabe = aufgabenMap[z.aufgabe_id] || {};
          return {
            id: z.id,
            aufgabe_id: z.aufgabe_id,
            via_springer: false, // Standardwert, falls nicht vorhanden
            helferaufgaben: {
              id: z.aufgabe_id,
              titel: aufgabe.titel || 'Unbekannte Aufgabe',
              beschreibung: aufgabe.beschreibung || null,
              zeitfenster: aufgabe.zeitfenster || null
            },
            slots: [] // Wird später gefüllt
          };
        });
        
        // Zuteilungs-IDs für die Slot-Abfrage sammeln
        const zuteilungIds = transformedZuteilungen.map(z => z.id);
        
        // Slot-Zuteilungen laden, wenn Zuteilungen vorhanden sind
        if (zuteilungIds.length > 0) {
          console.log('Lade Slot-Zuteilungen für Zuteilungs-IDs:', zuteilungIds);
          
          const { data: slotZuteilungenData, error: slotZuteilungenError } = await supabase
            .from('helfer_slot_zuteilungen')
            .select('slot_id, zuteilung_id')
            .in('zuteilung_id', zuteilungIds);
            
          if (slotZuteilungenError) {
            console.error('Fehler beim Laden der Slot-Zuteilungen:', slotZuteilungenError);
          } else if (slotZuteilungenData && slotZuteilungenData.length > 0) {
            console.log(`${slotZuteilungenData.length} Slot-Zuteilungen gefunden`);
            
            // Slot-IDs für die Slot-Details-Abfrage sammeln
            const slotIds = slotZuteilungenData.map(sz => sz.slot_id);
            
            // Slot-Details laden
            const { data: slotDetailsData, error: slotDetailsError } = await supabase
              .from('helfer_slots')
              .select('id, beschreibung, startzeit, endzeit, max_helfer')
              .in('id', slotIds);
              
            if (slotDetailsError) {
              console.error('Fehler beim Laden der Slot-Details:', slotDetailsError);
            } else if (slotDetailsData && slotDetailsData.length > 0) {
              console.log(`${slotDetailsData.length} Slot-Details geladen`);
              
              // Slot-Details in Map umwandeln für schnellen Zugriff
              const slotDetailsMap = slotDetailsData.reduce((acc, slot) => {
                acc[slot.id] = slot;
                return acc;
              }, {} as Record<string, any>);
              
              // Slot-Zuteilungen nach Zuteilungs-ID gruppieren
              const slotsByZuteilungId: Record<string, any[]> = {};
              
              slotZuteilungenData.forEach(sz => {
                if (!slotsByZuteilungId[sz.zuteilung_id]) {
                  slotsByZuteilungId[sz.zuteilung_id] = [];
                }
                
                const slotDetail = slotDetailsMap[sz.slot_id];
                if (slotDetail) {
                  slotsByZuteilungId[sz.zuteilung_id].push({
                    slot_id: sz.slot_id,
                    zuteilung_id: sz.zuteilung_id,
                    slot: slotDetail
                  });
                }
              });
              
              // Slots zu den entsprechenden Zuteilungen hinzufügen
              transformedZuteilungen.forEach(z => {
                if (slotsByZuteilungId[z.id]) {
                  z.slots = slotsByZuteilungId[z.id];
                }
              });
              
              console.log('Transformierte Zuteilungen mit Slots:', transformedZuteilungen);
            }
          }
        }
        
        setZuteilungen(transformedZuteilungen);
        
        // Ansprechpartner laden
        const { data: ansprechpartnerData, error: ansprechpartnerError } = await createClient()
          .from('ansprechpartner')
          .select('id, bereich, name, telefonnummer');
          
        if (ansprechpartnerError) {
          console.error('Fehler beim Laden der Ansprechpartner:', ansprechpartnerError);
          throw new Error(`Fehler beim Laden der Ansprechpartner: ${ansprechpartnerError.message}`);
        }
        
        console.log(`${ansprechpartnerData?.length || 0} Ansprechpartner geladen`);
        setAnsprechpartner(ansprechpartnerData || []);
        
        // Essensspenden laden
        // Wir müssen den kind_identifier im Format "Nachname, Vorname (Klasse)" erstellen
        const kindIdentifier = `${kindData.nachname}, ${kindData.vorname}${kindData.klasse ? ` (${kindData.klasse})` : ''}`;
        console.log(`Suche Essensspenden für Kind-Identifier: ${kindIdentifier}`);
        
        // Jetzt die Rueckmeldungen laden mit dem korrekten Identifier
        const { data: essensspendenData, error: essensspendenError } = await createClient()
          .from('essensspenden_rueckmeldungen')
          .select(`
            id,
            spende_id,
            kind_identifier,
            menge,
            freitext,
            erstellt_am
          `)
          .eq('kind_identifier', kindIdentifier);
          
        if (essensspendenError) {
          console.error('Fehler beim Laden der Essensspenden:', essensspendenError);
          setEssensspenden([]);
        } else if (essensspendenData && essensspendenData.length > 0) {
          console.log(`${essensspendenData.length} Essensspenden gefunden`);
          
          // Alle Spenden-IDs sammeln
          const spendeIds = essensspendenData.map(s => s.spende_id);
          
          // Spenden-Details laden
          const { data: spendenDetails, error: spendenError } = await createClient()
            .from('essensspenden_bedarf')
            .select('id, titel, beschreibung, anzahl_benoetigt, created_at')
            .in('id', spendeIds);
            
          if (spendenError) {
            console.error('Fehler beim Laden der Spenden-Details:', spendenError);
            setEssensspenden([]);
          } else {
            // Spenden-Details in Map umwandeln für schnellen Zugriff
            const spendenMap = spendenDetails?.reduce((acc, spende) => {
              acc[spende.id] = spende;
              return acc;
            }, {} as Record<string, any>) || {};
            
            // Essensspenden mit Details zusammenführen
            const transformedEssensspenden = essensspendenData.map(rueckmeldung => {
              const spendeDetail = spendenMap[rueckmeldung.spende_id] || {
                id: rueckmeldung.spende_id,
                titel: 'Unbekannte Spende',
                beschreibung: null,
                anzahl_benoetigt: 0,
                created_at: ''
              };
              
              return {
                ...rueckmeldung,
                spende: spendeDetail
              };
            });
            
            setEssensspenden(transformedEssensspenden);
            console.log(`${transformedEssensspenden.length} Essensspenden transformiert`);
          }
        } else {
          setEssensspenden([]);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Daten für die PDF-Vorschau:', error);
        toast.error(`Fehler beim Laden der Daten für die PDF-Vorschau: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [isOpen, kindId]);
  
  const handleGeneratePDF = async () => {
    if (!kind) return;
    
    try {
      toast.loading(`PDF für ${kind.vorname} ${kind.nachname} wird generiert...`);
      await generatePDF(kindId);
      toast.dismiss();
      toast.success(`PDF für ${kind.vorname} ${kind.nachname} erfolgreich generiert`);
    } catch (error) {
      console.error('Fehler bei der PDF-Generierung:', error);
      toast.dismiss();
      toast.error(`Fehler bei der PDF-Generierung für ${kind.vorname} ${kind.nachname}`);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            PDF-Vorschau: {kind ? `${kind.vorname} ${kind.nachname}` : 'Lädt...'}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Lade Daten...</span>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto bg-gray-100 rounded">
              {kind && zuteilungen.length > 0 ? (
                <div className="p-6 bg-white rounded shadow-inner h-full overflow-auto">
                  <div className="mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold mb-2">Vogelschießen 2025 – Helferaufgaben</h2>
                    <p className="text-gray-600">{kind.vorname} {kind.nachname} {kind.klasse ? `(${kind.klasse})` : ''}</p>
                  </div>
                  
                  <div className="mb-6">
                    <p className="mb-4">Liebe Eltern von {kind.vorname},</p>
                    <p className="mb-4">vielen Dank für Eure Unterstützung beim Vogelschießen 2025! Nur durch unsere gemeinsamen Anstrengungen ist unser Fest überhaupt zu realisieren.</p>
                    <p className="mb-4">Hier findet ihr eine Übersicht eurer Aufgaben:</p>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-4">Helferaufgaben:</h3>
                    
                    {zuteilungen.map((zuteilung) => (
                      <div key={zuteilung.id} className="mb-4 p-4 bg-gray-50 rounded border">
                        <h4 className="font-bold">
                          {zuteilung.helferaufgaben.titel}
                          {zuteilung.via_springer ? ' (als Springer)' : ''}
                        </h4>
                        
                        <div className="text-sm text-gray-600">
                          {/* Wenn keine Slots vorhanden sind, zeige das allgemeine Zeitfenster an */}
                          {(!zuteilung.slots || !Array.isArray(zuteilung.slots) || zuteilung.slots.length === 0) && zuteilung.helferaufgaben.zeitfenster && (
                            <p>Zeitfenster: {zuteilung.helferaufgaben.zeitfenster}</p>
                          )}
                          
                          {/* Wenn Slots vorhanden sind, zeige diese an */}
                          {zuteilung.slots && Array.isArray(zuteilung.slots) && zuteilung.slots.length > 0 && (
                            <div>
                              {zuteilung.slots.map((slotZuteilung, index) => {
                                // Formatiere die Zeiten (HH:MM statt HH:MM:SS)
                                let startzeit = 'Unbekannt';
                                let endzeit = 'Unbekannt';
                                
                                try {
                                  startzeit = slotZuteilung.slot.startzeit.substring(0, 5);
                                  endzeit = slotZuteilung.slot.endzeit.substring(0, 5);
                                } catch (e) {
                                  console.error('Fehler beim Formatieren der Zeiten:', e);
                                }
                                
                                return (
                                  <p key={`slot-${index}-${slotZuteilung.slot_id || 'unknown'}`}>
                                    {slotZuteilung.slot.beschreibung ? `${slotZuteilung.slot.beschreibung} – ` : ''}
                                    Zeitfenster: {startzeit}–{endzeit} Uhr
                                  </p>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        
                        {zuteilung.helferaufgaben.beschreibung && (
                          <p className="mt-2">
                            {zuteilung.helferaufgaben.beschreibung}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Essensspenden Sektion */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-4">Essensspenden:</h3>
                    
                    {essensspenden && essensspenden.length > 0 ? (
                      <>
                        {essensspenden.map((spende) => (
                          <div key={spende.id} className="mb-4 p-4 bg-gray-50 rounded border">
                            <h4 className="font-bold">
                              {spende.spende?.titel || 'Unbekannte Spende'}
                            </h4>
                            
                            <p className="text-gray-600 text-sm mt-1">
                              Menge: {spende.menge}
                            </p>
                            
                            {spende.freitext && (
                              <p className="mt-2">
                                Anmerkung: {spende.freitext}
                              </p>
                            )}
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-gray-600">
                        Keine Essensspenden zugeordnet.
                      </p>
                    )}
                  </div>
                  
                  {ansprechpartner.length > 0 && (
                    <div className="bg-gray-100 p-4 rounded">
                      <h3 className="font-bold mb-2">Ansprechpartner:</h3>
                      
                      {/* Gruppiere Ansprechpartner nach Bereich */}
                      {Object.entries(ansprechpartner.reduce<Record<string, typeof ansprechpartner>>((acc, person) => {
                        if (!acc[person.bereich]) {
                          acc[person.bereich] = [];
                        }
                        acc[person.bereich].push(person);
                        return acc;
                      }, {})).map(([bereich, personen]) => (
                        <div key={bereich} className="mb-2">
                          <p className="font-medium">{bereich}:</p>
                          
                          {personen.map((person) => (
                            <p key={person.id} className="text-sm ml-4">
                              {person.name}{person.telefonnummer ? ` - ${person.telefonnummer}` : ''}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-8 pt-4 border-t text-center text-gray-500 text-sm">
                    <p>Regenbogenschule Melsdorf</p>
                    <p>www.vagelscheeten.de</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center h-full">
                  <p className="text-muted-foreground">
                    {kind ? 'Keine Zuteilungen gefunden.' : 'Kind nicht gefunden.'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-4">
              <Button
                variant="default"
                onClick={handleGeneratePDF}
                disabled={!kind || zuteilungen.length === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                PDF herunterladen
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
