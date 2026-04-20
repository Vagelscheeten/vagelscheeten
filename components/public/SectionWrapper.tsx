import React from 'react';

interface SectionWrapperProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  /** Tailwind bg utility class, z. B. 'bg-paper', 'bg-melsdorf-green' */
  bgColor?: string;
  /** Vertikales Padding */
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  /** Papier-Grain-Overlay aktivieren */
  grain?: boolean;
}

const paddingMap = {
  sm: 'py-12 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-28',
  xl: 'py-24 md:py-36',
};

export function SectionWrapper({
  id,
  children,
  className = '',
  bgColor = 'bg-paper',
  padding = 'md',
  grain = false,
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={`relative ${bgColor} ${paddingMap[padding]} ${grain ? 'paper-grain' : ''} ${className}`}
    >
      <div className="relative z-[1] w-full max-w-7xl mx-auto px-4 md:px-8">
        {children}
      </div>
    </section>
  );
}
