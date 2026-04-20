# Postfach-Setup

Administrations-Postfach für `orgateam@vagelscheeten.de`. Eingehende Mails werden über Resend-Inbound empfangen, im Admin-Bereich gelistet und können direkt beantwortet werden.

## 1. Voraussetzungen

- Resend-Account mit aktivem Inbound-Feature
- Verifizierte Domain `vagelscheeten.de` in Resend (bereits eingerichtet)
- MX-Records der Domain zeigen auf Resend (bereits eingerichtet)

## 2. Resend-Dashboard konfigurieren

1. **Inbound-Route anlegen** (Resend → *Inbound* → *Add Route*)
   - Empfängeradresse: `orgateam@vagelscheeten.de` (oder Catch-all `*@vagelscheeten.de` nach Geschmack)
   - Destination: **Webhook**
   - Webhook-URL: `https://<prod-domain>/api/inbound/resend`

2. **Webhook-Signing-Secret notieren**
   Resend zeigt bei Einrichtung der Webhook-Route ein Signing-Secret (svix-kompatibel). In den ENV-Variablen setzen (siehe unten).

## 3. Environment-Variablen

Ergänze sowohl lokal in `.env.local` als auch im **Vercel-Projekt** (Settings → Environment Variables, für Production und Preview):

```
RESEND_WEBHOOK_SECRET=<das Signing-Secret aus Schritt 2>
POSTFACH_NOTIFICATION_FROM=Orgateam Vagelscheeten <orgateam@vagelscheeten.de>
NEXT_PUBLIC_SITE_URL=https://vagelscheeten.vercel.app
```

`RESEND_API_KEY` und `SUPABASE_SERVICE_ROLE_KEY` existieren bereits.

## 4. Benachrichtigungsempfänger konfigurieren

- `/admin/postfach/einstellungen` im Admin öffnen
- Mindestens einen Empfänger hinzufügen (App-User oder freie Adresse)
- Inaktiv lassen = Empfänger wird nicht benachrichtigt

## 5. Funktions-Test (Smoketest)

1. **Inbound:** Aus externem Gmail eine Testmail mit kleinem PDF-Anhang an `orgateam@vagelscheeten.de` senden.
   - Vercel-Logs: POST `/api/inbound/resend` gibt 200 zurück
   - Supabase → Tabelle `emails` enthält eine neue Zeile mit `direction='inbound'`
   - Tabelle `email_attachments` hat einen Eintrag mit `storage_path`
   - UI `/admin/postfach` zeigt den Thread fett markiert

2. **Benachrichtigung:** An die konfigurierte Adresse kommt eine Mail mit Betreff `[Postfach] Neue Mail: …` und Link zum Thread.

3. **Detail/Read:** Thread öffnen → er verschwindet aus dem Ungelesen-Filter, `thread.has_unread=false`.

4. **Attachment:** Klick auf Anhang in Detailansicht → Datei wird heruntergeladen (signed URL, 5 min TTL).

5. **Antworten:** Im Composer Antwort mit kleinem Bild-Anhang senden.
   - Gmail empfängt die Antwort mit richtigem Threading (`In-Reply-To` gesetzt)
   - Tabelle `emails` hat neue Zeile `direction='outbound'` im gleichen Thread
   - Attachment-Chip im UI sichtbar

6. **Reply-Threading:** Aus Gmail auf unsere Antwort antworten → neue Inbound-Mail landet im **gleichen** Thread (Thread-Count steigt auf 3).

7. **Idempotenz:** Im Resend-Dashboard die Webhook-Delivery manuell re-senden → keine Duplicate-Rows (die Tabelle `postfach_webhook_events` verhindert das).

8. **Signatur-Check:** `curl -X POST https://<domain>/api/inbound/resend` mit gefälschten Headern → 401.

## 6. Was im MVP nicht enthalten ist

Bewusst ausgeklammert, siehe Plan:

- HTML-Body-Rendering (nur Plain-Text wird angezeigt)
- Volltext-Suche, Labels, Archiv, Ordner
- Spam-Filter / Quarantäne
- Push-Benachrichtigungen, In-App-Badge
- Draft-Speicherung, Forward, Inline-CID-Bilder

## 7. Datenmodell (Kurzfassung)

| Tabelle | Zweck |
|---|---|
| `email_threads` | Thread-Metadaten (Subject, Teilnehmer, Last-Message, Unread-Flag) |
| `emails` | eine Zeile pro Nachricht (Inbound + Outbound) mit `direction`, `message_id`, `in_reply_to`, `references` |
| `email_attachments` | Anhänge, Storage-Path zeigt auf Bucket `postfach-attachments` |
| `postfach_notification_recipients` | konfigurierbare Liste (App-User-Link optional) |
| `postfach_webhook_events` | Idempotenz-Ledger gegen Resend-Retries |

Storage-Bucket: `postfach-attachments` (privat, authenticated-read, Service-Role-write).
