'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Send, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

type Event = {
  id: string;
  name: string;
  jahr: number;
  datum: string | null;
  anmeldeschluss: string | null;
};

type Aufgabe = {
  id: string;
  titel: string;
  beschreibung: string | null;
  zeitfenster: string;
  bedarf: number;
};

type Spende = {
  id: string;
  titel: string;
  beschreibung: string | null;
  anzahl_benoetigt: number;
};

type Klasse = {
  id: string;
  name: string;
};

type GeschwisterKind = {
  vorname: string;
  nachname: string;
  klasse: string;
};

// ─── Form-Styling-Konstanten ──────────────────────────────────
const inputBase =
  'w-full px-3.5 py-2.5 rounded-md bg-paper-soft text-ink placeholder:text-ink-muted border border-ink/12 focus:outline-none focus:border-melsdorf-green focus:ring-2 focus:ring-melsdorf-green/20 transition-all';
const inputSm =
  'w-full px-3 py-2 rounded-md bg-paper-soft text-ink placeholder:text-ink-muted border border-ink/12 focus:outline-none focus:border-melsdorf-green focus:ring-2 focus:ring-melsdorf-green/20 text-sm transition-all';

const labelBase = 'block text-[0.82rem] font-semibold text-ink-soft mb-1.5';

// ─── Option-Karten für Auswahlen ──────────────────────────────
type OptionCardProps = {
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string | null;
  hint?: string | null;
  accent?: 'green' | 'red' | 'orange';
  inputType?: 'checkbox' | 'radio';
  inputName?: string;
};

function OptionCard({ checked, onChange, title, description, hint, accent = 'green', inputType = 'checkbox', inputName }: OptionCardProps) {
  const accentColor =
    accent === 'red' ? 'var(--color-melsdorf-red)'
    : accent === 'orange' ? 'var(--color-melsdorf-orange)'
    : 'var(--color-melsdorf-green)';
  const accentBg =
    accent === 'red' ? 'color-mix(in srgb, var(--color-melsdorf-red) 8%, var(--color-paper-soft))'
    : accent === 'orange' ? 'color-mix(in srgb, var(--color-melsdorf-orange) 10%, var(--color-paper-soft))'
    : 'color-mix(in srgb, var(--color-melsdorf-green) 8%, var(--color-paper-soft))';

  return (
    <label
      className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all border"
      style={{
        borderColor: checked ? accentColor : 'color-mix(in srgb, var(--color-ink) 10%, transparent)',
        backgroundColor: checked ? accentBg : 'var(--color-paper-soft)',
      }}
    >
      <input
        type={inputType}
        name={inputName}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-[18px] w-[18px] accent-melsdorf-green"
        style={{ accentColor }}
      />
      <div className="flex-1">
        <div className="font-medium text-ink text-[0.92rem]">{title}</div>
        {description && <div className="text-sm text-ink-soft mt-0.5 leading-snug">{description}</div>}
        {hint && <div className="text-xs text-ink-muted mt-1 italic leading-snug">{hint}</div>}
      </div>
    </label>
  );
}

// ─── Zeitfenster-Label mit farbigem Punkt ─────────────────────
function ZeitfensterLabel({ label, dotColor }: { label: string; dotColor: string }) {
  return (
    <h3 className="text-[0.95rem] font-semibold text-ink mb-3 flex items-center gap-2">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
      {label}
    </h3>
  );
}

