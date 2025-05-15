import React from 'react';

export default function FAQ() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-2">❓ FAQ & Elterninfos</h1>
      <p>Antworten auf häufige Fragen und wichtige Hinweise für Eltern.</p>
      <ul className="list-disc ml-6 mt-4">
        <li>Was passiert bei Regen?</li>
        <li>Was sollen die Kinder mitbringen?</li>
        <li>Wie läuft die Betreuung?</li>
        <li>Wer darf zuschauen?</li>
      </ul>
      <p className="mt-4 text-gray-500">(Weitere Fragen und Elterninfos folgen ...)</p>
    </main>
  );
}
