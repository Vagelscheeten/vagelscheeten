import type { SupabaseClient } from '@supabase/supabase-js';
import { stripRePrefixes } from '@/lib/email-utils';

/**
 * Normalisiert einen Betreff für Thread-Matching:
 * - mehrfache Re:/Fwd:/AW:/WG:-Prefixe entfernen
 * - Whitespace kollabieren
 * - lowercase
 */
export function normalizeSubject(subject: string | null | undefined): string {
  const stripped = stripRePrefixes(subject ?? '');
  return stripped.replace(/\s+/g, ' ').trim().toLowerCase();
}

export interface ResolveThreadInput {
  inReplyTo: string | null;
  references: string[];
  subject: string;
  participants: string[];
}

export interface ResolveThreadResult {
  threadId: string;
  created: boolean;
}

/**
 * Findet einen passenden Thread für eine neu eingehende Mail — oder legt einen neuen an.
 *
 * Priorität:
 *   1. In-Reply-To / References matcht eine existierende Message-ID
 *   2. Normalisierter Subject + überlappende Teilnehmer
 *   3. Neuer Thread
 */
export async function resolveThread(
  supabase: SupabaseClient,
  input: ResolveThreadInput
): Promise<ResolveThreadResult> {
  const subjectNormalized = normalizeSubject(input.subject);
  const participants = dedupeLowercase(input.participants);

  // 1. Header-Chain-Match
  const candidateIds = [input.inReplyTo, ...input.references].filter(Boolean) as string[];
  if (candidateIds.length > 0) {
    const { data: headerMatch } = await supabase
      .from('emails')
      .select('thread_id')
      .in('message_id', candidateIds)
      .limit(1)
      .maybeSingle();

    if (headerMatch?.thread_id) {
      await mergeParticipants(supabase, headerMatch.thread_id, participants);
      return { threadId: headerMatch.thread_id, created: false };
    }
  }

  // 2. Subject + Teilnehmer-Überlappung
  if (subjectNormalized.length > 0 && participants.length > 0) {
    const { data: subjectMatches } = await supabase
      .from('email_threads')
      .select('id, participants')
      .eq('subject_normalized', subjectNormalized)
      .order('last_message_at', { ascending: false })
      .limit(10);

    const overlap = (subjectMatches ?? []).find((t) =>
      (t.participants ?? []).some((p: string) => participants.includes(p.toLowerCase()))
    );

    if (overlap?.id) {
      await mergeParticipants(supabase, overlap.id, participants);
      return { threadId: overlap.id, created: false };
    }
  }

  // 3. Neuer Thread
  const { data: created, error } = await supabase
    .from('email_threads')
    .insert({
      subject_normalized: subjectNormalized,
      participants,
      last_message_at: new Date().toISOString(),
      message_count: 0,
      has_unread: true,
    })
    .select('id')
    .single();

  if (error || !created) {
    throw new Error(`Thread konnte nicht angelegt werden: ${error?.message ?? 'unknown'}`);
  }
  return { threadId: created.id, created: true };
}

async function mergeParticipants(
  supabase: SupabaseClient,
  threadId: string,
  newParticipants: string[]
): Promise<void> {
  if (newParticipants.length === 0) return;
  const { data: current } = await supabase
    .from('email_threads')
    .select('participants')
    .eq('id', threadId)
    .maybeSingle();

  const merged = dedupeLowercase([...(current?.participants ?? []), ...newParticipants]);
  if (merged.length === (current?.participants ?? []).length) return;

  await supabase.from('email_threads').update({ participants: merged }).eq('id', threadId);
}

function dedupeLowercase(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const k = (v ?? '').trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}
