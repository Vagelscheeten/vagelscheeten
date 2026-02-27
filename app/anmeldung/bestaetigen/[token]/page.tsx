'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function BestaetigenPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anmeldung, setAnmeldung] = useState<any>(null);

  useEffect(() => {
    const confirmRegistration = async () => {
      if (!token) {
        setError('Kein Token gefunden');
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/api/anmeldung/bestaetigen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Fehler bei der Bestätigung');
        }
        
        setSuccess(true);
        setAnmeldung(data.anmeldung);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    confirmRegistration();
  }, [token]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-tertiary mx-auto mb-4" />
          <p className="text-gray-600">Anmeldung wird bestätigt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md mx-4">
          <XCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Fehler</h1>
          <p className="text-gray-600">{error}</p>
          <Link href="/anmeldung" className="mt-6 inline-block text-tertiary hover:underline">
            Neue Anmeldung erstellen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-green-50 to-white py-8 px-4">
      <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md mx-4">
        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Anmeldung bestätigt!</h1>
        
        {anmeldung && (
          <div className="mt-6 text-left bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 mb-1">
              <strong>{anmeldung.kind_vorname} {anmeldung.kind_nachname}</strong>
              <span className="text-gray-500 text-sm ml-2">Klasse {anmeldung.kind_klasse}</span>
            </p>
            {anmeldung.weitere_kinder_json && (anmeldung.weitere_kinder_json as any[]).map((k: any, i: number) => (
              <p key={i} className="text-gray-700 mt-1">
                <strong>{k.vorname} {k.nachname}</strong>
                <span className="text-gray-500 text-sm ml-2">Klasse {k.klasse}</span>
              </p>
            ))}
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          <p>📧 Du erhältst eine Bestätigungs-E-Mail mit allen Details.</p>
          <p className="mt-2">📋 Das Orgateam wird sich melden, sobald deine Aufgabe zugeteilt wurde.</p>
        </div>
        
        <Link 
          href="/" 
          className="mt-6 inline-block px-6 py-3 bg-tertiary text-white rounded-lg hover:bg-tertiary-dark transition-colors"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
