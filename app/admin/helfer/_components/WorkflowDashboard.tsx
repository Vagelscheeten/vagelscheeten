'use client';

import { useState } from 'react';
import {
  CheckCircle2, ArrowRight, Lock, ChevronDown, ChevronRight,
  ExternalLink, ClipboardList, Utensils, Wrench, Search,
} from 'lucide-react';
import Link from 'next/link';
import { Phase1Sichten } from './Phase1Sichten';
import { Phase2Zuteilen } from './Phase2Zuteilen';
import { Phase3Pruefen } from './Phase3Pruefen';
import { Phase4Kommunizieren } from './Phase4Kommunizieren';
import { Phase5Nachpflegen } from './Phase5Nachpflegen';
import { PhaseEssensspenden } from './PhaseEssensspenden';

export interface WorkflowStats {
  anzahlRueckmeldungen: number;
  anzahlZuteilungen: number;
  anzahlBenachrichtigt: number;
  anzahlZuBenachrichtigen: number;
  aufgaben: { id: string; titel: string; bedarf: number; zeitfenster: string }[];
  eventId: string;
  anzahlEssensspendenRueckmeldungen: number;
  essensspendenVerteilt: boolean;
}

type SchrittStatus = 'done' | 'current' | 'locked';

interface Schritt {
  nr: number;
  titel: string;
  beschreibung: string;
  summaryDone: (s: WorkflowStats) => string;
  icon: React.ElementType;
  status: (s: WorkflowStats) => SchrittStatus;
}

const SCHRITTE: Schritt[] = [
  {
    nr: 1,
    titel: 'Helfer sichten & zuteilen',
    beschreibung: 'Rückmeldungen ansehen, dann Auto-Zuteilung starten.',
    summaryDone: (s) =>
      `${s.anzahlRueckmeldungen} Rückmeldung${s.anzahlRueckmeldungen !== 1 ? 'en' : ''} · ${s.anzahlZuteilungen} Zuteilungen erstellt`,
    icon: ClipboardList,
    status: (s) => {
      if (s.anzahlZuteilungen > 0) return 'done';
      return 'current';
    },
  },
  {
    nr: 2,
    titel: 'Essensspenden verteilen',
    beschreibung: 'Wer bringt was? Angebote bestätigen, Überschuss umbuchen.',
    summaryDone: (s) =>
      `${s.anzahlEssensspendenRueckmeldungen} Zusage${s.anzahlEssensspendenRueckmeldungen !== 1 ? 'n' : ''} verteilt`,
    icon: Utensils,
    status: (s) => {
      if (s.anzahlZuteilungen === 0) return 'locked';
      if (s.essensspendenVerteilt) return 'done';
      return 'current';
    },
  },
  {
    nr: 3,
    titel: 'Prüfen & Benachrichtigen',
    beschreibung: 'Zuteilungen kontrollieren, Lücken schließen, Eltern per E-Mail informieren.',
    summaryDone: (s) =>
      `${s.anzahlBenachrichtigt} von ${s.anzahlZuBenachrichtigen} Eltern benachrichtigt`,
    icon: Wrench,
    status: (s) => {
      if (!s.essensspendenVerteilt) return 'locked';
      if (s.anzahlZuBenachrichtigen > 0 && s.anzahlBenachrichtigt >= s.anzahlZuBenachrichtigen) return 'done';
      return 'current';
    },
  },
  {
    nr: 4,
    titel: 'Nachpflegen',
    beschreibung: 'Kurzfristige Änderungen, Absagen, Korrekturen — jederzeit.',
    summaryDone: () => 'Laufend aktiv',
    icon: Search,
    status: (s) => {
      if (!s.essensspendenVerteilt) return 'locked';
      return 'current';
    },
  },
];

interface WorkflowDashboardProps {
  stats: WorkflowStats;
  onRefresh: () => void;
}

