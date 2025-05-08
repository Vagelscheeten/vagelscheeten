"use client";

import React from 'react';
import Image from 'next/image';

// Typ für die Spieldaten
type Game = {
  id: number;
  titel: string;
  ziel: string;
  ort: string;
  regeln: string;
  icon?: string;
  bild?: string;
};

interface GameCardProps {
  game: Game;
  onClick: (game: Game) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  // Standardbild für Spiele ohne eigenes Bild
  const defaultImage = '/images/game-default.jpg';
  
  return (
    <div 
      className="bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer"
      onClick={() => onClick(game)}
    >
      <div className="aspect-[4/3] relative bg-gray-100">
        {game.bild ? (
          <Image 
            src={game.bild} 
            alt={game.titel}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-5xl text-gray-300">
              {game.icon ? (
                <span>{game.icon}</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-1">{game.titel}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">
          {game.ziel ? game.ziel : 'Klicke für mehr Details'}
        </p>
        <div className="mt-3 flex justify-end">
          <span className="text-sm font-medium text-green-600 hover:text-green-700">
            Details anzeigen
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
