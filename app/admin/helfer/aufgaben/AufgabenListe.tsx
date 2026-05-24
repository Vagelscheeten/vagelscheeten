'use client';

import React, { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ChevronDown, ChevronUp, Clock, CalendarClock } from 'lucide-react';
import { ZeitslotsModal } from './ZeitslotsModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FilterBar, StatusBadge, RowActions, EmptyState, type StatusVariant } from '@/components/admin';

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  bedarf: number;
  zeitfenster: string;
  rueckmeldungen_count?: number;
}

interface AufgabenListeProps {
  aufgaben: Aufgabe[];
  rueckmeldungen: { aufgabe_id: string }[];
  onEdit: (aufgabe: Aufgabe) => void;
  onRefresh: () => void;
}

function formatZeitfenster(z: string): string {
  switch (z) {
    case 'vormittag': return 'Vormittag';
    case 'nachmittag': return 'Nachmittag';
    case 'beides': return 'Ganztägig';
    default: return z;
  }
}

function zeitfensterVariant(z: string): StatusVariant {
  switch (z) {
    case 'vormittag': return 'info';
    case 'nachmittag': return 'accent';
    case 'beides': return 'success';
    default: return 'neutral';
  }
}

function auslastungVariant(count: number, bedarf: number): StatusVariant {
  if (bedarf === 0) return 'neutral';
  const ratio = count / bedarf;
  if (ratio >= 1) return 'success';
  if (ratio >= 0.5) return 'warn';
  if (count === 0) return 'danger';
  return 'warn';
}

