import { escapeHtml } from '@/lib/email-utils';
import type { SupabaseClient } from '@supabase/supabase-js';

const FEST_DATUM = process.env.FEST_DATUM || 'Melsdörper Vagelscheeten';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vagelscheeten.de';
const STARTSEITE_URL = `${BASE_URL.replace(/\/$/, '')}/startseite`;

interface MitbringEintrag {
  kategorie: string;
  zielgruppe: string;
  inhalt: string;
  sortierung: number;
}

interface AblaufEintrag {
  uhrzeit: string;
  titel: string;
  beschreibung: string | null;
  ist_highlight: boolean | null;
}

const KATEGORIE_LABEL: Record<string, string> = {
  vormittag: 'Spiele am Vormittag',
  nachmittag: 'Fest am Nachmittag',
};

export interface AnmeldungMail {
  id: string;
  kind_vorname: string;
  kind_nachname: string;
  kind_klasse: string;
  eltern_email: string | null;
  weitere_kinder_json: { vorname: string; nachname: string; klasse: string }[] | null;
}

export interface EmailKontext {
  zuteilungen: any[];
  alleEssensspenden: any[];
  kinder: { id: string; vorname: string; nachname: string; klasse?: string }[];
  mitbringHtml: string;
  ablaufHtml: string;
}

function formatZeitfenster(z: string): string {
  if (z === 'vormittag') return 'Vormittags';
  if (z === 'nachmittag') return 'Nachmittags';
  if (z === 'beides') return 'Ganztägig';
  return z;
}

function renderMitbringliste(eintraege: MitbringEintrag[], pdfUrl: string | null): string {
  if (eintraege.length === 0 && !pdfUrl) return '';

  const gruppen: Record<string, MitbringEintrag[]> = {};
  for (const e of eintraege) {
    if (!gruppen[e.kategorie]) gruppen[e.kategorie] = [];
    gruppen[e.kategorie].push(e);
  }

  const kategorienReihenfolge = ['vormittag', 'nachmittag'];
  const gruppenHtml = kategorienReihenfolge
    .filter((k) => gruppen[k]?.length > 0)
    .map((k) => {
      const rows = gruppen[k]
        .map(
          (e) => `
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #64748b; vertical-align: top; white-space: nowrap; font-weight: 600;">${escapeHtml(e.zielgruppe)}</td>
              <td style="padding: 4px 0; vertical-align: top;">${escapeHtml(e.inhalt)}</td>
            </tr>`,
        )
        .join('');
      return `
        <div style="margin-bottom: 14px;">
          <div style="font-size: 13px; font-weight: 600; color: #F2A03D; margin-bottom: 6px;">${escapeHtml(KATEGORIE_LABEL[k] || k)}</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">${rows}</table>
        </div>`;
    })
    .join('');

  const pdfBlock = pdfUrl
    ? `<p style="margin: 12px 0 0; font-size: 14px;">
        <a href="${pdfUrl}" style="color: #2563eb; text-decoration: underline;">Mitbringliste als PDF herunterladen</a> &mdash; zum Ausdrucken oder Speichern.
      </p>`
    : '';

  return `
    <h3 style="color: #F2A03D; margin: 28px 0 8px;">Mitbringliste</h3>
    <p style="margin: 0 0 12px; font-size: 14px;">Folgendes ist am Festtag von allen mitzubringen:</p>
    <div style="background: #fff; border: 1px solid #e2e8f0; padding: 16px 20px; border-radius: 8px;">
      ${gruppenHtml}
    </div>
    ${pdfBlock}
  `;
}

function renderAblauf(eintraege: AblaufEintrag[]): string {
  if (eintraege.length === 0) return '';

  const rows = eintraege
    .map(
      (e) => `
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #64748b; vertical-align: top; white-space: nowrap; font-weight: 600;">${escapeHtml(e.uhrzeit)}</td>
          <td style="padding: 4px 0; vertical-align: top;">
            <span style="${e.ist_highlight ? 'font-weight: 600;' : ''}">${escapeHtml(e.titel)}</span>
            ${e.beschreibung ? `<br><span style="font-size: 13px; color: #64748b;">${escapeHtml(e.beschreibung)}</span>` : ''}
          </td>
        </tr>`,
    )
    .join('');

  return `
    <h3 style="color: #F2A03D; margin: 28px 0 8px;">Ablaufplan</h3>
    <div style="background: #fff; border: 1px solid #e2e8f0; padding: 16px 20px; border-radius: 8px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">${rows}</table>
    </div>
    <p style="margin: 12px 0 0; font-size: 14px;">
      Aktueller Stand jederzeit unter <a href="${STARTSEITE_URL}" style="color: #2563eb; text-decoration: underline;">vagelscheeten.de</a> &mdash; falls sich kurzfristig etwas ändert.
    </p>
  `;
}

