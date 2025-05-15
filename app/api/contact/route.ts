import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialisieren des Supabase-Clients mit Admin-Rechten
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

// E-Mail-Empfänger
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'orgateam@vagelscheeten.de';

// Initialisieren der Clients
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
const resend = new Resend(resendApiKey);

console.log('Kontakt-API initialisiert mit Supabase und Resend');

export async function POST(request: Request) {
  try {
    // Daten aus der Anfrage extrahieren
    const { name, email, message } = await request.json();
    
    // Validierung der Eingaben
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, E-Mail und Nachricht sind erforderlich' },
        { status: 400 }
      );
    }
    
    // E-Mail-Validierung mit einfachem Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Bitte gib eine gültige E-Mail-Adresse ein' },
        { status: 400 }
      );
    }
    
    // In Supabase speichern
    const { data: supabaseData, error: supabaseError } = await supabaseAdmin
      .from('kontaktanfragen')
      .insert([
        {
          name: name,
          email: email,
          nachricht: message,
          created_at: new Date().toISOString()
        }
      ]);
    
    if (supabaseError) {
      console.error('Fehler beim Speichern der Kontaktanfrage:', supabaseError);
      return NextResponse.json(
        { error: `Fehler beim Speichern der Nachricht: ${supabaseError.message}` },
        { status: 500 }
      );
    }
    
    // E-Mail senden mit Resend
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Vogelschießen Kontaktformular <onboarding@resend.dev>',
        to: [RECIPIENT_EMAIL],
        subject: `Neue Kontaktanfrage von ${name}`,
        replyTo: email,
        text: `Name: ${name}\nE-Mail: ${email}\n\nNachricht:\n${message}`,
        html: `
          <h2>Neue Kontaktanfrage vom Vogelschießen-Formular</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>E-Mail:</strong> ${email}</p>
          <h3>Nachricht:</h3>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      });
      
      if (emailError) {
        console.error('Fehler beim Senden der E-Mail:', emailError);
        // Wir geben trotzdem eine Erfolgsantwort zurück, da die Nachricht in der Datenbank gespeichert wurde
      } else {
        console.log('E-Mail erfolgreich gesendet:', emailData);
      }
    } catch (emailSendError) {
      console.error('Fehler beim Senden der E-Mail:', emailSendError);
      // Wir geben trotzdem eine Erfolgsantwort zurück, da die Nachricht in der Datenbank gespeichert wurde
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Deine Nachricht wurde erfolgreich gespeichert. Wir werden uns so schnell wie möglich bei dir melden.'
    });
  } catch (error: any) {
    console.error('Unerwarteter Fehler:', error);
    return NextResponse.json(
      { error: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` },
      { status: 500 }
    );
  }
}
