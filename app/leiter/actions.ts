'use server';

import { createClient } from '@/lib/supabase/server'; // Server client für DB-Zugriff
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { redirect } from 'next/navigation';

// Definiere das erwartete Schema für die Formulardaten
const LeiterLoginSchema = z.object({
  gruppenname: z.string().min(1, 'Gruppenname darf nicht leer sein'),
  zugangscode: z.string().min(1, 'Zugangscode darf nicht leer sein'),
});

// Typ für das Ergebnis der Action
interface LeiterLoginState {
  success: boolean;
  error?: string;
}

export async function leiterLogin(prevState: LeiterLoginState | undefined, formData: FormData): Promise<LeiterLoginState> {
  const formDataObject = {
    gruppenname: formData.get('gruppenname'),
    zugangscode: formData.get('zugangscode'),
  };

  const validatedFields = LeiterLoginSchema.safeParse(formDataObject);

  // Wenn die Validierung fehlschlägt, gib die Fehler zurück
  if (!validatedFields.success) {
    return {
      success: false,
      error: validatedFields.error.flatten().fieldErrors.gruppenname?.[0] ||
        validatedFields.error.flatten().fieldErrors.zugangscode?.[0] ||
        'Ungültige Eingabe.',
    };
  }

  // Wenn Validierung erfolgreich war:
  const { gruppenname, zugangscode } = validatedFields.data;
  console.log(`Leiter-Login: Validierung erfolgreich für Gruppe: ${gruppenname}`); // LOGGING

  try {
    console.log('Leiter-Login: Versuche Supabase Server Client zu erstellen...'); // LOGGING
    const supabase = await createClient();
    console.log('Leiter-Login: Supabase Server Client erstellt.'); // LOGGING

    // 1. Finde das aktuell aktive Event
    console.log('Leiter-Login: Suche aktives Event...'); // LOGGING
    const { data: activeEvent, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('ist_aktiv', true)
      .single();

    if (eventError) {
      console.error('Leiter-Login: Fehler beim Abrufen des aktiven Events:', eventError); // LOGGING
      return { success: false, error: 'Fehler beim Abrufen des Events. Bitte Admin kontaktieren.' };
    }

    if (!activeEvent) {
      console.error('Leiter-Login: Kein aktives Event in der Datenbank gefunden.'); // LOGGING
      return { success: false, error: 'Kein aktives Event gefunden. Bitte Admin kontaktieren.' };
    }

    console.log(`Leiter-Login: Aktives Event gefunden: ID ${activeEvent.id}`); // LOGGING

    // 2. Finde die Spielgruppe basierend auf dem Namen UND dem aktiven Event
    console.log(`Leiter-Login: Suche Gruppe '${gruppenname}' für Event ID ${activeEvent.id}...`); // LOGGING
    const { data: gruppe, error: dbError } = await supabase
      .from('spielgruppen')
      .select('id, leiter_zugangscode')
      .eq('name', gruppenname)
      .eq('event_id', activeEvent.id) 
      .single(); // Erwarte genau ein Ergebnis für dieses Event

    console.log('Leiter-Login: Datenbankabfrage für Gruppe abgeschlossen.'); // LOGGING

    if (dbError || !gruppe) {
      console.error(`Fehler bei DB-Abfrage oder Gruppe '${gruppenname}' nicht für Event '${activeEvent.id}' gefunden:`, dbError);
      return {
        success: false,
        error: 'Gruppenname nicht gefunden oder für aktuelles Event nicht vorhanden.',
      };
    }

    console.log(`Leiter-Login: Gruppe '${gruppenname}' für Event '${activeEvent.id}' gefunden. Vergleiche Zugangscode...`); // LOGGING

    // Vergleiche den Zugangscode (direkter Vergleich, für einfache Codes ok)
    // In einer echten Anwendung sollte man Hashes verwenden!
    if (gruppe.leiter_zugangscode !== zugangscode) {
      return {
        success: false,
        error: 'Ungültiger Zugangscode.',
      };
    }

    console.log('Leiter-Login: Zugangscode korrekt. Erstelle JWT...'); // LOGGING

    // Überprüfe, ob das JWT-Secret vorhanden ist
    const secret = process.env.LEITER_JWT_SECRET;
    if (!secret) {
      console.error('LEITER_JWT_SECRET ist nicht gesetzt!');
      return {
        success: false,
        error: 'Serverkonfigurationsfehler.',
      };
    }

    // Erstelle das JWT-Payload
    const payload = {
      gruppeId: gruppe.id,
      gruppenname: gruppenname,
      isLeiter: true, // Eindeutiges Merkmal für Leiter-Session
    };

    // Signiere das JWT
    const token = jwt.sign(payload, secret, {
      expiresIn: '8h', // Gültigkeit des Tokens, z.B. 8 Stunden
    });

    console.log('Leiter-Login: JWT erstellt, versuche Cookie zu setzen...'); // LOGGING

    // Setze das JWT als Cookie (mit await)
    (await cookies()).set('leiter_session', token, {
      httpOnly: true, // Nur serverseitig lesbar
      secure: process.env.NODE_ENV === 'production', // Nur über HTTPS in Produktion
      path: '/', // Gültig für die gesamte Anwendung
      maxAge: 60 * 60 * 8, // Lebensdauer des Cookies in Sekunden (8 Stunden)
      sameSite: 'lax', // Schutz gegen CSRF
    });

    console.log('Leiter-Login: Cookie erfolgreich gesetzt, gebe success zurück.'); // LOGGING

    // Bei Erfolg: Gib Erfolgsstatus zurück (kein Redirect hier)
    return { success: true };

  } catch (error) {
    console.error('Unerwarteter Fehler beim Leiter-Login:', error);
    return {
      success: false,
      error: 'Ein unerwarteter Fehler ist aufgetreten.',
    };
  }
}

// --- Neue Action für Leiter Logout ---
export async function leiterLogout() {
  'use server';

  console.log('Leiter-Logout: Versuche Cookie zu löschen...'); // LOGGING
  try {
    // Lösche das Cookie (mit await)
    (await cookies()).delete('leiter_session');
    console.log('Leiter-Logout: Cookie erfolgreich gelöscht.'); // LOGGING
  } catch (error) {
    console.error('Fehler beim Löschen des Leiter-Session-Cookies:', error);
    // Optional: Fehler an den Client zurückgeben, falls nötig
  }
  redirect('/leiter/login');
}
// --- Ende Leiter Logout Action ---
