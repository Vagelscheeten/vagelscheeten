"use client";

import { useEffect, useState } from 'react';

// Standard-URLs für die Karte und den Button
const DEFAULT_EMBED_URL = "https://www.google.com/maps/embed?pb=!1m34!1m12!1m3!1d2354.0551075371126!2d9.9732873!3d54.3206726!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m19!3e2!4m5!1s0x47b2560d6b48f96f%3A0xc7a544eed7e3c6f6!2sRegenbogenschule%20Melsdorf%2C%20Schulstra%C3%9Fe%2C%20Melsdorf!3m2!1d54.3206726!2d9.9732873!4m5!1s0x47b256120d4f8a33%3A0x5bea2ad88c011a0!2sKarweg%2C%20Melsdorf!3m2!1d54.3201271!2d9.9782661!4m5!1s0x47b2560d6b48f96f%3A0xc7a544eed7e3c6f6!2sRegenbogenschule%20Melsdorf%2C%20Schulstra%C3%9Fe%2C%20Melsdorf!3m2!1d54.3206726!2d9.9732873!5e0!3m2!1sde!2sde!4v1714422794000!5m2!1sde!2sde";
const DEFAULT_ROUTE_URL = "https://www.google.com/maps/dir/Regenbogenschule+Melsdorf,+Schulstra%C3%9Fe,+Melsdorf/Karweg,+Melsdorf/Regenbogenschule+Melsdorf,+Schulstra%C3%9Fe,+Melsdorf/@54.3203999,9.9732873,17z/";

export function RouteMap() {
  return (
    <div className="relative w-full h-full">
      <img 
        src="/images/route-map.png" 
        alt="Umzugsroute durch Melsdorf" 
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute bottom-2 right-2 bg-white/80 text-xs text-gray-600 px-1 py-0.5 rounded">
        © Google Maps
      </div>
    </div>
  );
}

export function RouteButton() {
  const [routeUrl, setRouteUrl] = useState(DEFAULT_ROUTE_URL);

  useEffect(() => {
    // Versuche, die gespeicherte Route-URL aus dem localStorage zu laden
    try {
      const savedRouteUrl = localStorage.getItem('routeUrl');
      if (savedRouteUrl) {
        setRouteUrl(savedRouteUrl);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Route-URL:", error);
    }
  }, []);

  return (
    <a 
      href={routeUrl}
      target="_blank" 
      rel="noopener noreferrer"
      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-300 flex items-center"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12 1.586l-4 4V10h2.586l4-4L12 1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 001 1h14a1 1 0 001-1V4a1 1 0 00-1-1H3.707zM4 5h12v8H4V5z" clipRule="evenodd" />
      </svg>
      Route in Google Maps öffnen
    </a>
  );
}
