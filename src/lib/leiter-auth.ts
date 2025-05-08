import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

// Typ-Definition für das erwartete Payload im JWT
export interface LeiterJwtPayload {
  gruppeId: string;
  gruppenname: string;
  isLeiter: true; // Wichtiges Merkmal zur Identifizierung
  iat?: number; // Issued at (automatisch von jsonwebtoken hinzugefügt)
  exp?: number; // Expiration time (automatisch von jsonwebtoken hinzugefügt)
}

/**
 * Liest das Leiter-Session-Cookie, verifiziert das JWT und gibt das Payload zurück.
 * @returns Das verifizierte JWT-Payload oder null, wenn das Token ungültig oder nicht vorhanden ist.
 */
export async function verifyLeiterSession(): Promise<LeiterJwtPayload | null> {
  const cookieStore = await cookies();
  // Expliziter Zugriff auf das Cookie-Value
  const token = cookieStore.get('leiter_session')?.value;
  const secret = process.env.LEITER_JWT_SECRET;

  if (!token || !secret) {
    return null;
  }

  try {
    // Verifiziere das Token mit dem Secret
    const payload = jwt.verify(token, secret) as LeiterJwtPayload;

    // Zusätzliche Prüfung, ob es wirklich ein Leiter-Token ist
    if (payload.isLeiter !== true) {
      console.warn('JWT Payload ist nicht als Leiter markiert.');
      return null;
    }

    return payload;
  } catch (error) {
    // Fehler beim Verifizieren (z.B. Token abgelaufen, Signatur ungültig)
    console.error('Fehler beim Verifizieren des Leiter JWT:', error);
    return null;
  }
}
