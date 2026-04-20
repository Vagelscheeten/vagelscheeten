'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
          body: JSON.stringify({ token }),
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
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-melsdorf-green mx-auto mb-4" />
          <p className="text-ink-soft" style={{ marginBottom: 0 }}>
            Anmeldung wird bestätigt …
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div
          className="text-center p-8 rounded-2xl max-w-md mx-auto bg-paper-soft"
          style={{
            border: '1px solid color-mix(in srgb, var(--color-ink) 8%, transparent)',
            boxShadow: '0 10px 30px -12px rgba(26,20,16,0.15)',
          }}
        >
          <XCircle className="h-14 w-14 text-melsdorf-red mx-auto mb-4" />
          <h1
            className="font-display text-ink mb-3"
            style={{
              fontSize: '1.65rem',
              fontWeight: 600,
              fontVariationSettings: '"SOFT" 50, "opsz" 96',
            }}
          >
            Das hat leider nicht geklappt
          </h1>
          <p className="text-ink-soft" style={{ marginBottom: '1.5rem' }}>{error}</p>
          <Link
            href="/anmeldung"
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-melsdorf-green hover:bg-melsdorf-green-dark text-paper-soft text-sm font-semibold transition-all"
          >
            Neue Anmeldung erstellen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="text-center p-8 rounded-2xl max-w-md mx-auto bg-paper-soft"
        style={{
          border: '1px solid color-mix(in srgb, var(--color-ink) 8%, transparent)',
          boxShadow: '0 14px 40px -14px rgba(26,20,16,0.2)',
        }}
      >
        <CheckCircle className="h-16 w-16 text-melsdorf-green mx-auto mb-4" />
        <p className="font-hand text-melsdorf-red mb-2" style={{ fontSize: '1.35rem', lineHeight: 1 }}>
          Geschafft —
        </p>
        <h1
          className="font-display text-ink mb-4"
          style={{
            fontSize: '1.85rem',
            fontWeight: 600,
            lineHeight: 1.1,
            fontVariationSettings: '"SOFT" 55, "opsz" 96',
          }}
        >
          Anmeldung bestätigt
        </h1>

        {anmeldung && (
          <div
            className="mt-6 text-left rounded-lg p-4"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-paper-warm) 50%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-ink) 8%, transparent)',
            }}
          >
            <p className="text-ink" style={{ marginBottom: 0 }}>
              <strong>{anmeldung.kind_vorname} {anmeldung.kind_nachname}</strong>
              <span className="text-ink-muted text-sm ml-2">Klasse {anmeldung.kind_klasse}</span>
            </p>
            {anmeldung.weitere_kinder_json &&
              (anmeldung.weitere_kinder_json as any[]).map((k: any, i: number) => (
                <p key={i} className="text-ink mt-1" style={{ marginBottom: 0 }}>
                  <strong>{k.vorname} {k.nachname}</strong>
                  <span className="text-ink-muted text-sm ml-2">Klasse {k.klasse}</span>
                </p>
              ))}
          </div>
        )}

        <div
          className="mt-6 p-3.5 rounded-lg text-sm text-left leading-snug"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-melsdorf-green) 8%, var(--color-paper))',
            border: '1px solid color-mix(in srgb, var(--color-melsdorf-green) 25%, transparent)',
            color: 'var(--color-ink-soft)',
          }}
        >
          <p className="mb-1" style={{ marginBottom: '0.35rem' }}>
            Ihr bekommt eine Bestätigungs-E-Mail mit allen Details.
          </p>
          <p style={{ marginBottom: 0 }}>
            Das Orgateam meldet sich, sobald eure Aufgabe zugeteilt wurde.
          </p>
        </div>

        <Link
          href="/startseite"
          className="mt-6 inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-melsdorf-green hover:bg-melsdorf-green-dark text-paper-soft text-sm font-semibold transition-all"
        >
          Zur Startseite
        </Link>
      </motion.div>
    </div>
  );
}
