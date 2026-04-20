'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Paperclip,
  Send,
  X,
  Download,
  Loader2,
  Mail,
  Reply,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageShell } from '@/components/admin/PageShell';

interface MessageRow {
  id: string;
  thread_id: string;
  direction: 'inbound' | 'outbound';
  message_id: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[] | null;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
}

interface AttachmentRow {
  id: string;
  email_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
}

interface ThreadRow {
  id: string;
  subject_normalized: string;
  participants: string[];
  message_count: number;
}

export default function PostfachThreadDetailPage() {
  const router = useRouter();
  const params = useParams<{ threadId: string }>();
  const threadId = params.threadId;

  const [thread, setThread] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const markedReadRef = useRef(false);

  useEffect(() => {
    if (!threadId) return;
    void loadThread();
  }, [threadId]);

  useEffect(() => {
    if (messages.length === 0 || markedReadRef.current) return;
    const hasUnreadInbound = messages.some((m) => m.direction === 'inbound');
    if (!hasUnreadInbound) return;
    markedReadRef.current = true;
    void markRead();
  }, [messages]);

  async function loadThread() {
    setLoading(true);
    const supabase = createClient();
    const [{ data: threadData }, { data: messagesData }] = await Promise.all([
      supabase.from('email_threads').select('*').eq('id', threadId).maybeSingle(),
      supabase
        .from('emails')
        .select('*')
        .eq('thread_id', threadId)
        .order('received_at', { ascending: true }),
    ]);

    setThread(threadData ?? null);
    setMessages(messagesData ?? []);

    if (messagesData && messagesData.length > 0) {
      const ids = messagesData.map((m) => m.id);
      const { data: attData } = await supabase
        .from('email_attachments')
        .select('*')
        .in('email_id', ids);
      setAttachments(attData ?? []);
    } else {
      setAttachments([]);
    }
    setLoading(false);
  }

  async function markRead() {
    try {
      await fetch('/api/postfach/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId }),
      });
    } catch {
      // best-effort
    }
  }

  async function handleDelete() {
    if (!confirm('Diesen Thread mit allen Nachrichten und Anhängen unwiderruflich löschen?')) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/postfach/thread/${threadId}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(`Löschen fehlgeschlagen: ${payload?.error ?? res.statusText}`);
        return;
      }
      toast.success('Thread gelöscht');
      router.push('/admin/postfach');
    } catch (err) {
      console.error(err);
      toast.error('Löschen fehlgeschlagen');
    } finally {
      setDeleting(false);
    }
  }

  const latestInbound = [...messages].reverse().find((m) => m.direction === 'inbound');
  const subject = messages[messages.length - 1]?.subject ?? '(kein Betreff)';

  return (
    <PageShell
      title={subject}
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Postfach', href: '/admin/postfach' },
        { label: 'Thread' },
      ]}
      actions={
        <>
          <button
            onClick={handleDelete}
            disabled={deleting || loading || !thread}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-red-200 bg-white text-[0.85rem] text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Löschen
          </button>
          <Link
            href="/admin/postfach"
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-admin-border bg-admin-surface text-[0.85rem] text-admin-ink hover:bg-admin-surface-muted transition-colors"
          >
            <ArrowLeft size={14} />
            Zurück
          </Link>
        </>
      }
    >
      {loading ? (
        <div className="text-[0.9rem] text-admin-ink-muted py-10 text-center">Lade Thread …</div>
      ) : !thread ? (
        <div className="text-[0.9rem] text-admin-ink-muted py-10 text-center">
          Thread nicht gefunden.
        </div>
      ) : (
        <div className="space-y-6">
          {thread.participants.length > 0 && (
            <div className="text-[0.82rem] text-admin-ink-muted">
              Teilnehmer: {thread.participants.join(', ')}
            </div>
          )}

          <div className="space-y-3">
            {messages.map((m) => (
              <MessageCard
                key={m.id}
                message={m}
                attachments={attachments.filter((a) => a.email_id === m.id)}
              />
            ))}
          </div>

          <ReplyComposer
            threadId={threadId}
            defaultTo={latestInbound?.from_address ?? ''}
            defaultSubject={makeReplySubject(subject)}
            replyToEmailId={latestInbound?.id ?? null}
            onSent={() => {
              void loadThread();
              router.refresh();
            }}
          />
        </div>
      )}
    </PageShell>
  );
}

