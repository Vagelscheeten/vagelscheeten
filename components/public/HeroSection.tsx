'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MarkerUnderline } from './decorations/MarkerUnderline';
import { Polaroid } from './decorations/Polaroid';
import { StempelBadge } from './decorations/StempelBadge';
import { PaperBackground } from './decorations/PaperBackground';

// ─── Types ────────────────────────────────────────────────────
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

type GalleryImage = {
  id: number;
  name: string;
  url: string;
};

// ─── Countdown ────────────────────────────────────────────────
const calcDaysLeft = (target: Date) => {
  const diff = target.getTime() - Date.now();
  const isToday = new Date().toDateString() === target.toDateString();
  return {
    days: Math.max(0, Math.ceil(diff / 86_400_000)),
    isPast: diff < 0 && !isToday,
    isToday,
  };
};

function CountdownLine({ target, year }: { target: Date; year?: number }) {
  const [t, setT] = useState(() => calcDaysLeft(target));

  useEffect(() => {
    const id = setInterval(() => setT(calcDaysLeft(target)), 60_000);
    return () => clearInterval(id);
  }, [target]);

  if (t.isToday)
    return (
      <p
        className="font-display text-melsdorf-red"
        style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 600, lineHeight: 1.1 }}
      >
        Heute ist es soweit.
      </p>
    );

  if (t.isPast)
    return (
      <p className="text-ink-soft" style={{ fontSize: '1.0625rem' }}>
        Das Vagelscheeten {year} ist vorbei — danke an alle!
      </p>
    );

  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <span className="font-hand text-ink-muted" style={{ fontSize: '1.15rem' }}>
        Noch
      </span>
      <span
        className="font-display text-melsdorf-red font-soft-warm tabular-nums"
        style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)', fontWeight: 600, lineHeight: 0.9 }}
      >
        {t.days}
      </span>
      <span
        className="font-display text-ink"
        style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)', fontWeight: 500 }}
      >
        {t.days === 1 ? 'Tag' : 'Tage'} bis zum Fest
      </span>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────
interface HeroSectionProps {
  event: ActiveEvent | null;
  heroSettings?: HeroSettings;
  galleryImages?: GalleryImage[];
  onScrollToSpenden?: () => void;
}

