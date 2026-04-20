'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Inbox, Mail, Paperclip, Settings as SettingsIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageShell } from '@/components/admin/PageShell';
import { FilterBar } from '@/components/admin/FilterBar';
import { EmptyState } from '@/components/admin/EmptyState';

interface ThreadWithLatest {
  id: string;
  subject_normalized: string;
  participants: string[];
  last_message_at: string;
  message_count: number;
  has_unread: boolean;
  latest_from_address: string | null;
  latest_from_name: string | null;
  latest_subject: string | null;
  latest_snippet: string | null;
  latest_direction: 'inbound' | 'outbound' | null;
  has_attachments: boolean;
}

export default function PostfachPage() {
  const [threads, setThreads] = useState<ThreadWithLatest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);

  useEffect(() => {
    void loadThreads();
  }, []);

  async function loadThreads() {
    setLoading(true);
    const supabase = createClient();

    const { data: threadsData, error: threadsError } = await supabase
      .from('email_threads')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(200);

    if (threadsError || !threadsData) {
      console.error(threadsError);
      setThreads([]);
      setLoading(false);
      return;
    }

    const threadIds = threadsData.map((t) => t.id);
    let emailMap = new Map<string, ThreadWithLatest>();
    let attachmentSet = new Set<string>();

    if (threadIds.length > 0) {
      const { data: emailsData } = await supabase
        .from('emails')
        .select('id, thread_id, from_address, from_name, subject, body_text, direction, received_at')
        .in('thread_id', threadIds)
        .order('received_at', { ascending: false });

      for (const e of emailsData ?? []) {
        if (!emailMap.has(e.thread_id)) {
          emailMap.set(e.thread_id, {
            id: e.thread_id,
            subject_normalized: '',
            participants: [],
            last_message_at: e.received_at,
            message_count: 0,
            has_unread: false,
            latest_from_address: e.from_address,
            latest_from_name: e.from_name,
            latest_subject: e.subject,
            latest_snippet: (e.body_text ?? '').slice(0, 120).replace(/\s+/g, ' ').trim(),
            latest_direction: e.direction,
            has_attachments: false,
          });
        }
      }

      const emailIds = (emailsData ?? []).map((e) => e.id);
      if (emailIds.length > 0) {
        const { data: attachmentsData } = await supabase
          .from('email_attachments')
          .select('email_id')
          .in('email_id', emailIds);
        const emailIdToThread = new Map<string, string>(
          (emailsData ?? []).map((e) => [e.id, e.thread_id])
        );
        for (const a of attachmentsData ?? []) {
          const tid = emailIdToThread.get(a.email_id);
          if (tid) attachmentSet.add(tid);
        }
      }
    }

    const merged: ThreadWithLatest[] = threadsData.map((t) => {
      const latest = emailMap.get(t.id);
      return {
        id: t.id,
        subject_normalized: t.subject_normalized,
        participants: t.participants ?? [],
        last_message_at: t.last_message_at,
        message_count: t.message_count,
        has_unread: t.has_unread,
        latest_from_address: latest?.latest_from_address ?? null,
        latest_from_name: latest?.latest_from_name ?? null,
        latest_subject: latest?.latest_subject ?? null,
        latest_snippet: latest?.latest_snippet ?? null,
        latest_direction: latest?.latest_direction ?? null,
        has_attachments: attachmentSet.has(t.id),
      };
    });

    setThreads(merged);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads
      .filter((t) => (onlyUnread ? t.has_unread : true))
      .filter((t) => {
        if (!q) return true;
        return (
          (t.latest_subject ?? '').toLowerCase().includes(q) ||
          (t.latest_from_address ?? '').toLowerCase().includes(q) ||
          (t.latest_from_name ?? '').toLowerCase().includes(q) ||
          (t.participants ?? []).some((p) => p.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (a.has_unread !== b.has_unread) return a.has_unread ? -1 : 1;
        return b.last_message_at.localeCompare(a.last_message_at);
      });
  }, [threads, search, onlyUnread]);

  return (
    <PageShell
      title="Postfach"
      description="Eingehende und ausgehende E-Mails an orgateam@vagelscheeten.de."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Postfach' }]}
      actions={
        <Link
          href="/admin/postfach/einstellungen"
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-admin-border bg-admin-surface text-[0.85rem] text-admin-ink hover:bg-admin-surface-muted transition-colors"
        >
          <SettingsIcon size={14} />
          Einstellungen
        </Link>
      }
      toolbar={
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Suche nach Betreff, Absender …"
        >
          <button
            onClick={() => setOnlyUnread((v) => !v)}
            className={`h-9 px-3 rounded-md text-[0.85rem] border transition-colors ${
              onlyUnread
                ? 'border-admin-accent bg-admin-accent/10 text-admin-accent'
                : 'border-admin-border bg-admin-surface text-admin-ink hover:bg-admin-surface-muted'
            }`}
          >
            Nur ungelesen
          </button>
        </FilterBar>
      }
    >
      {loading ? (
        <div className="text-[0.9rem] text-admin-ink-muted py-10 text-center">Lade …</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={threads.length === 0 ? 'Posteingang ist leer' : 'Keine Treffer'}
          description={
            threads.length === 0
              ? 'Es wurden noch keine E-Mails an orgateam@vagelscheeten.de empfangen.'
              : 'Passe Suche oder Filter an, um Mails zu sehen.'
          }
        />
      ) : (
        <div className="rounded-[0.75rem] border border-admin-border bg-admin-surface overflow-hidden">
          <ul className="divide-y divide-admin-border">
            {filtered.map((t) => {
              const fromDisplay =
                t.latest_from_name ?? t.latest_from_address ?? t.participants[0] ?? '—';
              return (
                <li key={t.id}>
                  <Link
                    href={`/admin/postfach/${t.id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-admin-surface-muted/60 transition-colors"
                  >
                    <div className="mt-1 shrink-0">
                      <Mail
                        size={16}
                        className={t.has_unread ? 'text-admin-accent' : 'text-admin-ink-muted'}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span
                          className={`text-[0.9rem] truncate ${
                            t.has_unread ? 'font-semibold text-admin-ink' : 'text-admin-ink-soft'
                          }`}
                        >
                          {fromDisplay}
                        </span>
                        {t.message_count > 1 && (
                          <span className="text-[0.7rem] text-admin-ink-muted font-medium px-1.5 py-0.5 rounded bg-admin-surface-muted border border-admin-border">
                            {t.message_count}
                          </span>
                        )}
                        {t.has_attachments && (
                          <Paperclip size={12} className="text-admin-ink-muted" />
                        )}
                        <span className="ml-auto text-[0.75rem] text-admin-ink-muted shrink-0">
                          {formatDate(t.last_message_at)}
                        </span>
                      </div>
                      <div
                        className={`text-[0.9rem] mt-0.5 truncate ${
                          t.has_unread ? 'font-medium text-admin-ink' : 'text-admin-ink-soft'
                        }`}
                      >
                        {t.latest_subject || '(kein Betreff)'}
                      </div>
                      {t.latest_snippet && (
                        <div className="text-[0.8rem] text-admin-ink-muted mt-0.5 truncate">
                          {t.latest_snippet}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </PageShell>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
