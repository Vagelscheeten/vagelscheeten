'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SpendenBedarfTabelle } from './SpendenBedarfTabelle';
import { SpendenRueckmeldungenTabelle } from './SpendenRueckmeldungenTabelle';
import { SpendenBedarfForm } from './SpendenBedarfForm';
import { ManuelleEssensspendeZuweisungModal } from './ManuelleEssensspendeZuweisungModal';
import { SpendenBedarf, SpendenBedarfMitSumme, SpendenRueckmeldung } from './types';

export function SpendenView() {
  const [bedarfe, setBedarfe] = useState<SpendenBedarf[]>([]);
  const [rueckmeldungen, setRueckmeldungen] = useState<SpendenRueckmeldung[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBedarf, setSelectedBedarf] = useState<SpendenBedarf | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isVisible, setIsVisible] = useState(true); // Tracking ob der Tab sichtbar ist
  const [isZuweisungModalOpen, setIsZuweisungModalOpen] = useState(false);
  const [selectedBedarfForZuweisung, setSelectedBedarfForZuweisung] = useState<SpendenBedarfMitSumme | null>(null);

  // Echtzeit-Subscription für Bedarfe
  useEffect(() => {
    if (!isVisible) return;
    
    const supabase = createClient();
    
    // Echtzeit-Subscription für Bedarfe
    const bedarfeSubscription = supabase
      .channel('essensspenden_bedarf_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'essensspenden_bedarf' 
      }, () => {
        // Bei Änderungen die Daten neu laden
        setRefreshTrigger(prev => prev + 1);
      })
      .subscribe();
      
    // Echtzeit-Subscription für Rückmeldungen
    const rueckmeldungenSubscription = supabase
      .channel('essensspenden_rueckmeldungen_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'essensspenden_rueckmeldungen' 
      }, () => {
        // Bei Änderungen die Daten neu laden
        setRefreshTrigger(prev => prev + 1);
      })
      .subscribe();
    
    // Cleanup-Funktion
    return () => {
      bedarfeSubscription.unsubscribe();
      rueckmeldungenSubscription.unsubscribe();
    };
  }, [isVisible]);
  
  // Komponente als sichtbar markieren, wenn sie gemountet wird
  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);
  
  // Daten laden
  useEffect(() => {
    if (!isVisible) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      
      // Bedarfe laden
      const { data: bedarfeData, error: bedarfeError } = await supabase
        .from('essensspenden_bedarf')
        .select('*')
        .order('titel');
      
      if (bedarfeError) {
        console.error('Fehler beim Laden der Bedarfe:', bedarfeError);
        toast.error('Bedarfe konnten nicht geladen werden.');
      } else {
        setBedarfe(bedarfeData || []);
      }
      
      // Rückmeldungen laden mit JOIN auf Bedarfe
      const { data: rueckmeldungenData, error: rueckmeldungenError } = await supabase
        .from('essensspenden_rueckmeldungen')
        .select(`
          *,
          spende:spende_id(id, titel, beschreibung, anzahl_benoetigt)
        `)
        .order('erstellt_am', { ascending: false });
      
      if (rueckmeldungenError) {
        console.error('Fehler beim Laden der Rückmeldungen:', rueckmeldungenError);
        toast.error('Rückmeldungen konnten nicht geladen werden.');
      } else {
        setRueckmeldungen(rueckmeldungenData || []);
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [refreshTrigger]);
  
  // Bedarf zum Bearbeiten auswählen
  const handleEditBedarf = (bedarf: SpendenBedarf) => {
    setSelectedBedarf(bedarf);
    setIsFormOpen(true);
  };
  
  // Bedarf löschen
  const handleDeleteBedarf = async (bedarfId: string) => {
    if (!window.confirm('Möchtest du diesen Bedarf wirklich löschen? Alle zugehörigen Rückmeldungen werden ebenfalls gelöscht.')) {
      return;
    }
    
    const supabase = createClient();
    const { error } = await supabase
      .from('essensspenden_bedarf')
      .delete()
      .eq('id', bedarfId);
    
    if (error) {
      console.error('Fehler beim Löschen des Bedarfs:', error);
      toast.error('Bedarf konnte nicht gelöscht werden.');
    } else {
      toast.success('Bedarf erfolgreich gelöscht.');
      setRefreshTrigger(prev => prev + 1); // Daten neu laden
    }
  };
  
  // Rückmeldung löschen
  const handleDeleteRueckmeldung = async (rueckmeldungId: string) => {
    if (!window.confirm('Möchtest du diese Rückmeldung wirklich löschen?')) {
      return;
    }
    
    const supabase = createClient();
    const { error } = await supabase
      .from('essensspenden_rueckmeldungen')
      .delete()
      .eq('id', rueckmeldungId);
    
    if (error) {
      console.error('Fehler beim Löschen der Rückmeldung:', error);
      toast.error('Rückmeldung konnte nicht gelöscht werden.');
    } else {
      toast.success('Rückmeldung erfolgreich gelöscht.');
      setRefreshTrigger(prev => prev + 1); // Daten neu laden
    }
  };
  
  // Formular-Callbacks
  const handleFormSubmit = () => {
    setIsFormOpen(false);
    setSelectedBedarf(null);
    setRefreshTrigger(prev => prev + 1); // Daten neu laden
  };
  
  // Berechne Summen für jeden Bedarf
  const bedarfeMitSummen = bedarfe.map(bedarf => {
    const summeRueckmeldungen = rueckmeldungen
      .filter(r => r.spende_id === bedarf.id)
      .reduce((sum, r) => sum + r.menge, 0);
    
    const prozentAbdeckung = bedarf.anzahl_benoetigt > 0 
      ? Math.min(100, Math.round((summeRueckmeldungen / bedarf.anzahl_benoetigt) * 100)) 
      : 0;
    
    return {
      ...bedarf,
      summeRueckmeldungen,
      prozentAbdeckung
    };
  });
  
  // Manuelle Zuweisung eines Kindes zu einer Essensspende
  const handleManuelleZuweisung = (bedarf: SpendenBedarfMitSumme) => {
    setSelectedBedarfForZuweisung(bedarf);
    setIsZuweisungModalOpen(true);
  };
  
  // Callback nach erfolgreicher Zuweisung
  const handleZuweisungSuccess = () => {
    setIsZuweisungModalOpen(false);
    setSelectedBedarfForZuweisung(null);
    setRefreshTrigger(prev => prev + 1); // Daten neu laden
  };
  
  // Automatisches Neuladen der Daten, wenn die Komponente sichtbar wird
  useEffect(() => {
    if (isVisible) {
      setRefreshTrigger(prev => prev + 1);
    }
  }, [isVisible]);
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Essensspenden-Verwaltung</h2>
        <Button onClick={() => { setSelectedBedarf(null); setIsFormOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Neuen Bedarf hinzufügen
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Lade Daten...
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Übersicht der Bedarfe</h3>
            <SpendenBedarfTabelle 
              bedarfe={bedarfeMitSummen} 
              onEdit={handleEditBedarf} 
              onDelete={handleDeleteBedarf}
              onManuelleZuweisung={handleManuelleZuweisung}
            />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Rückmeldungen</h3>
            <SpendenRueckmeldungenTabelle 
              rueckmeldungen={rueckmeldungen} 
              onDelete={handleDeleteRueckmeldung} 
            />
          </div>
        </>
      )}
      
      {isFormOpen && (
        <SpendenBedarfForm 
          bedarf={selectedBedarf}
          onClose={() => { setIsFormOpen(false); setSelectedBedarf(null); }}
          onSubmit={handleFormSubmit}
        />
      )}
      
      {isZuweisungModalOpen && selectedBedarfForZuweisung && (
        <ManuelleEssensspendeZuweisungModal
          open={isZuweisungModalOpen}
          onClose={() => { setIsZuweisungModalOpen(false); setSelectedBedarfForZuweisung(null); }}
          bedarf={selectedBedarfForZuweisung}
          onSave={handleZuweisungSuccess}
          verfuegbareMenge={Math.max(0, selectedBedarfForZuweisung.anzahl_benoetigt - selectedBedarfForZuweisung.summeRueckmeldungen)}
        />
      )}
    </div>
  );
}
