'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SectionWrapper } from './SectionWrapper';

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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title="Kopieren"
      className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-melsdorf-orange hover:bg-white/10 transition-all"
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function BankField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </span>
      <div className="flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
        <span className={`text-white text-sm leading-snug break-all ${mono ? 'font-mono tracking-wide' : 'font-medium'}`}>
          {value}
        </span>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

export function SpendenSection({ settings, eventJahr }: SpendenSectionProps) {
  const s = settings || defaults;
  const verwendungszweck = `${s.verwendungszweck_prefix}${eventJahr ? ` ${eventJahr}` : ''}`;

  return (
    <SectionWrapper id="spenden" bgColor="bg-melsdorf-green">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-sm font-semibold text-melsdorf-orange mb-5">
            ❤️ Jetzt unterstützen
          </span>
          <h2
            className="font-bold text-white leading-tight mb-4"
            style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontFamily: 'var(--font-poppins)' }}
          >
            Hilf mit, den Kindern einen{' '}
            <span className="text-melsdorf-orange">unvergesslichen Tag</span>{' '}
            zu schenken
          </h2>
        </div>

        {/* ── Two columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left: Description */}
          <motion.div
            className="flex flex-col gap-5"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-white/5 border border-white/10 rounded-3xl p-7 flex-grow">
              <p className="text-slate-300 leading-relaxed mb-4">{s.beschreibung_links}</p>
              <p className="text-slate-300 leading-relaxed mb-4">
                Mit deiner Unterstützung ermöglichst du den Kindern einen tollen Tag voller Spiel, Gemeinschaft und Freude – und hilfst bei der Finanzierung der Klassenausflüge.
              </p>
              <p className="text-slate-300 leading-relaxed">{s.beschreibung_helfer}</p>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 flex items-center gap-4">
              <span className="text-2xl flex-shrink-0">🤝</span>
              <p className="text-melsdorf-beige text-sm font-medium leading-snug">
                Alternativ kannst du ganz bequem per Überweisung spenden – einfach die Daten rechts nutzen.
              </p>
            </div>
          </motion.div>

          {/* Right: Bank details */}
          <motion.div
            className="bg-white/5 border border-white/10 rounded-3xl p-7"
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-full bg-melsdorf-orange/20 flex items-center justify-center text-lg flex-shrink-0">
                💳
              </div>
              <h3 className="text-white font-bold text-lg">Bankverbindung</h3>
            </div>

            <div className="space-y-4">
              <BankField label="Kontoinhaber" value={s.kontoinhaber} />
              <BankField label="IBAN" value={s.iban} mono />
              <BankField label="BIC" value={s.bic} mono />
              <BankField label="Verwendungszweck" value={verwendungszweck} />
            </div>

            <p className="mt-5 text-xs text-slate-500 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Auf das Kopier-Symbol klicken um Werte in die Zwischenablage zu kopieren
            </p>
          </motion.div>

        </div>
      </div>
    </SectionWrapper>
  );
}
