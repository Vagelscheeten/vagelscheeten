'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';

export interface ChatNachricht {
  id: string;
  absender_typ: 'leiter' | 'admin';
  absender_name: string;
  inhalt: string;
  created_at: string;
}

export const CHAT_MAX_LEN = 2000;

interface ChatPanelProps {
  nachrichten: ChatNachricht[];
  loading: boolean;
  /** Nachricht senden. Gibt true bei Erfolg zurück (Eingabe wird dann geleert). */
  onSend: (inhalt: string) => Promise<boolean>;
  /** Bestimmt, ob eine Nachricht vom Betrachter selbst stammt (rechtsbündig). */
  istEigene: (n: ChatNachricht) => boolean;
  /** z. B. offline → Senden gesperrt. */
  disabled?: boolean;
  disabledHinweis?: string;
  className?: string;
}

function formatZeit(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function ChatPanel({
  nachrichten,
  loading,
  onSend,
  istEigene,
  disabled = false,
  disabledHinweis,
  className = '',
}: ChatPanelProps) {
  const [text, setText] = useState('');
  const [senden, setSenden] = useState(false);
  const endeRef = useRef<HTMLDivElement | null>(null);
  const listeRef = useRef<HTMLDivElement | null>(null);

  // Automatisch nach unten scrollen, wenn neue Nachrichten kommen.
  useEffect(() => {
    endeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [nachrichten.length]);

  const absenden = async () => {
    const inhalt = text.trim();
    if (!inhalt || senden || disabled) return;
    setSenden(true);
    const ok = await onSend(inhalt);
    setSenden(false);
    if (ok) setText('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void absenden();
    }
  };

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Nachrichtenliste */}
      <div ref={listeRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading && nachrichten.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-8">Lade Nachrichten…</div>
        ) : nachrichten.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-8">
            Noch keine Nachrichten. Stell hier deine Frage.
          </div>
        ) : (
          nachrichten.map((n) => {
            const eigene = istEigene(n);
            const istAdmin = n.absender_typ === 'admin';
            return (
              <div key={n.id} className={`flex ${eigene ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    eigene
                      ? 'bg-melsdorf-orange/90 text-white rounded-br-sm'
                      : istAdmin
                        ? 'bg-melsdorf-green/10 border border-melsdorf-green/30 text-slate-800 rounded-bl-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  <div
                    className={`text-[11px] font-semibold mb-0.5 flex items-center gap-1 ${
                      eigene ? 'text-white/90' : istAdmin ? 'text-melsdorf-green' : 'text-slate-500'
                    }`}
                  >
                    {istAdmin && <span aria-hidden>👑</span>}
                    {n.absender_name}
                    {istAdmin && !eigene && (
                      <span className="font-normal opacity-80">(Orga)</span>
                    )}
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words">{n.inhalt}</div>
                  <div className={`text-[10px] mt-0.5 text-right ${eigene ? 'text-white/70' : 'text-slate-400'}`}>
                    {formatZeit(n.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endeRef} />
      </div>

      {/* Eingabe */}
      <div className="border-t border-slate-200 p-2.5 bg-white">
        {disabled && disabledHinweis && (
          <div className="text-xs text-amber-700 mb-1.5 px-1">{disabledHinweis}</div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, CHAT_MAX_LEN))}
            onKeyDown={onKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={disabled ? 'Senden nicht möglich…' : 'Nachricht schreiben…'}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-melsdorf-orange/40 disabled:bg-slate-50 disabled:text-slate-400 max-h-32"
          />
          <button
            onClick={absenden}
            disabled={disabled || senden || text.trim().length === 0}
            className="shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-xl bg-melsdorf-orange text-white disabled:opacity-40 active:scale-95 transition-transform"
            aria-label="Senden"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
