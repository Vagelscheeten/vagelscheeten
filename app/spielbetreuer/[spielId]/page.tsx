import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import SpielbetreuerDetail from './SpielbetreuerDetail';

export const revalidate = 0;

export default async function SpielStatusPage({
  params,
}: {
  params: Promise<{ spielId: string }>;
}) {
  const { spielId } = await params;

  const supabase = await createClient();
  const { data: spiel } = await supabase
    .from('spiele')
    .select('id, name, ort')
    .eq('id', spielId)
    .single();

  if (!spiel) {
    notFound();
  }

  return <SpielbetreuerDetail spiel={spiel} />;
}
