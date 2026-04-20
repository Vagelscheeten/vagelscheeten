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
    <div className="w-full bg-paper full-bleed -mt-6">
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
