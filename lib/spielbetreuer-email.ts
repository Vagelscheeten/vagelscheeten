import { escapeHtml } from '@/lib/email-utils';
import type { SupabaseClient } from '@supabase/supabase-js';

const FEST_DATUM = process.env.FEST_DATUM || 'Melsdörper Vagelscheeten';

export interface SpielZuteilung {
  zuteilungId: string;
  spielId: string;
  spielName: string;
  benachrichtigtAm: string | null;
  kindVorname: string;
  kindNachname: string;
  kindKlasse: string | null;
}

export interface SpielbetreuerMail {
  anmeldungId: string;
  elternEmail: string;
  zuteilungen: SpielZuteilung[];
  hatUnbenachrichtigt: boolean;
}

/**
 * Lädt alle Spielbetreuer-Zuteilungen für das aktive Event und gruppiert sie nach Anmeldung
 * (= eine Mail pro Familie). Externe Helfer werden ignoriert (keine Email vorhanden).
 */
export async function loadSpielbetreuerMails(
  supabaseAdmin: SupabaseClient,
  eventId: string,
): Promise<SpielbetreuerMail[]> {
  const { data: aufgabe } = await supabaseAdmin
    .from('helferaufgaben')
    .select('id')
    .eq('event_id', eventId)
    .ilike('titel', '%betreuer%spiel%')
    .limit(1)
    .single();
  if (!aufgabe) return [];

  const { data: helferZuteilungen } = await supabaseAdmin
    .from('helfer_zuteilungen')
    .select('id, kind_id')
    .eq('event_id', eventId)
    .eq('aufgabe_id', aufgabe.id)
    .not('kind_id', 'is', null);
  const helferToKind = new Map<string, string>();
  for (const h of helferZuteilungen || []) {
    if (h.kind_id) helferToKind.set(h.id as string, h.kind_id as string);
  }
  if (helferToKind.size === 0) return [];

  const helferIds = Array.from(helferToKind.keys());

  const { data: spielZuteilungen } = await supabaseAdmin
    .from('helfer_spiel_zuteilungen')
    .select('id, helfer_id, spiel_id, benachrichtigt_am')
    .in('helfer_id', helferIds)
    .neq('spiel_id', 'springer');
  if (!spielZuteilungen || spielZuteilungen.length === 0) return [];

  const kindIds = Array.from(new Set(spielZuteilungen.map((z) => helferToKind.get(z.helfer_id as string)!).filter(Boolean)));
  const spielIds = Array.from(new Set(spielZuteilungen.map((z) => z.spiel_id as string)));

  const [{ data: kinder }, { data: spiele }, { data: junctions }] = await Promise.all([
    supabaseAdmin.from('kinder').select('id, vorname, nachname, klasse').in('id', kindIds),
    supabaseAdmin.from('spiele').select('id, name').in('id', spielIds),
    supabaseAdmin.from('anmeldungs_kinder').select('kind_id, anmeldung_id').in('kind_id', kindIds),
  ]);
  const kindById = new Map((kinder || []).map((k) => [k.id as string, k]));
  const spielById = new Map((spiele || []).map((s) => [s.id as string, s.name as string]));
  const kindToAnmeldung = new Map<string, string>();
  for (const j of junctions || []) {
    if (j.kind_id && j.anmeldung_id) kindToAnmeldung.set(j.kind_id as string, j.anmeldung_id as string);
  }

  const anmeldungIds = Array.from(new Set(Array.from(kindToAnmeldung.values())));
  const { data: anmeldungen } = await supabaseAdmin
    .from('anmeldungen')
    .select('id, eltern_email')
    .in('id', anmeldungIds)
    .not('eltern_email', 'is', null);
  const anmeldungEmail = new Map<string, string>();
  for (const a of anmeldungen || []) {
    if (a.eltern_email) anmeldungEmail.set(a.id as string, a.eltern_email as string);
  }

  // Gruppiere Zuteilungen nach Anmeldung
  const grouped = new Map<string, SpielZuteilung[]>();
  for (const z of spielZuteilungen) {
    const kindId = helferToKind.get(z.helfer_id as string);
    if (!kindId) continue;
    const anmeldungId = kindToAnmeldung.get(kindId);
    if (!anmeldungId) continue;
    const kind = kindById.get(kindId);
    if (!kind) continue;
    const spielName = spielById.get(z.spiel_id as string);
    if (!spielName) continue;
    if (!grouped.has(anmeldungId)) grouped.set(anmeldungId, []);
    grouped.get(anmeldungId)!.push({
      zuteilungId: z.id as string,
      spielId: z.spiel_id as string,
      spielName,
      benachrichtigtAm: (z.benachrichtigt_am as string | null) ?? null,
      kindVorname: kind.vorname as string,
      kindNachname: kind.nachname as string,
      kindKlasse: (kind.klasse as string | null) ?? null,
    });
  }

  const result: SpielbetreuerMail[] = [];
  for (const [anmeldungId, zuteilungen] of grouped.entries()) {
    const email = anmeldungEmail.get(anmeldungId);
    if (!email) continue;
    zuteilungen.sort((a, b) => a.kindNachname.localeCompare(b.kindNachname, 'de'));
    result.push({
      anmeldungId,
      elternEmail: email,
      zuteilungen,
      hatUnbenachrichtigt: zuteilungen.some((z) => !z.benachrichtigtAm),
    });
  }
  result.sort((a, b) => a.elternEmail.localeCompare(b.elternEmail));
  return result;
}

