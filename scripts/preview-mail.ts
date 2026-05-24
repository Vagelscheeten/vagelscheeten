/* eslint-disable */
// Sendet die Helfer-Bestätigungs-Mail im Live-Layout (ohne TEST-Banner, ohne [TEST]-Subject)
// an eine konfigurierbare Empfänger-Adresse — Daten werden aus einer beliebigen Anmeldung gezogen.
//
// Konfiguration via ENV-Variablen:
//   PREVIEW_TO=matthias.gawlich@gmail.com       → Empfänger der Vorschau
//   PREVIEW_NACHNAME=Trautmann                  → Familien-Nachname für die Datenquelle
// (Falls mehrere Anmeldungen passen: die neueste verifizierte gewinnt.)
//
// Aufruf:
//   PREVIEW_TO=matthias.gawlich@gmail.com PREVIEW_NACHNAME=Trautmann \
//     npx tsx --env-file=.env.local scripts/preview-mail.ts
//
// WICHTIG: Die Mail geht NUR an PREVIEW_TO, NICHT an die echte eltern_email der Quell-Anmeldung.
// benachrichtigt_am wird NICHT in der DB gesetzt.

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const TARGET_EMAIL = process.env.PREVIEW_TO || 'matthias.gawlich@gmail.com';
const SOURCE_NACHNAME = process.env.PREVIEW_NACHNAME || 'Gawlich';
const ABSENDER = process.env.HELFER_EMAIL_FROM || 'Orgateam Vagelscheeten <orgateam@vagelscheeten.de>';
const FEST_DATUM = process.env.FEST_DATUM || 'Melsdörper Vagelscheeten';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vagelscheeten.de';
const STARTSEITE_URL = `${BASE_URL.replace(/\/$/, '')}/startseite`;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function formatZeitfenster(z: string): string {
  if (z === 'vormittag') return 'Vormittags';
  if (z === 'nachmittag') return 'Nachmittags';
  if (z === 'beides') return 'Ganztägig';
  return z;
}

const KATEGORIE_LABEL: Record<string, string> = {
  vormittag: 'Spiele am Vormittag',
  nachmittag: 'Fest am Nachmittag',
};

function renderMitbringliste(eintraege: any[], pdfUrl: string | null): string {
  if (eintraege.length === 0 && !pdfUrl) return '';
  const gruppen: Record<string, any[]> = {};
  for (const e of eintraege) {
    if (!gruppen[e.kategorie]) gruppen[e.kategorie] = [];
    gruppen[e.kategorie].push(e);
  }
  const gruppenHtml = ['vormittag', 'nachmittag']
    .filter((k) => gruppen[k]?.length > 0)
    .map((k) => {
      const rows = gruppen[k]
        .map((e) => `<tr><td style="padding: 4px 12px 4px 0; color: #64748b; vertical-align: top; white-space: nowrap; font-weight: 600;">${escapeHtml(e.zielgruppe)}</td><td style="padding: 4px 0; vertical-align: top;">${escapeHtml(e.inhalt)}</td></tr>`)
        .join('');
      return `<div style="margin-bottom: 14px;"><div style="font-size: 13px; font-weight: 600; color: #F2A03D; margin-bottom: 6px;">${escapeHtml(KATEGORIE_LABEL[k] || k)}</div><table style="width: 100%; border-collapse: collapse; font-size: 14px;">${rows}</table></div>`;
    })
    .join('');
  const pdfBlock = pdfUrl
    ? `<p style="margin: 12px 0 0; font-size: 14px;"><a href="${pdfUrl}" style="color: #2563eb; text-decoration: underline;">Mitbringliste als PDF herunterladen</a> &mdash; zum Ausdrucken oder Speichern.</p>`
    : '';
  return `<h3 style="color: #F2A03D; margin: 28px 0 8px;">Mitbringliste</h3><p style="margin: 0 0 12px; font-size: 14px;">Folgendes ist am Festtag von allen mitzubringen:</p><div style="background: #fff; border: 1px solid #e2e8f0; padding: 16px 20px; border-radius: 8px;">${gruppenHtml}</div>${pdfBlock}`;
}

function renderAblauf(eintraege: any[]): string {
  if (eintraege.length === 0) return '';
  const rows = eintraege
    .map((e) => `<tr><td style="padding: 4px 12px 4px 0; color: #64748b; vertical-align: top; white-space: nowrap; font-weight: 600;">${escapeHtml(e.uhrzeit)}</td><td style="padding: 4px 0; vertical-align: top;"><span style="${e.ist_highlight ? 'font-weight: 600;' : ''}">${escapeHtml(e.titel)}</span>${e.beschreibung ? `<br><span style="font-size: 13px; color: #64748b;">${escapeHtml(e.beschreibung)}</span>` : ''}</td></tr>`)
    .join('');
  return `<h3 style="color: #F2A03D; margin: 28px 0 8px;">Ablaufplan</h3><div style="background: #fff; border: 1px solid #e2e8f0; padding: 16px 20px; border-radius: 8px;"><table style="width: 100%; border-collapse: collapse; font-size: 14px;">${rows}</table></div><p style="margin: 12px 0 0; font-size: 14px;">Aktueller Stand jederzeit unter <a href="${STARTSEITE_URL}" style="color: #2563eb; text-decoration: underline;">vagelscheeten.de</a> &mdash; falls sich kurzfristig etwas ändert.</p>`;
}

