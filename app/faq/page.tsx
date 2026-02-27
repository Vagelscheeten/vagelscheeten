import React from 'react';
import { createClient } from '@/lib/supabase/server';
import FaqAccordion from './FaqAccordion';

export const revalidate = 60;

export const metadata = {
  title: 'FAQ – Melsdörper Vagelscheeten',
  description: 'Häufig gestellte Fragen rund um das Vogelschießen der Regenbogenschule Melsdorf.',
};

export default async function FaqPage() {
  const supabase = await createClient();

  const [katResult, eintraegeResult, settingsResult] = await Promise.all([
    supabase.from('faq_kategorien').select('*').order('sortierung'),
    supabase.from('faq_eintraege').select('*').order('sortierung'),
    supabase.from('seiteneinstellungen').select('key, value').eq('key', 'faq_hero').single(),
  ]);

  const kategorien   = katResult.data || [];
  const eintraege    = eintraegeResult.data || [];
  const heroSettings = settingsResult.data?.value as { titel?: string; untertitel?: string } | undefined;

  return (
    <FaqAccordion
      kategorien={kategorien}
      eintraege={eintraege}
      heroSettings={heroSettings}
    />
  );
}
