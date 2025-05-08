'use client';

import React, { useState, useEffect } from 'react';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  // Überprüfen, ob der Button angezeigt werden soll
  useEffect(() => {
    const toggleVisibility = () => {
      // Button anzeigen, wenn mehr als 300px gescrollt wurde
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Event-Listener für das Scroll-Event hinzufügen
    window.addEventListener('scroll', toggleVisibility);

    // Cleanup beim Unmount
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // Funktion zum sanften Scrollen nach oben
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-red-500 hover:bg-red-600 text-white rounded-full p-3 shadow-lg transition-all duration-300 hover:shadow-xl z-50 transform hover:scale-110"
          aria-label="Nach oben scrollen"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 15l7-7 7 7" 
            />
          </svg>
        </button>
      )}
    </>
  );
}