async function main() {
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, name, mitbringliste_pdf_filename')
    .eq('ist_aktiv', true)
    .single();
  if (!event) throw new Error('Kein aktives Event');

  // Familie suchen — neueste verifizierte Anmeldung mit dem konfigurierten Nachnamen
  const { data: anmeldung } = await supabaseAdmin
    .from('anmeldungen')
    .select('id, kind_vorname, kind_nachname, kind_klasse, eltern_email, weitere_kinder_json')
    .eq('event_id', event.id)
    .eq('verifiziert', true)
    .ilike('kind_nachname', SOURCE_NACHNAME)
    .order('verifiziert_am', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!anmeldung) throw new Error(`Keine verifizierte Anmeldung für Nachname "${SOURCE_NACHNAME}" gefunden`);

  const { data: kind } = await supabaseAdmin
    .from('kinder')
    .select('id')
    .eq('event_id', event.id)
    .ilike('vorname', anmeldung.kind_vorname)
    .ilike('nachname', anmeldung.kind_nachname)
    .limit(1)
    .maybeSingle();

  const familienZuteilungen: {
    titel: string; beschreibung: string | null; zeitfenster: string;
    slotTitel: string | null; slotStandort: string | null; slotZeit: string | null;
  }[] = [];
  if (kind) {
    const { data: treffer } = await supabaseAdmin
      .from('helfer_zuteilungen')
      .select('zeitfenster, aufgabe:helferaufgaben(titel, beschreibung), zeitslot:helferaufgabe_zeitslots(titel, standort, start_zeit, end_zeit)')
      .eq('event_id', event.id)
      .eq('kind_id', kind.id);
    for (const z of treffer || []) {
      const a: any = Array.isArray(z.aufgabe) ? z.aufgabe[0] : z.aufgabe;
      const slot: any = Array.isArray((z as any).zeitslot) ? (z as any).zeitslot[0] : (z as any).zeitslot;
      const slotZeit = slot?.start_zeit && slot?.end_zeit
        ? `${String(slot.start_zeit).substring(0, 5)} bis ${String(slot.end_zeit).substring(0, 5)} Uhr`
        : null;
      familienZuteilungen.push({
        titel: a?.titel || 'Helfer',
        beschreibung: a?.beschreibung || null,
        zeitfenster: formatZeitfenster(z.zeitfenster),
        slotTitel: slot?.titel || null,
        slotStandort: slot?.standort || null,
        slotZeit,
      });
    }
  }
  if (familienZuteilungen.length === 0) {
    familienZuteilungen.push({ titel: 'Helfer', beschreibung: null, zeitfenster: '', slotTitel: null, slotStandort: null, slotZeit: null });
  }

  const weitereKinder: any[] = (anmeldung.weitere_kinder_json as any[]) || [];
  let kindIdentifier = `${anmeldung.kind_nachname}, ${anmeldung.kind_vorname} (${anmeldung.kind_klasse})`;
  if (weitereKinder.length > 0) {
    kindIdentifier += weitereKinder.map((k) => ` + ${k.nachname}, ${k.vorname} (${k.klasse})`).join('');
  }
  const { data: alleEssensspenden } = await supabaseAdmin
    .from('essensspenden_rueckmeldungen')
    .select('kind_identifier, menge, anmerkung, spende:spende_id(titel)')
    .eq('event_id', event.id);
  const kindEssensspenden = (alleEssensspenden || []).filter((e) => e.kind_identifier === kindIdentifier);

  const { data: mitbringEintraege } = await supabaseAdmin
    .from('mitbringliste_eintraege')
    .select('kategorie, zielgruppe, inhalt, sortierung')
    .eq('event_id', event.id)
    .order('kategorie')
    .order('sortierung');

  const { data: ablaufEintraege } = await supabaseAdmin
    .from('ablauf_eintraege')
    .select('uhrzeit, titel, beschreibung, ist_highlight')
    .eq('event_id', event.id)
    .order('sortierung');

  const mitbringPdfUrl = event.mitbringliste_pdf_filename
    ? supabaseAdmin.storage.from('downloads').getPublicUrl(event.mitbringliste_pdf_filename).data.publicUrl
    : null;

  const mitbringHtml = renderMitbringliste(mitbringEintraege || [], mitbringPdfUrl);
  const ablaufHtml = renderAblauf(ablaufEintraege || []);

  const kindName = `${escapeHtml(anmeldung.kind_vorname)} ${escapeHtml(anmeldung.kind_nachname)}`;
  const aufgabenBlock = familienZuteilungen.map((z, i) => {
    const zeitZeile = z.slotZeit
      ? `<tr><td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Einsatz-Zeit:</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(z.slotZeit)}${z.slotTitel ? ` <span style="color: #64748b; font-weight: 400;">(${escapeHtml(z.slotTitel)})</span>` : ''}</td></tr>`
      : z.zeitfenster
        ? `<tr><td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Zeitfenster:</td><td style="padding: 8px 0; font-weight: 600;">${z.zeitfenster}</td></tr>`
        : '';
    const aufgabeWert = `${escapeHtml(z.titel)}${z.slotStandort ? ` <span style="color: #64748b; font-weight: 400;">(${escapeHtml(z.slotStandort)})</span>` : ''}`;
    return `<table style="width: 100%; border-collapse: collapse; font-size: 14px;${i > 0 ? ' margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e2e8f0;' : ''}"><tr><td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">${familienZuteilungen.length > 1 ? `${i + 1}. Aufgabe:` : 'Aufgabe:'}</td><td style="padding: 8px 0; font-weight: 600;">${aufgabeWert}</td></tr>${z.beschreibung ? `<tr><td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Details:</td><td style="padding: 8px 0;">${escapeHtml(z.beschreibung)}</td></tr>` : ''}${zeitZeile}</table>`;
  }).join('');
  const essensspendenBlock = kindEssensspenden.length > 0
    ? `<table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;"><tr><td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">${kindEssensspenden.length === 1 ? 'Essensspende:' : 'Essensspenden:'}</td><td style="padding: 8px 0;"><ul style="margin: 0; padding-left: 18px;">${kindEssensspenden.map((e: any) => { const sp = Array.isArray(e.spende) ? e.spende[0] : e.spende; return `<li>${e.menge}&times; ${escapeHtml(sp?.titel || 'Essensspende')}</li>`; }).join('')}</ul></td></tr></table>`
    : '';
  const aufgabenIntro = familienZuteilungen.length > 1
    ? `Folgende ${familienZuteilungen.length} Aufgaben wurden zugeteilt:`
    : 'Folgende Aufgabe wurde zugeteilt:';
  const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;"><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"><h2 style="color: #F2A03D;">Helfer-Zuteilung beim ${FEST_DATUM}</h2><p>Hallo!</p><p>Vielen Dank für die Anmeldung als Helfer beim ${FEST_DATUM} (${weitereKinder.length > 0 ? 'Kinder' : 'Kind'}: <strong>${kindName}</strong>, Klasse ${escapeHtml(anmeldung.kind_klasse)}${weitereKinder.map((k) => `; <strong>${escapeHtml(k.vorname)} ${escapeHtml(k.nachname)}</strong>, Klasse ${escapeHtml(k.klasse)}`).join('')}).</p><p>${aufgabenIntro}</p><div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">${aufgabenBlock}${essensspendenBlock}</div>${mitbringHtml}${ablaufHtml}<p style="margin-top: 28px;">Vielen Dank für die Unterstützung!</p><p style="font-size: 14px;">Bei Fragen: <a href="mailto:orgateam@vagelscheeten.de" style="color: #2563eb;">orgateam@vagelscheeten.de</a></p><hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;"><p style="color: #999; font-size: 12px;">Diese E-Mail wurde automatisch versendet.</p></div></body></html>`;

  console.log(`Sende Vorschau an ${TARGET_EMAIL}`);
  console.log(`  Datenquelle: ${anmeldung.kind_vorname} ${anmeldung.kind_nachname} (Klasse ${anmeldung.kind_klasse})`);
  console.log(`  Eltern-Mail der Quelle: ${anmeldung.eltern_email} (geht NICHT an diese Adresse)`);
  console.log(`  Geschwister: ${weitereKinder.length > 0 ? weitereKinder.map((k) => `${k.vorname} ${k.nachname} (${k.klasse})`).join(', ') : '(keine)'}`);
  console.log(`  Aufgaben (${familienZuteilungen.length}): ${familienZuteilungen.map((z) => `${z.titel}${z.slotStandort ? ` @${z.slotStandort}` : ''} [${z.slotZeit || z.zeitfenster || '–'}]`).join(', ')}`);
  console.log(`  Essensspenden: ${kindEssensspenden.length}`);

  const result = await resend.emails.send({
    from: ABSENDER,
    to: [TARGET_EMAIL],
    subject: `Helfer-Zuteilung beim ${FEST_DATUM} (${weitereKinder.length > 0 ? `Familie ${anmeldung.kind_nachname}` : kindName})`,
    html: htmlBody,
  });
  console.log('Resend-Antwort:', JSON.stringify(result, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