export function WorkflowDashboard({ stats, onRefresh }: WorkflowDashboardProps) {
  const aktuellerSchritt = SCHRITTE.find(
    (s) => s.status(stats) === 'current'
  )?.nr ?? 4;

  const [offeneSchritte, setOffeneSchritte] = useState<Set<number>>(
    () => new Set([aktuellerSchritt])
  );

  const toggle = (nr: number, status: SchrittStatus) => {
    if (status === 'locked') return;
    setOffeneSchritte((prev) => {
      const next = new Set(prev);
      if (next.has(nr)) next.delete(nr);
      else next.add(nr);
      return next;
    });
  };

  const doneAnzahl = SCHRITTE.filter((s) => s.status(stats) === 'done').length;
  const fortschrittProzent = Math.round((doneAnzahl / SCHRITTE.length) * 100);

  return (
    <div className="space-y-3">
      {/* Status-Banner */}
      <StatusBanner stats={stats} aktuellerSchritt={aktuellerSchritt} fortschrittProzent={fortschrittProzent} />

      {/* Schritt-Karten */}
      {SCHRITTE.map((schritt) => {
        const status = schritt.status(stats);
        const isOffen = offeneSchritte.has(schritt.nr);
        const Icon = schritt.icon;

        return (
          <div
            key={schritt.nr}
            className={`rounded-xl border transition-all ${
              status === 'current'
                ? 'border-orange-300 bg-white shadow-sm'
                : status === 'done'
                ? 'border-green-200 bg-green-50/40'
                : 'border-slate-100 bg-slate-50 opacity-55'
            }`}
          >
            {/* Header */}
            <button
              onClick={() => toggle(schritt.nr, status)}
              disabled={status === 'locked'}
              className="w-full text-left px-5 py-4 flex items-center gap-4"
            >
              {/* Status-Icon */}
              <div className="shrink-0 w-8 flex justify-center">
                {status === 'done' && <CheckCircle2 size={24} className="text-green-500" />}
                {status === 'current' && (
                  <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center">
                    <ArrowRight size={14} className="text-white" />
                  </div>
                )}
                {status === 'locked' && <Lock size={18} className="text-slate-300" />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-bold uppercase tracking-widest ${
                    status === 'current' ? 'text-orange-500' :
                    status === 'done'    ? 'text-green-600'  : 'text-slate-400'
                  }`}>
                    Schritt {schritt.nr}
                  </span>
                  {status === 'done' && (
                    <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                      Erledigt
                    </span>
                  )}
                  {status === 'current' && schritt.nr === aktuellerSchritt && (
                    <span className="text-[11px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                      Jetzt aktiv
                    </span>
                  )}
                  {status === 'locked' && (
                    <span className="text-[11px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                      Gesperrt bis Schritt {schritt.nr - 1} abgeschlossen
                    </span>
                  )}
                </div>

                <div className={`font-semibold text-base mt-0.5 ${
                  status === 'locked' ? 'text-slate-400' : 'text-slate-800'
                }`}>
                  {schritt.titel}
                </div>

                <div className={`text-sm mt-0.5 ${
                  status === 'done'    ? 'text-green-700' :
                  status === 'current' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {status === 'done' ? schritt.summaryDone(stats) : schritt.beschreibung}
                </div>
              </div>

              {/* Chevron */}
              {status !== 'locked' && (
                <div className="shrink-0 text-slate-400">
                  {isOffen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              )}
            </button>

            {/* Inhalt (aufgeklappt) */}
            {isOffen && status !== 'locked' && (
              <div className="border-t border-slate-100">
                {schritt.nr === 1 && (
                  <SchrittSichtenZuteilen stats={stats} onRefresh={onRefresh} />
                )}
                {schritt.nr === 2 && (
                  <div className="px-5 py-5">
                    <PhaseEssensspenden eventId={stats.eventId} onRefresh={onRefresh} />
                  </div>
                )}
                {schritt.nr === 3 && (
                  <SchrittPruefenBenachrichtigen stats={stats} onRefresh={onRefresh} />
                )}
                {schritt.nr === 4 && (
                  <div className="px-5 py-5">
                    <Phase5Nachpflegen eventId={stats.eventId} onRefresh={onRefresh} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Weitere Tools */}
      <div className="pt-6 border-t border-slate-100 mt-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Weitere Tools
        </p>
        <div className="flex flex-wrap gap-2">
          <ToolLink href="/admin/helfer/detail" label="Spielbetreuer & Teamleiter" />
          <ToolLink href="/admin/helfer/aufgaben" label="Aufgaben verwalten" />
          <ToolLink href="/admin/helfer/essensspenden" label="Essensspenden (Detail)" />
          <ToolLink href="/admin/helfer/pdf" label="PDF-Export" />
        </div>
      </div>
    </div>
  );
}

// ── Schritt 1: Rückmeldungen sichten + Zuteilen ──────────────────────────────

function SchrittSichtenZuteilen({ stats, onRefresh }: { stats: WorkflowStats; onRefresh: () => void }) {
  const [tab, setTab] = useState<'sichten' | 'zuteilen'>('sichten');

  return (
    <div>
      {/* Sub-Navigation */}
      <div className="flex border-b border-slate-100">
        <SubTab active={tab === 'sichten'} onClick={() => setTab('sichten')} label="Rückmeldungen" badge={stats.anzahlRueckmeldungen} />
        <SubTab active={tab === 'zuteilen'} onClick={() => setTab('zuteilen')} label="Auto-Zuteilung" badge={stats.anzahlZuteilungen > 0 ? stats.anzahlZuteilungen : undefined} badgeDone={stats.anzahlZuteilungen > 0} />
      </div>
      <div className="px-5 py-5">
        {tab === 'sichten' && (
          <>
            {stats.anzahlZuteilungen === 0 && (
              <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
                Wenn du alle Rückmeldungen gesehen hast, wechsle zum Tab <strong>Auto-Zuteilung</strong> und starte die Zuteilung. Damit ist dieser Schritt abgeschlossen.
              </div>
            )}
            <Phase1Sichten eventId={stats.eventId} onRefresh={onRefresh} />
          </>
        )}
        {tab === 'zuteilen' && (
          <Phase2Zuteilen
            eventId={stats.eventId}
            anzahlRueckmeldungen={stats.anzahlRueckmeldungen}
            anzahlZuteilungen={stats.anzahlZuteilungen}
            onRefresh={onRefresh}
          />
        )}
      </div>
    </div>
  );
}

// ── Schritt 3: Prüfen + Benachrichtigen ─────────────────────────────────────

function SchrittPruefenBenachrichtigen({ stats, onRefresh }: { stats: WorkflowStats; onRefresh: () => void }) {
  const [tab, setTab] = useState<'pruefen' | 'benachrichtigen'>('pruefen');

  return (
    <div>
      <div className="flex border-b border-slate-100">
        <SubTab active={tab === 'pruefen'} onClick={() => setTab('pruefen')} label="Zuteilungen prüfen" />
        <SubTab active={tab === 'benachrichtigen'} onClick={() => setTab('benachrichtigen')} label="Eltern benachrichtigen" badge={stats.anzahlBenachrichtigt > 0 ? stats.anzahlBenachrichtigt : undefined} badgeDone={stats.anzahlBenachrichtigt > 0} />
      </div>
      <div className="px-5 py-5">
        {tab === 'pruefen' && (
          <>
            {stats.anzahlBenachrichtigt === 0 && (
              <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
                Wenn alle Zuteilungen stimmen, wechsle zu <strong>Eltern benachrichtigen</strong>. Damit ist dieser Schritt abgeschlossen.
              </div>
            )}
            <Phase3Pruefen eventId={stats.eventId} onRefresh={onRefresh} />
          </>
        )}
        {tab === 'benachrichtigen' && (
          <Phase4Kommunizieren eventId={stats.eventId} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  );
}

// ── Status-Banner ────────────────────────────────────────────────────────────

function StatusBanner({ stats, aktuellerSchritt, fortschrittProzent }: {
  stats: WorkflowStats;
  aktuellerSchritt: number;
  fortschrittProzent: number;
}) {
  const nachricht = (() => {
    if (stats.anzahlRueckmeldungen === 0)
      return 'Warte auf Rückmeldungen der Eltern. Sobald der Stichtag erreicht ist, hier starten.';
    if (stats.anzahlZuteilungen === 0)
      return `${stats.anzahlRueckmeldungen} Rückmeldung${stats.anzahlRueckmeldungen !== 1 ? 'en' : ''} eingegangen. Jetzt sichten und danach die Auto-Zuteilung starten — Schritt 1 ist dann fertig.`;
    if (!stats.essensspendenVerteilt)
      return `${stats.anzahlZuteilungen} Zuteilungen erstellt. Jetzt Essensspenden verteilen (Auto-Verteilen klicken) — Schritt 2 ist dann fertig.`;
    if (stats.anzahlBenachrichtigt === 0)
      return `Essensspenden verteilt. Jetzt Zuteilungen prüfen, dann Eltern benachrichtigen — Schritt 3 ist dann fertig.`;
    return `Alle ${stats.anzahlBenachrichtigt} Eltern benachrichtigt. Bei Änderungen: Schritt 4 nutzen.`;
  })();

  const isComplete = fortschrittProzent === 100;

  return (
    <div className={`rounded-xl border p-4 mb-1 ${isComplete ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Nächster Schritt
          </div>
          <p className={`text-sm font-medium leading-snug ${isComplete ? 'text-green-800' : 'text-slate-800'}`}>
            {nachricht}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold text-slate-700">{fortschrittProzent}%</div>
          <div className="text-[11px] text-slate-400">erledigt</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 bg-white/70 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-400' : 'bg-orange-400'}`}
          style={{ width: `${fortschrittProzent}%` }}
        />
      </div>
    </div>
  );
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function SubTab({ active, onClick, label, badge, badgeDone }: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
  badgeDone?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
        active
          ? 'border-orange-400 text-slate-900'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
      {badge !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
          badgeDone ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function ToolLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
    >
      <ExternalLink size={12} />
      {label}
    </Link>
  );
}
