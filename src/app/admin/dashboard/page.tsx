import { createClient } from '@/lib/supabase/server'; // Unser Server-seitiger Supabase Client
import { redirect } from 'next/navigation'; // Für die Weiterleitung
import { logout } from '@/app/auth/actions'; // Import der Logout-Action
import { Button } from '@/components/ui/button'; // Import Button

export default async function DashboardPage() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect('/login');
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Willkommen im Admin Dashboard!</h1>
      <p className="mt-2">Du bist erfolgreich als Admin angemeldet.</p>
      <p className="mt-1">Benutzer-ID: {data.user.id}</p>
      <p className="mt-1">E-Mail: {data.user.email}</p>

      {/* Logout Button Form */}
      <form action={logout} className="mt-4">
        <Button type="submit" variant="destructive">
          Logout
        </Button>
      </form>
      {/* Ende Logout Button Form */}

      {/* Hier können später die eigentlichen Admin-Funktionen hin */}
    </div>
  );
}