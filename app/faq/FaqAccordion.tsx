'use client';

import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { WaveDivider } from '@/components/public/WaveDivider';

type FaqKategorie = {
  id: string;
  name: string;
  sortierung: number;
};

type FaqEintrag = {
  id: string;
  kategorie_id: string;
  frage: string;
  antwort: string;
  sortierung: number;
};

type FaqHeroSettings = {
  titel?: string;
  untertitel?: string;
};

interface FaqAccordionProps {
  kategorien: FaqKategorie[];
  eintraege: FaqEintrag[];
  heroSettings?: FaqHeroSettings;
}

export default function FaqAccordion({ kategorien, eintraege, heroSettings }: FaqAccordionProps) {
  const titel      = heroSettings?.titel      ?? 'Häufig gestellte Fragen';
  const untertitel = heroSettings?.untertitel ?? 'Hier findest du Antworten rund um das Melsdörper Vagelscheeten.';

  // Letztes Wort des Titels in Orange hervorheben
  const words    = titel.split(' ');
  const titelEnd = words.slice(0, -1).join(' ');
  const titelLast = words[words.length - 1];

  return (
    <div className="w-full">

      {/* ── Hero-Header ──────────────────────────────────────── */}
      <header className="pt-14 pb-12 lg:pt-16 lg:pb-16 px-6 bg-gradient-to-b from-melsdorf-beige/30 to-white overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            className="font-bold leading-tight text-slate-900 tracking-tight mb-4"
            style={{ fontSize: 'clamp(1.9rem, 4.5vw, 3.2rem)', fontFamily: 'var(--font-poppins)' }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {titelEnd}{titelEnd ? ' ' : ''}
            <span className="text-melsdorf-orange">{titelLast}</span>
          </motion.h1>

          <motion.p
            className="text-slate-600 text-base max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {untertitel}
          </motion.p>
        </div>
      </header>

      {/* Wave: header-weiß → Inhalts-Hintergrund */}
      <WaveDivider fromColor="#ffffff" toColor="#F8F9FB" height={55} />

      {/* ── FAQ-Inhalt ───────────────────────────────────────── */}
      <div className="bg-[#F8F9FB] py-16 px-6">
        <div className="max-w-3xl mx-auto">

          {kategorien.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <span className="text-5xl block mb-4 opacity-40">💭</span>
              <p className="text-slate-500 text-lg">Noch keine FAQ-Einträge vorhanden.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {kategorien.map((kategorie, catIndex) => {
                const katEintraege = eintraege.filter(e => e.kategorie_id === kategorie.id);
                if (katEintraege.length === 0) return null;

                return (
                  <motion.section
                    key={kategorie.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.55, delay: catIndex * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* Kategorie-Header — kein Icon, cleaner Stil */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-6 bg-melsdorf-orange rounded-full flex-shrink-0" />
                      <h2 className="text-lg font-bold text-slate-800">{kategorie.name}</h2>
                    </div>

                    {/* Accordion */}
                    <Accordion type="multiple" className="space-y-2">
                      {katEintraege.map((eintrag, idx) => (
                        <motion.div
                          key={eintrag.id}
                          className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                          initial={{ opacity: 0, x: -18 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true, margin: '-40px' }}
                          transition={{ duration: 0.45, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <AccordionItem
                            value={eintrag.id}
                            className="bg-white rounded-xl border border-slate-100 overflow-hidden"
                          >
                            <AccordionTrigger className="px-5 py-4 text-left font-semibold text-slate-800 hover:no-underline hover:text-melsdorf-orange transition-colors text-[0.95rem]">
                              {eintrag.frage}
                            </AccordionTrigger>
                            <AccordionContent className="px-5 pb-5 pt-1 text-slate-600 leading-relaxed text-sm border-t border-slate-100">
                              {eintrag.antwort}
                            </AccordionContent>
                          </AccordionItem>
                        </motion.div>
                      ))}
                    </Accordion>
                  </motion.section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Wave → CTA-Bereich */}
      <WaveDivider fromColor="#F8F9FB" toColor="#FAF4E7" height={60} flip />

      {/* ── CTA ──────────────────────────────────────────────── */}
      <div className="bg-[#FAF4E7] py-16 px-6">
        <motion.div
          className="max-w-lg mx-auto bg-white rounded-3xl shadow-sm border border-white/80 p-8 text-center"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="text-4xl block mb-4">💬</span>
          <h3
            className="font-bold text-slate-900 mb-2"
            style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', fontFamily: 'var(--font-poppins)' }}
          >
            Noch weitere Fragen?
          </h3>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Deine Frage wurde hier nicht beantwortet? Wir helfen gerne weiter — schreib uns einfach!
          </p>
          <a
            href="/startseite#kontakt"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3 bg-accent hover:bg-melsdorf-orange transition-colors text-slate-900 font-bold shadow-md shadow-orange-100 hover:shadow-orange-200 transform hover:-translate-y-0.5"
          >
            Kontakt aufnehmen
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </motion.div>
      </div>

      {/* Wave → Footer */}
      <WaveDivider fromColor="#FAF4E7" toColor="#ffffff" height={50} />

    </div>
  );
}