export function buildSpielbetreuerEmail(mail: SpielbetreuerMail): { subject: string; html: string } {
  const anzahl = mail.zuteilungen.length;
  const subject =
    anzahl === 1
      ? `Deine Spiel-Zuteilung beim ${FEST_DATUM}`
      : `Eure Spiel-Zuteilungen beim ${FEST_DATUM}`;

  const tabellenZeilen = mail.zuteilungen
    .map((z) => {
      const klasse = z.kindKlasse ? ` (${escapeHtml(z.kindKlasse)})` : '';
      return `
        <tr>
          <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Kind:</td>
          <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(z.kindVorname)} ${escapeHtml(z.kindNachname)}${klasse}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Spiel:</td>
          <td style="padding: 8px 0 16px; font-weight: 600;">${escapeHtml(z.spielName)}</td>
        </tr>`;
    })
    .join(
      `
        <tr><td colspan="2" style="padding: 0; border-top: 1px dashed #e2e8f0;"></td></tr>`,
    );

  const intro =
    anzahl === 1
      ? `<p>vielen Dank, dass Du beim ${FEST_DATUM} als Spielbetreuer:in dabei bist! Hier ist Deine konkrete Zuteilung:</p>`
      : `<p>vielen Dank, dass Ihr beim ${FEST_DATUM} als Spielbetreuer:innen dabei seid! Hier sind Eure Zuteilungen:</p>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
    <h2 style="color: #F2A03D;">Spielbetreuung beim ${FEST_DATUM}</h2>

    <p>Hallo!</p>

    ${intro}

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <colgroup>
          <col style="width: 80px;">
          <col>
        </colgroup>
        ${tabellenZeilen}
      </table>
    </div>

    <p>Alle weiteren Details zum Spiel (Regeln, genauer Treffpunkt, Zeit) erhältst Du am Veranstaltungstag direkt vom Orgateam vor Ort.</p>

    <p style="font-size: 14px;">Bei Verhinderung oder Fragen bitte schnellstmöglich an <a href="mailto:orgateam@vagelscheeten.de" style="color: #2563eb;">orgateam@vagelscheeten.de</a> melden.</p>

    <p style="margin-top: 28px;">Wir freuen uns auf einen tollen Tag!</p>

    <p>Liebe Grüße<br>Dein Orgateam ${FEST_DATUM}</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">Diese E-Mail wurde automatisch versendet.</p>
  </div>
</body>
</html>`;

  return { subject, html };
}
