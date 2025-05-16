'use server'; // Markiert dies als Server Actions Modul

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function logout() {
  const supabase = await createClient();

  // Versucht, den Benutzer abzumelden
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Logout error:', error);
    // Optional: Fehlerbehandlung, z.B. Weiterleitung zu einer Fehlerseite
    // oder Anzeige einer Nachricht. Fürs Erste leiten wir einfach weiter.
  }

  // Nach dem Logout (oder Fehler) zur Login-Seite weiterleiten
  redirect('/login');
}
