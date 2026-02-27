'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Types
type ActiveEvent = {
  id: string;
  name: string;
  jahr: number;
  datum: string | null;
  ist_aktiv: boolean;
};

type HeroSettings = {
  titel: string;
  untertitel: string;
  cta_text: string;
  cta_beschreibung: string;
  hero_bild_url?: string;
};

// ─── Countdown ───────────────────────────────────────────────
const calcTimeLeft = (target: Date) => {
  const diff = target.getTime() - Date.now();
  const isToday = new Date().toDateString() === target.toDateString();
  return {
    days: Math.max(0, Math.floor(diff / 86_400_000)),
    hours: Math.max(0, Math.floor((diff % 86_400_000) / 3_600_000)),
    minutes: Math.max(0, Math.floor((diff % 3_600_000) / 60_000)),
    seconds: Math.max(0, Math.floor((diff % 60_000) / 1_000)),
    isPast: diff < 0 && !isToday,
    isToday,
  };
};

const CountdownCard = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 py-4 px-3">
    <span className="text-3xl lg:text-4xl font-bold text-slate-900">{value}</span>
    <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide mt-1">
      {label}
    </span>
  </div>
);

function Countdown({ target, year }: { target: Date; year?: number }) {
  const [t, setT] = useState(calcTimeLeft(target));

  useEffect(() => {
    const id = setInterval(() => setT(calcTimeLeft(target)), 1_000);
    if (t.isPast) clearInterval(id);
    return () => clearInterval(id);
  }, [target, t.isPast]);

  if (t.isToday)
    return (
      <p className="text-2xl font-bold text-slate-900">
        🎉 Heute ist es soweit!
      </p>
    );

  if (t.isPast)
    return (
      <p className="text-lg text-slate-600">
        Das Vogelschießen {year} ist vorbei — danke an alle!
      </p>
    );

  return (
    <div className="w-full max-w-sm">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
        Countdown zum Fest
      </p>
      <div className="grid grid-cols-4 gap-3">
        <CountdownCard value={t.days} label="Tage" />
        <CountdownCard value={t.hours} label="Std" />
        <CountdownCard value={t.minutes} label="Min" />
        <CountdownCard value={t.seconds} label="Sek" />
      </div>
    </div>
  );
}

// ─── Hero Section ────────────────────────────────────────────
interface HeroSectionProps {
  event: ActiveEvent | null;
  heroSettings?: HeroSettings;
  onScrollToSpenden?: () => void;
}

export function HeroSection({
  event,
  heroSettings,
  onScrollToSpenden,
}: HeroSectionProps) {
  const eventDate = event?.datum
    ? new Date(event.datum + 'T10:00:00')
    : new Date('2026-05-30T10:00:00');

  const title = heroSettings?.titel || 'Melsdörper Vagelscheeten';
  const ctaText = heroSettings?.cta_text || 'Jetzt mit einer Spende helfen';

  const dateFormatted = event?.datum
    ? new Date(event.datum).toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Samstag, 30. Mai 2026';

  const words = title.split(' ');
  const firstWord = words[0];
  const rest = words.slice(1).join(' ');

  return (
    <header className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 px-6 bg-gradient-to-b from-melsdorf-beige/30 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto relative min-h-[500px] lg:min-h-[550px]">

        {/* ── Image: absolutely positioned right side, BEHIND text (z-0) ── */}
        <motion.div
          className="absolute right-0 top-1/2 -translate-y-[55%] w-[53%] z-0 hidden lg:block"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative aspect-[4/3] rounded-3xl shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 ease-out bg-white p-3">
            <div className="relative w-full h-full rounded-2xl overflow-hidden">
              <Image
                src={heroSettings?.hero_bild_url || '/hero.jpg'}
                alt="Melsdörper Vagelscheeten"
                fill
                className="object-cover"
                quality={90}
                priority
              />
            </div>
          </div>
        </motion.div>

        {/* ── Text: sits ABOVE the image (z-10), NO max-width on headline ── */}
        <div className="relative z-10">

          {/* HEADLINE: 3 lines, NO width constraint so it can overlap image */}
          <h1
            className="font-bold leading-[0.95] text-slate-900 tracking-tight mb-8"
            style={{ fontSize: 'clamp(2.25rem, 6vw, 7rem)' }}
          >
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0, ease: [0.22, 1, 0.36, 1] }}
            >
              {firstWord}
            </motion.span>
            <motion.span
              className="block text-[#F2A03D]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {rest}
            </motion.span>
            {event && (
              <motion.span
                className="block"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {event.jahr}
              </motion.span>
            )}
          </h1>

          {/* Below headline: constrain to left side */}
          <div className="max-w-md">
            {/* Date + Location */}
            <motion.div
              className="flex flex-col text-slate-600 mb-8 leading-tight -space-y-0.5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="flex items-center gap-2 text-base lg:text-lg font-medium">
                <svg className="w-4 h-4 text-melsdorf-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {dateFormatted}
              </p>
              <p className="flex items-center gap-2 text-base lg:text-lg font-medium">
                <svg className="w-4 h-4 text-melsdorf-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Regenbogenschule Melsdorf
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center mb-10">
              <motion.a
                href="#spenden"
                onClick={(e) => {
                  if (onScrollToSpenden) {
                    e.preventDefault();
                    onScrollToSpenden();
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full h-14 px-8 bg-accent hover:bg-melsdorf-orange transition-all text-slate-900 text-base font-bold shadow-lg shadow-orange-200/50 hover:shadow-orange-300 transform hover:-translate-y-0.5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.52, ease: [0.22, 1, 0.36, 1] }}
              >
                {ctaText}
                <span className="text-lg">❤️</span>
              </motion.a>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.58, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href="/anmeldung"
                  className="inline-flex items-center gap-2 rounded-full h-14 px-8 border-2 border-slate-300 hover:border-melsdorf-orange bg-white/80 hover:bg-white text-slate-900 text-base font-bold transition-all transform hover:-translate-y-0.5"
                >
                  Anmeldung
                  <span className="text-lg">🙋</span>
                </Link>
              </motion.div>
            </div>

            {/* Countdown */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <Countdown target={eventDate} year={event?.jahr} />
            </motion.div>
          </div>
        </div>

        {/* Mobile: Image below text */}
        <motion.div
          className="relative mt-10 lg:hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl rotate-1">
            <Image
              src={heroSettings?.hero_bild_url || '/hero.jpg'}
              alt="Melsdörper Vagelscheeten"
              fill
              className="object-cover"
              quality={90}
              priority
            />
          </div>
        </motion.div>

      </div>
    </header>
  );
}
