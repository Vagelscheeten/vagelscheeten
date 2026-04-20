'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SectionWrapper } from './SectionWrapper';
import { PageHeader } from './PageHeader';
import { GameIcon, iconForGame } from './decorations/GameIcons';
import { HandDrawnArrow } from './decorations/HandDrawnArrow';

type Game = {
  id: string;
  name: string;
  beschreibung: string;
  icon?: string | null;
};

interface SpieleSectionProps {
  games: Game[];
  loading?: boolean;
  error?: string | null;
}

// Bento-Patterns: alternierende Kartengrößen
// Jedes Game bekommt basierend auf Index eine Span-Klasse
const bentoSpans = [
  'md:col-span-4 md:row-span-2',  // groß
  'md:col-span-2',
  'md:col-span-2',
  'md:col-span-3',
  'md:col-span-3',
  'md:col-span-2',
  'md:col-span-4',
  'md:col-span-3',
  'md:col-span-3',
  'md:col-span-2',
  'md:col-span-2',
  'md:col-span-2',
];

const accentPalette = [
  { tint: '#FFF1A8', border: '#F2A03D', text: '#8A5A10' },  // gelb/orange
  { tint: '#FFD8BE', border: '#E7432C', text: '#8E2818' },  // pfirsich/rot
  { tint: '#D9F2B4', border: '#33665B', text: '#1E4138' },  // grün
  { tint: '#F2E4C2', border: '#D4AC0D', text: '#6B5208' },  // beige/gelb
];

function GameCard({
  game,
  index,
  onClick,
  featured = false,
}: {
  game: Game;
  index: number;
  onClick: (game: Game) => void;
  featured?: boolean;
}) {
  const palette = accentPalette[index % accentPalette.length];
  const rotation = (index % 3 === 0 ? 0.5 : index % 3 === 1 ? -0.4 : 0.2);

  return (
    <motion.button
      type="button"
      onClick={() => onClick(game)}
      className="group relative text-left w-full h-full flex flex-col"
      style={{
        background: 'var(--color-paper-soft)',
        borderRadius: '1.25rem',
        padding: featured ? '2rem' : '1.5rem',
        border: `1.5px solid color-mix(in srgb, ${palette.border} 28%, transparent)`,
        boxShadow: '0 1px 0 rgba(26,20,16,0.04), 0 10px 28px -16px rgba(26,20,16,0.18)',
        transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s, border-color 0.4s',
        transform: `rotate(${rotation}deg)`,
      }}
      whileHover={{
        rotate: 0,
        y: -4,
        boxShadow: '0 2px 0 rgba(26,20,16,0.06), 0 18px 40px -14px rgba(26,20,16,0.28)',
      }}
      transition={{ type: 'spring', stiffness: 180, damping: 18 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
    >
      {/* Icon-Fläche */}
      <div
        className="inline-flex items-center justify-center mb-4"
        style={{
          width: featured ? '5.5rem' : '4rem',
          height: featured ? '5.5rem' : '4rem',
          borderRadius: '1rem',
          background: palette.tint,
          color: palette.text,
        }}
      >
        <GameIcon
          name={iconForGame(game.name)}
          size={featured ? 52 : 36}
        />
      </div>

      <h3
        className="font-display text-ink mb-2"
        style={{
          fontSize: featured ? 'clamp(1.5rem, 2vw, 1.875rem)' : '1.2rem',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
          fontVariationSettings: featured
            ? '"SOFT" 60, "opsz" 96'
            : '"SOFT" 40, "opsz" 48',
        }}
      >
        {game.name || 'Unbenanntes Spiel'}
      </h3>
      <p
        className="text-ink-soft flex-grow"
        style={{
          fontSize: featured ? '1rem' : '0.925rem',
          lineHeight: 1.55,
          display: '-webkit-box',
          WebkitLineClamp: featured ? 5 : 3,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
          marginBottom: 0,
        }}
      >
        {game.beschreibung || 'Beschreibung folgt.'}
      </p>
      <span
        className="mt-4 inline-flex items-center gap-1 font-hand opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ fontSize: '1.05rem', color: palette.text }}
      >
        mehr lesen
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="transition-transform group-hover:translate-x-0.5">
          <path d="M1 5 L 13 5 M9 1 L 13 5 L 9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </motion.button>
  );
}

function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,20,16,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-paper-soft rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 24px 80px -20px rgba(26,20,16,0.45)' }}
      >
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition-colors rounded-full p-2 hover:bg-ink/5"
            aria-label="Schließen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-8 pb-10">{children}</div>
      </div>
    </div>
  );
}

