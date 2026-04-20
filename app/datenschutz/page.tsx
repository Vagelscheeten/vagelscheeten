import React from 'react';
import Link from 'next/link';

export default function Datenschutz() {
  return (
    <div className="bg-white py-16">
      <div className="container max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-primary mb-8">Datenschutzerklärung</h1>

        <div className="prose prose-lg max-w-none">
          <p className="lead">
            Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen. Wir verarbeiten Ihre Daten ausschließlich auf Grundlage der gesetzlichen Bestimmungen (DSGVO, BDSG, TMG/TTDSG). In dieser Datenschutzerklärung informieren wir Sie über Art, Umfang und Zweck der Verarbeitung personenbezogener Daten auf dieser Website.
          </p>

          <hr className="my-8" />

          <h2>1. Verantwortlicher</h2>
          <p>
            Verantwortlich im Sinne der DSGVO ist:
          </p>
          <p>
            <strong>Planungsteam Vogelschießen der Regenbogenschule Melsdorf</strong><br />
            c/o Regenbogenschule Melsdorf<br />
            Dorfstraße 13<br />
            24109 Melsdorf<br />
            Ansprechpartnerin: Johanna Gawlich<br />
            📧 <a href="mailto:orgateam@vagelscheeten.de" className="text-primary hover:underline">orgateam@vagelscheeten.de</a>
          </p>

          <hr className="my-8" />

          <h2>2. Anmeldung zum Vogelschießen</h2>
          <p>
            Über das Anmeldeformular erheben wir folgende personenbezogene Daten:
          </p>
          <ul>
            <li><strong>Eltern / Erziehungsberechtigte:</strong> Vor- und Nachname, E-Mail-Adresse, Telefonnummer</li>
            <li><strong>Kind(er):</strong> Vor- und Nachname, Klasse, Geschlecht</li>
            <li><strong>Angaben zur Helfertätigkeit:</strong> ausgewählte Aufgabe(n), Zeitfenster</li>
            <li><strong>Essensspenden:</strong> ausgewählte Kategorie(n)</li>
          </ul>
          <p>
            <strong>Zweck:</strong> Organisation und Durchführung der Veranstaltung „Vogelschießen der Regenbogenschule Melsdorf", Zuordnung der Kinder zu Spielgruppen, Koordination der Helfenden, Planung der Verpflegung.
          </p>
          <p>
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Durchführung vorvertraglicher bzw. vertragsähnlicher Maßnahmen auf Anfrage der betroffenen Person), ergänzend Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer organisierten und sicheren Durchführung der Veranstaltung). Die Eingabe der Daten erfolgt freiwillig; ohne die Angaben ist eine Teilnahme am Vogelschießen nicht möglich.
          </p>
          <p>
            <strong>Besondere Hinweise zu Kinderdaten:</strong> Die Anmeldung erfolgt durch die Erziehungsberechtigten. Mit der Anmeldung bestätigen die Erziehungsberechtigten ihr Einverständnis mit der Verarbeitung der Daten ihres Kindes zum Zweck der Veranstaltungsdurchführung. Es werden keine besonderen Kategorien personenbezogener Daten nach Art. 9 DSGVO erhoben.
          </p>
          <p>
            <strong>Bestätigungsverfahren (Double-Opt-In):</strong> Nach Absenden des Formulars senden wir eine E-Mail mit einem Bestätigungslink an die angegebene E-Mail-Adresse. Erst nach Klick auf den Link gilt die Anmeldung als bestätigt.
          </p>
          <p>
            <strong>Speicherdauer:</strong> Die im Rahmen der Anmeldung erhobenen Daten werden gespeichert, bis der Zweck der Verarbeitung entfallen ist — spätestens bis zum Abschluss der Veranstaltung und einer kurzen Nachbereitungsphase. Danach werden die Daten gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Einzelne Daten können zu Dokumentationszwecken (z. B. Gewinner:innen) anonymisiert oder pseudonymisiert länger aufbewahrt werden.
          </p>

          <hr className="my-8" />

          <h2>3. Kontaktaufnahme</h2>
          <p>
            Bei Kontaktaufnahme per E-Mail oder über ein Kontaktformular werden Ihre Angaben (Name, E-Mail-Adresse, ggf. weitere von Ihnen mitgeteilte Informationen sowie Ihre Nachricht) zur Bearbeitung der Anfrage und für mögliche Anschlussfragen gespeichert.
          </p>
          <p>
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bearbeitung von Anfragen), bei Anfragen mit Vertragsbezug Art. 6 Abs. 1 lit. b DSGVO.
          </p>
          <p>
            <strong>Speicherdauer:</strong> Die Daten werden gelöscht, sobald sie für die Zweckerreichung nicht mehr erforderlich sind, spätestens nach Abschluss des zugrundeliegenden Vorgangs.
          </p>

          <hr className="my-8" />

          <h2>4. Hosting (Vercel)</h2>
          <p>
            Diese Website wird bei <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA 91723, USA gehostet. Bei jedem Aufruf werden technisch notwendige Zugriffsdaten (insbesondere IP-Adresse, Datum und Uhrzeit, Browsertyp, aufgerufene Ressource) in Server-Logs verarbeitet.
          </p>
          <p>
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der sicheren und stabilen Bereitstellung der Website).
          </p>
          <p>
            <strong>Drittlandübermittlung:</strong> Eine Übermittlung in die USA kann nicht ausgeschlossen werden. Vercel Inc. ist unter dem EU-U.S. Data Privacy Framework (DPF) zertifiziert; ergänzend bestehen Standardvertragsklauseln. Mit dem Anbieter wurde ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO geschlossen.
          </p>
          <p>
            Weitere Informationen: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">vercel.com/legal/privacy-policy</a>
          </p>

          <hr className="my-8" />

          <h2>5. Datenbank und Authentifizierung (Supabase)</h2>
          <p>
            Für die Speicherung der über die Website eingegebenen Daten (Anmeldungen, Kontakte, Bildergalerie, Helferzuteilungen u. a.) sowie für Anmeldevorgänge im Administrationsbereich setzen wir <strong>Supabase</strong> (Supabase, Inc., 970 Toa Payoh North, Singapur 318992) ein.
          </p>
          <p>
            <strong>Zweck:</strong> Sichere und strukturierte Speicherung der für die Veranstaltungsdurchführung erforderlichen Daten sowie Authentifizierung berechtigter Nutzer:innen im Admin- und Leiter-Bereich.
          </p>
          <p>
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b und lit. f DSGVO.
          </p>
          <p>
            <strong>Drittlandübermittlung:</strong> Der konkrete Server-Standort wurde so gewählt, dass die Verarbeitung vorrangig innerhalb der EU erfolgt. Sollte es im Einzelfall zu Übermittlungen außerhalb der EU kommen, bestehen Standardvertragsklauseln nach Art. 46 DSGVO. Mit dem Anbieter wurde ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO geschlossen.
          </p>
          <p>
            Weitere Informationen: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com/privacy</a>
          </p>

          <hr className="my-8" />

          <h2>6. E-Mail-Versand (Resend)</h2>
          <p>
            Zum Versand von Bestätigungs- und Benachrichtigungs-E-Mails setzen wir <strong>Resend</strong> (Resend, Inc., 2261 Market Street #5039, San Francisco, CA 94114, USA) ein. Dabei werden Ihre E-Mail-Adresse sowie die zu versendenden Inhalte verarbeitet.
          </p>
          <p>
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Versand von Bestätigungs- und Abwicklungs-E-Mails im Rahmen der Anmeldung) sowie Art. 6 Abs. 1 lit. f DSGVO (organisatorische Kommunikation).
          </p>
          <p>
            <strong>Drittlandübermittlung:</strong> Mit Resend, Inc. bestehen Standardvertragsklauseln nach Art. 46 DSGVO sowie ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO.
          </p>
          <p>
            Weitere Informationen: <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com/legal/privacy-policy</a>
          </p>

          <hr className="my-8" />

          <h2>7. Cookies und Session-Speicherung</h2>
          <p>
            Diese Website setzt ausschließlich <strong>technisch notwendige Cookies bzw. Session-Speicher</strong> ein, die für den Betrieb der Seite und die Nutzung geschützter Bereiche erforderlich sind:
          </p>
          <ul>
            <li><strong>Admin-Session (Supabase Auth):</strong> ermöglicht die Anmeldung und den Verbleib im Adminbereich.</li>
            <li><strong>Leiter-Session (<code>leiter_session</code>):</strong> signiertes JSON-Web-Token für den Zugang der Spielleiter:innen zur mobilen Ergebniserfassung.</li>
          </ul>
          <p>
            Diese Cookies werden nur gesetzt, wenn Sie sich aktiv anmelden, und sind auf die Dauer der Sitzung bzw. wenige Stunden begrenzt. Eine Einwilligung nach § 25 Abs. 1 TTDSG ist nicht erforderlich, da die Speicherung unbedingt erforderlich ist (§ 25 Abs. 2 Nr. 2 TTDSG). Es werden keine Analyse-, Tracking- oder Marketing-Cookies gesetzt.
          </p>
          <p>
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO i. V. m. § 25 Abs. 2 Nr. 2 TTDSG.
          </p>

          <hr className="my-8" />

          <h2>8. Verwendung von Google Maps</h2>
          <p>
            Diese Website verwendet Google Maps zur Darstellung eines Lageplans und von Routen. Anbieter ist:
          </p>
          <p>
            <strong>Google Ireland Limited</strong><br />
            Gordon House, Barrow Street, Dublin 4, Irland
          </p>
          <p>
            Zur Nutzung der Funktionen von Google Maps ist es notwendig, Ihre IP-Adresse an Google zu übermitteln. Diese Informationen werden in der Regel an einen Server von Google (auch in Drittländer, insbesondere die USA) übertragen und dort gespeichert. Der Websitebetreiber hat keinen Einfluss auf diese Datenübertragung.
          </p>
          <p>
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer ansprechenden Darstellung und leichten Auffindbarkeit der Orte).
          </p>
          <p>
            <strong>Drittlandübermittlung:</strong> Google LLC ist unter dem EU-U.S. Data Privacy Framework zertifiziert.
          </p>
          <p>
            Weitere Informationen in der Datenschutzerklärung von Google:<br />
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">policies.google.com/privacy</a>
          </p>

          <hr className="my-8" />

          <h2>9. Verwendung von Google Fonts</h2>
          <p>
            Auf dieser Website werden Google Fonts <strong>lokal eingebunden</strong> (Self-Hosting über das <code>next/font</code>-Modul). Die Schriftdateien werden beim Erstellen der Website einmalig heruntergeladen und anschließend von unserem Server ausgeliefert.
          </p>
          <p>
            <strong>Es findet beim Seitenaufruf kein Datentransfer an Google-Server statt.</strong> Es werden keine personenbezogenen Daten an Google übermittelt und keine Cookies gesetzt.
          </p>

          <hr className="my-8" />

          <h2>10. Ihre Rechte</h2>
          <p>
            Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie betreffenden personenbezogenen Daten:
          </p>
          <ul>
            <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
            <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
            <li>Recht auf Löschung (Art. 17 DSGVO)</li>
            <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Recht auf Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
            <li>Recht auf Widerruf einer erteilten Einwilligung (Art. 7 Abs. 3 DSGVO) mit Wirkung für die Zukunft</li>
          </ul>
          <p>
            Zur Ausübung Ihrer Rechte genügt eine formlose Nachricht an <a href="mailto:orgateam@vagelscheeten.de" className="text-primary hover:underline">orgateam@vagelscheeten.de</a>.
          </p>

          <hr className="my-8" />

          <h2>11. Beschwerderecht bei der Aufsichtsbehörde</h2>
          <p>
            Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten gegen die DSGVO verstößt (Art. 77 DSGVO).
          </p>
          <p>
            Zuständige Aufsichtsbehörde ist:
          </p>
          <p>
            <strong>Unabhängiges Landeszentrum für Datenschutz Schleswig-Holstein (ULD)</strong><br />
            Holstenstraße 98<br />
            24103 Kiel<br />
            <a href="https://www.datenschutzzentrum.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              www.datenschutzzentrum.de
            </a>
          </p>

          <hr className="my-8" />

          <h2>12. Datensicherheit</h2>
          <p>
            Wir treffen angemessene technische und organisatorische Maßnahmen (Art. 32 DSGVO), um Ihre Daten vor unbefugtem Zugriff, Verlust oder Manipulation zu schützen. Die Datenübertragung auf dieser Website erfolgt durchgehend verschlüsselt über HTTPS (TLS).
          </p>

          <hr className="my-8" />

          <h2>13. Änderungen dieser Datenschutzerklärung</h2>
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, sofern dies aufgrund geänderter technischer oder rechtlicher Rahmenbedingungen erforderlich wird. Die jeweils aktuelle Version ist auf dieser Seite abrufbar.
          </p>
          <p className="text-sm text-ink-muted">
            Stand: April 2026
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
