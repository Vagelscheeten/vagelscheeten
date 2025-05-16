import { verifyLeiterSession } from '@/lib/leiter-auth';
import { redirect } from 'next/navigation';
import { leiterLogout } from '@/app/leiter/actions'; 
import { Button } from '@/components/ui/button'; 

// TODO: Diese Seite muss noch mit Logik versehen werden,
// um die Ergebniseingabe zu ermöglichen.

export default async function LeiterErgebnissePage() {
  const leiterSession = await verifyLeiterSession();

  // Wenn keine gültige Leiter-Session vorhanden ist, zurück zum Login
  if (!leiterSession) {
    redirect('/leiter/login');
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Ergebniseingabe für Leiter</h1>
      <p className="mt-2">
        Du bist erfolgreich als Leiter für Gruppe{' '}
        <span className="font-semibold">{leiterSession.gruppenname}</span> angemeldet.
      </p>
      <p className="mt-1">
        Hier kannst du bald die Ergebnisse für deine Gruppe eintragen.
      </p>
      {/* Später hier: Formular zur Ergebniseingabe */}

      {/* Leiter Logout Button Form */}
      <form action={leiterLogout} className="mt-6">
        <Button type="submit" variant="outline">
          Als Leiter abmelden
        </Button>
      </form>
      {/* Ende Leiter Logout Button Form */}
    </div>
  );
}
