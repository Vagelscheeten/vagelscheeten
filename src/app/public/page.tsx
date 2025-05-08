import React from 'react';

export default function PublicHome() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-2">Willkommen beim Vogelschießen!</h1>
      <p className="mb-4">Hier findest du alle öffentlichen Infos, Bildergalerien und Kontaktmöglichkeiten.</p>
      <ul className="list-disc ml-6 space-y-2">
        <li><b>Spieleübersicht</b></li>
        <li><b>Historie</b></li>
        <li><b>Galerie</b></li>
        <li><b>Informationen für Eltern/Besucher</b></li>
        <li><b>Sponsorenübersicht</b></li>
        <li><b>Kontakt & Impressum</b></li>
      </ul>
      <p className="mt-8 text-gray-500">(Navigation zu den Unterseiten folgt)</p>
    </main>
  );
}
