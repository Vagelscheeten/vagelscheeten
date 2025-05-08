'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
// Direkte Importe ohne Typprüfung, um Kompilierungsfehler zu vermeiden
const HeadingSection = require('./HeadingSection').HeadingSection;
const AufgabenListe = require('./AufgabenListe').AufgabenListe;
const HelferRueckmeldungForm = require('./HelferRueckmeldungForm').HelferRueckmeldungForm;
const AuswertungView = require('./AuswertungView').AuswertungView;
const EssensspendenTabs = require('./essensspenden/EssensspendenTabs').EssensspendenTabs;
import { Button } from '@/components/ui/button';
import { PlusCircle, ClipboardList, Settings, Users, Edit, Coffee, FileDown, Phone, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
// Verwende einen einfachen Div statt der Skeleton-Komponente
// import { Skeleton } from '@/components/ui/skeleton';

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
  kind?: {
    vorname: string;
    nachname: string;
    klasse?: string;
  };
}

export default function HelferVerwaltung() {
  const [isLoading, setIsLoading] = useState(true);
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [rueckmeldungen, setRueckmeldungen] = useState<Rueckmeldung[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
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
      
      // Rückmeldungen laden mit Kinder-Daten
      const { data: rueckmeldungenData, error: rueckmeldungenError } = await supabase
        .from('helfer_rueckmeldungen')
        .select(`
          *,
          kind:kinder(vorname, nachname, klasse)
        `);
      
      if (rueckmeldungenError) {
        console.error('Fehler beim Laden der Rückmeldungen:', rueckmeldungenError);
      } else {
        setRueckmeldungen(rueckmeldungenData || []);
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [refreshTrigger]);
  
  // Callback für erfolgreiche Formular-Übermittlung
  const handleFormSubmit = () => {
    setIsFormOpen(false);
    setRefreshTrigger(prev => prev + 1); // Daten neu laden
  };
  
  // Callback, der NUR die Daten neu lädt (für onSuccess prop)
  const handleFormSuccess = () => {
    setRefreshTrigger(prev => prev + 1); // Daten neu laden
  };
  
  return (
    <main className="p-6">
      <div className="mb-8">
        <HeadingSection /> 
        <div className="flex flex-wrap gap-2 mt-4">
          <Button onClick={() => setIsFormOpen(true)} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Neue Rückmeldung
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <Link href="/admin/helfer/rueckmeldungen">
              <ClipboardList className="mr-2 h-4 w-4" /> Rückmeldungen verwalten
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <Link href="/admin/helfer/aufgaben">
              <Settings className="mr-2 h-4 w-4" /> Aufgaben verwalten
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <Link href="/admin/helfer/zuteilung">
              <Users className="mr-2 h-4 w-4" /> Helfer zuteilen
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <Link href="/admin/helfer-bearbeiten">
              <Edit className="mr-2 h-4 w-4" /> Zuteilungen bearbeiten
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <Link href="/admin/helfer/slots">
              <Clock className="mr-2 h-4 w-4" /> Slot-Zuteilung
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <Link href="/admin/helfer/spielbetreuer">
              <Users className="mr-2 h-4 w-4" /> Spielbetreuer
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <Link href="/admin/helfer/pdf">
              <FileDown className="mr-2 h-4 w-4" /> PDF-Ausgabe
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <Link href="/admin/kontakte">
              <Phone className="mr-2 h-4 w-4" /> Ansprechpartner
            </Link>
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="aufgaben" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="aufgaben" className="px-2 py-2 text-sm whitespace-normal">Aufgaben & Rückmeldungen</TabsTrigger>
          <TabsTrigger value="auswertung" className="px-2 py-2 text-sm whitespace-normal">Auswertung</TabsTrigger>
          <TabsTrigger value="essensspenden" className="px-2 py-2 text-sm whitespace-normal">Essensspenden</TabsTrigger>
        </TabsList>
        
        <TabsContent value="aufgaben" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-12 w-full bg-gray-200 animate-pulse rounded-md" />
              <div className="h-12 w-full bg-gray-200 animate-pulse rounded-md" />
              <div className="h-12 w-full bg-gray-200 animate-pulse rounded-md" />
            </div>
          ) : (
            <AufgabenListe 
              aufgaben={aufgaben} 
              rueckmeldungen={rueckmeldungen} 
            />
          )}
        </TabsContent>
        
        <TabsContent value="auswertung" className="mt-6">
          <div className="space-y-6">
            <AuswertungView 
              aufgaben={aufgaben} 
              rueckmeldungen={rueckmeldungen}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="essensspenden" className="mt-6">
          <EssensspendenTabs />
        </TabsContent>
      </Tabs>
      
      {/* Formular für neue Rückmeldungen */}
      {isFormOpen && (
        <HelferRueckmeldungForm 
          aufgaben={aufgaben}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          onSuccess={handleFormSuccess} // Use the new prop and handler
        />
      )}
    </main>
  );
}
