import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendApiKey = process.env.RESEND_API_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: "Token fehlt" },
                { status: 400 },
            );
        }

        // Find anmeldung by token
        const { data: anmeldung, error: findError } = await supabaseAdmin
            .from("anmeldungen")
            .select("*, events(name)")
            .eq("token", token)
            .single();

        if (findError || !anmeldung) {
            return NextResponse.json(
                { error: "Ungültiger oder abgelaufener Link" },
                { status: 400 },
            );
        }

        if (anmeldung.verifiziert) {
            return NextResponse.json({
                success: true,
                message: "Diese Anmeldung wurde bereits bestätigt",
                anmeldung,
            });
        }

        // Mark as verified
        const { error: updateError } = await supabaseAdmin
            .from("anmeldungen")
            .update({
                verifiziert: true,
                verifiziert_am: new Date().toISOString(),
            })
            .eq("id", anmeldung.id);

        if (updateError) {
            console.error("Error verifying anmeldung:", updateError);
            return NextResponse.json(
                { error: "Fehler beim Bestätigen der Anmeldung" },
                { status: 500 },
            );
        }

        // Now create the actual helfer_rueckmeldungen and essensspenden_rueckmeldungen
        // We need to create these records now that email is verified

        const helferAufgaben = anmeldung.helfer_aufgaben_json || [];
        const essensspenden = anmeldung.essensspenden_json || [];
        const weitereKinder: { vorname: string; nachname: string; klasse: string }[] = anmeldung.weitere_kinder_json || [];

        // Build combined identifier: primary + siblings separated by " + "
        let kindIdentifier =
            `${anmeldung.kind_nachname}, ${anmeldung.kind_vorname} (${anmeldung.kind_klasse})`;
        if (weitereKinder.length > 0) {
            kindIdentifier += weitereKinder
                .map(k => ` + ${k.nachname}, ${k.vorname} (${k.klasse})`)
                .join('');
        }

        // Try to find a matching child in the kinder table for auto-linking
        const { data: kindMatch } = await supabaseAdmin
            .from("kinder")
            .select("id")
            .eq("event_id", anmeldung.event_id)
            .ilike("vorname", anmeldung.kind_vorname)
            .ilike("nachname", anmeldung.kind_nachname);
        // Only use match if exactly one result — ambiguous names require manual assignment
        const autoKindId = (kindMatch && kindMatch.length === 1) ? kindMatch[0].id : null;

        // Create helfer_rueckmeldungen
        // First check if Springer - create a Springer record
        if (anmeldung.ist_springer) {
            await supabaseAdmin
                .from("helfer_rueckmeldungen")
                .insert({
                    kind_id: autoKindId,
                    aufgabe_id: null, // No specific task for Springer
                    prioritaet: 1,
                    ist_springer: true,
                    zeitfenster: anmeldung.springer_zeitfenster || null,
                    event_id: anmeldung.event_id,
                    kind_name_extern: kindIdentifier,
                    kommentar: anmeldung.kommentar || null,
                    freitext: null, // Clean!
                });
        }

        // Then create regular aufgaben records if any
        if (helferAufgaben.length > 0) {
            for (const aufgabe of helferAufgaben) {
                await supabaseAdmin
                    .from("helfer_rueckmeldungen")
                    .insert({
                        kind_id: autoKindId,
                        aufgabe_id: aufgabe.aufgabe_id,
                        prioritaet: aufgabe.prioritaet || 1,
                        ist_springer: false,
                        event_id: anmeldung.event_id,
                        kind_name_extern: kindIdentifier,
                        kommentar: anmeldung.kommentar || null,
                        freitext: null, // Clean!
                    });
            }
        }

        // Create essensspenden_rueckmeldungen
        if (essensspenden.length > 0) {
            for (const spende of essensspenden) {
                await supabaseAdmin
                    .from("essensspenden_rueckmeldungen")
                    .insert({
                        spende_id: spende.spende_id,
                        kind_identifier: kindIdentifier,
                        menge: spende.menge || 1,
                        event_id: anmeldung.event_id,
                    });
            }
        }

        // Send confirmation email
        const eventName = (anmeldung as any).events?.name || "Vogelschießen";

        // Build summary of selections
        let aufgabenText = "";
        let spendenText = "Keine Essensspenden angegeben";

        // Check if Springer
        if (anmeldung.ist_springer) {
            const zeitfensterText = anmeldung.springer_zeitfenster === "beides"
                ? "ganztägig"
                : anmeldung.springer_zeitfenster || "nicht angegeben";
            aufgabenText =
                `<span style="color: #7c3aed; font-weight: bold;">🏃 Springer (${zeitfensterText})</span>`;
        } else if (helferAufgaben.length > 0) {
            const { data: aufgaben } = await supabaseAdmin
                .from("helferaufgaben")
                .select("titel")
                .in("id", helferAufgaben.map((a: any) => a.aufgabe_id));

            if (aufgaben && aufgaben.length > 0) {
                aufgabenText = aufgaben.map((a) => `• ${a.titel}`).join("<br>");
            }
        }

        if (!aufgabenText) {
            aufgabenText = "Keine Helfer-Aufgaben ausgewählt";
        }

        if (essensspenden.length > 0) {
            const { data: spenden } = await supabaseAdmin
                .from("essensspenden_bedarf")
                .select("titel")
                .in("id", essensspenden.map((s: any) => s.spende_id));

            if (spenden && spenden.length > 0) {
                spendenText = spenden.map((s) => `• ${s.titel}`).join("<br>");
            }
        }

        try {
            await resend.emails.send({
                from: "Orgateam Vagelscheeten <orgateam@vagelscheeten.de>",
                to: [anmeldung.eltern_email],
                subject: `Helfer-Anmeldung bestätigt - ${eventName}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #16a34a;">Helfer-Anmeldung bestätigt</h2>
            <p>Vielen Dank! Die Helfer-Anmeldung zum <strong>${eventName}</strong> wurde erfolgreich bestätigt.</p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">${weitereKinder.length > 0 ? 'Kinder:' : 'Kind:'}</td>
                  <td style="padding: 8px 0; font-weight: 600;">
                    ${anmeldung.kind_vorname} ${anmeldung.kind_nachname} (${anmeldung.kind_klasse})${weitereKinder.map(k => `<br>${k.vorname} ${k.nachname} (${k.klasse})`).join('')}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Helfer-Aufgaben:</td>
                  <td style="padding: 8px 0;">${aufgabenText}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Essensspenden:</td>
                  <td style="padding: 8px 0;">${spendenText}</td>
                </tr>
                ${anmeldung.kommentar ? `
                <tr>
                  <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Anmerkung:</td>
                  <td style="padding: 8px 0;">${anmeldung.kommentar}</td>
                </tr>
                ` : ""}
              </table>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 6px 6px 0; margin: 24px 0; font-size: 14px;">
              <strong>Wie geht es weiter?</strong> Das Orgateam teilt die Aufgaben zu. Du erhältst eine weitere E-Mail mit deiner endgültigen Zuteilung.
            </div>

            <p style="font-size: 14px;">Bei Fragen wende dich an <a href="mailto:orgateam@vagelscheeten.de" style="color: #2563eb;">orgateam@vagelscheeten.de</a></p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Diese E-Mail wurde automatisch versendet.
            </p>
          </div>
        `,
            });
        } catch (emailError) {
            console.error("Error sending confirmation email:", emailError);
        }

        return NextResponse.json({
            success: true,
            message: "Deine Anmeldung wurde erfolgreich bestätigt!",
            anmeldung: {
                ...anmeldung,
                verifiziert: true,
            },
        });
    } catch (error: any) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            {
                error:
                    `Ein unerwarteter Fehler ist aufgetreten: ${error.message}`,
            },
            { status: 500 },
        );
    }
}
