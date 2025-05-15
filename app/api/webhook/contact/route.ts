import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialisieren des Resend-Clients mit dem API-Key
const resend = new Resend(process.env.RESEND_API_KEY);

// E-Mail-Adresse, an die die Benachrichtigungen gesendet werden sollen
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'orgateam@vagelscheeten.de';

// Geheimer Schlüssel für die Webhook-Authentifizierung
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    // Daten aus der Anfrage extrahieren
    const payload = await request.json();
    
    // Überprüfen des Webhook-Secrets (optional, aber empfohlen)
    const authHeader = request.headers.get('x-webhook-secret');
    if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Überprüfen, ob es sich um eine neue Kontaktanfrage handelt
    if (payload.table === 'kontaktanfragen' && payload.type === 'INSERT') {
      const { name, email, nachricht } = payload.record;
      
      // E-Mail senden
      const { data, error } = await resend.emails.send({
        from: 'Vogelschießen Kontaktformular <onboarding@resend.dev>',
        to: [RECIPIENT_EMAIL],
        subject: `Neue Kontaktanfrage von ${name}`,
        replyTo: email,
        text: `Name: ${name}\nE-Mail: ${email}\n\nNachricht:\n${nachricht}`,
        html: `
          <h2>Neue Kontaktanfrage vom Vogelschießen-Formular</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>E-Mail:</strong> ${email}</p>
          <h3>Nachricht:</h3>
          <p>${nachricht.replace(/\n/g, '<br>')}</p>
        `,
      });
      
      if (error) {
        console.error('Fehler beim Senden der E-Mail:', error);
        return NextResponse.json(
          { error: 'E-Mail konnte nicht gesendet werden' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, data });
    }
    
    // Wenn es kein relevantes Event ist, einfach OK zurückgeben
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unerwarteter Fehler im Webhook:', error);
    return NextResponse.json(
      { error: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` },
      { status: 500 }
    );
  }
}
