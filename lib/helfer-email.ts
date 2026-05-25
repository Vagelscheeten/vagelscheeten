import { escapeHtml } from '@/lib/email-utils';
import { buildKinderIndex, findKindInIndex, type KindLite } from '@/lib/helfer-utils';
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
        .select('kind_identifier, menge, anmerkung, spende:spende_id(titel, beschreibung)')
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

  const kindName = `${escapeHtml(anmeldung.kind_vorname)} ${escapeHtml(anmeldung.kind_nachname)}`;
  const weitereKinder = anmeldung.weitere_kinder_json || [];

  // Alle möglichen Sub-Identifier dieser Familie sammeln.
  // Wichtig: Essensspenden können mit dem VOLLEN Namen aus der kinder-Tabelle
  // gespeichert sein (z.B. 'Bargob, Anna Marlene (4b)'), während die Anmeldung
  // nur den Rufnamen enthält ('Anna'). Wir matchen daher über kinder-Index
  // mit firstWord-Fallback und nehmen beide Namensformen als Keys auf.
  const familienKinderKeys = new Set<string>();
  const kinderIdx = buildKinderIndex(kontext.kinder as KindLite[]);
  const familienEintraege: { vorname: string; nachname: string; klasse: string }[] = [
    { vorname: anmeldung.kind_vorname, nachname: anmeldung.kind_nachname, klasse: anmeldung.kind_klasse },
  ];
  for (const w of weitereKinder) {
    if (w?.vorname && w?.nachname) {
      familienEintraege.push({ vorname: w.vorname, nachname: w.nachname, klasse: w.klasse || '' });
    }
  }
  for (const e of familienEintraege) {
    familienKinderKeys.add(`${e.nachname}, ${e.vorname} (${e.klasse})`);
    const matchedKind = findKindInIndex(e.vorname, e.nachname, e.klasse, kinderIdx);
    if (matchedKind) {
      familienKinderKeys.add(`${matchedKind.nachname}, ${matchedKind.vorname} (${matchedKind.klasse || e.klasse})`);
    }
  }

  const kindEssensspenden = kontext.alleEssensspenden.filter((e) => {
    if (!e.kind_identifier) return false;
    // kind_identifier kann ein einzelnes Kind sein ('Nachname, Vorname (Klasse)')
    // oder mehrere mit ' + ' verkettet. Match wenn IRGENDEINES der enthaltenen
    // Kinder zur Familie der Anmeldung gehört.
    const kinderInIdentifier = e.kind_identifier.split(' + ');
    return kinderInIdentifier.some((k: string) => familienKinderKeys.has(k));
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
    <h2 style="color: #F2A03D;">Helfer-Zuteilung beim ${FEST_DATUM}</h2>

    <p>Hallo!</p>

    <p>Vielen Dank für die Anmeldung als Helfer beim ${FEST_DATUM} (${weitereKinder.length > 0 ? 'Kinder' : 'Kind'}: <strong>${kindName}</strong>, Klasse ${escapeHtml(anmeldung.kind_klasse)}${weitereKinder.map((k) => `; <strong>${escapeHtml(k.vorname)} ${escapeHtml(k.nachname)}</strong>, Klasse ${escapeHtml(k.klasse)}`).join('')}).</p>

    <p>Hier eure Beteiligung beim ${FEST_DATUM} im Überblick:</p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <colgroup>
          <col style="width: 140px;">
          <col>
        </colgroup>
        ${hatZuteilung
          ? familienZuteilungen
              .map((z, i) => {
                const aufgabeSepStyle = i > 0 ? 'padding-top: 16px; border-top: 1px dashed #e2e8f0;' : '';
                const aufgabeRow = `
                  <tr>
                    <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap; ${aufgabeSepStyle}">${familienZuteilungen.length > 1 ? `${i + 1}. Aufgabe:` : 'Aufgabe:'}</td>
                    <td style="padding: 8px 0; font-weight: 600; ${aufgabeSepStyle}">${escapeHtml(z.titel)}${z.slotStandort ? ` <span style="color: #64748b; font-weight: 400;">(${escapeHtml(z.slotStandort)})</span>` : ''}</td>
                  </tr>`;
                const detailsRow = z.beschreibung
                  ? `
                  <tr>
                    <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Details:</td>
                    <td style="padding: 8px 0;">${escapeHtml(z.beschreibung)}</td>
                  </tr>`
                  : '';
                const zeitRow = z.slotZeit
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
                    : '';
                return aufgabeRow + detailsRow + zeitRow;
              })
              .join('')
          : `
              <tr>
                <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Aufgabe:</td>
                <td style="padding: 8px 0;">Keine Aufgabe</td>
              </tr>`}
        ${kindEssensspenden.length > 0
          ? kindEssensspenden
              .map((e, i) => {
                const spende: any = Array.isArray(e.spende) ? e.spende[0] : e.spende;
                const titel = escapeHtml(spende?.titel || 'Essensspende');
                const beschreibung = spende?.beschreibung
                  ? `<div style="font-size: 13px; color: #64748b; margin-top: 2px;">${escapeHtml(spende.beschreibung)}</div>`
                  : '';
                const label = kindEssensspenden.length === 1 ? 'Essensspende:' : `${i + 1}. Essensspende:`;
                const sepStyle = i === 0 ? 'padding-top: 16px; border-top: 1px solid #e2e8f0;' : '';
                return `
                  <tr>
                    <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap; ${sepStyle}">${label}</td>
                    <td style="padding: 8px 0; ${sepStyle}"><strong>${e.menge}&times; ${titel}</strong>${beschreibung}</td>
                  </tr>`;
              })
              .join('') + `
              <tr>
                <td colspan="2" style="padding-top: 14px;">
                  <div style="background: #fef3c7; border-left: 3px solid #f59e0b; padding: 10px 14px; font-size: 14px; color: #78350f; border-radius: 4px;">
                    Bitte verseht alle eure Kannen und Kuchenbehälter mit Namen!<br>
                    <strong>Abgabe von 9:00 - 12:00 Uhr in der Kaffeebar.</strong>
                  </div>
                </td>
              </tr>`
          : `
              <tr>
                <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap; padding-top: 16px; border-top: 1px solid #e2e8f0;">Essensspende:</td>
                <td style="padding: 8px 0; padding-top: 16px; border-top: 1px solid #e2e8f0;">Keine Essensspende</td>
              </tr>`}
      </table>
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
