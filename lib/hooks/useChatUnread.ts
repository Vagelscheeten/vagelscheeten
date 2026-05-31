'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function key(eventId: string) {
  return `chat_last_seen_${eventId}`;
}

/** Liest den "zuletzt gesehen"-Zeitstempel (oder setzt ihn initial auf jetzt). */
function getLastSeen(eventId: string): string {
  if (typeof window === 'undefined') return new Date(0).toISOString();
  const vorhanden = window.localStorage.getItem(key(eventId));
  if (vorhanden) return vorhanden;
  const jetzt = new Date().toISOString();
  window.localStorage.setItem(key(eventId), jetzt);
  return jetzt;
}

/** Markiert den Chat des Events als gelesen (jetzt) und informiert die Sidebar. */
export function markChatGesehen(eventId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key(eventId), new Date().toISOString());
  window.dispatchEvent(new Event('chat-gesehen'));
}

/**
 * Liefert die Anzahl ungelesener Leiter-Nachrichten für das aktive Event.
 * Pollt alle 15s und reagiert auf Fokus + "chat-gesehen"-Events.
 */
export function useChatUnread(): number {
  const [eventId, setEventId] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  // Aktives Event einmalig ermitteln
  useEffect(() => {
    let abbruch = false;
    const supabase = createClient();
    supabase
      .from('events')
      .select('id')
      .eq('ist_aktiv', true)
      .maybeSingle()
      .then(({ data }) => {
        if (!abbruch) setEventId(data?.id ?? null);
      });
    return () => {
      abbruch = true;
    };
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const supabase = createClient();

    const fetchCount = async () => {
      const lastSeen = getLastSeen(eventId);
      const { count: c } = await supabase
        .from('chat_nachrichten')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('absender_typ', 'leiter')
        .gt('created_at', lastSeen);
      setCount(c ?? 0);
    };

    void fetchCount();
    const interval = setInterval(() => void fetchCount(), 15_000);
    const onSignal = () => void fetchCount();
    window.addEventListener('focus', onSignal);
    window.addEventListener('chat-gesehen', onSignal);
    window.addEventListener('storage', onSignal);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onSignal);
      window.removeEventListener('chat-gesehen', onSignal);
      window.removeEventListener('storage', onSignal);
    };
  }, [eventId]);

  return count;
}
