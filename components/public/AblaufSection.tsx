'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SectionWrapper } from './SectionWrapper';
import { PageHeader } from './PageHeader';

type AblaufEintrag = {
  id: string;
  uhrzeit: string;
  titel: string;
  beschreibung: string | null;
  icon: string | null;
  farbe: string;
  sortierung: number;
  ist_highlight: boolean;
  hinweis: string | null;
};

export type AblaufSectionSettings = {
  badge?: string;
  titel?: string;
  untertitel?: string;
};

interface AblaufSectionProps {
  eintraege: AblaufEintrag[];
  eventJahr?: number;
  sectionSettings?: AblaufSectionSettings;
}

// Brand-Farb-Mapping für Akzente
const farbeToHex: Record<string, string> = {
  primary:   '#E7432C',
  secondary: '#F2A03D',
  tertiary:  '#27AE60',
  accent:    '#F6C91C',
  green:     '#33665B',
};

function TimeLabel({ time, color }: { time: string; color: string }) {
  return (
    <span
      className="font-display font-soft-warm block tabular-nums"
      style={{
        fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
        fontWeight: 600,
        color,
        lineHeight: 1,
        letterSpacing: '-0.015em',
      }}
    >
      {time}
    </span>
  );
}

function EintragCard({
  eintrag,
  accentHex,
  isHighlight,
}: {
  eintrag: AblaufEintrag;
  accentHex: string;
  isHighlight: boolean;
}) {
  return (
    <div
      className="relative"
      style={{
        background: isHighlight
          ? `color-mix(in srgb, ${accentHex} 12%, var(--color-paper-soft))`
          : 'var(--color-paper-soft)',
        borderRadius: '1rem',
        padding: '1.25rem 1.5rem',
        border: `1px solid color-mix(in srgb, ${accentHex} ${isHighlight ? 40 : 15}%, transparent)`,
        boxShadow: isHighlight
          ? `0 1px 0 color-mix(in srgb, ${accentHex} 20%, transparent), 0 14px 30px -14px color-mix(in srgb, ${accentHex} 40%, transparent)`
          : '0 1px 0 rgba(26,20,16,0.04), 0 8px 20px -12px rgba(26,20,16,0.14)',
      }}
    >
      <h4
        className="font-display text-ink mb-1"
        style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          lineHeight: 1.25,
          fontVariationSettings: '"SOFT" 40, "opsz" 48',
        }}
      >
        {eintrag.titel}
      </h4>
      {eintrag.beschreibung && (
        <p
          className="text-ink-soft"
          style={{ fontSize: '0.95rem', lineHeight: 1.55, marginBottom: 0 }}
        >
          {eintrag.beschreibung}
        </p>
      )}
      {eintrag.hinweis && (
        <div
          className="mt-3 px-3 py-2 rounded-lg font-hand"
          style={{
            background: 'color-mix(in srgb, var(--color-melsdorf-red) 10%, transparent)',
            color: 'var(--color-melsdorf-red-dark)',
            fontSize: '1.1rem',
            lineHeight: 1.3,
          }}
        >
          → {eintrag.hinweis}
        </div>
      )}
    </div>
  );
}

export function AblaufSection({ eintraege, eventJahr, sectionSettings }: AblaufSectionProps) {
  if (!eintraege || eintraege.length === 0) return null;

  const badge    = sectionSettings?.badge     ?? 'So läuft der Tag';
  const title    = sectionSettings?.titel     ?? 'Ablaufplan';
  const subtitle = sectionSettings?.untertitel ?? `Unser buntes Programm für einen unvergesslichen Tag${eventJahr ? ` ${eventJahr}` : ''}`;

  return (
    <SectionWrapper id="ablauf" bgColor="bg-paper" padding="lg" grain>
      <PageHeader
        badge={badge}
        title={title}
        subtitle={subtitle}
        highlightVariant="highlighter"
      />

      <div className="max-w-3xl mx-auto relative">
        {eintraege.map((eintrag, index) => {
          const accentHex = farbeToHex[eintrag.farbe] ?? farbeToHex.secondary;
          const isLeft = index % 2 === 0;

          return (
            <motion.div
              key={eintrag.id}
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Grid: Uhrzeit | Karte */}
              <div
                className="grid gap-4 md:gap-8 py-5 md:py-6"
                style={{
                  gridTemplateColumns: 'minmax(4.5rem, 7rem) 1fr',
                }}
              >
                <div className={`flex items-start ${isLeft ? 'justify-end' : 'justify-end'} pt-1`}>
                  <div className="text-right">
                    <TimeLabel time={eintrag.uhrzeit} color={accentHex} />
                    {eintrag.icon && (
                      <span
                        className="inline-block mt-2 text-2xl"
                        style={{ filter: 'grayscale(0.05)' }}
                      >
                        {eintrag.icon}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`${isLeft ? 'md:pl-0' : 'md:pl-6'}`}>
                  <EintragCard
                    eintrag={eintrag}
                    accentHex={accentHex}
                    isHighlight={eintrag.ist_highlight}
                  />
                </div>
              </div>

              {/* Kritzel-Verbinder zum nächsten Eintrag */}
              {index < eintraege.length - 1 && (
                <svg
                  aria-hidden
                  className="absolute left-[3.4rem] md:left-[5.3rem] top-full -translate-y-2 pointer-events-none"
                  width="28"
                  height="44"
                  viewBox="0 0 28 44"
                  fill="none"
                >
                  <path
                    d={isLeft ? 'M14 2 C 22 14, 6 26, 14 42' : 'M14 2 C 6 14, 22 26, 14 42'}
                    stroke="color-mix(in srgb, var(--color-ink) 22%, transparent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="1 5"
                  />
                </svg>
              )}
            </motion.div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
