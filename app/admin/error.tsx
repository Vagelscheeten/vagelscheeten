'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin-Fehler:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-semibold text-gray-800">
        Fehler im Admin-Bereich
      </h2>
      <p className="text-gray-600 max-w-md">
        Beim Laden der Seite ist ein Fehler aufgetreten.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="btn btn-primary"
        >
          Erneut versuchen
        </button>
        <a href="/admin" className="btn btn-secondary">
          Zum Dashboard
        </a>
      </div>
    </div>
  );
}
