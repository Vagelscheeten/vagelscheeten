import React from 'react';

export default function AdminHome() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-2">Admin-Bereich</h1>
      <p className="mb-6">Hier verwaltest du alle organisatorischen Bereiche des Vogelschießens.</p>
      <ul className="list-disc ml-6 space-y-2">
        <li><b>Kinder & Gruppen</b></li>
        <li><b>Spieleverwaltung</b></li>
        <li><b>Helferverwaltung</b></li>
        <li><b>Sponsoring</b></li>
        <li><b>Auswertung & Administration</b></li>
        <li><b>Reporting & Statistiken</b></li>
      </ul>
      <p className="mt-8 text-gray-500">(Navigation zu den Modulen folgt)</p>
    </main>
  );
}
