import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

// Typ für einen Sponsor aus der Datenbank
interface Sponsor {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
  kategorie?: string;
  created_at?: string;
  updated_at?: string;
}

export default async function Sponsoren() {
  const supabase = await createClient();
  
  // Alle Sponsoren aus der Datenbank laden
  const { data: sponsoren, error } = await supabase
    .from('sponsoren')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Fehler beim Laden der Sponsoren:', error);
  }
  
  // Sponsoren nach Kategorie gruppieren
  const sponsorenByKategorie: Record<string, Sponsor[]> = {};
  
  if (sponsoren) {
    sponsoren.forEach((sponsor: Sponsor) => {
      const kategorie = sponsor.kategorie || 'Sonstige';
      if (!sponsorenByKategorie[kategorie]) {
        sponsorenByKategorie[kategorie] = [];
      }
      sponsorenByKategorie[kategorie].push(sponsor);
    });
  }
  
  // Kategorien in der gewünschten Reihenfolge
  const kategorieOrder = ['Hauptsponsor', 'Gold', 'Silber', 'Bronze', 'Sonstige'];
  
  return (
    <>
      {/* Header-Sektion */}
      <section className="bg-gradient-to-b from-tertiary/10 to-background py-8 mb-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-tertiary mb-4">🤝 Sponsoren & Mitmachen</h1>
          <p className="text-lg text-neutral max-w-2xl mx-auto">
            Ein herzliches Dankeschön an alle Unterstützer des Vogelschießens! 
            Ohne das Engagement unserer Sponsoren wäre dieses traditionelle Fest nicht möglich.
          </p>
        </div>
      </section>
      
      {error && (
        <section className="mb-8">
          <div className="card border-error bg-error/10" role="alert">
            <p className="font-bold text-error">Fehler</p>
            <p>Beim Laden der Sponsoren ist ein Fehler aufgetreten. Bitte versuche es später noch einmal.</p>
          </div>
        </section>
      )}
      
      {/* Call-to-Action */}
      <section className="mb-12">
        <div className="card bg-tertiary text-white">
          <div className="md:flex items-center justify-between">
            <div className="mb-6 md:mb-0 md:mr-8">
              <h2 className="text-2xl font-bold mb-3">Werden Sie Sponsor!</h2>
              <p className="text-white/90 mb-4">
                Unterstützen Sie das Vogelschießen der Regenbogenschule Melsdorf und werden Sie Teil 
                einer langjährigen Tradition. Als Sponsor profitieren Sie von Sichtbarkeit in der Gemeinde 
                und tragen zur Förderung des Gemeinschaftsgefühls bei.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start">
                  <span className="text-white mr-2">✓</span>
                  <span>Präsenz auf unserer Website</span>
                </li>
                <li className="flex items-start">
                  <span className="text-white mr-2">✓</span>
                  <span>Logo auf Veranstaltungsmaterialien</span>
                </li>
                <li className="flex items-start">
                  <span className="text-white mr-2">✓</span>
                  <span>Erwähnung bei der Siegerehrung</span>
                </li>
                <li className="flex items-start">
                  <span className="text-white mr-2">✓</span>
                  <span>Steuerlich absetzbare Spende</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <Link 
                href="/downloads" 
                className="btn btn-light"
              >
                Sponsoring-Paket herunterladen
              </Link>
              <Link 
                href="/kontakt" 
                className="btn btn-light-outline"
              >
                Kontakt aufnehmen
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Sponsoren nach Kategorie */}
      {!error && sponsoren && sponsoren.length > 0 ? (
        <section className="mb-12">
          <div className="space-y-10">
            {kategorieOrder.map(kategorie => {
              if (!sponsorenByKategorie[kategorie] || sponsorenByKategorie[kategorie].length === 0) return null;
              
              return (
                <div key={kategorie} className="card">
                  <h2 className="text-2xl font-bold mb-6 text-tertiary">{kategorie}-Sponsoren</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {sponsorenByKategorie[kategorie].map(sponsor => (
                      <div key={sponsor.id} className="card hover:shadow-md transition-all">
                        {sponsor.logo_url ? (
                          <div className="h-24 w-full relative mb-4 flex items-center justify-center">
                            <Image 
                              src={sponsor.logo_url} 
                              alt={`${sponsor.name} Logo`} 
                              width={120} 
                              height={80} 
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-24 w-full flex items-center justify-center bg-tertiary/10 rounded-md mb-4">
                            <span className="text-tertiary font-medium">{sponsor.name}</span>
                          </div>
                        )}
                        <h3 className="font-semibold text-neutral text-center">{sponsor.name}</h3>
                        {sponsor.website && (
                          <div className="text-center mt-2">
                            <a 
                              href={sponsor.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-tertiary hover:underline"
                            >
                              Website besuchen
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : !error && (
        <section className="mb-12">
          <div className="card text-center">
            <h2 className="text-xl font-semibold mb-4 text-tertiary">Werden Sie unser erster Sponsor!</h2>
            <p className="text-neutral mb-6">
              Aktuell haben wir noch keine Sponsoren für das kommende Vogelschießen. 
              Nutzen Sie die Chance und werden Sie einer unserer ersten Unterstützer!
            </p>
            <div className="flex justify-center">
              <Link 
                href="/kontakt" 
                className="btn btn-tertiary"
              >
                Jetzt Sponsor werden
              </Link>
            </div>
          </div>
        </section>
      )}
      
      {/* Weitere Möglichkeiten zum Mitmachen */}
      <section className="mb-12">
        <div className="card border-accent/20 bg-accent/5">
          <h2 className="text-2xl font-bold mb-6 text-accent">Weitere Möglichkeiten zum Mitmachen</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card hover:border-accent transition-colors">
              <div className="text-3xl mb-3 text-accent">🍳</div>
              <h3 className="text-xl font-semibold mb-2 text-accent">Kuchenspenden</h3>
              <p className="text-neutral">Unterstützen Sie uns mit selbstgebackenen Kuchen oder anderen Leckereien für den Verkauf.</p>
            </div>
            
            <div className="card hover:border-accent transition-colors">
              <div className="text-3xl mb-3 text-accent">💪</div>
              <h3 className="text-xl font-semibold mb-2 text-accent">Helfer werden</h3>
              <p className="text-neutral">Wir freuen uns über Helfer, die bei der Organisation und Durchführung unterstützen.</p>
            </div>
            
            <div className="card hover:border-accent transition-colors">
              <div className="text-3xl mb-3 text-accent">💰</div>
              <h3 className="text-xl font-semibold mb-2 text-accent">Sachspenden</h3>
              <p className="text-neutral">Sachspenden für Preise oder die Tombola sind immer willkommen und werden dankbar angenommen.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
