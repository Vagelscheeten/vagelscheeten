'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon, ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  /** Hauptwert (in Mono-Schrift, groß) */
  value: string | number;
  /** Unterzeile — z. B. „+3 heute" oder Kontext */
  sub?: React.ReactNode;
  icon?: LucideIcon;
  /** Optional: wird zur Zielseite verlinkt, Karte bekommt Hover-Affordance */
  href?: string;
  /** Optional: semantischer Farbton für den Icon-Container */
  tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'accent';
  /** Optional: Progress-Wert 0..1 — rendert dünnen Balken unten */
  progress?: number;
}

const toneBg: Record<NonNullable<StatCardProps['tone']>, { bg: string; text: string }> = {
  neutral: { bg: 'var(--color-admin-surface-muted)', text: 'var(--color-admin-ink-soft)' },
  success: { bg: 'var(--color-admin-success-bg)', text: 'var(--color-admin-success)' },
  warn:    { bg: 'var(--color-admin-warn-bg)',    text: 'var(--color-admin-warn)' },
  danger:  { bg: 'var(--color-admin-danger-bg)',  text: 'var(--color-admin-danger)' },
  info:    { bg: 'var(--color-admin-info-bg)',    text: 'var(--color-admin-info)' },
  accent:  { bg: 'var(--color-admin-accent-bg)',  text: 'var(--color-admin-accent)' },
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  tone = 'neutral',
  progress,
}: StatCardProps) {
  const t = toneBg[tone];

  const content = (
    <div
      className="relative group h-full flex flex-col justify-between rounded-[0.75rem] border border-admin-border bg-admin-surface p-4 md:p-5 transition-all duration-200"
      style={{
        boxShadow: '0 1px 0 color-mix(in srgb, var(--color-admin-ink) 3%, transparent)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-admin-ink-muted">
          {label}
        </span>
        {Icon && (
          <span
            className="inline-flex items-center justify-center rounded-md w-8 h-8 shrink-0"
            style={{ backgroundColor: t.bg, color: t.text }}
          >
            <Icon size={16} />
          </span>
        )}
      </div>
      <div>
        <div
          className="text-[1.75rem] md:text-[2rem] font-semibold tabular-nums leading-none tracking-[-0.01em] text-admin-ink"
          style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[0.82rem] text-admin-ink-muted mt-2 leading-snug">
            {sub}
          </div>
        )}
        {typeof progress === 'number' && (
          <div className="mt-3 h-1 rounded-full bg-admin-surface-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
                backgroundColor: t.text,
              }}
            />
          </div>
        )}
      </div>
      {href && (
        <ArrowUpRight
          size={14}
          className="absolute top-4 right-4 text-admin-ink-muted/0 group-hover:text-admin-ink-muted transition-colors"
          aria-hidden
        />
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full hover:-translate-y-px hover:border-admin-border-strong transition-transform"
      >
        {content}
      </Link>
    );
  }
  return content;
}
