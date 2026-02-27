'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { SectionWrapper } from './SectionWrapper';
import { PageHeader } from './PageHeader';
import { RouteMap } from '@/components/route/RouteComponents';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export function RouteSection() {
  return (
    <SectionWrapper id="route" bgColor="bg-gradient-to-b from-pastel-green/10 to-pastel-blue/20">
      <PageHeader
        badge="🚜 Festumzug"
        title="Umzugsroute"
        subtitle="Der Festumzug ist einer der Höhepunkte des Tages! Folge unserer Route durch das festlich geschmückte Dorf"
      />

      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-all duration-500 border border-white/50">
          <div className="aspect-[16/9] relative">
            <motion.div className="w-full h-full" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
              <RouteMap />
            </motion.div>
          </div>
          <div className="p-8 bg-white">
            <div className="flex items-start mb-4">
              <div className="bg-primary-light/20 p-3 rounded-full mr-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Festumzug durch Melsdorf</h3>
                <p className="text-gray-700">
                  Der Umzug startet an der Regenbogenschule und führt über die Köhlerkoppel, die Dorfstraße, Kieler Weg, am Dom, Rothenberg, Schlichtingstraße und Rotenhofer Weg zurück zu der Regenbogenschule.
                  Alle freuen sich über jedes geschmückte Haus entlang der Route!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
