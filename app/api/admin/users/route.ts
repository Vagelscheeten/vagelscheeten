// Next.js 13+ Route Handler für sicheres User-Listing und -Erstellung (Service-Role-Key, nur auf dem Server!)
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data.users), { status: 200 });
}

// Neuen Benutzer anlegen
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { email, password, name } = await req.json();
    
    // Validierung
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'E-Mail und Passwort sind erforderlich' }), { status: 400 });
    }
    
    // Benutzer erstellen mit force_password_change Flag
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // E-Mail-Bestätigung überspringen
      user_metadata: {
        name: name || '',
        force_password_change: true // Passwortänderung beim ersten Login erzwingen
      }
    });
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    return new Response(JSON.stringify(data), { status: 201 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Ein Fehler ist aufgetreten' }), { status: 500 });
  }
}
