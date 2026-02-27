import React from 'react';

interface WaveDividerProps {
  fromColor: string;
  toColor: string;
  height?: number;
  flip?: boolean;
}

export function WaveDivider({ fromColor, toColor, height = 70, flip = false }: WaveDividerProps) {
  const w = 1440;
  const h = height;
  // Single smooth S-curve wave
  const d = `M0,0 L0,${Math.round(h * 0.4)} C${Math.round(w * 0.25)},${h} ${Math.round(w * 0.75)},0 ${w},${Math.round(h * 0.4)} L${w},0 Z`;

  return (
    <div style={{ backgroundColor: toColor, display: 'block', lineHeight: 0, marginBottom: -1 }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{
          display: 'block',
          width: '100%',
          height: `${h}px`,
          transform: flip ? 'scaleX(-1)' : undefined,
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={d} fill={fromColor} />
      </svg>
    </div>
  );
}
