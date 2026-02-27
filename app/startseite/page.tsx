import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { StartseiteClient } from './StartseiteClient';

export const revalidate = 60; // revalidate data every 60 seconds

export const metadata = {
  title: 'Startseite – Melsdörper Vagelscheeten',
  description:
    'Das Vogelschießen der Regenbogenschule Melsdorf – Spiele, Festumzug, Galerie, Downloads und mehr.',
  openGraph: {
    title: 'Melsdörper Vagelscheeten',
    description:
      'Das Vogelschießen der Regenbogenschule Melsdorf – Ein Fest für Kinder, Eltern und Besucher.',
    type: 'website',
  },
};

async function fetchStartseiteData() {
  const supabase = await createClient();

  // Parallel data fetching for performance
  const [
    eventResult,
    gamesResult,
    ablaufResult,
    settingsResult,
    galerieResult,
    downloadsResult,
  ] = await Promise.all([
    // Active event
    supabase.from('events').select('*').eq('ist_aktiv', true).single(),
    // Games
    supabase.from('spiele').select('id, name, beschreibung, icon').order('name'),
    // Ablauf entries
    supabase.from('ablauf_eintraege').select('*').order('sortierung'),
    // Site settings
    supabase.from('seiteneinstellungen').select('key, value'),
    // Gallery images from storage
    supabase.storage.from('galerie').list(''),
    // Download files from storage
    supabase.storage.from('downloads').list(''),
  ]);

  // Process event
  const activeEvent = eventResult.data || null;

  // Filter ablauf for active event
  const ablaufEintraege = (ablaufResult.data || []).filter(
    (e: { event_id: string | null }) =>
      !activeEvent || e.event_id === activeEvent.id
  );

  // Process settings into a map
  const settingsMap: Record<string, unknown> = {};
  if (settingsResult.data) {
    for (const s of settingsResult.data) {
      settingsMap[s.key] = s.value;
    }
  }

  // Process gallery images
  const galleryImages = [];
  if (galerieResult.data) {
    const imageFiles = galerieResult.data.filter((file: { name: string }) =>
      file.name.match(/\.(jpeg|jpg|png|gif|webp)$/i)
    );
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const {
        data: { publicUrl },
      } = supabase.storage.from('galerie').getPublicUrl(file.name);
      galleryImages.push({ id: i, name: file.name, url: publicUrl });
    }
  }

  // Process download files
  const downloadFiles = [];
  if (downloadsResult.data) {
    const validFiles = downloadsResult.data.filter(
      (file: { name: string }) => !file.name.startsWith('.')
    );
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const {
        data: { publicUrl },
      } = supabase.storage.from('downloads').getPublicUrl(file.name);
      downloadFiles.push({ id: i, name: file.name, url: publicUrl });
    }
  }

  return {
    activeEvent,
    games: gamesResult.data || [],
    ablaufEintraege,
    settings: settingsMap,
    galleryImages,
    downloadFiles,
  };
}

export default async function Startseite() {
  const data = await fetchStartseiteData();

  return <StartseiteClient {...data} />;
}
