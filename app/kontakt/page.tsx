import React from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';

// Typ für einen Ansprechpartner
interface Ansprechpartner {
  id: string;
  name: string;
  rolle?: string;
  email?: string;
  telefon?: string;
  bild_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Fallback-Ansprechpartner, falls keine Daten in der Datenbank vorhanden sind
const fallbackAnsprechpartner: Ansprechpartner[] = [
  { 
    id: '1', 
    name: 'Frau Sabine Müller', 
    rolle: 'Schulleiterin', 
    email: 'schulleitung@regenbogenschule-melsdorf.de', 
    telefon: '04340 / 12345'
  },
  { 
    id: '2', 
    name: 'Herr Thomas Schmidt', 
    rolle: 'Organisator Vogelschießen', 
    email: 'vogelschiessen@regenbogenschule-melsdorf.de', 
    telefon: '04340 / 12346'
  },
  { 
    id: '3', 
    name: 'Förderverein Regenbogenschule', 
    rolle: 'Sponsoring & Unterstützung', 
    email: 'foerderverein@regenbogenschule-melsdorf.de'
  }
];

export default async function Kontakt() {
  // Ansprechpartner aus der Datenbank laden
  const supabase = await createClient();
  const { data: ansprechpartner, error } = await supabase
    .from('ansprechpartner')
    .select('*')
    .order('name');
  
  // Bei Fehler oder leeren Daten die Fallback-Ansprechpartner verwenden
  const kontakte = error || !ansprechpartner || ansprechpartner.length === 0 
    ? fallbackAnsprechpartner 
    : ansprechpartner;
  
  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">📬 Kontakt & Anfahrt</h1>
        <p className="text-lg text-gray-700">
          Fragen, Feedback oder Anregungen zum Vogelschießen? Hier finden Sie alle wichtigen 
          Kontaktinformationen sowie Anfahrtshinweise zur Regenbogenschule Melsdorf.
        </p>
      </div>
      
      {/* Schule & Anfahrt */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <span className="mr-2">🏫</span> Regenbogenschule Melsdorf
        </h2>
        
        <div className="md:flex gap-8">
          <div className="md:w-1/2 mb-6 md:mb-0">
            <div className="prose max-w-none">
              <p className="font-medium">Adresse:</p>
              <p className="mb-4">
                Regenbogenschule Melsdorf<br />
                Schulstraße 1<br />
                24109 Melsdorf
              </p>
              
              <p className="font-medium">Kontakt:</p>
              <p className="mb-4">
                Telefon: 04340 / 40 26 0<br />
                E-Mail: info@regenbogenschule-melsdorf.de<br />
                Website: <a href="https://www.regenbogenschule-melsdorf.de" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.regenbogenschule-melsdorf.de</a>
              </p>
              
              <p className="font-medium">Öffnungszeiten Sekretariat:</p>
              <p>
                Montag - Freitag: 8:00 - 12:00 Uhr<br />
                Donnerstag zusätzlich: 14:00 - 16:00 Uhr
              </p>
            </div>
          </div>
          
          <div className="md:w-1/2">
            <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2344.0731833493877!2d9.9583!3d54.3173!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47b2560b27760a9d%3A0xdf5dfa7d52055a0e!2sRegenbogenschule%20Melsdorf!5e0!3m2!1sde!2sde!4v1683730000000!5m2!1sde!2sde" 
                width="100%" 
                height="300" 
                style={{ border: 0 }} 
                allowFullScreen 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-lg"
                title="Standort Regenbogenschule Melsdorf"
              />
            </div>
            
            <div className="mt-4 bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Anfahrt:</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Mit dem Auto: Parkplätze sind vor der Schule und in den umliegenden Straßen vorhanden</li>
                <li>Mit dem Bus: Linie 501 bis Haltestelle "Melsdorf, Schule"</li>
                <li>Mit dem Fahrrad: Fahrradständer befinden sich auf dem Schulgelände</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Ansprechpartner */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <span className="mr-2">👤</span> Ansprechpartner
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kontakte.map((kontakt) => (
            <div key={kontakt.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start">
                {kontakt.bild_url ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden mr-4 flex-shrink-0">
                    <Image 
                      src={kontakt.bild_url} 
                      alt={kontakt.name} 
                      width={64} 
                      height={64} 
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-2xl">{kontakt.name.charAt(0)}</span>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold text-lg">{kontakt.name}</h3>
                  {kontakt.rolle && <p className="text-sm text-gray-600">{kontakt.rolle}</p>}
                </div>
              </div>
              
              <div className="mt-4 space-y-1 text-sm">
                {kontakt.email && (
                  <p>
                    <span className="font-medium">E-Mail:</span>{' '}
                    <a href={`mailto:${kontakt.email}`} className="text-blue-600 hover:underline">
                      {kontakt.email}
                    </a>
                  </p>
                )}
                
                {kontakt.telefon && (
                  <p>
                    <span className="font-medium">Telefon:</span>{' '}
                    <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`} className="text-blue-600 hover:underline">
                      {kontakt.telefon}
                    </a>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Kontaktformular */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Haben Sie Fragen zum Vogelschießen?</h2>
        <p className="mb-6">
          Wir helfen Ihnen gerne weiter! Kontaktieren Sie uns per E-Mail oder Telefon. 
          Alternativ können Sie auch das Sekretariat der Schule direkt ansprechen.
        </p>
        <div className="flex flex-wrap gap-4">
          <a 
            href="mailto:vogelschiessen@regenbogenschule-melsdorf.de" 
            className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors inline-flex items-center"
          >
            <span className="mr-2">✉️</span> E-Mail senden
          </a>
          <a 
            href="tel:04340402600" 
            className="bg-gray-600 text-white px-6 py-3 rounded-md font-medium hover:bg-gray-700 transition-colors inline-flex items-center"
          >
            <span className="mr-2">📞</span> Anrufen
          </a>
        </div>
      </div>
    </main>
  );
}
