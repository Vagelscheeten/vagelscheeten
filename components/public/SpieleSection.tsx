'use client';

import React, { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { SectionWrapper } from './SectionWrapper';
import { PageHeader } from './PageHeader';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

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

const getGameIcon = (game: Game): string => {
  if (game.icon) return game.icon;
  const name = (game.name || '').toLowerCase();
  if (name.includes('schießen') || name.includes('armbrust')) return '🏹';
  if (name.includes('ball') || name.includes('werfen')) return '🎯';
  if (name.includes('fisch')) return '🐟';
  if (name.includes('glücksrad')) return '🎡';
  if (name.includes('stiefel') || name.includes('gummistiefel')) return '👢';
  if (name.includes('schatz')) return '💰';
  if (name.includes('rennen') || name.includes('roller')) return '🛴';
  if (name.includes('draht')) return '⚡';
  if (name.includes('schwamm')) return '🧽';
  if (name.includes('wäsche')) return '👕';
  return '🎮';
};

function GameCard({ game, onClick }: { game: Game; onClick: (game: Game) => void }) {
  const icon = getGameIcon(game);
  return (
    <div
      className="card card-tertiary hover:shadow-lg cursor-pointer transition-all duration-300 hover:-translate-y-2 overflow-hidden group"
      onClick={() => onClick(game)}
    >
      <div className="card-header flex items-center">
        <div className="mr-3 text-3xl bg-pastel-green w-12 h-12 rounded-full flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-tertiary-dark">{game.name || 'Unbenanntes Spiel'}</h3>
      </div>
      <div className="card-body">
        <p className="text-gray-600 line-clamp-3">{game.beschreibung || 'Keine Beschreibung verfügbar'}</p>
      </div>
      <div className="card-footer pt-4 mt-auto flex justify-end">
        <span className="text-tertiary font-medium flex items-center group-hover:translate-x-1 transition-transform">
          Details anzeigen
          <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end p-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function SpieleSection({ games, loading = false, error = null }: SpieleSectionProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  return (
    <>
      <SectionWrapper id="spiele" bgColor="bg-pastel-green/30" className="py-24">
        <PageHeader
          badge="🎮 Spaß für alle"
          title="Unsere Spiele"
          subtitle="Entdecke unsere spannenden Wettbewerbe und Spiele beim diesjährigen Melsdörper Vagelscheeten"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
          {loading ? (
            <div className="col-span-full bg-white rounded-2xl shadow-md p-12 text-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-tertiary/20 rounded-full mb-4" />
                <div className="h-4 w-48 bg-tertiary/20 rounded mb-3" />
                <p className="text-gray-500 mt-4">Spiele werden geladen...</p>
              </div>
            </div>
          ) : error ? (
            <div className="col-span-full text-center bg-red-50 rounded-xl p-8 shadow-sm border border-red-100">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          ) : games.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl shadow-md p-12 text-center">
              <p className="text-gray-500">Keine Spiele gefunden.</p>
            </div>
          ) : (
            games.map((game, index) => (
              <motion.div
                key={game.id}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}
              >
                <GameCard game={game} onClick={setSelectedGame} />
              </motion.div>
            ))
          )}
        </div>

        {/* Spielhinweis */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-8 border-l-4 border-tertiary">
            <div className="flex items-start">
              <div className="text-tertiary mr-4 flex-shrink-0">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Hinweis zu den Spielen</h3>
                <p className="text-gray-600">
                  In jedem Spiel erhalten die besten zehn Kinder Punkte – von 10 bis 1. Am Ende werden pro Klasse die Punkte addiert: Das Mädchen und der Junge mit den meisten Punkten werden Königin und König ihrer Klasse.
                  Alle Klassen erhalten für ihre Teilnahme ein gemeinsames Geschenk – einen individuellen Klassenausflug. Die &quot;Schulis&quot; aus dem Kindergarten bekommen eine kleine Aufmerksamkeit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>

      <Modal isOpen={selectedGame !== null} onClose={() => setSelectedGame(null)}>
        {selectedGame && (
          <div>
            <h3 className="text-2xl font-bold text-tertiary-dark mb-4">{selectedGame.name}</h3>
            <div className="mb-4">
              <h4 className="text-lg font-medium text-gray-800 mb-1">Beschreibung</h4>
              <p className="text-gray-700">{selectedGame.beschreibung || 'Keine Beschreibung verfügbar'}</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