export default function AnmeldungPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [event, setEvent] = useState<Event | null>(null);
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [spenden, setSpenden] = useState<Spende[]>([]);
  const [klassen, setKlassen] = useState<Klasse[]>([]);

  const [kindVorname, setKindVorname] = useState('');
  const [kindNachname, setKindNachname] = useState('');
  const [kindKlasse, setKindKlasse] = useState('');
  const [elternEmail, setElternEmail] = useState('');
  const [selectedAufgaben, setSelectedAufgaben] = useState<string[]>([]);
  const [selectedSpenden, setSelectedSpenden] = useState<string[]>([]);
  const [kommentar, setKommentar] = useState('');
  const [istSpringer, setIstSpringer] = useState(false);
  const [springerZeitfenster, setSpringerZeitfenster] = useState<'vormittag' | 'nachmittag' | 'beides'>('beides');
  const [geschwister, setGeschwister] = useState<GeschwisterKind[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient();

        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('ist_aktiv', true)
          .single();

        if (eventError || !eventData) {
          setError('Kein aktives Event gefunden');
          setLoading(false);
          return;
        }

        if (eventData.anmeldeschluss) {
          const deadline = new Date(eventData.anmeldeschluss);
          deadline.setHours(23, 59, 59, 999);
          if (new Date() > deadline) {
            setError('Die Anmeldefrist ist leider abgelaufen');
            setLoading(false);
            return;
          }
        }

        setEvent(eventData);

        const { data: aufgabenData } = await supabase
          .from('helferaufgaben')
          .select('*')
          .eq('event_id', eventData.id)
          .order('zeitfenster', { ascending: true });
        setAufgaben(aufgabenData || []);

        const { data: spendenData } = await supabase
          .from('essensspenden_bedarf')
          .select('*')
          .eq('event_id', eventData.id);
        setSpenden(spendenData || []);

        const { data: klassenData } = await supabase
          .from('klassen')
          .select('id, name')
          .eq('event_id', eventData.id)
          .neq('name', 'Schulis')
          .order('name', { ascending: true });
        setKlassen(klassenData || []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Fehler beim Laden der Daten');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const toggleAufgabe = (id: string) =>
    setSelectedAufgaben((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  const toggleSpende = (id: string) =>
    setSelectedSpenden((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const canProceed = () => {
    if (step === 1) {
      const primaryOk = kindVorname.trim() && kindNachname.trim() && kindKlasse && elternEmail.trim();
      const geschwisterOk = geschwister.every((g) => g.vorname.trim() && g.nachname.trim() && g.klasse);
      return primaryOk && geschwisterOk;
    }
    return true;
  };

  const addGeschwister = () => {
    if (geschwister.length >= 4) return;
    setGeschwister([...geschwister, { vorname: '', nachname: kindNachname, klasse: '' }]);
  };
  const removeGeschwister = (index: number) =>
    setGeschwister(geschwister.filter((_, i) => i !== index));
  const updateGeschwister = (index: number, field: keyof GeschwisterKind, value: string) => {
    const updated = [...geschwister];
    updated[index] = { ...updated[index], [field]: value };
    setGeschwister(updated);
  };

  const handleSubmit = async () => {
    if (!event) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/anmeldung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind_vorname: kindVorname,
          kind_nachname: kindNachname,
          kind_klasse: kindKlasse,
          eltern_email: elternEmail,
          helfer_aufgaben: selectedAufgaben.map((id) => ({ aufgabe_id: id, prioritaet: 1 })),
          essensspenden: selectedSpenden.map((id) => ({ spende_id: id, menge: 1 })),
          ist_springer: istSpringer,
          springer_zeitfenster: istSpringer ? springerZeitfenster : null,
          kommentar,
          weitere_kinder: geschwister.length > 0 ? geschwister : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Fehler beim Absenden');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading / Error / Submitted ──────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div
          className="text-center p-8 rounded-2xl max-w-md mx-auto bg-paper-soft"
          style={{
            border: '1px solid color-mix(in srgb, var(--color-ink) 8%, transparent)',
            boxShadow: '0 10px 30px -12px rgba(26,20,16,0.15)',
          }}
        >
          <AlertCircle className="h-14 w-14 text-melsdorf-red mx-auto mb-4" />
          <h1
            className="font-display text-ink mb-2"
            style={{ fontSize: '1.65rem', fontWeight: 600, fontVariationSettings: '"SOFT" 50, "opsz" 96' }}
          >
            Anmeldung nicht möglich
          </h1>
          <p className="text-ink-soft mb-6" style={{ marginBottom: '1.5rem' }}>{error}</p>
          <Link
            href="/startseite"
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-melsdorf-green hover:bg-melsdorf-green-dark text-paper-soft text-sm font-semibold transition-all"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center p-8 rounded-2xl max-w-md mx-auto bg-paper-soft"
          style={{
            border: '1px solid color-mix(in srgb, var(--color-ink) 8%, transparent)',
            boxShadow: '0 14px 40px -14px rgba(26,20,16,0.2)',
          }}
        >
          <CheckCircle className="h-16 w-16 text-melsdorf-green mx-auto mb-4" />
          <p className="font-hand text-melsdorf-red mb-2" style={{ fontSize: '1.35rem', lineHeight: 1 }}>
            Fast geschafft!
          </p>
          <h1
            className="font-display text-ink mb-4"
            style={{ fontSize: '1.85rem', fontWeight: 600, lineHeight: 1.1, fontVariationSettings: '"SOFT" 55, "opsz" 96' }}
          >
            Eine E-Mail ist unterwegs
          </h1>
          <p className="text-ink-soft mb-2" style={{ marginBottom: '0.5rem' }}>
            Wir haben eine Nachricht an <strong className="text-ink">{elternEmail}</strong> geschickt.
          </p>
          <p className="text-ink-soft" style={{ marginBottom: '1.5rem' }}>
            Bitte klickt dort auf den Bestätigungslink, damit eure Anmeldung gültig wird.
          </p>
          <div
            className="p-3.5 rounded-lg text-sm text-left"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-paper))',
              color: 'var(--color-ink-soft)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
            }}
          >
            <strong>Tipp:</strong> Schau auch kurz in deinen Spam-Ordner — manchmal landen Bestätigungs-Mails dort.
          </div>
          <Link
            href="/startseite"
            className="mt-6 inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-melsdorf-green hover:bg-melsdorf-green-dark text-paper-soft text-sm font-semibold transition-all"
          >
            Zurück zur Startseite
          </Link>
        </motion.div>
      </div>
    );
  }

  const vormittagAufgaben = aufgaben.filter((a) => a.zeitfenster === 'vormittag');
  const nachmittagAufgaben = aufgaben.filter((a) => a.zeitfenster === 'nachmittag');

  return (
    <div className="flex-1 py-10 md:py-14 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="font-hand text-melsdorf-red mb-2" style={{ fontSize: '1.3rem', lineHeight: 1 }}>
            Schön, dass ihr dabei seid —
          </p>
          <h1
            className="font-display text-ink mb-3"
            style={{
              fontSize: 'clamp(1.85rem, 4vw, 2.4rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              fontVariationSettings: '"SOFT" 60, "opsz" 96',
            }}
          >
            Anmeldung {event?.name}
          </h1>
          {event?.datum && (
            <p className="text-ink-soft" style={{ marginBottom: 0 }}>
              {new Date(event.datum).toLocaleDateString('de-DE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
          {event?.anmeldeschluss && (
            <p className="text-sm text-melsdorf-red mt-2" style={{ marginBottom: 0 }}>
              Anmeldeschluss: {new Date(event.anmeldeschluss).toLocaleDateString('de-DE')}
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all tabular-nums"
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  backgroundColor: s <= step ? 'var(--color-melsdorf-green)' : 'var(--color-paper-soft)',
                  color: s <= step ? 'var(--color-paper-soft)' : 'var(--color-ink-muted)',
                  border: s <= step ? 'none' : '1px solid color-mix(in srgb, var(--color-ink) 15%, transparent)',
                }}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className="w-10 md:w-12 h-px"
                  style={{
                    backgroundColor: s < step
                      ? 'var(--color-melsdorf-green)'
                      : 'color-mix(in srgb, var(--color-ink) 15%, transparent)',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl bg-paper-soft p-6 sm:p-8"
          style={{
            border: '1px solid color-mix(in srgb, var(--color-ink) 8%, transparent)',
            boxShadow: '0 10px 30px -14px rgba(26,20,16,0.15)',
          }}
        >
          {error && (
            <div
              className="mb-6 p-3.5 rounded-lg flex items-center gap-3"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-melsdorf-red) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-melsdorf-red) 25%, transparent)',
                color: 'var(--color-melsdorf-red-dark)',
              }}
            >
              <AlertCircle size={18} className="shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* ── Step 1: Kind-Daten ── */}
          {step === 1 && (
            <div>
              <h2
                className="font-display text-ink mb-6"
                style={{ fontSize: '1.4rem', fontWeight: 600, fontVariationSettings: '"SOFT" 50, "opsz" 48' }}
              >
                Angaben zum Kind
              </h2>

              <div className="space-y-4">
                <div>
                  <label className={labelBase}>Vorname *</label>
                  <input
                    type="text"
                    value={kindVorname}
                    onChange={(e) => setKindVorname(e.target.value)}
                    className={inputBase}
                    placeholder="z. B. Max"
                  />
                </div>
                <div>
                  <label className={labelBase}>Nachname *</label>
                  <input
                    type="text"
                    value={kindNachname}
                    onChange={(e) => setKindNachname(e.target.value)}
                    className={inputBase}
                    placeholder="z. B. Mustermann"
                  />
                </div>
                <div>
                  <label className={labelBase}>Klasse *</label>
                  <select
                    value={kindKlasse}
                    onChange={(e) => setKindKlasse(e.target.value)}
                    className={inputBase}
                  >
                    <option value="">Bitte wählen …</option>
                    {klassen.map((k) => (
                      <option key={k.id} value={k.name}>{k.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Geschwisterkind hinzufügen */}
              {geschwister.length < 4 && (
                <button
                  type="button"
                  onClick={addGeschwister}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-melsdorf-green hover:text-melsdorf-green-dark transition-colors"
                >
                  <Plus size={16} />
                  Geschwisterkind hinzufügen
                </button>
              )}

              {/* Geschwisterkinder */}
              {geschwister.length > 0 && (
                <div className="mt-5 space-y-4">
                  {geschwister.map((g, index) => (
                    <div
                      key={index}
                      className="rounded-lg p-4 relative"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-paper-warm) 50%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-ink) 8%, transparent)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => removeGeschwister(index)}
                        className="absolute top-3 right-3 text-ink-muted hover:text-melsdorf-red transition-colors"
                        title="Entfernen"
                      >
                        <Trash2 size={16} />
                      </button>
                      <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-ink-muted mb-3">
                        Geschwisterkind {index + 1}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[0.8rem] text-ink-soft mb-1">Vorname *</label>
                          <input
                            type="text"
                            value={g.vorname}
                            onChange={(e) => updateGeschwister(index, 'vorname', e.target.value)}
                            className={inputSm}
                          />
                        </div>
                        <div>
                          <label className="block text-[0.8rem] text-ink-soft mb-1">Nachname *</label>
                          <input
                            type="text"
                            value={g.nachname}
                            onChange={(e) => updateGeschwister(index, 'nachname', e.target.value)}
                            className={inputSm}
                          />
                        </div>
                        <div>
                          <label className="block text-[0.8rem] text-ink-soft mb-1">Klasse *</label>
                          <select
                            value={g.klasse}
                            onChange={(e) => updateGeschwister(index, 'klasse', e.target.value)}
                            className={inputSm}
                          >
                            <option value="">Bitte wählen …</option>
                            {klassen.map((k) => (
                              <option key={k.id} value={k.name}>{k.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* E-Mail */}
              <div
                className="mt-6 pt-6"
                style={{ borderTop: '1px solid color-mix(in srgb, var(--color-ink) 10%, transparent)' }}
              >
                <label className={labelBase}>E-Mail der Eltern *</label>
                <input
                  type="email"
                  value={elternEmail}
                  onChange={(e) => setElternEmail(e.target.value)}
                  className={inputBase}
                  placeholder="z. B. eltern@example.de"
                />
                <div
                  className="mt-2 p-3 rounded-md text-sm leading-snug"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-accent) 18%, var(--color-paper))',
                    border: '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
                    color: 'var(--color-ink-soft)',
                  }}
                >
                  <strong className="text-ink">Wichtig:</strong> Ihr bekommt eine E-Mail mit einem Bestätigungslink. Erst wenn ihr diesen anklickt, ist die Anmeldung gültig.
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Helfer-Aufgaben ── */}
          {step === 2 && (
            <div>
              <h2
                className="font-display text-ink mb-2"
                style={{ fontSize: '1.4rem', fontWeight: 600, fontVariationSettings: '"SOFT" 50, "opsz" 48' }}
              >
                Helfer-Aufgaben
              </h2>
              <p className="text-ink-soft mb-6" style={{ marginBottom: '1.5rem' }}>
                Wählt aus, welche Aufgaben ihr übernehmen möchtet — Mehrfachauswahl ist möglich.
              </p>

              {vormittagAufgaben.length > 0 && (
                <div className="mb-6">
                  <ZeitfensterLabel label="Vormittag" dotColor="var(--color-accent)" />
                  <div className="space-y-2">
                    {vormittagAufgaben.map((aufgabe) => (
                      <OptionCard
                        key={aufgabe.id}
                        checked={selectedAufgaben.includes(aufgabe.id)}
                        onChange={() => toggleAufgabe(aufgabe.id)}
                        title={aufgabe.titel}
                        description={aufgabe.beschreibung}
                        accent="green"
                      />
                    ))}
                  </div>
                </div>
              )}

              {nachmittagAufgaben.length > 0 && (
                <div>
                  <ZeitfensterLabel label="Nachmittag" dotColor="var(--color-melsdorf-orange)" />
                  <div className="space-y-2">
                    {nachmittagAufgaben.map((aufgabe) => (
                      <OptionCard
                        key={aufgabe.id}
                        checked={selectedAufgaben.includes(aufgabe.id)}
                        onChange={() => toggleAufgabe(aufgabe.id)}
                        title={aufgabe.titel}
                        description={aufgabe.beschreibung}
                        accent="orange"
                      />
                    ))}
                  </div>
                </div>
              )}

              {aufgaben.length === 0 && (
                <p className="text-ink-muted text-center py-8" style={{ marginBottom: 0 }}>
                  Keine Helfer-Aufgaben verfügbar.
                </p>
              )}

              {/* Springer */}
              <div
                className="mt-6 pt-6"
                style={{ borderTop: '1px solid color-mix(in srgb, var(--color-ink) 10%, transparent)' }}
              >
                <ZeitfensterLabel label="Flexible Hilfe (Springer)" dotColor="var(--color-melsdorf-red)" />
                <OptionCard
                  checked={istSpringer}
                  onChange={() => setIstSpringer(!istSpringer)}
                  title="Ich bin Springer"
                  description="Wir teilen euch flexibel für eine Aufgabe ein, wo gerade Hilfe benötigt wird."
                  accent="red"
                />

                {istSpringer && (
                  <div className="mt-3 pl-1 space-y-2">
                    <p className="text-sm font-medium text-ink-soft">Wann seid ihr verfügbar?</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'beides', label: 'Ganztägig' },
                        { value: 'vormittag', label: 'Vormittag' },
                        { value: 'nachmittag', label: 'Nachmittag' },
                      ].map((opt) => {
                        const active = springerZeitfenster === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all text-sm"
                            style={{
                              border: `1px solid ${active ? 'var(--color-melsdorf-red)' : 'color-mix(in srgb, var(--color-ink) 12%, transparent)'}`,
                              backgroundColor: active ? 'color-mix(in srgb, var(--color-melsdorf-red) 10%, var(--color-paper-soft))' : 'var(--color-paper-soft)',
                              color: active ? 'var(--color-melsdorf-red-dark)' : 'var(--color-ink-soft)',
                              fontWeight: active ? 600 : 500,
                            }}
                          >
                            <input
                              type="radio"
                              name="springerZeit"
                              checked={active}
                              onChange={() => setSpringerZeitfenster(opt.value as any)}
                              className="sr-only"
                            />
                            {opt.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Essensspenden ── */}
          {step === 3 && (
            <div>
              <h2
                className="font-display text-ink mb-2"
                style={{ fontSize: '1.4rem', fontWeight: 600, fontVariationSettings: '"SOFT" 50, "opsz" 48' }}
              >
                Essensspenden
              </h2>
              <p className="text-ink-soft mb-6" style={{ marginBottom: '1.5rem' }}>
                Möchtet ihr etwas für das Kuchenbuffet mitbringen?
              </p>

              <div className="space-y-2">
                {spenden.map((spende) => {
                  const isKaffee = spende.titel.toLowerCase().includes('kaffee');
                  const hint = isKaffee
                    ? 'Zu um 14 Uhr in der Kaffee-Bar abgeben'
                    : 'Abgabe am Tag des Vagelscheetens zwischen 9 und 12 Uhr in der Cafeteria';
                  return (
                    <OptionCard
                      key={spende.id}
                      checked={selectedSpenden.includes(spende.id)}
                      onChange={() => toggleSpende(spende.id)}
                      title={spende.titel}
                      description={spende.beschreibung}
                      hint={hint}
                      accent="green"
                    />
                  );
                })}
              </div>

              {spenden.length === 0 && (
                <p className="text-ink-muted text-center py-8" style={{ marginBottom: 0 }}>
                  Keine Essensspenden-Kategorien verfügbar.
                </p>
              )}
            </div>
          )}

          {/* ── Step 4: Zusammenfassung ── */}
          {step === 4 && (
            <div>
              <h2
                className="font-display text-ink mb-6"
                style={{ fontSize: '1.4rem', fontWeight: 600, fontVariationSettings: '"SOFT" 50, "opsz" 48' }}
              >
                Zusammenfassung
              </h2>

              <div className="space-y-4">
                <SummaryBlock label={geschwister.length > 0 ? 'Kinder' : 'Kind'}>
                  <p className="text-ink-soft" style={{ marginBottom: 0 }}>
                    <strong className="text-ink">{kindVorname} {kindNachname}</strong>
                    <span className="text-ink-muted text-sm ml-2">Klasse {kindKlasse}</span>
                  </p>
                  {geschwister.map((g, i) => (
                    <p key={i} className="text-ink-soft mt-1" style={{ marginBottom: 0 }}>
                      <strong className="text-ink">{g.vorname} {g.nachname}</strong>
                      <span className="text-ink-muted text-sm ml-2">Klasse {g.klasse}</span>
                    </p>
                  ))}
                </SummaryBlock>

                <SummaryBlock label="E-Mail">
                  <p className="text-ink-soft font-mono" style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', marginBottom: 0 }}>
                    {elternEmail}
                  </p>
                </SummaryBlock>

                <SummaryBlock label="Helfer-Aufgaben">
                  {istSpringer ? (
                    <p style={{ color: 'var(--color-melsdorf-red-dark)', marginBottom: 0 }}>
                      <strong>Springer ({springerZeitfenster === 'beides' ? 'ganztägig' : springerZeitfenster})</strong>
                    </p>
                  ) : selectedAufgaben.length > 0 ? (
                    <ul className="text-ink-soft space-y-1" style={{ marginBottom: 0 }}>
                      {selectedAufgaben.map((id) => {
                        const aufgabe = aufgaben.find((a) => a.id === id);
                        return aufgabe && <li key={id}>• {aufgabe.titel}</li>;
                      })}
                    </ul>
                  ) : (
                    <p className="text-ink-muted italic" style={{ marginBottom: 0 }}>Keine ausgewählt</p>
                  )}
                </SummaryBlock>

                <SummaryBlock label="Essensspenden">
                  {selectedSpenden.length > 0 ? (
                    <ul className="text-ink-soft space-y-1" style={{ marginBottom: 0 }}>
                      {selectedSpenden.map((id) => {
                        const spende = spenden.find((s) => s.id === id);
                        return spende && <li key={id}>• {spende.titel}</li>;
                      })}
                    </ul>
                  ) : (
                    <p className="text-ink-muted italic" style={{ marginBottom: 0 }}>Keine ausgewählt</p>
                  )}
                </SummaryBlock>

                <div>
                  <label className={labelBase}>Anmerkungen (optional)</label>
                  <textarea
                    value={kommentar}
                    onChange={(e) => setKommentar(e.target.value)}
                    rows={3}
                    className={inputBase}
                    placeholder="z. B. zeitliche Einschränkungen, Fragen, Hinweise …"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div
            className="flex justify-between mt-8 pt-6"
            style={{ borderTop: '1px solid color-mix(in srgb, var(--color-ink) 10%, transparent)' }}
          >
            {step > 1 ? (
              <button
                onClick={() => { setStep(step - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex items-center gap-1.5 h-11 px-4 text-ink-soft hover:text-ink transition-colors text-[0.92rem] font-medium"
              >
                <ChevronLeft size={18} />
                Zurück
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={() => { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={!canProceed()}
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-melsdorf-green hover:bg-melsdorf-green-dark text-paper-soft text-[0.92rem] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                Weiter
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-melsdorf-red hover:bg-melsdorf-red-dark text-paper-soft text-[0.92rem] font-semibold transition-all disabled:opacity-40 shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Wird gesendet …
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Anmeldung absenden
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>

        {/* Bestätigungs-Warnhinweis */}
        <div
          className="mt-6 flex items-start gap-3 p-4 rounded-lg border"
          style={{
            borderColor: 'var(--color-melsdorf-orange)',
            backgroundColor: 'color-mix(in srgb, var(--color-melsdorf-orange) 12%, var(--color-paper-soft))',
          }}
        >
          <AlertCircle
            size={22}
            className="shrink-0 mt-0.5"
            style={{ color: 'var(--color-melsdorf-orange)' }}
          />
          <div className="text-sm text-ink leading-relaxed">
            <strong className="font-semibold">Wichtig:</strong> Nach dem Absenden erhaltet ihr eine E-Mail mit einem Bestätigungslink.{' '}
            <strong className="font-semibold">
              Erst wenn ihr diesen Link anklickt, ist eure Anmeldung gültig.
            </strong>
          </div>
        </div>

        {/* Datenschutz-Hinweis */}
        <p className="text-center text-xs text-ink-muted mt-4 leading-relaxed" style={{ marginBottom: 0 }}>
          Eure Daten werden ausschließlich für die Organisation des Vogelschießens verwendet.
        </p>
      </div>
    </div>
  );
}

// ─── Zusammenfassungs-Block ───────────────────────────────────
function SummaryBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-paper-warm) 40%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-ink) 7%, transparent)',
      }}
    >
      <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-muted mb-2">
        {label}
      </h3>
      {children}
    </div>
  );
}
