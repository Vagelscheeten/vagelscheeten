'use client';

import React from 'react';

type Variant = 'down' | 'down-curved' | 'right-curved' | 'loop';

interface HandDrawnArrowProps {
  variant?: Variant;
  color?: string;
  strokeWidth?: number;
  className?: string;
  width?: number | string;
  height?: number | string;
}

const paths: Record<Variant, { d: string; viewBox: string }> = {
  'down': {
    viewBox: '0 0 60 120',
    d: 'M30 5 C 34 28, 22 55, 32 82 M32 82 L 22 70 M32 82 L 44 74',
  },
  'down-curved': {
    viewBox: '0 0 120 160',
    d: 'M12 10 C 40 40, 95 45, 85 110 M85 110 L 72 95 M85 110 L 102 100',
  },
  'right-curved': {
    viewBox: '0 0 180 70',
    d: 'M8 40 C 50 12, 110 14, 168 34 M168 34 L 152 22 M168 34 L 156 48',
  },
  'loop': {
    viewBox: '0 0 160 120',
    d: 'M8 30 C 40 8, 120 12, 140 50 C 155 90, 70 105, 40 85 M40 85 L 50 72 M40 85 L 55 95',
  },
};

export function HandDrawnArrow({
  variant = 'down',
  color = 'currentColor',
  strokeWidth = 2.4,
  className = '',
  width,
  height,
}: HandDrawnArrowProps) {
  const { d, viewBox } = paths[variant];
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
