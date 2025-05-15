import React from 'react';
import Link from 'next/link';

export default function Datenschutz() {
  return (
    <div className="bg-white py-16">
      <div className="container max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-primary mb-8">Datenschutzerklärung</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="lead">
            Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen. Wir verarbeiten Ihre Daten daher ausschließlich auf Grundlage der gesetzlichen Bestimmungen (DSGVO, TMG). In dieser Datenschutzerklärung informieren wir Sie über die wichtigsten Aspekte der Datenverarbeitung im Rahmen unserer Website.
          </p>
          
          <hr className="my-8" />
          
          <h2>1. Kontakt mit uns</h2>
          <p>
            Wenn Sie per Formular auf der Website Kontakt mit uns aufnehmen, werden Ihre angegebenen Daten (Name, E-Mail-Adresse, Nachricht) zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
          </p>
          <p>
            Die Übermittlung erfolgt per E-Mail an:<br />
            📧 <strong>orgateam@vagelscheeten.de</strong>
          </p>
          
          <hr className="my-8" />
          
          <h2>2. Verwendung von Google Maps</h2>
          <p>
            Diese Website verwendet Google Maps zur Darstellung eines Lageplans. Anbieter ist:
          </p>
          <p>
            <strong>Google Ireland Limited</strong><br />
            Gordon House, Barrow Street, Dublin 4, Irland
          </p>
          <p>
            Zur Nutzung der Funktionen von Google Maps ist es notwendig, Ihre IP-Adresse zu speichern. Diese Informationen werden in der Regel an einen Server von Google in den USA übertragen und dort gespeichert. Der Websitebetreiber hat keinen Einfluss auf diese Datenübertragung.
          </p>
          <p>
            Die Nutzung von Google Maps erfolgt im Interesse einer ansprechenden Darstellung und leichter Auffindbarkeit der auf der Website angegebenen Orte.
          </p>
          <p>
            Weitere Informationen finden Sie in der Datenschutzerklärung von Google:<br />
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              https://policies.google.com/privacy
            </a>
          </p>
          
          <hr className="my-8" />
          
          <h2>3. Verwendung von Google Fonts</h2>
          <p>
            Auf dieser Website werden <strong>Google Fonts lokal eingebunden</strong>. Dadurch findet kein automatischer Datentransfer an Google-Server statt. Es werden <strong>keine personenbezogenen Daten an Google übermittelt</strong>.
          </p>
          
          <hr className="my-8" />
          
          <h2>4. Ihre Rechte</h2>
          <p>
            Ihnen stehen grundsätzlich die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerruf und Widerspruch zu.
          </p>
          <p>
            Wenn Sie glauben, dass die Verarbeitung Ihrer Daten gegen das Datenschutzrecht verstößt oder Ihre datenschutzrechtlichen Ansprüche sonst in einer Weise verletzt worden sind, können Sie sich bei der zuständigen Aufsichtsbehörde beschweren.
          </p>
          <p>
            Zuständige Aufsichtsbehörde ist:<br />
            <strong>Unabhängiges Landeszentrum für Datenschutz Schleswig-Holstein (ULD)</strong><br />
            Holstenstraße 98, 24103 Kiel<br />
            <a href="https://www.datenschutzzentrum.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              www.datenschutzzentrum.de
            </a>
          </p>
          
          <hr className="my-8" />
          
          <h2>5. Verantwortlicher für die Datenverarbeitung</h2>
          <p>
            Förderverein Regenbogenschule Strohbrück e.V.<br />
            Mönkbergseck 27<br />
            24107 Quarnbek<br />
            📧 <a href="mailto:orgateam@vagelscheeten.de" className="text-primary hover:underline">orgateam@vagelscheeten.de</a>
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
