import React from 'react';

interface SectionWrapperProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  bgColor?: string;
}

export function SectionWrapper({ id, children, className = '', bgColor = 'bg-white' }: SectionWrapperProps) {
  return (
    <div id={id} className={`py-20 ${bgColor} ${className}`}>
      <div className="container max-w-7xl mx-auto px-4">
        {children}
      </div>
    </div>
  );
}
