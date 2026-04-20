'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageShellProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  /** Optionale Meta-Zeile unter dem Titel (z. B. IDs, Timestamps in Mono) */
  meta?: React.ReactNode;
  /** Optionale Toolbar-Zeile direkt unter Header (FilterBar etc.) */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Standard-Layout für Admin-Seiten.
 * - Header-Zeile: Breadcrumb, Titel, Beschreibung, Aktionen rechts
 * - Optional Toolbar (Filter/Suche)
 * - Content-Bereich mit konsistentem Abstand
 */
export function PageShell({
  title,
  description,
  breadcrumbs,
  actions,
  meta,
  toolbar,
  children,
}: PageShellProps) {
  return (
    <main className="px-4 md:px-8 py-6 md:py-8 max-w-[1400px] mx-auto">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className="flex items-center gap-1.5 text-[0.8rem] text-admin-ink-muted mb-3 flex-wrap"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={12} className="text-admin-ink-muted/60" />}
              {b.href ? (
                <Link
                  href={b.href}
                  className="hover:text-admin-ink transition-colors"
                >
                  {b.label}
                </Link>
              ) : (
                <span className="text-admin-ink-soft">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-6 border-b border-admin-border">
        <div className="min-w-0 flex-1">
          <h1
            className="text-[1.55rem] md:text-[1.75rem] font-semibold text-admin-ink leading-tight tracking-[-0.015em]"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            {title}
          </h1>
          {description && (
            <p className="text-[0.92rem] text-admin-ink-soft mt-1.5 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
          {meta && (
            <div className="mt-2 text-[0.8rem] text-admin-ink-muted font-mono flex items-center gap-3 flex-wrap">
              {meta}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </header>

      {toolbar && (
        <div className="py-4 border-b border-admin-border">
          {toolbar}
        </div>
      )}

      <div className="pt-6 md:pt-8">{children}</div>
    </main>
  );
}