export function HeroSection({
  event,
  heroSettings,
  galleryImages = [],
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

  // Stempel: Tag + Monat oben, Jahr unten
  const stempelTop = event?.datum
    ? new Date(event.datum).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }).toUpperCase()
    : '30. MAI';
  const stempelBottom = String(event?.jahr ?? 2026);

  // Letztes Wort im Titel hervorgehoben
  const words = title.split(' ');
  const mainTitle = words.slice(0, -1).join(' ');
  const lastWord = words[words.length - 1];

  // Polaroid-Bilder aus Galerie wählen (bis zu 3)
  const polaroidImages = useMemo(() => {
    const pool = galleryImages.filter((g) => g.url);
    if (pool.length === 0 && heroSettings?.hero_bild_url) {
      return [{ id: 0, name: 'Hero', url: heroSettings.hero_bild_url }];
    }
    if (pool.length === 0) {
      return [{ id: 0, name: 'Hero', url: '/hero.jpg' }];
    }
    // Nimm die ersten 3 in stabiler Reihenfolge (deterministisch)
    return pool.slice(0, 3);
  }, [galleryImages, heroSettings?.hero_bild_url]);

  const [primary, ...rest] = polaroidImages;

  return (
    <PaperBackground
      color="var(--color-paper)"
      grain={0.4}
      className="overflow-hidden"
    >
      <header className="relative pt-20 pb-24 md:pt-28 md:pb-36 px-4 md:px-8">
        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6 items-start">

            {/* ── Text-Bereich (7 cols) ─────────────────────── */}
            <div className="md:col-span-7 relative z-10">

              {/* Caveat-Einleitung */}
              <motion.p
                className="font-hand text-melsdorf-red mb-4 md:mb-6"
                style={{ fontSize: '1.4rem', letterSpacing: '0.01em' }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                Für die Kinder der Regenbogenschule —
              </motion.p>

              {/* HEADLINE */}
              <h1
                className="font-display text-ink mb-6 md:mb-8"
                style={{
                  fontSize: 'clamp(2.75rem, 10vw, 7.5rem)',
                  fontWeight: 600,
                  letterSpacing: '-0.025em',
                  lineHeight: 0.92,
                  fontVariationSettings: '"SOFT" 60, "opsz" 144',
                }}
              >
                <motion.span
                  className="block"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  {mainTitle}
                </motion.span>
                <motion.span
                  className="block text-melsdorf-orange italic"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  style={{ fontVariationSettings: '"SOFT" 85, "opsz" 144' }}
                >
                  {lastWord}
                </motion.span>
              </h1>

              {/* Datum + Ort */}
              <motion.div
                className="max-w-lg mb-8 md:mb-10"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <p
                  className="font-display text-ink-soft mb-1.5"
                  style={{ fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.25 }}
                >
                  {dateFormatted}
                </p>
                <p
                  className="text-ink-muted flex items-center gap-2"
                  style={{ fontSize: '1.0625rem', lineHeight: 1.4 }}
                >
                  <span className="inline-block w-6 h-px bg-ink-muted" />
                  Regenbogenschule Melsdorf
                </p>
              </motion.div>

              {/* CTAs */}
              <motion.div
                className="flex flex-col sm:flex-row flex-wrap gap-3 mb-10 md:mb-14"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    if (onScrollToSpenden) {
                      e.preventDefault();
                      onScrollToSpenden();
                    } else {
                      window.location.hash = 'spenden';
                    }
                  }}
                  className="group inline-flex items-center justify-center gap-2 rounded-full h-14 px-7 bg-melsdorf-red hover:bg-melsdorf-red-dark text-paper-soft font-semibold transition-all shadow-lg shadow-melsdorf-red/20 hover:-translate-y-0.5"
                  style={{ fontSize: '1.0625rem' }}
                >
                  {ctaText}
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <Link
                  href="/anmeldung"
                  className="inline-flex items-center justify-center gap-2 rounded-full h-14 px-7 border-2 border-ink/15 bg-paper-soft hover:bg-ink hover:text-paper-soft hover:border-ink text-ink font-semibold transition-all"
                  style={{ fontSize: '1.0625rem' }}
                >
                  Zur Anmeldung
                </Link>
              </motion.div>

              {/* Countdown-Zeile */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <CountdownLine target={eventDate} year={event?.jahr} />
              </motion.div>
            </div>

            {/* ── Bild-Bereich (5 cols) — Polaroid-Collage ─── */}
            <div className="md:col-span-5 relative min-h-[320px] md:min-h-[520px]">
              {/* Primär-Polaroid */}
              {primary && (
                <motion.div
                  className="absolute left-1/2 md:left-auto md:right-0 top-0 -translate-x-1/2 md:translate-x-0 w-[78%] md:w-[85%] z-10"
                  initial={{ opacity: 0, y: 30, rotate: -4 }}
                  animate={{ opacity: 1, y: 0, rotate: 3 }}
                  transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Polaroid
                    src={primary.url}
                    alt={primary.name}
                    rotate={3}
                    tape
                    priority
                    aspectRatio="landscape"
                    caption="Erinnerung"
                    sizes="(min-width: 920px) 42vw, 78vw"
                  />
                </motion.div>
              )}

              {/* Zweites Polaroid (nur Desktop) */}
              {rest[0] && (
                <motion.div
                  className="hidden md:block absolute left-[-6%] top-[58%] w-[52%] z-0"
                  initial={{ opacity: 0, y: 30, rotate: 2 }}
                  animate={{ opacity: 1, y: 0, rotate: -7 }}
                  transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Polaroid
                    src={rest[0].url}
                    alt={rest[0].name}
                    rotate={-7}
                    aspectRatio="square"
                    sizes="(min-width: 920px) 25vw, 50vw"
                  />
                </motion.div>
              )}

              {/* Stempel — auf der unteren Kante des Polaroids, dezentes Papier-Fill für Lesbarkeit */}
              <motion.div
                className="absolute md:top-[56%] top-[32%] right-[-2%] md:-right-6 z-20"
                initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: -7 }}
                transition={{ duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <StempelBadge
                  topLine={stempelTop}
                  bottomLine={stempelBottom}
                  rotate={-7}
                  scale={1.05}
                  paperFill
                />
              </motion.div>
            </div>
          </div>
        </div>
      </header>
    </PaperBackground>
  );
}
