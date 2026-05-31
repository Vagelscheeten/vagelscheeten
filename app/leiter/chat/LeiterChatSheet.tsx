'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChatPanel, type ChatNachricht } from '@/components/chat/ChatPanel';

interface LeiterChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gruppenname: string;
  isOnline: boolean;
  /** Wird nach jedem Laden aufgerufen (für Unread-Reset im Header). */
  onGelesen?: () => void;
}

export default function LeiterChatSheet({
  open,
  onOpenChange,
  gruppenname,
  isOnline,
  onGelesen,
}: LeiterChatSheetProps) {
  const [nachrichten, setNachrichten] = useState<ChatNachricht[]>([]);
  const [loading, setLoading] = useState(true);
  const onGelesenRef = useRef(onGelesen);
  onGelesenRef.current = onGelesen;

  const lade = useCallback(async () => {
    try {
      const res = await fetch('/api/leiter/chat', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setNachrichten(json.nachrichten ?? []);
      onGelesenRef.current?.();
    } catch {
      // offline o. ä. — still ignorieren, nächster Poll versucht es erneut
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling nur, solange das Sheet offen ist.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void lade();
    const interval = setInterval(() => void lade(), 5000);
    const onFocus = () => void lade();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [open, lade]);

  // Sheet an den sichtbaren Viewport anpassen, damit das Eingabefeld nicht von der
  // Tastatur verdeckt wird (iOS/Android). Reagiert live auf das Öffnen/Schließen der Tastatur.
  useEffect(() => {
    if (!open) return;
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;

    const update = () => {
      const node = document.getElementById('leiter-chat-content');
      if (!node) return;
      const margin = 8;
      const tastaturHoehe = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const tastaturOffen = tastaturHoehe > 120;
      let hoehe: number;
      let top: number;
      if (tastaturOffen) {
        // Sichtbaren Bereich über der Tastatur ausfüllen
        hoehe = vv.height - margin;
        top = vv.offsetTop + margin / 2;
      } else {
        // Kompaktes, mittig platziertes Fenster
        hoehe = Math.min(vv.height - margin * 2, Math.round(vv.height * 0.72));
        top = vv.offsetTop + (vv.height - hoehe) / 2;
      }
      node.style.top = `${top}px`;
      node.style.height = `${hoehe}px`;
      node.style.maxHeight = `${hoehe}px`;
      node.style.translate = '-50% 0'; // vertikale Zentrierung aufheben, horizontal beibehalten
    };

    const raf = requestAnimationFrame(update);
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [open]);

  const onSend = useCallback(
    async (inhalt: string): Promise<boolean> => {
      if (!isOnline) {
        toast.error('Keine Verbindung — Nachricht kann nicht gesendet werden.');
        return false;
      }
      try {
        const res = await fetch('/api/leiter/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inhalt }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error || 'Senden fehlgeschlagen.');
          return false;
        }
        const json = await res.json();
        const neu: ChatNachricht | undefined = json.nachricht;
        if (neu) {
          // optimistisch anhängen (dedupe per id)
          setNachrichten((prev) => (prev.some((n) => n.id === neu.id) ? prev : [...prev, neu]));
        }
        void lade();
        return true;
      } catch {
        toast.error('Senden fehlgeschlagen.');
        return false;
      }
    },
    [isOnline, lade],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="leiter-chat-content"
        className="p-0 gap-0 w-[calc(100vw-1.5rem)] sm:max-w-md h-[70dvh] max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden"
      >
        <DialogHeader className="px-4 py-2.5 border-b border-slate-200 shrink-0 text-left">
          <DialogTitle className="text-base">Orga-Chat</DialogTitle>
          <p className="text-[11px] text-slate-500 leading-tight">
            Öffentlich — alle Gruppen und die Orga sehen Fragen und Antworten.
          </p>
        </DialogHeader>
        <ChatPanel
          className="flex-1 min-h-0"
          nachrichten={nachrichten}
          loading={loading}
          onSend={onSend}
          istEigene={(n) => n.absender_typ === 'leiter' && n.absender_name === gruppenname}
          disabled={!isOnline}
          disabledHinweis="Keine Verbindung — du kannst gerade nichts senden."
        />
      </DialogContent>
    </Dialog>
  );
}
