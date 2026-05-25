'use client';

import React from 'react';
import Link from 'next/link';
import {
  HeroSection,
  AblaufSection,
  EinladungSection,
  RouteSection,
  SpieleSection,
  SpendenSection,
  GalerieSection,
  KontaktSection,
  DownloadsSection,
} from '@/components/public';
import type { AblaufSectionSettings } from '@/components/public/AblaufSection';

function LiveBanner({ datum }: { datum: string | null }) {
  if (!datum) return null;
  const heute = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
  if (datum !== heute) return null;
  return (
    <Link
      href="/live"
      className="block w-full bg-melsdorf-red text-paper-soft hover:bg-melsdorf-red-dark transition-colors"
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-center gap-3 text-sm sm:text-base font-semibold">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-paper-soft opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-paper-soft"></span>
        </span>
        <span>Vagelscheeten läuft jetzt — Live-Stand anschauen</span>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}

// Types from server data
type ActiveEvent = {
  id: string;
  name: string;
  jahr: number;
  datum: string | null;
  ist_aktiv: boolean;
};

type Game = {
  id: string;
  name: string;
  beschreibung: string;
  icon?: string | null;
};

type AblaufEintrag = {
  id: string;
  uhrzeit: string;
  titel: string;
  beschreibung: string | null;
  icon: string | null;
  farbe: string;
  sortierung: number;
  ist_highlight: boolean;
  hinweis: string | null;
};

type GalleryImage = {
  id: number;
  name: string;
  url: string;
};

type DownloadFile = {
  id: number;
  name: string;
  url: string;
};

interface StartseiteClientProps {
  activeEvent: ActiveEvent | null;
  games: Game[];
  ablaufEintraege: AblaufEintrag[];
  settings: Record<string, unknown>;
  galleryImages: GalleryImage[];
  downloadFiles: DownloadFile[];
}

export function StartseiteClient({
  activeEvent,
  games,
  ablaufEintraege,
  settings,
  galleryImages,
  downloadFiles,
}: StartseiteClientProps) {
  const heroSettings = settings.hero as {
    titel: string;
    untertitel: string;
    cta_text: string;
    cta_beschreibung: string;
  } | undefined;

  const spendenSettings = settings.spenden as {
    kontoinhaber: string;
    iban: string;
    bic: string;
    verwendungszweck_prefix: string;
    beschreibung_links: string;
    beschreibung_helfer: string;
  } | undefined;

  const einladungSettings = settings.einladung as {
    badge?: string;
    titel: string;
    text1: string;
    text2: string;
    mitbringen: string[];
    fussnote: string;
    card1_kicker?: string;
    card1_titel?: string;
    card1_text?: string;
    card2_kicker?: string;
    card2_titel?: string;
    card2_text?: string;
    card3_kicker?: string;
    card3_titel?: string;
  } | undefined;

  const ablaufSettings = settings.ablauf as AblaufSectionSettings | undefined;
  const downloadLabels = (settings.downloads_labels ?? {}) as Record<string, string>;

  return (
    <div className="w-full bg-paper full-bleed -mt-6">
      <LiveBanner datum={activeEvent?.datum ?? null} />
      <HeroSection
        event={activeEvent}
        heroSettings={heroSettings}
        galleryImages={galleryImages}
      />

      <AblaufSection
        eintraege={ablaufEintraege}
        eventJahr={activeEvent?.jahr}
        sectionSettings={ablaufSettings}
      />

      <EinladungSection settings={einladungSettings} />

      <RouteSection />

      <SpieleSection games={games} />

      <SpendenSection
        settings={spendenSettings}
        eventJahr={activeEvent?.jahr}
      />

      <GalerieSection images={galleryImages} />

      <KontaktSection />

      <DownloadsSection files={downloadFiles} labels={downloadLabels} />
    </div>
  );
}
