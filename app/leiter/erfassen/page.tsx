import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { leiterLogout } from '../actions';
import { createClient } from '@/lib/supabase/server';
import ClientErfassung from './ClientErfassung';
import { verifyLeiterSession } from '@/lib/leiter-auth';

export default async function ErgebnisErfassenPage() {
  const supabase = await createClient();
  const leiterSession = await verifyLeiterSession();

  if (!leiterSession) {
    console.error('Erfassen Page: Kein Leiter-Token gefunden. Umleitung zum Login.');
    redirect('/leiter/login');
  }

  const gruppenname = leiterSession.gruppenname;
  const gruppeId = leiterSession.gruppeId;

  // Hole die Spielgruppe aus der Datenbank
  const { data: spielgruppe, error: spielgruppeError } = await supabase
    .from('spielgruppen')
    .select('*')
    .eq('id', gruppeId)
    .single();

  if (spielgruppeError || !spielgruppe) {
    console.error('Erfassen Page: Fehler beim Laden der Spielgruppe:', spielgruppeError);
    // Hier könnten wir einen Fehler anzeigen oder zum Login umleiten
    redirect('/leiter/login');
  }

  // Hole alle Kinder für diese Gruppe über die Zuordnungstabelle
  const { data: kinderZuordnungen, error: zuordnungError } = await supabase
    .from('kind_spielgruppe_zuordnung')
    .select('kind_id')
    .eq('spielgruppe_id', gruppeId)
    .eq('event_id', spielgruppe.event_id);

  if (zuordnungError) {
    console.error('Erfassen Page: Fehler beim Laden der Kinder-Zuordnungen:', zuordnungError);
    // Hier könnten wir einen Fehler anzeigen
  }

  // Extrahiere die Kind-IDs aus den Zuordnungen
  const kindIds = kinderZuordnungen?.map(z => z.kind_id) || [];
  
  // Hole die Kinderdaten für die gefundenen IDs
  const { data: kinder, error: kinderError } = await supabase
    .from('kinder')
    .select('*')
    .in('id', kindIds.length > 0 ? kindIds : ['0']) // Fallback auf eine nicht existierende ID, wenn keine Kinder gefunden wurden
    .order('vorname');

  if (kinderError) {
    console.error('Erfassen Page: Fehler beim Laden der Kinder:', kinderError);
    // Hier könnten wir einen Fehler anzeigen
  }
  
  // Stelle sicher, dass kinder ein Array ist, auch wenn keine Daten gefunden wurden
  const kinderListe = kinder || [];

  // Define a local server action wrapper
  async function handleLogout() {
    'use server';
    await leiterLogout(); // Call the imported action
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Leiter-Bereich</h1>
          <p className="text-gray-600">Gruppe: {gruppenname}</p>
        </div>
        <form action={handleLogout}>
          <Button type="submit" variant="outline">Abmelden</Button>
        </form>
      </div>

      {/* Hauptinhalt */}
      <div className="mb-8">
        {spielgruppe && (
          <ClientErfassung
            spielgruppe={spielgruppe}
            kinder={kinderListe}
          />
        )}
      </div>
    </div>
  );
}
