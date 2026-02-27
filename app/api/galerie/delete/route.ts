import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Serverseitiger Supabase-Client mit Admin-Rechten
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: Request) {
  try {
    // Auth-Check: Nur eingeloggte Admins dürfen Bilder löschen
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Daten aus der Anfrage extrahieren
    const { imageName } = await request.json();

    if (!imageName || typeof imageName !== 'string') {
      return NextResponse.json(
        { error: 'Bildname ist erforderlich' },
        { status: 400 }
      );
    }

    // Bildname validieren — nur Dateinamen ohne Pfad-Traversal erlauben
    if (imageName.includes('/') || imageName.includes('..') || imageName.includes('\\')) {
      return NextResponse.json(
        { error: 'Ungültiger Bildname' },
        { status: 400 }
      );
    }

    // Löschen mit Admin-Rechten
    const { data, error } = await supabaseAdmin
      .storage
      .from('galerie')
      .remove([imageName]);

    if (error) {
      console.error('API Löschfehler:', error);
      return NextResponse.json(
        { error: 'Fehler beim Löschen des Bildes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API Unerwarteter Fehler:', error);
    return NextResponse.json(
      { error: 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
