import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const quickLinks = [
  { href: '/startseite#ablauf',   label: 'Ablauf' },
  { href: '/startseite#spiele',   label: 'Spiele' },
  { href: '/startseite#spenden',  label: 'Spenden' },
  { href: '/startseite#galerie',  label: 'Galerie' },
  { href: '/faq',                 label: 'FAQ' },
  { href: '/startseite#kontakt',  label: 'Kontakt' },
];

const legalLinks = [
  { href: '/impressum',   label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutzerklärung' },
];

export function Footer() {
  return (
    <footer
      className="relative mt-auto full-bleed"
      style={{ background: 'var(--color-melsdorf-green-dark)' }}
    >
      {/* dezente Papier-Grain für Wärme */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.25,
          mixBlendMode: 'overlay',
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative z-[1] max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12">

          {/* Brand — 5 cols */}
          <div className="md:col-span-5 flex flex-col gap-5">
            <Link href="/startseite" className="flex items-center gap-4 group w-fit">
              <Image
                src="/Logo%20farbig.png"
                alt="Melsdörper Vagelscheeten"
                width={64}
                height={64}
                className="h-14 w-14 brightness-0 invert opacity-85 group-hover:opacity-100 transition-opacity"
              />
              <div className="leading-tight">
                <span
                  className="font-display text-paper-soft block"
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.05,
                    fontVariationSettings: '"SOFT" 55, "opsz" 48',
                  }}
                >
                  Melsdörper<br />Vagelscheeten
                </span>
              </div>
            </Link>

            <p
              className="font-hand text-accent"
              style={{ fontSize: '1.25rem', lineHeight: 1.35, marginBottom: 0 }}
            >
              Ein Fest für die Kinder der Regenbogenschule Melsdorf.
            </p>

            <address
              className="not-italic text-paper-soft/75 text-sm leading-relaxed"
              style={{ marginTop: '0.5rem' }}
            >
              Regenbogenschule Melsdorf<br />
              Dorfstraße 13 · 24109 Melsdorf
            </address>
          </div>

          {/* Nav — 4 cols */}
          <div className="md:col-span-4">
            <h3
              className="text-xs font-semibold uppercase tracking-[0.2em] mb-5"
              style={{ color: 'color-mix(in srgb, var(--color-paper-soft) 55%, transparent)' }}
            >
              Navigation
            </h3>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-paper-soft/85 hover:text-accent transition-colors text-[0.95rem]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal — 3 cols */}
          <div className="md:col-span-3">
            <h3
              className="text-xs font-semibold uppercase tracking-[0.2em] mb-5"
              style={{ color: 'color-mix(in srgb, var(--color-paper-soft) 55%, transparent)' }}
            >
              Rechtliches
            </h3>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-paper-soft/85 hover:text-accent transition-colors text-[0.95rem]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="relative z-[1] border-t"
        style={{ borderColor: 'color-mix(in srgb, var(--color-paper-soft) 15%, transparent)' }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            className="text-xs"
            style={{
              color: 'color-mix(in srgb, var(--color-paper-soft) 55%, transparent)',
              marginBottom: 0,
            }}
          >
            © {new Date().getFullYear()} Planungsteam der Regenbogenschule Melsdorf
          </p>
          <p
            className="font-hand text-accent/70 text-sm"
            style={{ marginBottom: 0 }}
          >
            — mit Liebe in Melsdorf gebaut
          </p>
        </div>
      </div>
    </footer>
  );
}