/**
 * Lädt alle event-weiten Daten, die für jede Helfer-Mail identisch sind
 * (Zuteilungen, Essensspenden, Mitbringliste, Tagesablauf).
 */
export async function loadEmailKontext(
  supabaseAdmin: SupabaseClient,
  eventId: string,
): Promise<EmailKontext> {
  const [zuteilungenRes, essensspendenRes, kinderRes, mitbringRes, ablaufRes, eventRes] =
    await Promise.all([
      supabaseAdmin
        .from('helfer_zuteilungen')
        .select(`
          kind_id, zeitfenster,
          aufgabe:helferaufgaben(titel, beschreibung),
          zeitslot:helferaufgabe_zeitslots(titel, standort, start_zeit, end_zeit)
        `)
        .eq('event_id', eventId),
      supabaseAdmin
        .from('essensspenden_rueckmeldungen')
        .select('kind_identifier, menge, anmerkung, spende:spende_id(titel)')
        .eq('event_id', eventId)
        .eq('bestaetigt', true),
      supabaseAdmin
        .from('kinder')
        .select('id, vorname, nachname, klasse')
        .eq('event_id', eventId),
      supabaseAdmin
        .from('mitbringliste_eintraege')
        .select('kategorie, zielgruppe, inhalt, sortierung')
        .eq('event_id', eventId)
        .order('kategorie')
        .order('sortierung'),
      supabaseAdmin
        .from('ablauf_eintraege')
        .select('uhrzeit, titel, beschreibung, ist_highlight')
        .eq('event_id', eventId)
        .order('sortierung'),
      supabaseAdmin
        .from('events')
        .select('mitbringliste_pdf_filename')
        .eq('id', eventId)
        .single(),
    ]);

  const mitbringPdfUrl = eventRes.data?.mitbringliste_pdf_filename
    ? supabaseAdmin.storage
        .from('downloads')
        .getPublicUrl(eventRes.data.mitbringliste_pdf_filename).data.publicUrl
    : null;

  const mitbringHtml = renderMitbringliste(
    (mitbringRes.data || []) as MitbringEintrag[],
    mitbringPdfUrl,
  );
  const ablaufHtml = renderAblauf((ablaufRes.data || []) as AblaufEintrag[]);

  return {
    zuteilungen: zuteilungenRes.data || [],
    alleEssensspenden: essensspendenRes.data || [],
    kinder: kinderRes.data || [],
    mitbringHtml,
    ablaufHtml,
  };
}

export interface BuiltEmail {
  subject: string;
  html: string;
  to: string;
  kindName: string;
  hatZuteilung: boolean;
}

/**
 * Baut Betreff + HTML-Body für eine konkrete Anmeldung.
 */
