'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function AnmeldungLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="full-bleed -mt-6 flex flex-col min-h-screen"
      style={{ backgroundColor: 'var(--color-paper)' }}
    >
      {/* Header */}
      <header
        className="border-b"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-ink) 8%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--color-paper-soft) 85%, transparent)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/startseite" className="flex items-center gap-2.5 group">
            <Image
              src="/2025_Logo_transparent.png"
              alt="Melsdörper Vagelscheeten"
              width={40}
              height={40}
              className="h-10 w-10 transition-opacity group-hover:opacity-85"
            />
            <span
              className="font-display text-ink hidden sm:inline"
              style={{
                fontSize: '1.15rem',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                fontVariationSettings: '"SOFT" 50, "opsz" 48',
              }}
            >
              Vagelscheeten
            </span>
          </Link>
          <Link
            href="/startseite"
            className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Zur Webseite</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1">{children}</div>

      {/* Footer */}
      <footer
        className="border-t"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-ink) 8%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--color-paper-soft) 50%, transparent)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-muted">
          <p style={{ marginBottom: 0 }}>
            &copy; {new Date().getFullYear()} Planungsteam der Regenbogenschule Melsdorf
          </p>
          <div className="flex items-center gap-3">
            <Link href="/datenschutz" className="hover:text-ink-soft transition-colors">
              Datenschutz
            </Link>
            <span>·</span>
            <Link href="/impressum" className="hover:text-ink-soft transition-colors">
              Impressum
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
