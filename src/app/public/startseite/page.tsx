import React from 'react';

export default function Startseite() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-2">Willkommen beim Vogelschießen!</h1>
      <p className="mb-4">Das große Kinder-Event: Spaß, Spiele, Gemeinschaft und Tradition. Hier findest du alle wichtigen Informationen rund um das Vogelschießen.</p>
      <ul className="list-disc ml-6 space-y-2">
        <li><b>Alle Spiele & Regeln</b></li>
        <li><b>Ablauf & Zeitplan</b></li>
        <li><b>Sponsoren & Mitmachen</b></li>
        <li><b>FAQ & Elterninfos</b></li>
        <li><b>Galerie & Historie</b></li>
        <li><b>Kontakt & Anfahrt</b></li>
        <li><b>Downloads</b></li>
      </ul>
      <p className="mt-8 text-gray-500">(Nutze das Menü für alle Bereiche – Viel Spaß beim Stöbern!)</p>
    </main>
  );
}
