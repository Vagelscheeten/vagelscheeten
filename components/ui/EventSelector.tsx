'use client';

import { useEvent, Event } from '@/context/EventContext';
import { ChevronDown, Calendar, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function EventSelector() {
  const { activeEvent, allEvents, loading, setActiveEvent } = useEvent();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
        <div className="w-4 h-4 bg-gray-300 rounded"></div>
        <div className="w-24 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 rounded-lg text-yellow-800 text-sm">
        <Calendar size={16} />
        <span>Kein Event ausgewählt</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Calendar size={16} className="text-tertiary" />
        <span className="font-medium text-gray-800">
          {activeEvent.name}
        </span>
        {activeEvent.ist_aktiv && (
          <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
            Aktiv
          </span>
        )}
        <ChevronDown 
          size={16} 
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
            Event auswählen
          </div>
          <div className="max-h-64 overflow-y-auto">
            {allEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => {
                  setActiveEvent(event);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                  activeEvent.id === event.id ? 'bg-tertiary/5' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="font-medium">{event.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {event.ist_aktiv && (
                    <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                      Aktiv
                    </span>
                  )}
                  {activeEvent.id === event.id && (
                    <Check size={16} className="text-tertiary" />
                  )}
                </div>
              </button>
            ))}
          </div>
          {allEvents.length === 0 && (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">
              Keine Events gefunden
            </div>
          )}
        </div>
      )}
    </div>
  );
}