export function buildEmailFuerAnmeldung(
  anmeldung: AnmeldungMail,
  kontext: EmailKontext,
): BuiltEmail {
  const kind = kontext.kinder.find(
    (k) =>
      k.vorname.toLowerCase() === anmeldung.kind_vorname.toLowerCase() &&
      k.nachname.toLowerCase() === anmeldung.kind_nachname.toLowerCase(),
  );

  const familienZuteilungen: {
    titel: string;
    beschreibung: string | null;
    zeitfenster: string;
    slotTitel: string | null;
    slotStandort: string | null;
    slotZeit: string | null;
  }[] = [];

  if (kind) {
    const treffer = kontext.zuteilungen.filter((z) => z.kind_id === kind.id);
    for (const z of treffer) {
      const aufgabe = Array.isArray(z.aufgabe) ? z.aufgabe[0] : z.aufgabe;
      const slot: any = Array.isArray(z.zeitslot) ? z.zeitslot[0] : z.zeitslot;
      const slotZeit =
        slot?.start_zeit && slot?.end_zeit
          ? `${String(slot.start_zeit).substring(0, 5)} bis ${String(slot.end_zeit).substring(0, 5)} Uhr`
          : null;
      familienZuteilungen.push({
        titel: aufgabe?.titel || 'Helfer',
        beschreibung: aufgabe?.beschreibung || null,
        zeitfenster: formatZeitfenster(z.zeitfenster),
        slotTitel: slot?.titel || null,
        slotStandort: slot?.standort || null,
        slotZeit,
      });
    }
  }

  const hatZuteilung = familienZuteilungen.length > 0;
  if (!hatZuteilung) {
    familienZuteilungen.push({
      titel: 'Helfer',
      beschreibung: null,
      zeitfenster: '',
      slotTitel: null,
      slotStandort: null,
      slotZeit: null,
    });
  }

  const kindName = `${escapeHtml(anmeldung.kind_vorname)} ${escapeHtml(anmeldung.kind_nachname)}`;
  const weitereKinder = anmeldung.weitere_kinder_json || [];

  let kindIdentifier = `${anmeldung.kind_nachname}, ${anmeldung.kind_vorname} (${anmeldung.kind_klasse})`;
  if (weitereKinder.length > 0) {
    kindIdentifier += weitereKinder
      .map((k) => ` + ${k.nachname}, ${k.vorname} (${k.klasse})`)
      .join('');
  }
  const kindEssensspenden = kontext.alleEssensspenden.filter(
    (e) => e.kind_identifier === kindIdentifier,
  );

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
    <h2 style="color: #F2A03D;">Helfer-Zuteilung beim ${FEST_DATUM}</h2>

    <p>Hallo!</p>

    <p>Vielen Dank für die Anmeldung als Helfer beim ${FEST_DATUM} (${weitereKinder.length > 0 ? 'Kinder' : 'Kind'}: <strong>${kindName}</strong>, Klasse ${escapeHtml(anmeldung.kind_klasse)}${weitereKinder.map((k) => `; <strong>${escapeHtml(k.vorname)} ${escapeHtml(k.nachname)}</strong>, Klasse ${escapeHtml(k.klasse)}`).join('')}).</p>

    <p>${familienZuteilungen.length > 1 ? `Folgende ${familienZuteilungen.length} Aufgaben wurden` : 'Folgende Aufgabe wurde'} zugeteilt:</p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      ${familienZuteilungen
        .map(
          (z, i) => `
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;${i > 0 ? ' margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e2e8f0;' : ''}">
          <tr>
            <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">${familienZuteilungen.length > 1 ? `${i + 1}. Aufgabe:` : 'Aufgabe:'}</td>
            <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(z.titel)}${z.slotStandort ? ` <span style="color: #64748b; font-weight: 400;">(${escapeHtml(z.slotStandort)})</span>` : ''}</td>
          </tr>
          ${z.beschreibung
            ? `
          <tr>
            <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Details:</td>
            <td style="padding: 8px 0;">${escapeHtml(z.beschreibung)}</td>
          </tr>`
            : ''}
          ${z.slotZeit
            ? `
          <tr>
            <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Einsatz-Zeit:</td>
            <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(z.slotZeit)}${z.slotTitel ? ` <span style="color: #64748b; font-weight: 400;">(${escapeHtml(z.slotTitel)})</span>` : ''}</td>
          </tr>`
            : z.zeitfenster
              ? `
          <tr>
            <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Zeitfenster:</td>
            <td style="padding: 8px 0; font-weight: 600;">${z.zeitfenster}</td>
          </tr>`
              : ''}
        </table>
      `,
        )
        .join('')}
      ${kindEssensspenden.length > 0
        ? `
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">${kindEssensspenden.length === 1 ? 'Essensspende:' : 'Essensspenden:'}</td>
            <td style="padding: 8px 0;">
              <ul style="margin: 0; padding-left: 18px;">${kindEssensspenden
                .map((e) => {
                  const spende = Array.isArray(e.spende) ? e.spende[0] : e.spende;
                  return `<li>${e.menge}&times; ${escapeHtml(spende?.titel || 'Essensspende')}</li>`;
                })
                .join('')}</ul>
            </td>
          </tr>
        </table>`
        : ''}
    </div>

    ${kontext.mitbringHtml}
    ${kontext.ablaufHtml}

    <p style="margin-top: 28px;">Vielen Dank für die Unterstützung!</p>

    <p style="font-size: 14px;">Bei Fragen: <a href="mailto:orgateam@vagelscheeten.de" style="color: #2563eb;">orgateam@vagelscheeten.de</a></p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">
      Diese E-Mail wurde automatisch versendet.
    </p>
  </div>
</body>
</html>`;

  const subject = `Helfer-Zuteilung beim ${FEST_DATUM} (${weitereKinder.length > 0 ? `Familie ${anmeldung.kind_nachname}` : `${anmeldung.kind_vorname} ${anmeldung.kind_nachname}`})`;

  return {
    subject,
    html,
    to: anmeldung.eltern_email || '',
    kindName: `${anmeldung.kind_vorname} ${anmeldung.kind_nachname}`,
    hatZuteilung,
  };
}
