'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { HeadingSection } from './HeadingSection';
import { AufgabenListe } from './AufgabenListe';
import { AufgabenForm } from './AufgabenForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
}

interface Rueckmeldung {
  id: string;
  kind_id: string;
  aufgabe_id: string;
  prioritaet: number;
  freitext: string | null;
}

export default function AufgabenVerwaltung() {
  const [isLoading, setIsLoading] = useState(true);
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [rueckmeldungen, setRueckmeldungen] = useState<Rueckmeldung[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAufgabe, setSelectedAufgabe] = useState<Aufgabe | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();
  
  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      
      // Aufgaben laden
      const { data: aufgabenData, error: aufgabenError } = await supabase
        .from('helferaufgaben')
        .select('*')
        .order('titel');
      
      if (aufgabenError) {
        console.error('Fehler beim Laden der Aufgaben:', aufgabenError);
      } else {
        setAufgaben(aufgabenData || []);
      }
      
      // Rückmeldungen laden
      const { data: rueckmeldungenData, error: rueckmeldungenError } = await supabase
        .from('helfer_rueckmeldungen')
        .select('id, kind_id, aufgabe_id, prioritaet, freitext');
      
      if (rueckmeldungenError) {
        console.error('Fehler beim Laden der Rückmeldungen:', rueckmeldungenError);
      } else {
        setRueckmeldungen(rueckmeldungenData || []);
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [refreshTrigger]);
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  const handleCreateNew = () => {
    setSelectedAufgabe(undefined);
    setIsEditing(false);
    setIsFormOpen(true);
  };
  
  const handleEdit = (aufgabe: Aufgabe) => {
    setSelectedAufgabe(aufgabe);
    setIsEditing(true);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
  };
  
  const handleFormSave = () => {
    handleRefresh();
  };
  
  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <HeadingSection />
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/helfer')}
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Übersicht
          </Button>
          <Button onClick={handleCreateNew} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Neue Aufgabe
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-8 w-8 border-2 border-gray-500 rounded-full border-t-transparent"></div>
        </div>
      ) : (
        <AufgabenListe 
          aufgaben={aufgaben}
          rueckmeldungen={rueckmeldungen}
          onEdit={handleEdit}
          onRefresh={handleRefresh}
        />
      )}
      
      {/* Formular für neue/bearbeiten von Aufgaben */}
      <AufgabenForm 
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleFormSave}
        aufgabe={selectedAufgabe}
        isEditing={isEditing}
      />
    </main>
  );
}
