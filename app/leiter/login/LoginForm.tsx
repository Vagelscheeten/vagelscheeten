'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { leiterLogin } from '../actions';
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

export default function LoginForm() {
  const [state, formAction] = useFormState<LeiterLoginState, FormData>(leiterLogin, initialState);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (state.success) {
      router.push('/leiter/erfassen');
    } 
  }, [state, router]);

  return (
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
              defaultValue={searchParams.get('gruppenname') || ''}
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
              defaultValue={searchParams.get('zugangscode') || ''}
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
        <CardFooter className="pt-6">
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
