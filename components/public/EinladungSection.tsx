'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SectionWrapper } from './SectionWrapper';
import { PageHeader } from './PageHeader';

type EinladungSettings = {
  badge?: string;
  titel: string;
  text1: string;
  text2: string;
  mitbringen: string[];
  fussnote: string;
};

interface EinladungSectionProps {
  settings?: EinladungSettings;
}

const defaults: EinladungSettings = {
  badge: 'Auch für Sie',
  titel: 'Eltern, Omas, Opas & Freunde — kommen Sie vorbei!',
  text1: 'Wir laden alle Melsdorfer*innen und Freund*innen der Regenbogenschule herzlich ein, mit uns einen fröhlichen Nachmittag auf der Schulwiese zu verbringen.',
  text2: 'Gemeinsam genießen wir ein Picknick mit Kaffee und Kuchen unter freiem Himmel.',
  mitbringen: [
    'Eigene Kaltgetränke (Kaffee gibt\'s vor Ort)',
    'Kaffeebecher, Geschirr, Besteck',
    'Picknickdecke oder Sitzgelegenheit',
  ],
  fussnote: 'Für Kaffee und Kuchen ist gesorgt — wir freuen uns auf euch!',
};

function ChecklistItem({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.li
      className="flex items-start gap-3"
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Handgezeichneter Haken */}
      <svg
        aria-hidden
        width="24"
        height="24"
        viewBox="0 0 24 24"
        className="flex-shrink-0 mt-1"
      >
        <path
          d="M4 12 Q 8 16 10 18 Q 14 12 20 5"
          fill="none"
          stroke="var(--color-tertiary)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-ink-soft" style={{ fontSize: '1.0625rem', lineHeight: 1.55 }}>
        {text}
      </span>
    </motion.li>
  );
}

function InfoCard({
  kicker,
  title,
  children,
  accent,
  delay,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      className="relative h-full flex flex-col"
      style={{
        background: 'var(--color-paper-soft)',
        border: '1px solid color-mix(in srgb, var(--color-ink) 8%, transparent)',
        borderRadius: '1.25rem',
        padding: '1.75rem',
        boxShadow: '0 1px 0 rgba(26,20,16,0.04), 0 10px 28px -16px rgba(26,20,16,0.18)',
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <span
        className="font-hand mb-2"
        style={{ fontSize: '1.2rem', color: accent, lineHeight: 1 }}
      >
        {kicker}
      </span>
      <h3
        className="font-display text-ink mb-4"
        style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          lineHeight: 1.15,
          fontVariationSettings: '"SOFT" 50, "opsz" 48',
        }}
      >
        {title}
      </h3>
      <div className="flex-grow">{children}</div>
    </motion.div>
  );
}

export function EinladungSection({ settings }: EinladungSectionProps) {
  const s = settings
    ? { ...defaults, ...settings, mitbringen: settings.mitbringen?.length ? settings.mitbringen : defaults.mitbringen }
    : defaults;

  return (
    <SectionWrapper id="einladung" bgColor="bg-paper-soft" padding="lg">
      <PageHeader
        badge={s.badge ?? defaults.badge}
        title={s.titel}
        subtitle={`${s.text1} ${s.text2 ?? ''}`}
        highlightVariant="underline"
        highlightWordIndex={0}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">

        <InfoCard
          kicker="Wann"
          title="Nachmittag-Programm"
          accent="var(--color-melsdorf-orange-dark)"
          delay={0.08}
        >
          <p className="text-ink-soft" style={{ fontSize: '1rem', lineHeight: 1.6, marginBottom: 0 }}>
            Während die Kinder vormittags auf den Spielstationen sind, starten wir am <strong className="text-ink">Nachmittag</strong> mit dem gemeinsamen Picknick, der Krönung und dem Festumzug durchs Dorf.
          </p>
        </InfoCard>

        <InfoCard
          kicker="Wo"
          title="Auf der Schulwiese"
          accent="var(--color-melsdorf-green)"
          delay={0.16}
        >
          <p className="text-ink-soft" style={{ fontSize: '1rem', lineHeight: 1.6, marginBottom: 0 }}>
            Die Regenbogenschule Melsdorf öffnet Tore und Wiese. Parkmöglichkeiten finden Sie am Dorfgemeinschaftshaus — wir empfehlen den Weg zu Fuß.
          </p>
        </InfoCard>

        <InfoCard
          kicker="Mitbringen"
          title="Picknick-Checkliste"
          accent="var(--color-melsdorf-red)"
          delay={0.24}
        >
          <ul className="space-y-2.5">
            {s.mitbringen.map((item, i) => (
              <ChecklistItem key={i} text={item} delay={0.3 + i * 0.06} />
            ))}
          </ul>
        </InfoCard>
      </div>

      {/* Fußnote — warme, handgeschriebene Nachricht */}
      <motion.div
        className="mt-14 max-w-3xl mx-auto text-center"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <p
          className="font-display text-ink-soft italic"
          style={{
            fontSize: 'clamp(1.35rem, 2vw, 1.65rem)',
            fontWeight: 500,
            lineHeight: 1.4,
            fontVariationSettings: '"SOFT" 70, "opsz" 96',
            marginBottom: 0,
          }}
        >
          „{s.fussnote}"
        </p>
      </motion.div>
    </SectionWrapper>
  );
}
