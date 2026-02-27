'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SectionWrapper } from './SectionWrapper';

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
  badge: '🎉 Herzlich eingeladen',
  titel: 'Schön, wenn ihr dabei seid!',
  text1: 'Wir laden alle Melsdorfer*innen und Freund*innen der Regenbogenschule herzlich ein, mit uns einen fröhlichen Nachmittag auf der Schulwiese zu verbringen.',
  text2: 'Gemeinsam genießen wir ein Picknick mit Kaffee und Kuchen unter freiem Himmel.',
  mitbringen: [
    'Eigene Kaltgetränke (Kaffee gibt\'s vor Ort)',
    'Kaffeebecher, Geschirr, Besteck',
    'Picknickdecke oder Sitzgelegenheit',
  ],
  fussnote: 'Für Kaffee und Kuchen ist gesorgt – wir freuen uns auf euch!',
};

export function EinladungSection({ settings }: EinladungSectionProps) {
  const s = settings
    ? { ...defaults, ...settings, mitbringen: settings.mitbringen?.length ? settings.mitbringen : defaults.mitbringen }
    : defaults;

  // Split title at last word for accent coloring
  const titleWords = s.titel.split(' ');
  const titleMain = titleWords.slice(0, -1).join(' ');
  const titleLast = titleWords[titleWords.length - 1];

  return (
    <SectionWrapper id="einladung" bgColor="bg-gradient-to-br from-pastel-yellow/60 to-melsdorf-beige/40">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-12">
          {s.badge && (
            <span className="inline-block px-4 py-1.5 bg-white/80 backdrop-blur-sm rounded-full text-sm font-semibold text-melsdorf-orange shadow-sm mb-5">
              {s.badge}
            </span>
          )}
          <h2
            className="font-bold leading-tight text-slate-900 mb-6"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontFamily: 'var(--font-poppins)' }}
          >
            {titleMain}{' '}
            <span className="text-melsdorf-orange">{titleLast}</span>
          </h2>
          <p className="text-slate-700 max-w-2xl mx-auto leading-relaxed mb-3">{s.text1}</p>
          {s.text2 && (
            <p className="text-slate-700 max-w-2xl mx-auto leading-relaxed">{s.text2}</p>
          )}
        </div>

        {/* ── Content grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Mitbringen card */}
          <motion.div
            className="bg-white rounded-3xl shadow-sm p-4 sm:p-7 border border-white/80"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-melsdorf-orange/15 flex items-center justify-center text-xl flex-shrink-0">
                🎒
              </div>
              <h3 className="text-lg font-bold text-slate-900">Bitte mitbringen</h3>
            </div>
            <ul className="space-y-3">
              {s.mitbringen.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-tertiary/15 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-slate-700 text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Fußnote / Highlight card */}
          <motion.div
            className="bg-melsdorf-orange rounded-3xl shadow-sm p-4 sm:p-7 flex flex-col justify-between"
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="text-4xl mb-4">☀️</div>
            <p className="text-white text-lg font-semibold leading-relaxed">{s.fussnote}</p>
          </motion.div>

        </div>
      </div>
    </SectionWrapper>
  );
}
