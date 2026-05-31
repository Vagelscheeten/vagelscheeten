'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { istKleinerBesser } from '@/lib/points';

interface SpielAnleitungProps {
  spiel: {
    name: string;
    wertungstyp?: string | null;
    einheit?: string | null;
    erfassung_anleitung?: string | null;
  };
  /** zusätzliche Klassen für den (?)-Button */
  className?: string;
}

export function SpielAnleitung({ spiel, className = '' }: SpielAnleitungProps) {
  const [open, setOpen] = useState(false);
  const kleinerBesser = istKleinerBesser(spiel.wertungstyp);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Anleitung: Was eintragen?"
        className={`inline-flex items-center justify-center text-melsdorf-orange hover:text-melsdorf-red active:scale-95 transition-transform ${className}`}
      >
        <HelpCircle size={20} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{spiel.name} – Anleitung</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm text-slate-700">
            <section>
              <h3 className="font-semibold text-slate-900 mb-1">Was eintragen?</h3>
              <p className="whitespace-pre-wrap">
                {spiel.erfassung_anleitung || 'Trage das erreichte Ergebnis des Kindes ein.'}
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900 mb-1">Wertung</h3>
              <p>
                Bei diesem Spiel gilt:{' '}
                <strong>{kleinerBesser ? 'weniger ist besser' : 'mehr ist besser'}</strong>
                {spiel.einheit ? ` (Einheit: ${spiel.einheit})` : ''}.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900 mb-1">Wie werden die Punkte berechnet?</h3>
              <p>
                Pro Spiel werden alle Kinder einer Klasse – Jungen und Mädchen getrennt – nach
                ihrem Wert sortiert. Das beste Kind bekommt <strong>10 Punkte</strong>, das
                zweitbeste 9, … das zehnte 1, danach 0. Die Punkte aus allen Spielen werden
                zusammengezählt. Wer in seiner Klasse die meisten Punkte hat, wird{' '}
                <strong>König</strong> (bester Junge) bzw. <strong>Königin</strong> (bestes Mädchen).
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
