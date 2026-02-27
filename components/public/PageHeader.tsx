'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  titleColor?: string;
}

export function PageHeader({ badge, title, subtitle, titleColor = 'text-gray-900' }: PageHeaderProps) {
  return (
    <div className="text-center mb-16">
      {badge && (
        <motion.span
          className="inline-block px-4 py-1 bg-white rounded-full font-medium text-sm mb-3 shadow-sm"
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {badge}
        </motion.span>
      )}
      <motion.h2
        className={`text-4xl font-bold ${titleColor} mb-4`}
        style={{ fontFamily: 'var(--font-poppins)' }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          className="text-gray-700 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
