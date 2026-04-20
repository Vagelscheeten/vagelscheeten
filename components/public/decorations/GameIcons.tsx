import React from 'react';

type IconKey =
  | 'target'
  | 'ball'
  | 'fish'
  | 'wheel'
  | 'boot'
  | 'treasure'
  | 'scooter'
  | 'wire'
  | 'sponge'
  | 'laundry'
  | 'crossbow'
  | 'default';

interface GameIconProps {
  name: IconKey;
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Hand-drawn looking game icons as SVG. Wackelige Linien, warmer Stil,
 * passen zum „Schulheft"-Look.
 */
export function GameIcon({
  name,
  size = 48,
  color = 'currentColor',
  className = '',
}: GameIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
    fill: 'none' as const,
    xmlns: 'http://www.w3.org/2000/svg',
    className,
    'aria-hidden': true,
  };
  const stroke = color;
  const sw = 2.2;

  switch (name) {
    case 'target':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth={sw} />
          <circle cx="24" cy="24" r="12" stroke={stroke} strokeWidth={sw} />
          <circle cx="24" cy="24" r="6" stroke={stroke} strokeWidth={sw} />
          <circle cx="24" cy="24" r="2" fill={stroke} />
        </svg>
      );
    case 'crossbow':
      return (
        <svg {...common}>
          <path
            d="M6 14 Q 24 6 42 14"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <path d="M24 14 L 24 38" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M18 38 L 30 38" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M24 8 L 24 20 M20 14 L 24 10 L 28 14" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'ball':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="16" stroke={stroke} strokeWidth={sw} />
          <path
            d="M8 24 Q 24 14 40 24 M8 24 Q 24 34 40 24 M24 8 Q 14 24 24 40 M24 8 Q 34 24 24 40"
            stroke={stroke}
            strokeWidth={sw * 0.7}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case 'fish':
      return (
        <svg {...common}>
          <path
            d="M6 24 C 12 14, 28 14, 34 24 C 28 34, 12 34, 6 24 Z"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M34 24 L 44 18 L 44 30 Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <circle cx="14" cy="22" r="1.2" fill={stroke} />
        </svg>
      );
    case 'wheel':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="17" stroke={stroke} strokeWidth={sw} />
          <path
            d="M24 7 L 24 41 M7 24 L 41 24 M11.5 11.5 L 36.5 36.5 M11.5 36.5 L 36.5 11.5"
            stroke={stroke}
            strokeWidth={sw * 0.8}
          />
          <circle cx="24" cy="24" r="3" fill={stroke} />
        </svg>
      );
    case 'boot':
      return (
        <svg {...common}>
          <path
            d="M16 8 L 16 30 L 10 30 L 10 40 L 38 40 L 38 30 L 26 30 L 26 8 Z"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M16 20 L 26 20" stroke={stroke} strokeWidth={sw * 0.7} />
        </svg>
      );
    case 'treasure':
      return (
        <svg {...common}>
          <rect x="6" y="18" width="36" height="22" rx="2" stroke={stroke} strokeWidth={sw} />
          <path d="M6 18 Q 24 8 42 18" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M22 26 L 26 26 M24 24 L 24 32" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M6 28 L 42 28" stroke={stroke} strokeWidth={sw * 0.7} />
        </svg>
      );
    case 'scooter':
      return (
        <svg {...common}>
          <circle cx="12" cy="36" r="5" stroke={stroke} strokeWidth={sw} />
          <circle cx="38" cy="36" r="5" stroke={stroke} strokeWidth={sw} />
          <path
            d="M12 36 L 30 14 L 34 14 M30 14 L 38 36"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M26 14 L 34 10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case 'wire':
      return (
        <svg {...common}>
          <path
            d="M6 24 C 10 14, 16 34, 20 24 C 24 14, 28 34, 32 24 C 36 14, 40 34, 44 24"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="24" cy="24" r="3" stroke={stroke} strokeWidth={sw} fill="none" />
        </svg>
      );
    case 'sponge':
      return (
        <svg {...common}>
          <rect x="8" y="14" width="32" height="20" rx="3" stroke={stroke} strokeWidth={sw} />
          <circle cx="16" cy="22" r="1.2" fill={stroke} />
          <circle cx="26" cy="20" r="1.2" fill={stroke} />
          <circle cx="34" cy="26" r="1.2" fill={stroke} />
          <circle cx="20" cy="28" r="1.2" fill={stroke} />
          <circle cx="32" cy="30" r="1.2" fill={stroke} />
        </svg>
      );
    case 'laundry':
      return (
        <svg {...common}>
          <path d="M6 14 Q 24 8 42 14" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M14 14 L 14 26 Q 18 30 22 26 L 22 14" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M28 14 L 28 28 Q 32 32 36 28 L 36 14" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M12 12 L 16 9 M32 12 L 36 9" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path
            d="M10 22 L 14 26 L 22 12 L 30 24 L 38 16"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="34" r="3" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
  }
}

/** Maps free-text game names to an icon key. */
export function iconForGame(name: string | null | undefined): IconKey {
  const n = (name || '').toLowerCase();
  if (n.includes('armbrust') || n.includes('bogen')) return 'crossbow';
  if (n.includes('schießen') || n.includes('schiessen') || n.includes('ziel')) return 'target';
  if (n.includes('ball') || n.includes('werfen') || n.includes('wurf')) return 'ball';
  if (n.includes('fisch') || n.includes('angel')) return 'fish';
  if (n.includes('glücksrad') || n.includes('rad')) return 'wheel';
  if (n.includes('stiefel') || n.includes('gummistiefel')) return 'boot';
  if (n.includes('schatz') || n.includes('grabung')) return 'treasure';
  if (n.includes('rennen') || n.includes('roller')) return 'scooter';
  if (n.includes('draht')) return 'wire';
  if (n.includes('schwamm')) return 'sponge';
  if (n.includes('wäsche') || n.includes('waesche') || n.includes('klammer')) return 'laundry';
  return 'default';
}
