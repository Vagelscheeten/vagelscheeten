'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push('/login');
        return;
      }
      setUser(data.user);
      
      // Wenn der Benutzer nicht zum Passwort-Reset gezwungen wird, weiterleiten
      if (!data.user.user_metadata?.force_password_change) {
        router.push('/admin/dashboard');
      }
    };
    
    checkAuth();
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Bitte beide Passwortfelder ausfüllen');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    
    // Erweiterte Passwort-Validierung
    if (password.length < 8) {
      toast.error('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }
    
    // Supabase erfordert mindestens einen Großbuchstaben, einen Kleinbuchstaben und eine Zahl
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      toast.error('Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben und eine Zahl enthalten');
      return;
    }
    
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Passwort ändern
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      
      if (updateError) throw updateError;
      
      // force_password_change Flag mit der neuen API zurücksetzen
      const metadataResponse = await fetch('/api/admin/users-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update',
          userId: user.id,
          updates: {
            user_metadata: {
              ...user.user_metadata,
              force_password_change: false
            }
          }
        })
      });
      
      const metadataResult = await metadataResponse.json();
      const metadataError = !metadataResponse.ok ? metadataResult : null;
      
      if (metadataError) throw metadataError;
      
      toast.success('Passwort erfolgreich geändert');
      router.push('/admin/dashboard');
      router.refresh();
    } catch (error: any) {
      toast.error(`Fehler beim Ändern des Passworts: ${error.message || error.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center">Lade...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Passwort ändern</h1>
          <p className="text-gray-600 mt-2">
            Du musst dein Passwort ändern, bevor du fortfahren kannst
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Neues Passwort
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Passwort bestätigen
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="mt-1"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Wird geändert...' : 'Passwort ändern'}
          </Button>
        </form>
      </div>
    </div>
  );
}
