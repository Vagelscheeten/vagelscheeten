'use client';

import React from 'react';

interface StempelBadgeProps {
  /** Obere Zeile — z. B. „30. MAI" */
  topLine: string;
  /** Untere Zeile — z. B. „2026" */
  bottomLine?: string;
  /** Rotation in Grad (default -6) */
  rotate?: number;
  /** Farbe der Stempel-Tinte */
  color?: string;
  /** Skalierungsfaktor (1 = Default, 1.2 = 20% größer) */
  scale?: number;
  /** Dezente Papier-Füllung für bessere Lesbarkeit über Fotos */
  paperFill?: boolean;
  className?: string;
}

/**
 * Ein „Stempel"-Element mit Tintenoptik.
 * Doppelte Linie (äußere Kontur + innere Parallellinie), leicht rotiert.
 * Optional mit leicht transparentem Papierhintergrund für Lesbarkeit
 * über unruhigen Flächen (z. B. Fotos).
 */
export function StempelBadge({
  topLine,
  bottomLine,
  rotate = -6,
  color = 'var(--color-melsdorf-red)',
  scale = 1,
  paperFill = false,
  className = '',
}: StempelBadgeProps) {
  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
      style={{
        transform: `rotate(${rotate}deg) scale(${scale})`,
        color,
        padding: '0.95rem 1.8rem 0.85rem',
        border: `3px solid ${color}`,
        borderRadius: '12px',
        fontFamily: 'var(--font-fraunces), ui-serif, serif',
        fontVariationSettings: '"SOFT" 30, "opsz" 48',
        letterSpacing: '0.05em',
        lineHeight: 1,
        opacity: 0.98,
        background: paperFill
          ? 'color-mix(in srgb, var(--color-paper-soft) 88%, transparent)'
          : 'transparent',
        backdropFilter: paperFill ? 'blur(1.5px)' : undefined,
        boxShadow: paperFill
          ? '0 2px 10px -4px rgba(26, 20, 16, 0.18)'
          : undefined,
      }}
    >
      {/* Innere Parallellinie — Doppelstrich-Stempel-Optik */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: '4.5px',
          border: `1.25px solid ${color}`,
          borderRadius: '8px',
          opacity: 0.8,
        }}
      />
      <span
        style={{
          fontSize: '1rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          lineHeight: 1,
          marginBottom: bottomLine ? '0.24em' : 0,
        }}
      >
        {topLine}
      </span>
      {bottomLine && (
        <span
          style={{
            fontSize: '2.1rem',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '0.03em',
          }}
        >
          {bottomLine}
        </span>
      )}
    </div>
  );
}
