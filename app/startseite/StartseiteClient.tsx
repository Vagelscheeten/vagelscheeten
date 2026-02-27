'use client';

import React from 'react';
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
  WaveDivider,
} from '@/components/public';
import type { AblaufSectionSettings } from '@/components/public/AblaufSection';

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
    titel: string;
    text1: string;
    text2: string;
    mitbringen: string[];
    fussnote: string;
  } | undefined;

  const ablaufSettings = settings.ablauf as AblaufSectionSettings | undefined;
  const downloadLabels = (settings.downloads_labels ?? {}) as Record<string, string>;

  return (
    <div className="w-full bg-white">
      <HeroSection
        event={activeEvent}
        heroSettings={heroSettings}
      />

      <AblaufSection
        eintraege={ablaufEintraege}
        eventJahr={activeEvent?.jahr}
        sectionSettings={ablaufSettings}
      />

      {/* white → light yellow (Ablauf ends white, Einladung starts yellow) */}
      <WaveDivider fromColor="#ffffff" toColor="#FFF7CB" height={70} />

      <EinladungSection settings={einladungSettings} />

      {/* beige → very light green (Einladung ends beige-ish, Route starts green-ish) */}
      <WaveDivider fromColor="#FAF4E7" toColor="#FBFEF8" height={60} flip />

      <RouteSection />

      {/* light blue → pastel green (Route ends blue-ish, Spiele starts green) */}
      <WaveDivider fromColor="#F4FCFE" toColor="#F4FBE9" height={70} />

      <SpieleSection games={games} />

      {/* pastel green → dark slate (Spenden) — dramatic! */}
      <WaveDivider fromColor="#F4FBE9" toColor="#33665B" height={90} flip />

      <SpendenSection
        settings={spendenSettings}
        eventJahr={activeEvent?.jahr}
      />

      {/* dark slate → white (Galerie) — dramatic! */}
      <WaveDivider fromColor="#33665B" toColor="#ffffff" height={90} />

      <GalerieSection images={galleryImages} />

      {/* near-white → warm beige (Galerie ends slate-50, Kontakt is beige) */}
      <WaveDivider fromColor="#F8FAFC" toColor="#FAF4E7" height={60} flip />

      <KontaktSection />

      {/* beige → very light blue (Downloads starts pale blue) */}
      <WaveDivider fromColor="#FAF4E7" toColor="#FAFEFE" height={60} />

      <DownloadsSection files={downloadFiles} labels={downloadLabels} />
    </div>
  );
}
