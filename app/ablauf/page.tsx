import React from 'react';

export default function AblaufUndUmzug() {
  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">🗺️ Ablauf & Umzug</h1>
        <p className="text-lg text-gray-700">
          Hier findest du alle Informationen zum zeitlichen Ablauf des Vogelschießens, 
          zur Umzugsroute und zu wichtigen Hinweisen für Anwohner.
        </p>
      </div>
      
      {/* Tagesablauf */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <span className="mr-2">⏰</span> Tagesablauf
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-blue-50 text-blue-800">
                <th className="py-3 px-4 text-left font-semibold">Uhrzeit</th>
                <th className="py-3 px-4 text-left font-semibold">Programmpunkt</th>
                <th className="py-3 px-4 text-left font-semibold">Ort</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-3 px-4 font-medium">09:00 Uhr</td>
                <td className="py-3 px-4">Einlass & Begrüßung</td>
                <td className="py-3 px-4">Schulhof</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">09:30 Uhr</td>
                <td className="py-3 px-4">Beginn der Spiele</td>
                <td className="py-3 px-4">Verschiedene Stationen</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">11:00 Uhr</td>
                <td className="py-3 px-4">Festumzug durch Melsdorf</td>
                <td className="py-3 px-4">Start: Schulhof</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">12:00 Uhr</td>
                <td className="py-3 px-4">Mittagspause mit Verpflegung</td>
                <td className="py-3 px-4">Schulhof / Mensa</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">13:00 Uhr</td>
                <td className="py-3 px-4">Fortsetzung der Spiele</td>
                <td className="py-3 px-4">Verschiedene Stationen</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">15:00 Uhr</td>
                <td className="py-3 px-4">Königsproklamation & Siegerehrung</td>
                <td className="py-3 px-4">Schulhof</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">16:00 Uhr</td>
                <td className="py-3 px-4">Ende der Veranstaltung</td>
                <td className="py-3 px-4">Schulhof</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          (Der genaue Ablauf kann variieren – aktuelle Informationen erhalten Sie am Veranstaltungstag)
        </p>
      </div>
      
      {/* Umzugsroute */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <span className="mr-2">🚍</span> Umzugsroute
        </h2>
        <p className="mb-6 text-gray-700">
          Der traditionelle Festumzug startet um 11:00 Uhr am Schulhof und führt durch Melsdorf. 
          Die Route ist auf der Karte markiert. Der Umzug dauert ca. 45 Minuten.
        </p>
        
        {/* Google Maps Einbettung */}
        <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden mb-6">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2344.0731833493877!2d9.9583!3d54.3173!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47b2560b27760a9d%3A0xdf5dfa7d52055a0e!2sRegenbogenschule%20Melsdorf!5e0!3m2!1sde!2sde!4v1683730000000!5m2!1sde!2sde" 
            width="100%" 
            height="450" 
            style={{ border: 0 }} 
            allowFullScreen 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            className="rounded-lg"
            title="Umzugsroute Vogelschießen"
          />
        </div>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <h3 className="font-bold text-yellow-800">Hinweise für Anwohner</h3>
          <p className="text-yellow-700">
            Während des Umzugs kann es zu kurzzeitigen Verkehrsbehinderungen kommen. 
            Die Straßen werden nicht gesperrt, aber wir bitten um Rücksichtnahme auf den Festumzug. 
            Die Hauptstraße, Dorfstraße und Schulstraße sind zwischen 11:00 und 12:00 Uhr betroffen.
          </p>
        </div>
      </div>
      
      {/* Weitere Informationen */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Weitere Informationen</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Bei Regen findet das Vogelschießen trotzdem statt (ggf. in der Sporthalle)</li>
          <li>Eltern sind herzlich eingeladen, den Tag zu begleiten</li>
          <li>Für Verpflegung ist gesorgt (Kaffee, Kuchen, Grillwürstchen)</li>
          <li>Bitte achten Sie auf wetterfeste Kleidung der Kinder</li>
          <li>Parken ist auf dem Parkplatz der Schule und in den umliegenden Straßen möglich</li>
        </ul>
      </div>
    </main>
  );
}
