import { createBrowserClient } from '@supabase/ssr';
import Cookies from 'js-cookie';

export function createClient() {
  // Überprüfen, ob die Umgebungsvariablen gesetzt sind
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Supabase Umgebungsvariablen fehlen!');
  }

  // Create a supabase client on the browser with project's credentials
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        }
      }
    }
  );

  console.log('Supabase Client erstellt mit URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  return client;
}