export function SpieleSection({ games, loading = false, error = null }: SpieleSectionProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  return (
    <>
      <SectionWrapper id="spiele" bgColor="bg-paper-warm" padding="lg" grain>
        <PageHeader
          badge="Zehn Stationen — ein großer Tag"
          title="Was die Kinder erwartet"
          subtitle="Von Zielwerfen bis Schatzsuche: ein Parcours, der seit Jahrzehnten begeistert — und bei jedem Kind einen Sieger feiert."
          highlightWordIndex={1}
          highlightVariant="highlighter"
        />

        {loading ? (
          <div className="max-w-4xl mx-auto bg-paper-soft rounded-3xl p-12 text-center">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="h-12 w-12 bg-melsdorf-green/20 rounded-full" />
              <div className="h-4 w-48 bg-melsdorf-green/20 rounded" />
              <p className="text-ink-muted mt-4">Spiele werden geladen…</p>
            </div>
          </div>
        ) : error ? (
          <div className="max-w-4xl mx-auto text-center bg-melsdorf-red/10 rounded-2xl p-8 border border-melsdorf-red/20">
            <p className="text-melsdorf-red-dark font-medium">{error}</p>
          </div>
        ) : games.length === 0 ? (
          <div className="max-w-4xl mx-auto bg-paper-soft rounded-3xl p-12 text-center text-ink-muted">
            <p>Noch keine Spiele hinterlegt.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-5 max-w-6xl mx-auto auto-rows-[minmax(200px,auto)]">
            {games.map((game, index) => (
              <div
                key={game.id}
                className={`col-span-2 ${bentoSpans[index % bentoSpans.length]}`}
              >
                <GameCard
                  game={game}
                  index={index}
                  onClick={setSelectedGame}
                  featured={index === 0}
                />
              </div>
            ))}
          </div>
        )}

        {/* Regel-Hinweis */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div
            className="relative flex items-start gap-5 px-6 py-6 md:px-10 md:py-8"
            style={{
              background: 'var(--color-paper-soft)',
              border: '1px solid color-mix(in srgb, var(--color-melsdorf-green) 22%, transparent)',
              borderLeft: '4px solid var(--color-melsdorf-green)',
              borderRadius: '1rem',
            }}
          >
            <HandDrawnArrow
              variant="right-curved"
              color="var(--color-melsdorf-green)"
              width={70}
              height={28}
              className="flex-shrink-0 mt-2 hidden md:block"
            />
            <div>
              <h3
                className="font-display text-ink mb-2"
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  fontVariationSettings: '"SOFT" 40, "opsz" 48',
                }}
              >
                So gibt es Punkte
              </h3>
              <p className="text-ink-soft" style={{ fontSize: '1rem', lineHeight: 1.6, marginBottom: 0 }}>
                In jedem Spiel erhalten die besten zehn Kinder Punkte — von 10 bis 1. Am Ende werden pro Klasse die Punkte addiert: Das Mädchen und der Junge mit den meisten Punkten werden <span className="marker-highlight">Königin und König</span> ihrer Klasse. Alle Klassen bekommen einen gemeinsamen Klassenausflug; die „Schulis" aus dem Kindergarten eine kleine Aufmerksamkeit.
              </p>
            </div>
          </div>
        </div>
      </SectionWrapper>

      <Modal isOpen={selectedGame !== null} onClose={() => setSelectedGame(null)}>
        {selectedGame && (
          <div>
            <div className="flex items-start gap-4 mb-6">
              <div
                className="flex-shrink-0 inline-flex items-center justify-center"
                style={{
                  width: '4.5rem',
                  height: '4.5rem',
                  borderRadius: '1rem',
                  background: 'color-mix(in srgb, var(--color-melsdorf-green) 12%, var(--color-paper-soft))',
                  color: 'var(--color-melsdorf-green)',
                }}
              >
                <GameIcon name={iconForGame(selectedGame.name)} size={44} />
              </div>
              <div>
                <h3
                  className="font-display text-ink mb-1"
                  style={{
                    fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                    fontWeight: 600,
                    lineHeight: 1.15,
                    fontVariationSettings: '"SOFT" 60, "opsz" 96',
                  }}
                >
                  {selectedGame.name}
                </h3>
                <p className="font-hand text-melsdorf-red" style={{ fontSize: '1.1rem', marginBottom: 0 }}>
                  So wird gespielt
                </p>
              </div>
            </div>
            <p className="text-ink-soft" style={{ fontSize: '1.0625rem', lineHeight: 1.65 }}>
              {selectedGame.beschreibung || 'Keine Beschreibung verfügbar.'}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
