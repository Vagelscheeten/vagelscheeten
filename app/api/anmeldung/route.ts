import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";
import { escapeHtml } from "@/lib/email-utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendApiKey = process.env.RESEND_API_KEY!;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://vagelscheeten.de";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            kind_vorname,
            kind_nachname,
            kind_klasse,
            eltern_email,
            helfer_aufgaben,
            essensspenden,
            ist_springer,
            springer_zeitfenster,
            kommentar,
            weitere_kinder,
        } = body;

        // Validation
        if (
            !kind_vorname?.trim() || !kind_nachname?.trim() ||
            !kind_klasse?.trim()
        ) {
            return NextResponse.json(
                { error: "Bitte alle Angaben zum Kind ausfüllen" },
                { status: 400 },
            );
        }

        if (!eltern_email?.trim()) {
            return NextResponse.json(
                { error: "Bitte eine E-Mail-Adresse angeben" },
                { status: 400 },
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(eltern_email)) {
            return NextResponse.json(
                { error: "Bitte eine gültige E-Mail-Adresse angeben" },
                { status: 400 },
            );
        }

        // Validate weitere_kinder if provided
        const validierteWeitereKinder: { vorname: string; nachname: string; klasse: string }[] = [];
        if (weitere_kinder && Array.isArray(weitere_kinder)) {
            if (weitere_kinder.length > 4) {
                return NextResponse.json(
                    { error: "Maximal 4 Geschwisterkinder möglich" },
                    { status: 400 },
                );
            }
            for (const kind of weitere_kinder) {
                if (!kind.vorname?.trim() || !kind.nachname?.trim() || !kind.klasse?.trim()) {
                    return NextResponse.json(
                        { error: "Bitte alle Angaben zu den Geschwisterkindern ausfüllen" },
                        { status: 400 },
                    );
                }
                validierteWeitereKinder.push({
                    vorname: kind.vorname.trim(),
                    nachname: kind.nachname.trim(),
                    klasse: kind.klasse.trim(),
                });
            }
        }

        // Get active event
        const { data: activeEvent, error: eventError } = await supabaseAdmin
            .from("events")
            .select("id, name, anmeldeschluss")
            .eq("ist_aktiv", true)
            .single();

        if (eventError || !activeEvent) {
            return NextResponse.json(
                { error: "Kein aktives Event gefunden" },
                { status: 400 },
            );
        }

        // Check Anmeldeschluss
        if (activeEvent.anmeldeschluss) {
            const deadline = new Date(activeEvent.anmeldeschluss);
            deadline.setHours(23, 59, 59, 999);
            if (new Date() > deadline) {
                return NextResponse.json(
                    { error: "Die Anmeldefrist ist leider abgelaufen" },
                    { status: 400 },
                );
            }
        }

        // Delete existing unverified registrations for same email + event (allows corrections)
        await supabaseAdmin
            .from("anmeldungen")
            .delete()
            .eq("event_id", activeEvent.id)
            .eq("eltern_email", eltern_email.trim().toLowerCase())
            .eq("verifiziert", false);

        // Generate verification token
        const token = crypto.randomBytes(32).toString("hex");

        // Create registration
        const { data: anmeldung, error: insertError } = await supabaseAdmin
            .from("anmeldungen")
            .insert({
                event_id: activeEvent.id,
                kind_vorname: kind_vorname.trim(),
                kind_nachname: kind_nachname.trim(),
                kind_klasse: kind_klasse.trim(),
                eltern_email: eltern_email.trim().toLowerCase(),
                token,
                verifiziert: false,
                helfer_aufgaben_json: helfer_aufgaben || [],
                essensspenden_json: essensspenden || [],
                ist_springer: ist_springer || false,
                springer_zeitfenster: ist_springer
                    ? springer_zeitfenster
                    : null,
                kommentar: kommentar?.trim() || null,
                weitere_kinder_json: validierteWeitereKinder.length > 0 ? validierteWeitereKinder : null,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error creating anmeldung:", insertError);
            return NextResponse.json(
                { error: "Fehler beim Speichern der Anmeldung" },
                { status: 500 },
            );
        }

        // Fetch task and donation titles for the email
        let aufgabenHtml = "";
        if (ist_springer) {
            const zeitfensterText = springer_zeitfenster === "beides"
                ? "ganztägig"
                : springer_zeitfenster || "nicht angegeben";
            aufgabenHtml = `<span style="color: #7c3aed; font-weight: bold;">Springer (${zeitfensterText})</span>`;
        } else if (helfer_aufgaben && helfer_aufgaben.length > 0) {
            const { data: aufgaben } = await supabaseAdmin
                .from("helferaufgaben")
                .select("titel")
                .in("id", helfer_aufgaben.map((a: any) => a.aufgabe_id));
            if (aufgaben && aufgaben.length > 0) {
                aufgabenHtml = aufgaben.map((a) => `&bull; ${a.titel}`).join("<br>");
            }
        }
        if (!aufgabenHtml) {
            aufgabenHtml = '<span style="color: #999;">Keine ausgewählt</span>';
        }

        let spendenHtml = "";
        if (essensspenden && essensspenden.length > 0) {
            const { data: spenden } = await supabaseAdmin
                .from("essensspenden_bedarf")
                .select("titel")
                .in("id", essensspenden.map((s: any) => s.spende_id));
            if (spenden && spenden.length > 0) {
                spendenHtml = spenden.map((s) => `&bull; ${s.titel}`).join("<br>");
            }
        }
        if (!spendenHtml) {
            spendenHtml = '<span style="color: #999;">Keine ausgewählt</span>';
        }

        // Send verification email
        const verifyUrl = `${baseUrl}/anmeldung/bestaetigen/${token}`;
        const anmeldeUrl = `${baseUrl}/anmeldung`;

        try {
            await resend.emails.send({
                from: "Orgateam Vagelscheeten <orgateam@vagelscheeten.de>",
                to: [eltern_email.trim().toLowerCase()],
                subject:
                    `Bitte bestätige deine Helfer-Anmeldung zum ${activeEvent.name}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #2563eb;">Helfer-Anmeldung zum ${activeEvent.name}</h2>
            <p>Hallo!</p>
            <p>Wir haben folgende Anmeldung für das <strong>${activeEvent.name}</strong> erhalten:</p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">${validierteWeitereKinder.length > 0 ? 'Kinder:' : 'Kind:'}</td>
                  <td style="padding: 8px 0; font-weight: 600;">
                    ${escapeHtml(kind_vorname.trim())} ${escapeHtml(kind_nachname.trim())} (${escapeHtml(kind_klasse.trim())})${validierteWeitereKinder.map(k => `<br>${escapeHtml(k.vorname)} ${escapeHtml(k.nachname)} (${escapeHtml(k.klasse)})`).join('')}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Helfer-Aufgaben:</td>
                  <td style="padding: 8px 0;">${aufgabenHtml}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Essensspenden:</td>
                  <td style="padding: 8px 0;">${spendenHtml}</td>
                </tr>
                ${kommentar?.trim() ? `
                <tr>
                  <td style="padding: 8px 12px 8px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Anmerkung:</td>
                  <td style="padding: 8px 0;">${escapeHtml(kommentar.trim())}</td>
                </tr>
                ` : ""}
              </table>
            </div>

            <p><strong>Bitte bestätige deine Anmeldung</strong> durch Klick auf den folgenden Button:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                Anmeldung bestätigen
              </a>
            </p>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 6px 6px 0; margin: 24px 0; font-size: 14px;">
              <strong>Stimmt etwas nicht?</strong> Kein Problem &mdash; fülle das <a href="${anmeldeUrl}" style="color: #2563eb;">Anmeldeformular</a> einfach erneut aus. Die alte Anmeldung wird automatisch durch die neue ersetzt.
            </div>

            <p style="color: #666; font-size: 13px;">
              Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
              <a href="${verifyUrl}" style="color: #2563eb;">${verifyUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Diese E-Mail wurde automatisch versendet. Bei Fragen wende dich an <a href="mailto:orgateam@vagelscheeten.de">orgateam@vagelscheeten.de</a>
            </p>
          </div>
        `,
            });
        } catch (emailError) {
            console.error("Error sending verification email:", emailError);
        }

        return NextResponse.json({
            success: true,
            message:
                "Wir haben dir eine E-Mail gesendet. Bitte bestätige deine Anmeldung durch Klick auf den Link in der E-Mail.",
            anmeldung_id: anmeldung.id,
        });
    } catch (error: any) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            {
                error:
                    "Ein unerwarteter Fehler ist aufgetreten",
            },
            { status: 500 },
        );
    }
}
