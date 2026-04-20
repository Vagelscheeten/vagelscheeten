'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, UserCheck, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageShell } from '@/components/admin/PageShell';
import { EmptyState } from '@/components/admin/EmptyState';
import type { NotificationRecipient } from '@/lib/postfach/types';
import {
  listAuthUsers,
  createRecipient,
  setRecipientActive,
  deleteRecipient,
  type AuthUserBrief,
} from './actions';

export default function PostfachEinstellungenPage() {
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUserBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'user' | 'email'>('user');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [, startTransition] = useTransition();

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const supabase = createClient();
    const [{ data: recs }, users] = await Promise.all([
      supabase
        .from('postfach_notification_recipients')
        .select('*')
        .order('created_at', { ascending: false }),
      listAuthUsers(),
    ]);
    setRecipients(recs ?? []);
    setAuthUsers(users);
    setLoading(false);
  }

  async function handleAddFromUser() {
    if (!selectedUserId) {
      toast.error('Bitte User auswählen');
      return;
    }
    const user = authUsers.find((u) => u.id === selectedUserId);
    if (!user) return;

    startTransition(async () => {
      const result = await createRecipient({
        email: user.email,
        label: user.name,
        user_id: user.id,
      });
      if ('error' in result) {
        toast.error(
          result.error === 'already-exists'
            ? 'Diese Adresse ist bereits in der Liste'
            : `Fehler: ${result.error}`
        );
        return;
      }
      toast.success('Empfänger hinzugefügt');
      setSelectedUserId('');
      void loadAll();
    });
  }

  async function handleAddFromEmail() {
    if (!newEmail.trim()) {
      toast.error('Bitte E-Mail eingeben');
      return;
    }
    startTransition(async () => {
      const result = await createRecipient({
        email: newEmail.trim(),
        label: newLabel.trim() || null,
      });
      if ('error' in result) {
        toast.error(
          result.error === 'already-exists'
            ? 'Diese Adresse ist bereits in der Liste'
            : result.error === 'invalid-email'
              ? 'Ungültige E-Mail-Adresse'
              : `Fehler: ${result.error}`
        );
        return;
      }
      toast.success('Empfänger hinzugefügt');
      setNewEmail('');
      setNewLabel('');
      void loadAll();
    });
  }

  async function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      const result = await setRecipientActive(id, isActive);
      if ('error' in result) {
        toast.error(`Fehler: ${result.error}`);
        return;
      }
      void loadAll();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Empfänger wirklich löschen?')) return;
    startTransition(async () => {
      const result = await deleteRecipient(id);
      if ('error' in result) {
        toast.error(`Fehler: ${result.error}`);
        return;
      }
      toast.success('Empfänger gelöscht');
      void loadAll();
    });
  }

  return (
    <PageShell
      title="Postfach-Benachrichtigungen"
      description="Wer erhält eine E-Mail, wenn eine neue Nachricht im Postfach eingeht?"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Postfach', href: '/admin/postfach' },
        { label: 'Einstellungen' },
      ]}
      actions={
        <Link
          href="/admin/postfach"
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-admin-border bg-admin-surface text-[0.85rem] text-admin-ink hover:bg-admin-surface-muted transition-colors"
        >
          <ArrowLeft size={14} />
          Zurück
        </Link>
      }
    >
      {/* ── Hinzufügen-Bereich ─────────────────────────────────── */}
      <div className="rounded-[0.75rem] border border-admin-border bg-admin-surface p-4 mb-6">
        <div className="text-[0.95rem] font-semibold text-admin-ink mb-3">
          Empfänger hinzufügen
        </div>

        <div className="flex gap-1 mb-4 border-b border-admin-border">
          <button
            onClick={() => setActiveTab('user')}
            className={`px-3 py-2 text-[0.85rem] border-b-2 -mb-px transition-colors ${
              activeTab === 'user'
                ? 'border-admin-accent text-admin-ink font-medium'
                : 'border-transparent text-admin-ink-muted hover:text-admin-ink'
            }`}
          >
            <UserCheck size={13} className="inline mr-1.5 -mt-0.5" />
            Admin-User auswählen
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-3 py-2 text-[0.85rem] border-b-2 -mb-px transition-colors ${
              activeTab === 'email'
                ? 'border-admin-accent text-admin-ink font-medium'
                : 'border-transparent text-admin-ink-muted hover:text-admin-ink'
            }`}
          >
            <Mail size={13} className="inline mr-1.5 -mt-0.5" />
            Freie E-Mail-Adresse
          </button>
        </div>

        {activeTab === 'user' ? (
          <div className="flex gap-2 flex-wrap">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 min-w-[240px] h-9 px-3 rounded-md border border-admin-border bg-admin-surface text-[0.88rem] text-admin-ink focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
            >
              <option value="">— User auswählen —</option>
              {authUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ? `${u.name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddFromUser}
              className="px-4 h-9 rounded-md bg-melsdorf-green text-white text-[0.85rem] font-medium hover:bg-melsdorf-green-dark transition-colors"
            >
              Hinzufügen
            </button>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="empfaenger@example.com"
              className="flex-1 min-w-[200px] h-9 px-3 rounded-md border border-admin-border bg-admin-surface text-[0.88rem] text-admin-ink focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
            />
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Name (optional)"
              className="flex-1 min-w-[160px] h-9 px-3 rounded-md border border-admin-border bg-admin-surface text-[0.88rem] text-admin-ink focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
            />
            <button
              onClick={handleAddFromEmail}
              className="px-4 h-9 rounded-md bg-melsdorf-green text-white text-[0.85rem] font-medium hover:bg-melsdorf-green-dark transition-colors"
            >
              Hinzufügen
            </button>
          </div>
        )}
      </div>

      {/* ── Liste ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-[0.9rem] text-admin-ink-muted py-10 text-center">Lade …</div>
      ) : recipients.length === 0 ? (
        <EmptyState
          title="Noch keine Empfänger"
          description="Füge mindestens einen Empfänger hinzu, damit bei neuen Mails jemand benachrichtigt wird."
        />
      ) : (
        <div className="rounded-[0.75rem] border border-admin-border bg-admin-surface overflow-hidden">
          <ul className="divide-y divide-admin-border">
            {recipients.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[0.9rem] font-medium text-admin-ink truncate">
                      {r.email}
                    </span>
                    {r.user_id && (
                      <span className="inline-flex items-center gap-1 text-[0.7rem] font-medium px-1.5 py-0.5 rounded bg-admin-surface-muted text-admin-ink-muted border border-admin-border">
                        <UserCheck size={10} />
                        App-User
                      </span>
                    )}
                  </div>
                  {r.label && (
                    <div className="text-[0.8rem] text-admin-ink-muted">{r.label}</div>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 text-[0.82rem] text-admin-ink-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={r.is_active}
                    onChange={(e) => handleToggle(r.id, e.target.checked)}
                    className="w-4 h-4 accent-melsdorf-green"
                  />
                  aktiv
                </label>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1.5 rounded-md text-admin-ink-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                  aria-label="Löschen"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageShell>
  );
}
