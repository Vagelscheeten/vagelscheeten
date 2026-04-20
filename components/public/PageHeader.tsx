'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MarkerUnderline } from './decorations/MarkerUnderline';

interface PageHeaderProps {
  /** Optionales Kicker-Label — wird in Caveat/Akzentfarbe gesetzt */
  badge?: string;
  /** Hauptüberschrift (Fraunces, groß) */
  title: string;
  /** Unterzeile */
  subtitle?: string;
  /** Textfarbe für den Titel (für dunkle Sections z. B. text-paper-soft) */
  titleColor?: string;
  /** Wortindex, der mit Highlight/Unterstreichung betont werden soll */
  highlightWordIndex?: number;
  /** Variante des Highlights */
  highlightVariant?: 'highlighter' | 'underline';
  /** Linksbündig statt zentriert */
  align?: 'center' | 'left';
  /** Farbe für Badge-Text */
  badgeColor?: string;
}

export function PageHeader({
  badge,
  title,
  subtitle,
  titleColor = 'text-ink',
  highlightWordIndex,
  highlightVariant = 'highlighter',
  align = 'center',
  badgeColor = 'text-melsdorf-red',
}: PageHeaderProps) {
  const words = title.split(' ');
  const defaultHighlight =
    highlightWordIndex ?? (words.length >= 2 ? words.length - 1 : 0);

  const alignClass = align === 'center' ? 'text-center' : 'text-left';
  const subtitleWidth = align === 'center' ? 'mx-auto' : '';

  return (
    <div className={`${alignClass} mb-14`}>
      {badge && (
        <motion.span
          className={`inline-block ${badgeColor} mb-3 font-hand`}
          style={{ fontSize: '1.35rem', letterSpacing: '0.01em' }}
          initial={{ opacity: 0, y: -8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {badge}
        </motion.span>
      )}
      <motion.h2
        className={`font-display ${titleColor} mb-5 font-soft-display`}
        style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
          marginBottom: subtitle ? '1.25rem' : '0',
        }}
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        {words.map((word, i) => (
          <React.Fragment key={i}>
            {i === defaultHighlight ? (
              <MarkerUnderline variant={highlightVariant}>{word}</MarkerUnderline>
            ) : (
              word
            )}
            {i < words.length - 1 && ' '}
          </React.Fragment>
        ))}
      </motion.h2>
      {subtitle && (
        <motion.p
          className={`max-w-2xl ${subtitleWidth} text-ink-soft`}
          style={{ fontSize: '1.0625rem', lineHeight: 1.6 }}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
