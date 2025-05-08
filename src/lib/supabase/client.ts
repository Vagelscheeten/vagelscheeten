import { createBrowserClient } from '@supabase/ssr';
import Cookies from 'js-cookie';

export function createClient() {
  // Hole den Token aus dem korrekten Cookie
  const leiterToken = Cookies.get('leiterToken'); // <-- Name korrigiert!

  // Create a supabase client on the browser with project's credentials
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          // Setze den Leiter-JWT als Authorization Header, wenn vorhanden
          Authorization: leiterToken ? `Bearer ${leiterToken}` : '' // <-- Verwende die Variable
        }
      }
    }
  );

  return client;
}
