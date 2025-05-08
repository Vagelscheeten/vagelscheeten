# Vogelschießen Webapp

## 🎯 Zielbild
Die App soll die gesamte Organisation und Durchführung des jährlichen Vogelschießens für Kinder (Schulis bis Klasse 4) digital unterstützen – von der Planung über die Spielauswertung bis hin zur Öffentlichkeitsdarstellung.

---

## 👤 Benutzerrollen & Zugriff
| Rolle      | Beschreibung                                                                 |
|------------|------------------------------------------------------------------------------|
| 🌐 Besucher | Öffentlich, nicht eingeloggt. Sie sehen nur das Frontend (Infos, Galerie usw.) |
| 🛠️ Admin    | Eingeloggte Nutzer via Supabase Auth. Sie haben Zugriff auf alle Verwaltungsfunktionen |
| 🧢 Leiter   | Spielleiter. Kein Supabase-Login, sondern Zugang per Direktlink (QR-Code). Können Ergebnisse für ihre Gruppe erfassen |

---

## 🧱 Modulübersicht

### 1. 🔐 Authentifizierung & Benutzerprofil
- Supabase Auth für Admins
- Profil mit Nickname, Avatar, Name
- Einstellungsseite für Benutzer
- Kein Login für Leiter – stattdessen dedizierter Link je Gruppe

### 2. 🧒 Kinder- & Gruppenverwaltung
- Excel-Import oder Formular-Eingabe (inkl. Geschlecht "Junde", "Mädchen")
- Es gibt nur klassen und dazu Spielgruppen. Je Klasse kann es mehrere Spielgruppen geben.
- mobil-freundliche Gruppenzuweisung
- Kinder verschieben oder löschen
- Mehrere Gruppen pro Klasse definierbar
- Kinder aus Vorjahr übernehmen --> In dem Fall alle Kinder um eine Klasse nach oben verschieben (Schuli -> Klasse 1, Klasse 1a -> Klasse 2a, etc.) --> Klasse 4 -->  Entfernen

### 3. 🎯 Spieleverwaltung
- Spielname, Zielbeschreibung, Spielort, Regeln
- Spiele bestimmten Klassen zuordnen
- Einheitlicher Spielekatalog je Klasse - auch, wenn es mehrere Spielgruppen je Klasse gibt.

### 4. 📝 Spielergebnisseingabe (mobil optimiert)
- Nur per Link für Spielleiter zugänglich (kein Login)
- Eingabe je Spielgruppe, Spiel, Kind
- Automatische Punktevergabe nach Rangprinzip (z. B. 10–1)
- Gleichstände erkennen und korrekt bewerten
- Möglichkeit zur Korrektur, Ergänzung, Hinzufügen während der Veranstaltung

### 5. 🧑‍🔧 Helferverwaltung
- Liste vordefinierter Aufgaben (z. B. Aufbau, Cafeteria, Spielebetreuung, Spenden)
- Personen zu Schichten oder Aufgaben zuweisen
- Status (offen, besetzt) & Kontaktmöglichkeit
- Übersicht für die gesamte Helferplanung

### 6. 💌 Sponsoring & Serienanschreiben
- Sponsoren-Kontaktverwaltung
- Textbausteine für Serienanschreiben
- PDF-Erstellung & Export für Druck oder Versand
- Nachverfolgung: zugesagt / offen / abgelehnt

### 7. 📊 Auswertung & Administration
- Live-Übersicht der Ergebnisse pro Spiel & Gruppe
- Nachträgliche Bearbeitung, manuelle Punktkorrektur
- Kinder oder Gruppen nachträglich hinzufügen
- König/Königin automatisch berechnen pro Klassenstufe

### 8. 📈 Reporting & Statistiken
- Übersicht nach Gruppen, Spielen, Klassenstufen
- Exportmöglichkeiten (CSV, PDF)
- Highlighting: Top-Ergebnisse, Vergleiche, Beteiligung

### 9. 🌍 Öffentliches Frontend
- Responsive Seitenstruktur mit Navigation
- Unterseiten:
  - Spieleübersicht (öffentlich)
  - Historie des Vogelschießens
  - Galerie (Bilder, z. B. via Upload)
  - Informationen für Eltern / Besucher
  - Sponsorenübersicht (Logo + Info)
  - Kontakt & Impressum

---

## ✅ Ziel
**Einfache Bedienung, klar getrennte Bereiche, vollständige Übersicht – mobil & Desktop**

---

## ℹ️ Hinweise
- Die App befindet sich in aktiver Entwicklung. Nicht alle Module sind bereits umgesetzt.
- Für Feedback, Vorschläge oder Bugs bitte Issues im Repository nutzen.

---

## 👨‍💻 Setup & Entwicklung
_(Hier kannst du noch technische Hinweise, Installationsanleitung, .env-Beispiele etc. ergänzen)_

```bash
# Beispiel: Lokales Setup
npm install
npm run dev
```

---

**Copyright ©️ Vogelschießen-Team**
