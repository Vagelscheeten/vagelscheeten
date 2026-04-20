import React from 'react';

interface PaperBackgroundProps {
  children: React.ReactNode;
  /** CSS color for the paper base. Default: warm cream */
  color?: string;
  /** Zusätzliche Klassen */
  className?: string;
  /** Darüber liegender Texturstärke-Wert 0..1 */
  grain?: number;
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Wrapper mit warmem Papier-Hintergrund und subtiler Rauschtextur.
 * Die Textur liegt als Pseudo-Element darüber, ohne die Interaktion zu stören.
 */
export function PaperBackground({
  children,
  color = 'var(--color-paper)',
  className = '',
  grain = 0.35,
  as = 'div',
}: PaperBackgroundProps) {
  const Tag = as as React.ElementType;
  return (
    <Tag
      className={`relative isolate ${className}`}
      style={{ backgroundColor: color }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          opacity: grain,
          mixBlendMode: 'multiply',
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 0 0.04 0 0 0 0.18 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div className="relative z-[1]">{children}</div>
    </Tag>
  );
}
