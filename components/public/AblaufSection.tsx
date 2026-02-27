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

// Hex colors used as inline styles to reliably set only the left border
const farbeToHex: Record<string, string> = {
  primary:   '#E7432C', // melsdorf-red
  secondary: '#F2A03D', // melsdorf-orange
  tertiary:  '#27AE60', // green
  accent:    '#F6C91C', // golden
  green:     '#33665B', // melsdorf-green
};

const farbeToTimeColor: Record<string, string> = {
  primary:   'text-melsdorf-red',
  secondary: 'text-melsdorf-orange',
  tertiary:  'text-tertiary',
  accent:    'text-accent-dark',
  green:     'text-melsdorf-green',
};

const farbeToDotClass: Record<string, string> = {
  primary:   'bg-melsdorf-red text-white',
  secondary: 'bg-melsdorf-orange text-white',
  tertiary:  'bg-tertiary text-white',
  accent:    'bg-accent text-slate-900',
  green:     'bg-melsdorf-green text-white',
};

function EintragCard({ eintrag }: { eintrag: AblaufEintrag }) {
  const hex = farbeToHex[eintrag.farbe] ?? farbeToHex.secondary;
  const timeColor = farbeToTimeColor[eintrag.farbe] ?? farbeToTimeColor.secondary;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-slate-100 border-l-4 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
      style={{ borderLeftColor: hex }}
    >
      <div className={`text-sm font-bold ${timeColor} mb-1`}>{eintrag.uhrzeit}</div>
      <h4 className="text-base font-semibold text-slate-900 mb-2 leading-snug">{eintrag.titel}</h4>
      {eintrag.beschreibung && (
        <p className="text-slate-500 text-sm leading-relaxed">{eintrag.beschreibung}</p>
      )}
      {eintrag.hinweis && (
        <div className="mt-3 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-600 text-sm font-medium">⚠️ {eintrag.hinweis}</p>
        </div>
      )}
    </div>
  );
}

export function AblaufSection({ eintraege, eventJahr, sectionSettings }: AblaufSectionProps) {
  if (!eintraege || eintraege.length === 0) return null;

  const badge    = sectionSettings?.badge     ?? `Programm ${eventJahr ?? ''}`;
  const title    = sectionSettings?.titel     ?? 'Ablaufplan';
  const subtitle = sectionSettings?.untertitel ?? `Unser buntes Programm für einen unvergesslichen Tag des Melsdörper Vagelscheeten${eventJahr ? ` ${eventJahr}` : ''}`;

  return (
    <SectionWrapper id="ablauf" bgColor="bg-white" className="mt-8">
      <PageHeader badge={badge} title={title} subtitle={subtitle} />

      <div className="max-w-4xl mx-auto relative">
        {/* Timeline vertical line – desktop only */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-slate-200 z-0 hidden md:block" />

        {eintraege.map((eintrag, index) => {
          const dotClass = farbeToDotClass[eintrag.farbe] ?? farbeToDotClass.secondary;
          const isLeft = index % 2 === 0;

          return (
            <motion.div
              key={eintrag.id}
              className="mb-10 relative"
              initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            >

              {/* ── Dot (desktop only, centered on line) ── */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10 hidden md:flex">
                <div className={`w-11 h-11 rounded-full ${dotClass} border-2 border-white shadow-md flex items-center justify-center text-lg`}>
                  {eintrag.icon || '📌'}
                </div>
              </div>

              {/* ── Mobile: icon + card side by side ── */}
              <div className="flex items-start gap-3 md:hidden">
                <div className={`w-10 h-10 rounded-full ${dotClass} flex-shrink-0 flex items-center justify-center text-base shadow-sm mt-0.5`}>
                  {eintrag.icon || '📌'}
                </div>
                <div className="flex-1">
                  <EintragCard eintrag={eintrag} />
                </div>
              </div>

              {/* ── Desktop: alternating left / right ── */}
              <div className="hidden md:flex items-center">
                {isLeft ? (
                  <>
                    <div className="w-1/2 pr-14 flex justify-end pt-2">
                      <div className="w-full max-w-xs">
                        <EintragCard eintrag={eintrag} />
                      </div>
                    </div>
                    <div className="w-1/2 pl-14" />
                  </>
                ) : (
                  <>
                    <div className="w-1/2 pr-14" />
                    <div className="w-1/2 pl-14 pt-2">
                      <div className="w-full max-w-xs">
                        <EintragCard eintrag={eintrag} />
                      </div>
                    </div>
                  </>
                )}
              </div>

            </motion.div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
