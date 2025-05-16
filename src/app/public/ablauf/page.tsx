import React from 'react';

export default function Ablaufplan() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-2">⏰ Ablaufplan</h1>
      <p>Hier findest du den zeitlichen Ablauf des Vogelschießens – vom Einlass bis zur Siegerehrung.</p>
      <ul className="list-disc ml-6 mt-4">
        <li>09:00 Uhr – Einlass & Begrüßung</li>
        <li>09:30 Uhr – Start der Spiele</li>
        <li>12:00 Uhr – Mittagspause</li>
        <li>13:00 Uhr – Fortsetzung der Spiele</li>
        <li>15:00 Uhr – Siegerehrung & Abschluss</li>
      </ul>
      <p className="mt-4 text-gray-500">(Der genaue Ablauf kann variieren – aktuelle Infos am Veranstaltungstag!)</p>
    </main>
  );
}