export function AufgabenListe({ aufgaben, rueckmeldungen, onEdit, onRefresh }: AufgabenListeProps) {
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [aufgabeToDelete, setAufgabeToDelete] = useState<Aufgabe | null>(null);
  const [isDeletingWithRueckmeldungen, setIsDeletingWithRueckmeldungen] = useState(false);
  const [zeitfensterFilter, setZeitfensterFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [slotsAufgabe, setSlotsAufgabe] = useState<Aufgabe | null>(null);

  const rueckmeldungenCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rueckmeldungen) {
      map[r.aufgabe_id] = (map[r.aufgabe_id] ?? 0) + 1;
    }
    return map;
  }, [rueckmeldungen]);

  const toggleDescription = (id: string) =>
    setExpandedDescriptions((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleDeleteClick = (aufgabe: Aufgabe) => {
    const count = rueckmeldungenCountMap[aufgabe.id] ?? 0;
    setAufgabeToDelete(aufgabe);
    setIsDeletingWithRueckmeldungen(count > 0);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!aufgabeToDelete) return;
    const supabase = createClient();
    try {
      if (isDeletingWithRueckmeldungen) {
        const { error: rErr } = await supabase
          .from('helfer_rueckmeldungen')
          .delete()
          .eq('aufgabe_id', aufgabeToDelete.id);
        if (rErr) throw rErr;
      }
      const { error } = await supabase
        .from('helferaufgaben')
        .delete()
        .eq('id', aufgabeToDelete.id);
      if (error) throw error;
      toast.success('Aufgabe wurde gelöscht');
      onRefresh();
    } catch (error: any) {
      console.error('Fehler beim Löschen:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setDeleteDialogOpen(false);
      setAufgabeToDelete(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return aufgaben.filter((a) => {
      if (zeitfensterFilter !== 'all' && a.zeitfenster !== zeitfensterFilter) return false;
      if (q && !(a.titel.toLowerCase().includes(q) || (a.beschreibung ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [aufgaben, zeitfensterFilter, search]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Aufgaben durchsuchen …"
      >
        <Select value={zeitfensterFilter} onValueChange={setZeitfensterFilter}>
          <SelectTrigger className="h-9 w-[180px]">
            <Clock className="mr-1.5 h-3.5 w-3.5 text-admin-ink-muted" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Zeitfenster</SelectItem>
            <SelectItem value="vormittag">Vormittag</SelectItem>
            <SelectItem value="nachmittag">Nachmittag</SelectItem>
            <SelectItem value="beides">Ganztägig</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Tabelle */}
      <div className="rounded-lg border border-admin-border bg-admin-surface overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-admin-border">
              <TableHead className="w-[40%] text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-admin-ink-muted">
                Titel &amp; Beschreibung
              </TableHead>
              <TableHead className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-admin-ink-muted">Bedarf</TableHead>
              <TableHead className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-admin-ink-muted">Zeitfenster</TableHead>
              <TableHead className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-admin-ink-muted">Auslastung</TableHead>
              <TableHead className="text-right text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-admin-ink-muted w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    compact
                    title="Keine Aufgaben gefunden"
                    description={search || zeitfensterFilter !== 'all' ? 'Filter oder Suche anpassen.' : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((aufgabe) => {
                const count = rueckmeldungenCountMap[aufgabe.id] ?? 0;
                const isExpanded = expandedDescriptions[aufgabe.id] || false;
                const auslastVariant = auslastungVariant(count, aufgabe.bedarf);
                const ratio = aufgabe.bedarf > 0 ? Math.min(1, count / aufgabe.bedarf) : 0;

                return (
                  <TableRow key={aufgabe.id} className="border-admin-border hover:bg-admin-surface-hover/50">
                    <TableCell className="align-top py-4">
                      <div className="font-semibold text-admin-ink text-[0.92rem]">{aufgabe.titel}</div>
                      {aufgabe.beschreibung && (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => toggleDescription(aufgabe.id)}
                            className="inline-flex items-center gap-1 text-[0.76rem] text-admin-ink-muted hover:text-admin-ink transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            {isExpanded ? 'Beschreibung ausblenden' : 'Beschreibung anzeigen'}
                          </button>
                          {isExpanded && (
                            <p className="text-[0.85rem] text-admin-ink-soft mt-1.5 pl-3 border-l-2 border-admin-border leading-relaxed">
                              {aufgabe.beschreibung}
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <span
                        className="tabular-nums text-admin-ink font-medium"
                        style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
                      >
                        {aufgabe.bedarf}
                      </span>
                      <span className="text-admin-ink-muted text-[0.82rem] ml-1">Helfer:innen</span>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <StatusBadge variant={zeitfensterVariant(aufgabe.zeitfenster)} size="sm">
                        {formatZeitfenster(aufgabe.zeitfenster)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="align-top py-4 min-w-[180px]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="tabular-nums font-medium text-admin-ink text-[0.88rem]"
                          style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
                        >
                          {count} <span className="text-admin-ink-muted">/ {aufgabe.bedarf}</span>
                        </span>
                        <StatusBadge variant={auslastVariant} size="sm" dot={false}>
                          {aufgabe.bedarf > 0 ? `${Math.round(ratio * 100)}%` : '—'}
                        </StatusBadge>
                      </div>
                      <div className="h-1.5 rounded-full bg-admin-surface-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${ratio * 100}%`,
                            backgroundColor:
                              auslastVariant === 'success' ? 'var(--color-admin-success)' :
                              auslastVariant === 'warn'    ? 'var(--color-admin-warn)' :
                              auslastVariant === 'danger'  ? 'var(--color-admin-danger)' :
                                                             'var(--color-admin-ink-muted)',
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4 text-right">
                      <RowActions
                        actions={[
                          { label: 'Bearbeiten', icon: Pencil, onClick: () => onEdit(aufgabe) },
                          { label: 'Zeitslots verwalten', icon: CalendarClock, onClick: () => setSlotsAufgabe(aufgabe) },
                          { label: 'Löschen', icon: Trash2, onClick: () => handleDeleteClick(aufgabe), destructive: true, separatorBefore: true },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Lösch-Bestätigungsdialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aufgabe löschen</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {isDeletingWithRueckmeldungen ? (
                  <>
                    <p className="mb-2">
                      <strong>Achtung:</strong> Für diese Aufgabe existieren bereits Rückmeldungen,
                      die ebenfalls gelöscht werden.
                    </p>
                    <p>
                      Bist du sicher, dass du die Aufgabe „{aufgabeToDelete?.titel}" und alle
                      zugehörigen Rückmeldungen löschen möchtest?
                    </p>
                  </>
                ) : (
                  <p>
                    Bist du sicher, dass du die Aufgabe „{aufgabeToDelete?.titel}" löschen möchtest?
                  </p>
                )}
                <p className="mt-2">Diese Aktion kann nicht rückgängig gemacht werden.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              style={{ backgroundColor: 'var(--color-admin-danger)' }}
              className="hover:brightness-95 text-white"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {slotsAufgabe && (
        <ZeitslotsModal aufgabe={slotsAufgabe} onClose={() => setSlotsAufgabe(null)} />
      )}
    </div>
  );
}
