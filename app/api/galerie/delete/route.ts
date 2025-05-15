import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Serverseitiger Supabase-Client mit Admin-Rechten
const supabaseAdmin = createClient(
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
    // Daten aus der Anfrage extrahieren
    const { imageName } = await request.json();
    
    if (!imageName) {
      return NextResponse.json(
        { error: 'Bildname ist erforderlich' },
        { status: 400 }
      );
    }

    console.log(`API: Versuche Bild zu löschen: ${imageName}`);

    // Löschen mit Admin-Rechten
    const { data, error } = await supabaseAdmin
      .storage
      .from('galerie')
      .remove([imageName]);

    if (error) {
      console.error('API Löschfehler:', error);
      return NextResponse.json(
        { error: `Fehler beim Löschen: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('API Löschergebnis:', data);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API Unerwarteter Fehler:', error);
    return NextResponse.json(
      { error: `Unerwarteter Fehler: ${error.message}` },
      { status: 500 }
    );
  }
}
