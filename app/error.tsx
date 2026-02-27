'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unbehandelter Fehler:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
      <div className="text-6xl">😟</div>
      <h2 className="text-2xl font-semibold text-gray-800">
        Etwas ist schiefgelaufen
      </h2>
      <p className="text-gray-600 max-w-md">
        Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.
      </p>
      <button
        onClick={reset}
        className="btn btn-primary mt-2"
      >
        Erneut versuchen
      </button>
    </div>
  );
}
