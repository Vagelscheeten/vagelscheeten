'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MarkerUnderline } from './decorations/MarkerUnderline';

type SpendenSettings = {
  kontoinhaber: string;
  iban: string;
  bic: string;
  verwendungszweck_prefix: string;
  beschreibung_links: string;
  beschreibung_helfer: string;
};

interface SpendenSectionProps {
  settings?: SpendenSettings;
  eventJahr?: number;
}

const defaults: SpendenSettings = {
  kontoinhaber: 'Förderverein der Regenbogenschule Melsdorf',
  iban: 'DE12 3456 7890 1234 5678 90',
  bic: 'ABCDEFGHIJK',
  verwendungszweck_prefix: 'Spende Vogelschießen',
  beschreibung_links: 'Das Vogelschießen wird ausschließlich durch Spenden finanziert.',
  beschreibung_helfer: 'Unsere Helfer*innen sind im Ort unterwegs und sammeln Spenden persönlich ein.',
};

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title={label ? `${label} kopieren` : 'Kopieren'}
      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-paper-soft/10 text-paper-soft/80 hover:bg-paper-soft/20 hover:text-paper-soft transition-all"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          kopiert
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          kopieren
        </>
      )}
    </button>
  );
}

function BankField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-b border-paper-soft/15 pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-[0.7rem] font-semibold text-paper-soft/60 uppercase tracking-[0.18em]">
          {label}
        </span>
        <CopyButton value={value} label={label} />
      </div>
      <span
        className={`block text-paper-soft break-all ${mono ? 'font-mono tracking-wide' : ''}`}
        style={{
          fontSize: mono ? '1.125rem' : '1.0625rem',
          lineHeight: 1.35,
          fontFamily: mono ? 'var(--font-geist-mono), ui-monospace, monospace' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function SpendenSection({ settings, eventJahr }: SpendenSectionProps) {
  const s = settings || defaults;
  const verwendungszweck = `${s.verwendungszweck_prefix}${eventJahr ? ` ${eventJahr}` : ''}`;

  return (
    <section
      id="spenden"
      className="relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-melsdorf-green)' }}
    >
      {/* subtle paper grain on the green */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.3,
          mixBlendMode: 'overlay',
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.12 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative z-[1] max-w-6xl mx-auto px-4 md:px-8 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 items-start">

          {/* ── Text-Spalte (7 cols) ───────────────────────── */}
          <div className="md:col-span-7 relative">
            <motion.p
              className="font-hand text-accent mb-5"
              style={{ fontSize: '1.4rem' }}
              initial={{ opacity: 0, y: -8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              Was Ihre Spende bewirkt
            </motion.p>

            <motion.h2
              className="font-display text-paper-soft mb-8"
              style={{
                fontSize: 'clamp(2.25rem, 5vw, 4rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1.02,
                fontVariationSettings: '"SOFT" 55, "opsz" 144',
              }}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              Ein Fest, das{' '}
              <MarkerUnderline variant="highlighter" color="var(--color-accent)">
                nur durch Sie
              </MarkerUnderline>
              {' '}möglich wird.
            </motion.h2>

            <motion.div
              className="max-w-xl space-y-5 mb-10"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-paper-soft/85" style={{ fontSize: '1.125rem', lineHeight: 1.65, marginBottom: 0 }}>
                {s.beschreibung_links}
              </p>
              <p className="text-paper-soft/85" style={{ fontSize: '1.125rem', lineHeight: 1.65, marginBottom: 0 }}>
                Jeder Euro fließt in den Tag und in die Klassenausflüge, die die Kinder gemeinsam als Belohnung erleben — unvergessliche Erinnerungen für eine ganze Grundschulzeit.
              </p>
              <p className="text-paper-soft/70" style={{ fontSize: '1rem', lineHeight: 1.65, marginBottom: 0 }}>
                {s.beschreibung_helfer}
              </p>
            </motion.div>

            {/* Impact-Kacheln */}
            <motion.div
              className="grid grid-cols-3 gap-3 md:gap-4 max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {[
                { num: '100%', label: 'gehen an die Kinder' },
                { num: '~140', label: 'Kinder jedes Jahr' },
                { num: '10', label: 'Spielstationen' },
              ].map((cell, i) => (
                <div
                  key={i}
                  className="px-3 py-4 md:px-5 md:py-5 text-center"
                  style={{
                    background: 'color-mix(in srgb, var(--color-paper-soft) 8%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-paper-soft) 14%, transparent)',
                    borderRadius: '0.9rem',
                  }}
                >
                  <div
                    className="font-display text-accent font-soft-warm mb-1"
                    style={{
                      fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                      fontWeight: 600,
                      lineHeight: 1,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {cell.num}
                  </div>
                  <div className="text-paper-soft/70" style={{ fontSize: '0.78rem', lineHeight: 1.3 }}>
                    {cell.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Bank-Details-Karte (5 cols) ────────────────── */}
          <motion.div
            className="md:col-span-5 relative"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="relative"
              style={{
                background: 'color-mix(in srgb, #000 18%, var(--color-melsdorf-green))',
                border: '1px solid color-mix(in srgb, var(--color-paper-soft) 14%, transparent)',
                borderRadius: '1.5rem',
                padding: '2rem',
                boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
              }}
            >
              <div className="flex items-baseline justify-between mb-6">
                <h3
                  className="font-display text-paper-soft"
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    marginBottom: 0,
                    fontVariationSettings: '"SOFT" 50, "opsz" 48',
                  }}
                >
                  Per Überweisung
                </h3>
                <span className="font-hand text-accent" style={{ fontSize: '1.15rem' }}>
                  → einfach
                </span>
              </div>

              <div className="space-y-4">
                <BankField label="Kontoinhaber" value={s.kontoinhaber} />
                <BankField label="IBAN" value={s.iban} mono />
                <BankField label="BIC" value={s.bic} mono />
                <BankField label="Verwendungszweck" value={verwendungszweck} />
              </div>

            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
