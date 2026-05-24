/* eslint-disable */
// Einmal-Skript zum Versand einer Test-Benachrichtigung.
// Aufruf: node --env-file=.env.local --import tsx scripts/test-mail.ts
// Nach erfolgreichem Test bitte löschen.

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const TARGET_EMAIL = 'matthias.gawlich@gmail.com';
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

  const { data: anmeldung } = await supabaseAdmin
    .from('anmeldungen')
    .select('id, kind_vorname, kind_nachname, kind_klasse, eltern_email, weitere_kinder_json')
    .eq('event_id', event.id)
    .eq('verifiziert', true)
    .ilike('eltern_email', 'matthias.gawlich%')
    .order('erstellt_am', { ascending: false })
    .limit(1)
    .single();
  if (!anmeldung) throw new Error('Keine Anmeldung gefunden');

  const { data: kind } = await supabaseAdmin
    .from('kinder')
    .select('id')
    .eq('event_id', event.id)
    .ilike('vorname', anmeldung.kind_vorname)
    .ilike('nachname', anmeldung.kind_nachname)
    .limit(1)
    .single();

  const familienZuteilungen: { titel: string; beschreibung: string | null; zeitfenster: string }[] = [];
  if (kind) {
    const { data: treffer } = await supabaseAdmin
      .from('helfer_zuteilungen')
      .select('zeitfenster, aufgabe:helferaufgaben(titel, beschreibung)')
      .eq('event_id', event.id)
      .eq('kind_id', kind.id);
    for (const z of treffer || []) {
      const a: any = Array.isArray(z.aufgabe) ? z.aufgabe[0] : z.aufgabe;
      familienZuteilungen.push({
        titel: a?.titel || 'Helfer',
        beschreibung: a?.beschreibung || null,
        zeitfenster: formatZeitfenster(z.zeitfenster),
      });
    }
  }
  if (familienZuteilungen.length === 0) {
    familienZuteilungen.push({ titel: 'Helfer', beschreibung: null, zeitfenster: '' });
  }

  const weitereKinder: any[] = (anmeldung.weitere_kinder_json as any[]) || [];
  let kindIdentifier = `${anmeldung.kind_nachname}, ${anmeldung.kind_vorname} (${anmeldung.kind_klasse})`;
  if (weitereKinder.length > 0) {
    kindIdentifier += weitereKinder.map((k) => ` + ${k.nachname}, ${k.vorname} (${k.klasse})`).join('');
  }
  const { data: alleEssensspenden } = await supabaseAdmin
    .from('essensspenden_rueckmeldungen')
    .select('kind_identifier, menge, anmerkung, spende:spende_id(titel)')
    .eq('event_id', event.id)
    .eq('bestaetigt', true);
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
  const aufgabenBlock = familienZuteilungen.map((z, i) => `<table style="width: 100%; border-collapse: collapse; font-size: 14px;${i > 0 ? ' margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e2e8f0;' : ''}"><tr><td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">${familienZuteilungen.length > 1 ? `${i + 1}. Aufgabe:` : 'Aufgabe:'}</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(z.titel)}</td></tr>${z.beschreibung ? `<tr><td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Details:</td><td style="padding: 8px 0;">${escapeHtml(z.beschreibung)}</td></tr>` : ''}${z.zeitfenster ? `<tr><td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Zeitfenster:</td><td style="padding: 8px 0; font-weight: 600;">${z.zeitfenster}</td></tr>` : ''}</table>`).join('');
  const essensspendenBlock = kindEssensspenden.length > 0
    ? `<table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;"><tr><td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">${kindEssensspenden.length === 1 ? 'Essensspende:' : 'Essensspenden:'}</td><td style="padding: 8px 0;"><ul style="margin: 0; padding-left: 18px;">${kindEssensspenden.map((e: any) => { const sp = Array.isArray(e.spende) ? e.spende[0] : e.spende; return `<li>${e.menge}&times; ${escapeHtml(sp?.titel || 'Essensspende')}</li>`; }).join('')}</ul></td></tr></table>`
    : '';
  const aufgabenIntro = familienZuteilungen.length > 1
    ? `Folgende ${familienZuteilungen.length} Aufgaben wurden zugeteilt:`
    : 'Folgende Aufgabe wurde zugeteilt:';
  const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;"><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"><div style="background: #fff3cd; border: 1px solid #f0c14b; padding: 10px 14px; border-radius: 8px; font-size: 13px; color: #7a5b00; margin-bottom: 16px;"><strong>TEST-MAIL</strong> — kein automatischer Versand. Daten von Anmeldung ${escapeHtml(anmeldung.kind_nachname)} (${anmeldung.eltern_email}).</div><h2 style="color: #F2A03D;">Helfer-Zuteilung beim ${FEST_DATUM}</h2><p>Hallo!</p><p>Vielen Dank für die Anmeldung als Helfer beim ${FEST_DATUM} (${weitereKinder.length > 0 ? 'Kinder' : 'Kind'}: <strong>${kindName}</strong>, Klasse ${escapeHtml(anmeldung.kind_klasse)}${weitereKinder.map((k) => `; <strong>${escapeHtml(k.vorname)} ${escapeHtml(k.nachname)}</strong>, Klasse ${escapeHtml(k.klasse)}`).join('')}).</p><p>${aufgabenIntro}</p><div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">${aufgabenBlock}${essensspendenBlock}</div>${mitbringHtml}${ablaufHtml}<p style="margin-top: 28px;">Vielen Dank für die Unterstützung!</p><p style="font-size: 14px;">Bei Fragen: <a href="mailto:orgateam@vagelscheeten.de" style="color: #2563eb;">orgateam@vagelscheeten.de</a></p><hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;"><p style="color: #999; font-size: 12px;">Diese E-Mail wurde automatisch versendet.</p></div></body></html>`;

  console.log(`Sende Test-Mail an ${TARGET_EMAIL}…`);
  console.log(`  Anmeldung: ${anmeldung.kind_vorname} ${anmeldung.kind_nachname} (${anmeldung.eltern_email})`);
  console.log(`  Aufgaben (${familienZuteilungen.length}): ${familienZuteilungen.map((z) => `${z.titel} [${z.zeitfenster || '–'}]`).join(', ')}`);
  console.log(`  Mitbringliste-Einträge: ${mitbringEintraege?.length || 0}`);
  console.log(`  Ablauf-Einträge: ${ablaufEintraege?.length || 0}`);
  console.log(`  PDF: ${mitbringPdfUrl ?? '(keiner)'}`);

  const result = await resend.emails.send({
    from: ABSENDER,
    to: [TARGET_EMAIL],
    subject: `[TEST] Helfer-Zuteilung beim ${FEST_DATUM} (${weitereKinder.length > 0 ? `Familie ${anmeldung.kind_nachname}` : kindName})`,
    html: htmlBody,
  });
  console.log('Resend-Antwort:', JSON.stringify(result, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
