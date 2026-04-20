'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MarkerUnderlineProps {
  children: React.ReactNode;
  color?: string;
  /** 'highlighter' = gelber Leuchtstift hinter dem Text, 'underline' = rote Kritzel-Linie darunter */
  variant?: 'highlighter' | 'underline';
  className?: string;
}

/**
 * Wraps inline text with a hand-drawn marker effect.
 * - `highlighter`: yellow highlighter band behind the text
 * - `underline`: hand-drawn ink underline stroke
 */
export function MarkerUnderline({
  children,
  color,
  variant = 'highlighter',
  className = '',
}: MarkerUnderlineProps) {
  if (variant === 'highlighter') {
    const highlighterColor = color ?? 'var(--color-accent)';
    return (
      <span className={`relative inline-block ${className}`}>
        <motion.span
          aria-hidden
          className="absolute left-[-0.05em] right-[-0.05em] bottom-[0.08em] top-[0.35em] -z-0 rounded-[2px]"
          style={{ backgroundColor: highlighterColor, opacity: 0.55 }}
          initial={{ scaleX: 0, transformOrigin: 'left' }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
        <span className="relative z-10">{children}</span>
      </span>
    );
  }

  const underlineColor = color ?? 'var(--color-melsdorf-red)';
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      <svg
        aria-hidden
        className="absolute left-0 right-0 -bottom-[0.15em] w-full"
        viewBox="0 0 200 14"
        preserveAspectRatio="none"
        style={{ height: '0.5em' }}
      >
        <motion.path
          d="M2 8 Q 50 2 100 6 T 198 6"
          fill="none"
          stroke={underlineColor}
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        />
      </svg>
    </span>
  );
}
