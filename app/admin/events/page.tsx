'use client';

import React, { useState } from 'react';
import { useEvent, EventProvider } from '@/context/EventContext';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Plus, Check, Archive, Loader2, AlertCircle, Trash2, Edit2, Save, X } from 'lucide-react';

function EventsPageContent() {
  const { allEvents, activeEvent, refreshEvents, loading } = useEvent();
  const [isCreating, setIsCreating] = useState(false);
  const [newEventYear, setNewEventYear] = useState(new Date().getFullYear() + 1);
  const [newEventName, setNewEventName] = useState(`Vogelschießen ${new Date().getFullYear() + 1}`);
  const [newEventDate, setNewEventDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [editDeadline, setEditDeadline] = useState('');

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) {
      setError('Bitte einen Namen eingeben');
      return;
    }

    setActionLoading('create');
    setError(null);

    try {
      const supabase = createClient();
      
      // Check if event for this year already exists
      const existing = allEvents.find(e => e.jahr === newEventYear);
      if (existing) {
        setError(`Ein Event für ${newEventYear} existiert bereits`);
        setActionLoading(null);
        return;
      }

      // Find the previous year's event to copy from
      const previousEvent = allEvents.find(e => e.jahr === newEventYear - 1);

      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert({
          name: newEventName.trim(),
          jahr: newEventYear,
          ist_aktiv: false,
          datum: newEventDate || null
        })
        .select()
        .single();

      if (insertError || !newEvent) {
        console.error('Error creating event:', insertError);
        setError('Fehler beim Erstellen des Events');
        return;
      }

      // Copy data from previous year if exists
      if (previousEvent) {
        // Copy helferaufgaben
        const { data: aufgaben } = await supabase
          .from('helferaufgaben')
          .select('titel, beschreibung, bedarf, zeitfenster, has_slots, is_game_supervisor')
          .eq('event_id', previousEvent.id);
        
        if (aufgaben && aufgaben.length > 0) {
          await supabase
            .from('helferaufgaben')
            .insert(aufgaben.map(a => ({ ...a, event_id: newEvent.id })));
        }

        // Copy essensspenden_bedarf
        const { data: spenden } = await supabase
          .from('essensspenden_bedarf')
          .select('titel, beschreibung, anzahl_benoetigt')
          .eq('event_id', previousEvent.id);
        
        if (spenden && spenden.length > 0) {
          await supabase
            .from('essensspenden_bedarf')
            .insert(spenden.map(s => ({ ...s, event_id: newEvent.id })));
        }

        // Copy klassen
        const { data: klassen } = await supabase
          .from('klassen')
          .select('name')
          .eq('event_id', previousEvent.id);
        
        if (klassen && klassen.length > 0) {
          await supabase
            .from('klassen')
            .insert(klassen.map(k => ({ ...k, event_id: newEvent.id })));
        }
      }

      await refreshEvents();
      setIsCreating(false);
      setNewEventName(`Vogelschießen ${newEventYear + 1}`);
      setNewEventYear(newEventYear + 1);
      setNewEventDate('');
    } catch (err) {
      console.error('Error:', err);
      setError('Unbekannter Fehler');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetActive = async (eventId: string) => {
    setActionLoading(eventId);
    setError(null);

    try {
      const supabase = createClient();
      
      // First, deactivate all events
      await supabase
        .from('events')
        .update({ ist_aktiv: false })
        .neq('id', '');

      // Then activate the selected one
      const { error: updateError } = await supabase
        .from('events')
        .update({ ist_aktiv: true })
        .eq('id', eventId);

      if (updateError) {
        console.error('Error setting active event:', updateError);
        setError('Fehler beim Aktivieren des Events');
        return;
      }

      await refreshEvents();
    } catch (err) {
      console.error('Error:', err);
      setError('Unbekannter Fehler');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`Bist du sicher, dass du "${eventName}" löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    setActionLoading(eventId);
    setError(null);

    try {
      const supabase = createClient();
      
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (deleteError) {
        console.error('Error deleting event:', deleteError);
        setError('Fehler beim Löschen des Events. Möglicherweise sind noch Daten verknüpft.');
        return;
      }

      await refreshEvents();
    } catch (err) {
      console.error('Error:', err);
      setError('Unbekannter Fehler');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartEditDate = (eventId: string, currentDate: string | null) => {
    setEditingEventId(eventId);
    setEditDate(currentDate || '');
  };

  const handleSaveDate = async (eventId: string) => {
    setActionLoading(`date-${eventId}`);
    setError(null);

    try {
      const supabase = createClient();
      
      const { error: updateError } = await supabase
        .from('events')
        .update({ datum: editDate || null })
        .eq('id', eventId);

      if (updateError) {
        console.error('Error updating date:', updateError);
        setError('Fehler beim Speichern des Datums');
        return;
      }

      await refreshEvents();
      setEditingEventId(null);
    } catch (err) {
      console.error('Error:', err);
      setError('Unbekannter Fehler');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartEditDeadline = (eventId: string, currentDeadline: string | null) => {
    setEditingDeadlineId(eventId);
    setEditDeadline(currentDeadline || '');
  };

  const handleSaveDeadline = async (eventId: string) => {
    setActionLoading(`deadline-${eventId}`);
    setError(null);

    try {
      const supabase = createClient();
      
      const { error: updateError } = await supabase
        .from('events')
        .update({ anmeldeschluss: editDeadline || null })
        .eq('id', eventId);

      if (updateError) {
        console.error('Error updating deadline:', updateError);
        setError('Fehler beim Speichern des Anmeldeschlusses');
        return;
      }

      await refreshEvents();
      setEditingDeadlineId(null);
    } catch (err) {
      console.error('Error:', err);
      setError('Unbekannter Fehler');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nicht festgelegt';
    return new Date(dateStr).toLocaleDateString('de-DE', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nicht festgelegt';
    return new Date(dateStr).toLocaleDateString('de-DE', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Event-Verwaltung</h1>
          <p className="text-sm text-slate-500 mt-1">Verwalte Vogelschießen-Events nach Jahren</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-tertiary text-white rounded-lg hover:bg-tertiary-dark transition-colors"
        >
          <Plus size={20} />
          Neues Event erstellen
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* Create Event Form */}
      {isCreating && (
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Neues Event erstellen</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jahr</label>
              <input
                type="number"
                value={newEventYear}
                onChange={(e) => {
                  const year = parseInt(e.target.value);
                  setNewEventYear(year);
                  setNewEventName(`Vogelschießen ${year}`);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tertiary focus:border-tertiary"
                min={2020}
                max={2100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tertiary focus:border-tertiary"
                placeholder="z.B. Vogelschießen 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tertiary focus:border-tertiary"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreateEvent}
              disabled={actionLoading === 'create'}
              className="flex items-center gap-2 px-4 py-2 bg-tertiary text-white rounded-lg hover:bg-tertiary-dark transition-colors disabled:opacity-50"
            >
              {actionLoading === 'create' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Event erstellen
            </button>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        {allEvents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">Keine Events vorhanden</h3>
            <p className="text-gray-500 mt-1">Erstelle dein erstes Event, um loszulegen.</p>
          </div>
        ) : (
          allEvents.map((event) => (
            <div
              key={event.id}
              className={`p-5 bg-white border rounded-xl shadow-sm transition-all ${
                event.ist_aktiv ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    event.ist_aktiv ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Calendar size={24} className={event.ist_aktiv ? 'text-green-600' : 'text-gray-500'} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {event.name}
                      {event.ist_aktiv && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                          Aktiv
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-500 text-sm">Jahr: {event.jahr}</p>
                    
                    {/* Date display/edit */}
                    <div className="mt-2 flex items-center gap-2">
                      {editingEventId === event.id ? (
                        <>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-tertiary"
                          />
                          <button
                            onClick={() => handleSaveDate(event.id)}
                            disabled={actionLoading === `date-${event.id}`}
                            className="p-1 text-green-600 hover:text-green-800 transition-colors"
                          >
                            {actionLoading === `date-${event.id}` ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          </button>
                          <button
                            onClick={() => setEditingEventId(null)}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className={`text-sm ${(event as { datum?: string | null }).datum ? 'text-gray-700' : 'text-orange-600'}`}>
                            📅 {formatDate((event as { datum?: string | null }).datum || null)}
                          </span>
                          <button
                            onClick={() => handleStartEditDate(event.id, (event as { datum?: string | null }).datum || null)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                    
                    {/* Anmeldeschluss display/edit */}
                    <div className="mt-2 flex items-center gap-2">
                      {editingDeadlineId === event.id ? (
                        <>
                          <input
                            type="date"
                            value={editDeadline}
                            onChange={(e) => setEditDeadline(e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-tertiary"
                          />
                          <button
                            onClick={() => handleSaveDeadline(event.id)}
                            disabled={actionLoading === `deadline-${event.id}`}
                            className="p-1 text-green-600 hover:text-green-800 transition-colors"
                          >
                            {actionLoading === `deadline-${event.id}` ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          </button>
                          <button
                            onClick={() => setEditingDeadlineId(null)}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className={`text-sm ${(event as { anmeldeschluss?: string | null }).anmeldeschluss ? 'text-gray-700' : 'text-orange-600'}`}>
                            ⏰ Anmeldeschluss: {formatShortDate((event as { anmeldeschluss?: string | null }).anmeldeschluss || null)}
                          </span>
                          <button
                            onClick={() => handleStartEditDeadline(event.id, (event as { anmeldeschluss?: string | null }).anmeldeschluss || null)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!event.ist_aktiv && (
                    <>
                      <button
                        onClick={() => handleSetActive(event.id)}
                        disabled={actionLoading === event.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === event.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Aktivieren
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id, event.name)}
                        disabled={actionLoading === event.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        Löschen
                      </button>
                    </>
                  )}
                  {event.ist_aktiv && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500">
                      <Archive size={14} />
                      Öffentlich sichtbar
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">ℹ️ Hinweis zur Event-Verwaltung</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Das <strong>aktive Event</strong> wird auf der öffentlichen Startseite angezeigt.</li>
          <li>• Kinder, Helfer, Ergebnisse und alle anderen Daten sind pro Event getrennt.</li>
          <li>• Spiele, Sponsoren und Galerie-Bilder sind global und für alle Events verfügbar.</li>
        </ul>
      </div>
    </div>
  );
}

// Wrapper component that provides EventProvider
export default function EventsPage() {
  return (
    <EventProvider>
      <EventsPageContent />
    </EventProvider>
  );
}
