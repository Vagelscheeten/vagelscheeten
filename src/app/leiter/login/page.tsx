'use client';

import { useEffect } from 'react';
import { useActionState } from 'react'; 
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { leiterLogin } from '@/app/leiter/actions';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface LeiterLoginState {
  success: boolean;
  error?: string;
}

const initialState: LeiterLoginState = { success: false, error: undefined };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" aria-disabled={pending} disabled={pending} className="w-full">
      {pending ? 'Anmelden...' : 'Anmelden'}
    </Button>
  );
}

export default function LeiterLoginPage() {
  const [state, formAction] = useActionState<LeiterLoginState, FormData>(leiterLogin, initialState);
  const router = useRouter();


  useEffect(() => {
    console.log('Leiter Login Page: useEffect triggered. State:', state);
    if (state.success) {
      console.log('Leiter Login Page: Login successful, redirecting...');
      router.push('/leiter/erfassen');
    } else if (state.error) {
      console.log('Leiter Login Page: Login error received:', state.error);
    }
  }, [state, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-950">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Leiter Login</CardTitle>
          <CardDescription>Zugang für Gruppenleiter zur Ergebniseingabe</CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gruppenname">Gruppenname</Label>
              <Input
                id="gruppenname"
                name="gruppenname"
                type="text"
                placeholder="Deine Gruppe"
                required
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 dark:border-gray-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zugangscode">Zugangscode</Label>
              <Input
                id="zugangscode"
                name="zugangscode"
                type="password"
                placeholder="Code"
                required
                minLength={6}
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 dark:border-gray-800"
              />
            </div>
            {state?.error && (
              <div
                className="flex h-8 items-end space-x-1"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="text-sm text-red-500">{state.error}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