// ─── MessageCard ────────────────────────────────────────────────────
function MessageCard({
  message,
  attachments,
}: {
  message: MessageRow;
  attachments: AttachmentRow[];
}) {
  const isInbound = message.direction === 'inbound';
  return (
    <div
      className="rounded-[0.75rem] border bg-admin-surface p-4"
      style={{
        borderColor: isInbound
          ? 'color-mix(in srgb, var(--color-melsdorf-green) 30%, transparent)'
          : 'var(--admin-border, #e5e7eb)',
      }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span
          className={`inline-flex items-center gap-1 text-[0.7rem] font-medium px-2 py-0.5 rounded-full ${
            isInbound
              ? 'bg-melsdorf-green/10 text-melsdorf-green'
              : 'bg-admin-surface-muted text-admin-ink-muted border border-admin-border'
          }`}
        >
          {isInbound ? <Mail size={11} /> : <Reply size={11} />}
          {isInbound ? 'Eingang' : 'Ausgang'}
        </span>
        <span className="text-[0.82rem] font-medium text-admin-ink">
          {message.from_name
            ? `${message.from_name} <${message.from_address}>`
            : message.from_address}
        </span>
        <span className="text-[0.75rem] text-admin-ink-muted ml-auto">
          {new Date(message.received_at).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      <div className="text-[0.78rem] text-admin-ink-muted mb-2">
        an {message.to_addresses.join(', ')}
        {message.cc_addresses && message.cc_addresses.length > 0 && (
          <> · CC {message.cc_addresses.join(', ')}</>
        )}
      </div>

      {message.body_text ? (
        <pre className="whitespace-pre-wrap font-sans text-[0.88rem] text-admin-ink leading-relaxed">
          {message.body_text}
        </pre>
      ) : message.body_html ? (
        <div className="text-[0.82rem] text-admin-ink-muted italic">
          (Nur HTML-Inhalt — Rendering in v1 deaktiviert, bitte Attachments / Raw-Payload prüfen)
        </div>
      ) : (
        <div className="text-[0.82rem] text-admin-ink-muted italic">(Kein Text-Inhalt)</div>
      )}

      {attachments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-admin-border flex flex-wrap gap-2">
          {attachments.map((a) => (
            <a
              key={a.id}
              href={`/api/postfach/attachment/${a.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-admin-border bg-admin-surface-muted text-[0.8rem] text-admin-ink hover:bg-admin-surface transition-colors"
            >
              <Paperclip size={12} />
              <span className="max-w-[200px] truncate">{a.filename}</span>
              {a.size_bytes && (
                <span className="text-admin-ink-muted text-[0.7rem]">
                  {formatSize(a.size_bytes)}
                </span>
              )}
              <Download size={12} className="text-admin-ink-muted" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ReplyComposer ──────────────────────────────────────────────────
function ReplyComposer({
  threadId,
  defaultTo,
  defaultSubject,
  replyToEmailId,
  onSent,
}: {
  threadId: string;
  defaultTo: string;
  defaultSubject: string;
  replyToEmailId: string | null;
  onSent: () => void;
}) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error('Bitte Empfänger, Betreff und Nachrichtentext ausfüllen.');
      return;
    }
    setSending(true);
    try {
      const form = new FormData();
      form.append('thread_id', threadId);
      form.append('to', to.trim());
      form.append('subject', subject.trim());
      form.append('body_text', body);
      if (replyToEmailId) form.append('reply_to_email_id', replyToEmailId);
      for (const f of files) form.append('attachments', f);

      const res = await fetch('/api/postfach/send', { method: 'POST', body: form });
      const payload = await res.json();

      if (!res.ok) {
        const msg = payload?.detail ?? payload?.error ?? 'Senden fehlgeschlagen';
        toast.error(`Fehler: ${msg}`);
        return;
      }

      toast.success('Antwort gesendet');
      setBody('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSent();
    } catch (err) {
      console.error(err);
      toast.error('Senden fehlgeschlagen');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-[0.75rem] border border-admin-border bg-admin-surface p-4 space-y-3">
      <div className="text-[0.95rem] font-semibold text-admin-ink flex items-center gap-2">
        <Reply size={16} />
        Antworten
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-3 gap-y-2">
        <label className="text-[0.8rem] text-admin-ink-muted md:pt-2">An:</label>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 px-3 rounded-md border border-admin-border bg-admin-surface text-[0.88rem] text-admin-ink focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
          placeholder="empfaenger@example.com"
        />

        <label className="text-[0.8rem] text-admin-ink-muted md:pt-2">Betreff:</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="h-9 px-3 rounded-md border border-admin-border bg-admin-surface text-[0.88rem] text-admin-ink focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
        />
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Deine Antwort …"
        rows={8}
        className="w-full px-3 py-2 rounded-md border border-admin-border bg-admin-surface text-[0.9rem] text-admin-ink focus:outline-none focus:ring-2 focus:ring-admin-accent/30 resize-y"
      />

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-admin-surface-muted border border-admin-border text-[0.8rem] text-admin-ink"
            >
              <Paperclip size={12} />
              <span className="max-w-[160px] truncate">{f.name}</span>
              <span className="text-admin-ink-muted text-[0.7rem]">{formatSize(f.size)}</span>
              <button
                onClick={() => removeFile(i)}
                className="ml-1 text-admin-ink-muted hover:text-admin-ink"
                aria-label="Entfernen"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-admin-border bg-admin-surface text-[0.85rem] text-admin-ink hover:bg-admin-surface-muted transition-colors cursor-pointer">
          <Paperclip size={14} />
          Anhang
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
        <button
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center gap-1.5 px-4 h-9 rounded-md bg-melsdorf-green text-white text-[0.88rem] font-medium hover:bg-melsdorf-green-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Sende …
            </>
          ) : (
            <>
              <Send size={14} />
              Senden
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────
function makeReplySubject(subject: string): string {
  if (/^\s*re:\s*/i.test(subject)) return subject;
  return `Re: ${subject}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
