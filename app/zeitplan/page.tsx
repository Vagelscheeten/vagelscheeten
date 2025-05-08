import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Calendar, Clock } from 'lucide-react';

interface Zeitpunkt {
  id: number;
  zeit: string;
  beschreibung: string;
  wichtig?: boolean;
}

export default async function Zeitplan() {
  const supabase = await createClient();
  
  // In einer echten Anwendung würden diese Daten aus der Datenbank kommen
  // Für jetzt verwenden wir Beispieldaten
  const zeitplan: Zeitpunkt[] = [
    { id: 1, zeit: '10:00', beschreibung: 'Eröffnung des Vogelschießens', wichtig: true },
    { id: 2, zeit: '10:15', beschreibung: 'Start der Spiele für alle Klassen' },
    { id: 3, zeit: '12:00', beschreibung: 'Mittagspause', wichtig: true },
    { id: 4, zeit: '13:00', beschreibung: 'Fortsetzung der Spiele' },
    { id: 5, zeit: '15:00', beschreibung: 'Ende der Spiele' },
    { id: 6, zeit: '15:30', beschreibung: 'Auswertung und Krönung der Königspaare', wichtig: true },
    { id: 7, zeit: '16:30', beschreibung: 'Abschluss und gemeinsames Aufräumen' }
  ];
  
  return (
    <>
      {/* Header-Sektion */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-8 mb-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">Zeitplan</h1>
          <p className="text-lg text-neutral max-w-2xl mx-auto">
            Hier findest du den Zeitplan für das Vogelschießen. Alle wichtigen Ereignisse auf einen Blick.
          </p>
        </div>
      </section>
      
      {/* Zeitplan-Sektion */}
      <section className="mb-12">
        <div className="card border-primary/20 bg-primary/5 mb-8">
          <div className="flex items-center mb-4">
            <Calendar className="text-primary mr-2" />
            <h2 className="text-2xl font-bold text-primary">14. Juni 2025</h2>
          </div>
          <p className="text-neutral">
            Das Vogelschießen findet auf dem Schulhof der Regenbogenschule statt. Bei schlechtem Wetter wird die Veranstaltung in die Turnhalle verlegt.
          </p>
        </div>
        
        <div className="relative">
          {/* Vertikale Zeitlinie */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-primary/20"></div>
          
          {/* Zeitpunkte */}
          {zeitplan.map((punkt, index) => (
            <div 
              key={punkt.id} 
              className={`relative pl-12 pb-8 ${punkt.wichtig ? 'mb-6' : 'mb-4'}`}
            >
              {/* Zeitpunkt-Marker */}
              <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${punkt.wichtig ? 'bg-primary text-white' : 'bg-primary/20 text-primary'}`}>
                <Clock size={16} />
              </div>
              
              {/* Zeitpunkt-Inhalt */}
              <div className={`card ${punkt.wichtig ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <h3 className={`text-xl font-bold ${punkt.wichtig ? 'text-primary' : 'text-neutral'}`}>
                    {punkt.zeit} Uhr
                  </h3>
                  <p className="text-lg text-neutral">{punkt.beschreibung}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Hinweise-Sektion */}
      <section className="mb-12">
        <div className="card border-secondary/20 bg-secondary/5">
          <h2 className="text-2xl font-bold mb-4 text-secondary">Wichtige Hinweise</h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="text-secondary mr-2">✓</span>
              <span>Bitte achten Sie darauf, dass Ihre Kinder pünktlich erscheinen</span>
            </li>
            <li className="flex items-start">
              <span className="text-secondary mr-2">✓</span>
              <span>Für Verpflegung ist gesorgt, aber eigene Getränke sind empfehlenswert</span>
            </li>
            <li className="flex items-start">
              <span className="text-secondary mr-2">✓</span>
              <span>Bei Regen findet die Veranstaltung in die Turnhalle statt</span>
            </li>
            <li className="flex items-start">
              <span className="text-secondary mr-2">✓</span>
              <span>Die Krönung der Königspaare findet für alle Klassen gemeinsam statt</span>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
