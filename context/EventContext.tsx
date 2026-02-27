'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

export type Event = {
  id: string;
  name: string;
  jahr: number;
  ist_aktiv: boolean;
  created_at: string;
};

type EventContextType = {
  activeEvent: Event | null;
  allEvents: Event[];
  loading: boolean;
  error: string | null;
  setActiveEvent: (event: Event) => void;
  refreshEvents: () => Promise<void>;
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const [activeEvent, setActiveEventState] = useState<Event | null>(null);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .order('jahr', { ascending: false });

      if (fetchError) {
        console.error('Error fetching events:', fetchError);
        setError('Fehler beim Laden der Events');
        return;
      }

      setAllEvents(data || []);
      
      // Set active event (prefer ist_aktiv = true, otherwise most recent)
      const active = data?.find(e => e.ist_aktiv) || data?.[0] || null;
      setActiveEventState(active);
    } catch (err) {
      console.error('Error in refreshEvents:', err);
      setError('Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshEvents();
  }, []);

  const setActiveEvent = (event: Event) => {
    setActiveEventState(event);
    // Optionally persist to localStorage for session persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeEventId', event.id);
    }
  };

  return (
    <EventContext.Provider value={{
      activeEvent,
      allEvents,
      loading,
      error,
      setActiveEvent,
      refreshEvents
    }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}

// Hook to get just the active event ID (convenience)
export function useActiveEventId(): string | null {
  const { activeEvent } = useEvent();
  return activeEvent?.id || null;
}
