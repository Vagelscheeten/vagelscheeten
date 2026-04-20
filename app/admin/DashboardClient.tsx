'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users, Layers, HandHeart, CalendarDays,
  Clock, HelpCircle, Crown, Image as ImageIcon, Download, Settings,
  Gamepad2, UserCheck, BarChart3, FileText, Wrench, GraduationCap,
  ArrowUpRight,
} from 'lucide-react';
import { PageShell, StatCard, StatusBadge, EmptyState } from '@/components/admin';

type ActiveEvent = {
  id: string;
  name: string | null;
  jahr: number;
  datum: string | null;
  ist_aktiv: boolean;
};

interface DashboardClientProps {
  activeEvent: ActiveEvent | null;
  counts: {
    kinder: number;
    gruppen: number;
    rueckmeldungen: number;
    aufgaben: number;
  } | null;
}

const quickActionGroups = [
  {
    title: 'Organisation',
    items: [
      { href: '/admin/gruppen',   label: 'Kinder & Gruppen',  icon: Users,         desc: 'Import, Klassen, Spielgruppen' },
      { href: '/admin/spiele',    label: 'Spiele',            icon: Gamepad2,      desc: 'Katalog, Wertungstypen' },
      { href: '/admin/helfer',    label: 'Helfer',            icon: UserCheck,     desc: 'Aufgaben, Zusagen, Zuteilung' },
      { href: '/admin/events',    label: 'Events',            icon: CalendarDays,  desc: 'Jahrgang aktivieren' },
      { href: '/admin/klassen',   label: 'Klassen',           icon: GraduationCap, desc: 'Klassen-Metadaten' },
    ],
  },
  {
    title: 'Auswertung',
    items: [
      { href: '/admin/auswertung', label: 'Auswertung',     icon: BarChart3, desc: 'Live-Stand, Könige, Ranking' },
      { href: '/admin/reporting',  label: 'Reporting',      icon: FileText,  desc: 'Export, Statistiken' },
      { href: '/admin/settings',   label: 'Einstellungen',  icon: Wrench,    desc: 'System, Reset' },
    ],
  },
  {
    title: 'Inhalte der Webseite',
    items: [
      { href: '/admin/ablauf',         label: 'Ablaufplan',         icon: Clock,      desc: 'Zeitplan des Festes' },
      { href: '/admin/faq',            label: 'FAQ',                icon: HelpCircle, desc: 'Häufige Fragen' },
      { href: '/admin/historie',       label: 'Historie',           icon: Crown,      desc: 'Königspaare vergangener Jahre' },
      { href: '/admin/galerie',        label: 'Galerie',            icon: ImageIcon,  desc: 'Bilder hochladen' },
      { href: '/admin/downloads',      label: 'Downloads',          icon: Download,   desc: 'Dokumente' },
      { href: '/admin/einstellungen',  label: 'Seiteneinstellungen',icon: Settings,   desc: 'Texte, Kontakt, Spenden' },
    ],
  },
];

function QuickLinkCard({
  href, label, icon: Icon, desc,
}: { href: string; label: string; icon: React.ElementType; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 p-3.5 rounded-lg border border-admin-border bg-admin-surface hover:border-admin-border-strong hover:bg-admin-surface-hover transition-all"
    >
      <span className="inline-flex items-center justify-center shrink-0 w-9 h-9 rounded-md bg-admin-surface-muted text-admin-ink-soft group-hover:bg-admin-accent-bg group-hover:text-admin-accent transition-colors">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[0.88rem] font-semibold text-admin-ink">
          {label}
          <ArrowUpRight size={12} className="text-admin-ink-muted/0 group-hover:text-admin-ink-muted transition-colors" />
        </div>
        <div className="text-[0.78rem] text-admin-ink-muted mt-0.5 leading-snug">
          {desc}
        </div>
      </div>
    </Link>
  );
}

export function DashboardClient({ activeEvent, counts }: DashboardClientProps) {
  const eventBadge = activeEvent ? (
    <StatusBadge variant="success" size="sm">
      Aktives Event · {activeEvent.name ?? `Vagelscheeten ${activeEvent.jahr}`}
    </StatusBadge>
  ) : (
    <StatusBadge variant="warn" size="sm">Kein aktives Event</StatusBadge>
  );

  const metaLine = (
    <>
      {eventBadge}
      {activeEvent?.datum && (
        <span className="flex items-center gap-1">
          <CalendarDays size={11} className="text-admin-ink-muted" />
          {new Date(activeEvent.datum).toLocaleDateString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
          })}
        </span>
      )}
    </>
  );

  return (
    <PageShell
      title="Übersicht"
      description="Kennzahlen und Schnellaktionen für das aktive Vogelschießen."
      meta={metaLine}
    >
      {counts ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
          <StatCard
            label="Kinder"
            value={counts.kinder}
            sub="Registriert im aktiven Event"
            icon={Users}
            tone="info"
            href="/admin/gruppen"
          />
          <StatCard
            label="Spielgruppen"
            value={counts.gruppen}
            sub="Über alle Klassenstufen"
            icon={Layers}
            tone="accent"
            href="/admin/gruppen"
          />
          <StatCard
            label="Helfer-Aufgaben"
            value={counts.aufgaben}
            sub="Definierte Slots"
            icon={UserCheck}
            tone="neutral"
            href="/admin/helfer/aufgaben"
          />
          <StatCard
            label="Helfer-Zusagen"
            value={counts.rueckmeldungen}
            sub="Eingegangene Rückmeldungen"
            icon={HandHeart}
            tone="success"
            href="/admin/helfer"
          />
        </div>
      ) : (
        <div className="mb-10">
          <EmptyState
            icon={CalendarDays}
            title="Kein aktives Event"
            description="Es ist derzeit kein Event aktiv. Lege ein neues Event an oder aktiviere einen bestehenden Jahrgang."
            action={
              <Link
                href="/admin/events"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-admin-accent hover:brightness-95 text-white text-[0.85rem] font-semibold transition-all"
              >
                <CalendarDays size={14} /> Zu Events
              </Link>
            }
          />
        </div>
      )}

      {quickActionGroups.map((group) => (
        <section key={group.title} className="mb-10">
          <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-admin-ink-muted mb-3">
            {group.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map((item) => (
              <QuickLinkCard key={item.href} {...item} />
            ))}
          </div>
        </section>
      ))}
    </PageShell>
  );
}
