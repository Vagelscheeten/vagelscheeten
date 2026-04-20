import React from 'react';
import Link from 'next/link';

export default function Impressum() {
  return (
    <div className="bg-white py-16">
      <div className="container max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-primary mb-8">Impressum</h1>
        
        <div className="prose prose-lg max-w-none">
          <h2>Angaben gemäß § 5 TMG:</h2>

          <p>
            Planungsteam Vogelschießen der Regenbogenschule Melsdorf<br />
            Regenbogenschule Melsdorf<br />
            Dorfstraße 13<br />
            24109 Melsdorf
          </p>

          <h3>Ansprechpartnerin:</h3>
          <p>Johanna Gawlich</p>

          <h3>Kontakt:</h3>
          <p>
            E-Mail: <a href="mailto:orgateam@vagelscheeten.de" className="text-primary hover:underline">orgateam@vagelscheeten.de</a>
          </p>

          <h3>Inhaltlich verantwortlich gemäß § 55 Abs. 2 RStV:</h3>
          <p>
            Johanna Gawlich<br />
            Regenbogenschule Melsdorf<br />
            Dorfstraße 13<br />
            24109 Melsdorf
          </p>
          
          <h2>Haftungsausschluss:</h2>
          <p>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. 
            Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
          </p>
          
          <div className="mt-12">
            <Link href="/" className="text-primary hover:underline">
              ← Zurück zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
