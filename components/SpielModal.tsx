'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Spiel, getSpielIcon } from './SpielCard';

interface SpielModalProps {
  spiel: Spiel;
  isOpen: boolean;
  onClose: () => void;
}

const SpielModal: React.FC<SpielModalProps> = ({ spiel, isOpen, onClose }) => {
  if (!isOpen) return null;

  // Verhindere, dass Klicks innerhalb des Modals es schließen
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={handleModalClick}
      >
        {/* Header mit Icon und Titel */}
        <div className="sticky top-0 bg-red-600 text-white p-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center">
            <span className="text-4xl mr-3">{getSpielIcon(spiel)}</span>
            <h2 className="text-2xl font-bold">{spiel.name}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-red-700 rounded-full p-1 transition-colors"
            aria-label="Schließen"
          >
            <X size={24} />
          </button>
        </div>

        {/* Inhalt */}
        <div className="p-6 space-y-6">
          {/* Ort */}
          {spiel.ort && (
            <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6 mb-4 bg-blue-50">
              <h3 className="text-lg font-semibold text-blue-600 flex items-center">
                <span className="mr-2">📍</span> Ort
              </h3>
              <p className="text-gray-700 ml-7">{spiel.ort}</p>
            </div>
          )}

          {/* Ziel */}
          {spiel.ziel && (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 mb-4 bg-red-50">
              <h3 className="text-lg font-semibold text-red-600 flex items-center">
                <span className="mr-2">🎯</span> Ziel
              </h3>
              <p className="text-gray-700 ml-7">{spiel.ziel}</p>
            </div>
          )}

          {/* Beschreibung */}
          {spiel.beschreibung && (
            <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-6 mb-4 bg-yellow-50">
              <h3 className="text-lg font-semibold text-yellow-600 flex items-center">
                <span className="mr-2">📝</span> Beschreibung
              </h3>
              <p className="text-gray-700 ml-7 whitespace-pre-line">{spiel.beschreibung}</p>
            </div>
          )}

          {/* Regeln */}
          {spiel.regeln && (
            <div className="bg-white rounded-lg shadow-sm border border-green-200 p-6 mb-4 bg-green-50">
              <h3 className="text-lg font-semibold text-green-600 flex items-center">
                <span className="mr-2">📋</span> Spielregeln
              </h3>
              <div className="ml-7">
                {/* Prüfen, ob die Regeln als Liste formatiert sind */}
                {spiel.regeln.includes('- ') || spiel.regeln.includes('* ') ? (
                  <ul className="list-disc pl-5 space-y-2 text-gray-700">
                    {spiel.regeln.split('\n').map((regel, index) => {
                      // Entferne Aufzählungszeichen, wenn vorhanden
                      const regelText = regel.replace(/^[-*]\s+/, '').trim();
                      if (regelText) {
                        return <li key={index}>{regelText}</li>;
                      }
                      return null;
                    }).filter(Boolean)}
                  </ul>
                ) : (
                  <p className="text-gray-700 whitespace-pre-line">{spiel.regeln}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer mit Schließen-Button */}
        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpielModal;
