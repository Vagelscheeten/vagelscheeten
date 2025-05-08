'use client';

import React, { useState } from 'react';

// Akkordeon-Komponente
const Accordion = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border rounded-lg mb-2 overflow-hidden">
      <button
        className={`w-full p-4 text-left font-medium flex justify-between items-center ${isOpen ? 'bg-blue-50' : 'bg-white'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <span className="text-xl">{isOpen ? '−' : '+'}</span>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 p-4 bg-white' : 'max-h-0'}`}
      >
        {children}
      </div>
    </div>
  );
};

// FAQ-Kategorien und Fragen
const faqData = [
  {
    category: 'Allgemeine Informationen',
    items: [
      {
        question: 'Was ist das Vogelschießen?',
        answer: 'Das Vogelschießen ist ein traditionelles Schulfest der Regenbogenschule Melsdorf, bei dem die Kinder an verschiedenen Spielstationen teilnehmen. Es hat seinen Ursprung in alten Schützenfesten und wird seit 1952 jährlich gefeiert. Am Ende werden in jeder Klassenstufe ein König (bester Junge) und eine Königin (bestes Mädchen) gekürt.'
      },
      {
        question: 'Wann und wo findet das Vogelschießen statt?',
        answer: 'Das Vogelschießen findet am Samstag, den 14. Juni 2025, auf dem Gelände der Regenbogenschule Melsdorf statt. Die Veranstaltung beginnt um 9:00 Uhr und endet gegen 16:00 Uhr.'
      },
      {
        question: 'Wer darf teilnehmen?',
        answer: 'Alle Schülerinnen und Schüler der Regenbogenschule Melsdorf dürfen am Vogelschießen teilnehmen. Die Teilnahme ist kostenlos.'
      }
    ]
  },
  {
    category: 'Organisatorisches',
    items: [
      {
        question: 'Was passiert bei Regen?',
        answer: 'Das Vogelschießen findet auch bei leichtem Regen statt. Bitte geben Sie Ihrem Kind entsprechende Kleidung mit. Bei starkem Regen werden einige Aktivitäten in die Sporthalle oder Klassenräume verlegt. Nur bei extremen Wetterverhältnissen würde die Veranstaltung verschoben werden, worüber wir Sie rechtzeitig informieren würden.'
      },
      {
        question: 'Was sollen die Kinder mitbringen?',
        answer: 'Die Kinder sollten folgendes mitbringen:\n- Wetterfeste Kleidung (je nach Wetterlage)\n- Sonnenschutz (Kappe, Sonnencreme)\n- Eine Trinkflasche mit Wasser\n- Ggf. ein kleines Taschengeld für den Kuchenverkauf (max. 5 Euro)\n\nBitte verzichten Sie auf wertvolle Gegenstände, da wir keine Haftung übernehmen können.'
      },
      {
        question: 'Wie läuft die Betreuung?',
        answer: 'Die Kinder werden in Gruppen eingeteilt und von Lehrkräften sowie freiwilligen Helfern betreut. Jede Spielstation wird von mindestens einem Erwachsenen beaufsichtigt. Während des Umzugs werden die Kinder von mehreren Betreuern begleitet. Eltern dürfen gerne den ganzen Tag über anwesend sein, sind aber nicht zur Betreuung verpflichtet.'
      },
      {
        question: 'Wer darf zuschauen?',
        answer: 'Eltern, Geschwister, Großeltern und andere Angehörige sind herzlich eingeladen, das Vogelschießen als Zuschauer zu begleiten. Besonders zur Siegerehrung um 15:00 Uhr freuen wir uns über viele Zuschauer.'
      }
    ]
  },
  {
    category: 'Spiele & Wertung',
    items: [
      {
        question: 'Welche Spiele gibt es?',
        answer: 'Es gibt verschiedene Spielstationen wie Armbrustschießen, Bälletransport, Figurenwerfen, Fischstechen, Glücksrad, Gummistiefelweitwurf, Schatzsuche und Roller-Rennen. Die genaue Auswahl kann je nach Klassenstufe variieren. Eine vollständige Übersicht finden Sie auf der Spiele-Seite.'
      },
      {
        question: 'Wie werden die Königspaare ermittelt?',
        answer: 'Die Kinder sammeln bei jedem Spiel Punkte basierend auf ihrer Platzierung. Am Ende werden die Gesamtpunkte addiert. Der Junge und das Mädchen mit den meisten Punkten in jeder Klassenstufe werden zum König bzw. zur Königin gekürt.'
      },
      {
        question: 'Bekommen alle Kinder einen Preis?',
        answer: 'Ja, jedes Kind erhält eine Teilnahmeurkunde und eine kleine Überraschung. Die Königspaare erhalten zusätzlich eine Krone und einen besonderen Preis.'
      }
    ]
  },
  {
    category: 'Verpflegung & Unterstützung',
    items: [
      {
        question: 'Gibt es Essen und Trinken vor Ort?',
        answer: 'Ja, es gibt einen Kuchenverkauf mit Kaffee und kalten Getränken sowie einen Grillstand mit Würstchen zur Mittagszeit. Die Einnahmen kommen der Schule zugute.'
      },
      {
        question: 'Wie kann ich als Elternteil unterstützen?',
        answer: 'Wir freuen uns über Kuchenspenden, Hilfe beim Auf- und Abbau sowie Unterstützung bei der Betreuung der Spielstationen. Bitte melden Sie sich bei Interesse im Sekretariat oder über das Kontaktformular auf unserer Website.'
      },
      {
        question: 'Können Unternehmen das Vogelschießen unterstützen?',
        answer: 'Ja, wir freuen uns über Sponsoren, die unser Vogelschießen unterstützen möchten. Als Gegenleistung bieten wir Werbemöglichkeiten vor Ort und auf unserer Website. Weitere Informationen finden Sie auf der Sponsoren-Seite oder kontaktieren Sie uns direkt.'
      }
    ]
  }
];

export default function FAQ() {
  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">❓ FAQ & Elterninfos</h1>
        <p className="text-lg text-gray-700">
          Hier finden Sie Antworten auf häufig gestellte Fragen und wichtige Informationen 
          rund um das Vogelschießen der Regenbogenschule Melsdorf.
        </p>
      </div>
      
      {/* Suchfunktion könnte hier implementiert werden */}
      
      {/* FAQ-Kategorien */}
      <div className="space-y-8">
        {faqData.map((category, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-blue-800">{category.category}</h2>
            <div className="space-y-2">
              {category.items.map((item, itemIndex) => (
                <Accordion key={itemIndex} title={item.question}>
                  <p className="text-gray-700 whitespace-pre-line">{item.answer}</p>
                </Accordion>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Kontaktbereich */}
      <div className="mt-12 bg-blue-50 rounded-lg p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Weitere Fragen?</h2>
        <p className="mb-6">
          Wenn Sie weitere Fragen haben, zögern Sie nicht, uns zu kontaktieren. 
          Wir helfen Ihnen gerne weiter!
        </p>
        <a 
          href="/kontakt" 
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          Kontakt aufnehmen
        </a>
      </div>
    </main>
  );
}
