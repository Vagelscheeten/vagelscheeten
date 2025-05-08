import React from 'react';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { leiterLogout } from '@/app/leiter/actions';
import { createClient } from '@/lib/supabase/server';
import ClientErfassung from './ClientErfassung';
import type { Database } from '@/types/database';

interface LeiterJwtPayload {
  gruppenname: string;
  iat: number;
  exp: number;
}

export default async function ErgebnisErfassenPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  console.log('Erfassen Page: All cookies found:', cookieStore.getAll());
  const token = cookieStore.get('leiterToken')?.value;
  let gruppenname = '';

  if (!token) {
    console.error('Erfassen Page: Kein Leiter-Token gefunden. Umleitung zum Login.');
    redirect('/leiter/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.LEITER_JWT_SECRET!) as LeiterJwtPayload;
    gruppenname = decoded.gruppenname;
    console.log(`Erfassen Page: Token verifiziert für Gruppe: ${gruppenname}`);
  } catch (error) {
    console.error('Erfassen Page: Ungültiges oder abgelaufenes Leiter-Token. Umleitung zum Login.', error);
    // Optional: Cookie löschen, falls ungültig?
    // cookieStore.delete('leiterToken'); 
    redirect('/leiter/login');
  }

  if (!gruppenname) {
    // Fallback, sollte durch vorherige Checks nicht erreicht werden
    console.error('Erfassen Page: Gruppenname konnte nicht aus Token extrahiert werden. Umleitung zum Login.');
    redirect('/leiter/login');
  }

  // Define a local server action wrapper
  async function handleLogout() {
    'use server';
    await leiterLogout(); // Call the imported action
  }

  // Daten aus der Datenbank laden

  
  // Spielgruppe laden
  const { data: spielgruppe } = await supabase
    .from('spielgruppen')
    .select('*, klasse, event_id')
    .eq('name', gruppenname)
    .single();

  if (!spielgruppe) {
    console.error(`Erfassen Page: Keine Spielgruppe mit Namen ${gruppenname} gefunden`);
    redirect('/leiter/login');
  }

  // Kinder der Gruppe laden mit der neuen Datenbankstruktur
  const { data: kinder } = await supabase
    .from('kinder')
    .select(`
      *,
      kind_spielgruppe_zuordnung!inner(spielgruppe_id, event_id)
    `)
    .eq('kind_spielgruppe_zuordnung.spielgruppe_id', spielgruppe.id)
    .eq('kind_spielgruppe_zuordnung.event_id', spielgruppe.event_id)
    .order('nachname, vorname');

  // Spiele für die Klasse und das aktuelle Event laden
  const { data: spiele } = await supabase
    .from('spiele')
    .select(`
      *,
      event_spiele!inner(event_id)
    `)
    .eq('klasse', spielgruppe.klasse) // Direkt nach der Klasse filtern
    .eq('event_spiele.event_id', spielgruppe.event_id)
    .order('name'); // Nach Namen sortieren

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 p-4">
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-bold">{gruppenname}</CardTitle>
              <CardDescription>
                {spielgruppe.klasse || 'Keine Klasse zugeordnet'}
              </CardDescription>
            </div>
            <form action={handleLogout}>
              <Button type="submit" variant="outline" size="sm">
                Logout
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <ClientErfassung 
            kinder={kinder || []} 
            spielgruppe={spielgruppe}
          />
        </CardContent>
      </Card>
    </div>
  );
}