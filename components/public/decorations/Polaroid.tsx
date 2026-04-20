'use client';

import React from 'react';
import Image from 'next/image';

interface PolaroidProps {
  src: string;
  alt: string;
  caption?: string;
  rotate?: number;
  tape?: boolean;
  priority?: boolean;
  className?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  sizes?: string;
}

/**
 * Ein Polaroid-Foto mit leichtem Rotationswinkel, realistischem Schatten
 * und optionalem Washi-Tape oben.
 */
export function Polaroid({
  src,
  alt,
  caption,
  rotate = -2,
  tape = false,
  priority = false,
  className = '',
  aspectRatio = 'square',
  sizes = '(min-width: 920px) 33vw, 100vw',
}: PolaroidProps) {
  const aspectClass = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
  }[aspectRatio];

  return (
    <div
      className={`relative bg-[#FFFDF8] p-3 pb-10 rounded-[4px] ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        boxShadow:
          '0 1px 1px rgba(26,20,16,0.04), 0 4px 10px -4px rgba(26,20,16,0.18), 0 18px 40px -12px rgba(26,20,16,0.28)',
        transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.5s',
      }}
    >
      {tape && (
        <span
          aria-hidden
          className="absolute -top-3 left-1/2 w-16 h-5"
          style={{
            transform: 'translateX(-50%) rotate(-3deg)',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 70%, transparent) 0%, color-mix(in srgb, var(--color-accent) 50%, transparent) 100%)',
            boxShadow: '0 1px 3px rgba(26,20,16,0.12)',
          }}
        />
      )}
      <div
        className={`relative w-full ${aspectClass} overflow-hidden bg-paper-warm`}
        style={{ borderRadius: '2px' }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
      {caption && (
        <div
          className="absolute left-0 right-0 bottom-2 text-center px-2"
          style={{
            fontFamily: 'var(--font-caveat), cursive',
            fontSize: '1.05rem',
            color: 'var(--color-ink-soft)',
            lineHeight: 1.2,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
