'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, PlusCircle, Pencil, Trash2, Users, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';

type Klasse = Database['public']['Tables']['klassen']['Row'];

export default function KlassenVerwaltungPage() {
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats: Kinder je Klasse (nach Name-String), Spiele je Klasse (nach ID)
  const [kinderCountByName, setKinderCountByName] = useState<Map<string, number>>(new Map());
  const [spieleCountById, setSpieleCountById] = useState<Map<string, number>>(new Map());
  // Integritätsprüfung: kinder.klasse-Werte ohne Eintrag in klassen-Tabelle
  const [orphanedNames, setOrphanedNames] = useState<string[]>([]);

  // Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKlasse, setEditingKlasse] = useState<Klasse | null>(null);
  const [inputName, setInputName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [klasseToDelete, setKlasseToDelete] = useState<Klasse | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      // 1. Aktives Event holen
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('ist_aktiv', true)
        .single();

      if (eventError) {
        throw new Error(
          eventError.code === 'PGRST116'
            ? 'Kein aktives Event gefunden. Bitte im Event-Management ein Event aktivieren.'
            : eventError.message
        );
      }

      const eventId = eventData.id;
      setActiveEventId(eventId);

      // 2. Klassen, Kinder-Statistiken und Spiele-Zuweisungen parallel laden
      const [klassenRes, kinderRes, spieleRes] = await Promise.all([
        supabase.from('klassen').select('*').eq('event_id', eventId).order('name', { ascending: true }),
        supabase.from('kinder').select('klasse').eq('event_id', eventId).not('klasse', 'is', null),
        supabase.from('klasse_spiele').select('klasse_id'),
      ]);

      if (klassenRes.error) throw klassenRes.error;
      if (kinderRes.error) throw kinderRes.error;
      if (spieleRes.error) throw spieleRes.error;

      const klassenData = klassenRes.data || [];
      setKlassen(klassenData);

      // Kinder je Klasse anhand des String-Feldes kinder.klasse zählen
      const kinderMap = new Map<string, number>();
      for (const k of kinderRes.data || []) {
        if (k.klasse) kinderMap.set(k.klasse, (kinderMap.get(k.klasse) || 0) + 1);
      }
      setKinderCountByName(kinderMap);

      // Spiele je Klasse anhand der UUID klasse_spiele.klasse_id zählen
      const klassenIds = new Set(klassenData.map(k => k.id));
      const spieleMap = new Map<string, number>();
      for (const s of spieleRes.data || []) {
        if (s.klasse_id && klassenIds.has(s.klasse_id)) {
          spieleMap.set(s.klasse_id, (spieleMap.get(s.klasse_id) || 0) + 1);
        }
      }
      setSpieleCountById(spieleMap);

      // Integritätsprüfung: gibt es kinder.klasse-Werte ohne Klasse in der Tabelle?
      const klassenNames = new Set(klassenData.map(k => k.name));
      const uniqueKinderKlassen = [...new Set(
        (kinderRes.data || []).map(k => k.klasse).filter(Boolean) as string[]
      )].sort();
      setOrphanedNames(uniqueKinderKlassen.filter(n => !klassenNames.has(n)));

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAddDialog = () => {
    if (!activeEventId) { toast.error('Kein aktives Event gefunden.'); return; }
    setEditingKlasse(null);
    setInputName('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (klasse: Klasse) => {
    setEditingKlasse(klasse);
    setInputName(klasse.name);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) { toast.error('Name darf nicht leer sein.'); return; }

    setIsSaving(true);
    const supabase = createClient();
    try {
      if (editingKlasse) {
        const { error } = await supabase
          .from('klassen')
          .update({ name: inputName.trim() })
          .eq('id', editingKlasse.id);
        if (error) throw error;
        toast.success(`Klasse „${inputName.trim()}" aktualisiert.`);
      } else {
        const { error } = await supabase
          .from('klassen')
          .insert({ name: inputName.trim(), event_id: activeEventId! });
        if (error) throw error;
        toast.success(`Klasse „${inputName.trim()}" erstellt.`);
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(`Fehler: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!klasseToDelete) return;
    const supabase = createClient();
    try {
      const { error } = await supabase.from('klassen').delete().eq('id', klasseToDelete.id);
      if (error) throw error;
      toast.success(`Klasse „${klasseToDelete.name}" gelöscht.`);
      fetchData();
    } catch (err: any) {
      if (err.code === '23503') {
        toast.error('Klasse kann nicht gelöscht werden — es sind noch Spiele zugewiesen.');
      } else {
        toast.error(`Fehler: ${err.message}`);
      }
    } finally {
      setKlasseToDelete(null);
    }
  };

  if (loading) {
    return (
      <main className="p-4 md:p-8 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-4 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>
            {error}
            {!activeEventId && (
              <> Bitte gehe zur <a href="/admin/events" className="underline font-medium">Event-Verwaltung</a> und aktiviere ein Event.</>
            )}
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Klassen</h1>
        <Button onClick={openAddDialog} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> Neue Klasse
        </Button>
      </div>

      {/* Integritätswarnung: kinder.klasse-Werte ohne Klassen-Eintrag */}
      {orphanedNames.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-700">Datenproblem erkannt</AlertTitle>
          <AlertDescription className="text-orange-600">
            Diese Klassen-Bezeichnungen stehen in den Kinderdaten, existieren aber nicht in der Klassen-Tabelle:{' '}
            <strong>{orphanedNames.join(', ')}</strong>.
            Für diese Kinder können bei der Auswertung keine Spielzuweisungen gefunden werden —
            die Ermittlung der Königspaare ist dadurch fehlerhaft.
            Bitte diese Klassen manuell anlegen.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-3">
          <div>
            <CardTitle className="text-base">Klassen des aktiven Events</CardTitle>
            <CardDescription className="mt-0.5">
              Klassen sind dem aktiven Event zugeordnet. Für jede Klasse werden König und Königin ermittelt.
              Die Namen müssen exakt mit den Klassen-Angaben in den Kinderdaten übereinstimmen.
            </CardDescription>
          </div>
          <span className="shrink-0 ml-4 text-sm text-slate-400 font-normal">
            {klassen.length} {klassen.length === 1 ? 'Klasse' : 'Klassen'}
          </span>
        </CardHeader>
        <CardContent>
          {klassen.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Noch keine Klassen angelegt. Über „Neue Klasse" hinzufügen.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <Users size={13} /> Kinder
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <Gamepad2 size={13} /> Spiele
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {klassen.map(klasse => {
                  const kinderCount = kinderCountByName.get(klasse.name) ?? 0;
                  const spieleCount = spieleCountById.get(klasse.id) ?? 0;
                  return (
                    <TableRow key={klasse.id}>
                      <TableCell className="font-semibold text-slate-800">{klasse.name}</TableCell>
                      <TableCell>
                        {kinderCount > 0
                          ? <span className="text-slate-700">{kinderCount}</span>
                          : <span className="text-slate-400 text-sm">–</span>
                        }
                      </TableCell>
                      <TableCell>
                        {spieleCount > 0
                          ? (
                            <Badge variant="secondary" className="bg-orange-50 text-orange-600 border border-orange-200 text-xs">
                              {spieleCount} {spieleCount === 1 ? 'Spiel' : 'Spiele'}
                            </Badge>
                          )
                          : <span className="text-slate-400 text-sm">keine</span>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(klasse)} title="Bearbeiten">
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          onClick={() => { setKlasseToDelete(klasse); setIsAlertOpen(true); }}
                          title="Löschen"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingKlasse(null); }}>
        <DialogContent className="sm:max-w-[380px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingKlasse ? 'Klasse bearbeiten' : 'Neue Klasse'}</DialogTitle>
              <DialogDescription>
                {editingKlasse
                  ? `Namen der Klasse „${editingKlasse.name}" ändern.`
                  : 'Name der neuen Klasse eingeben. Muss exakt mit den Klassen-Angaben in den Kinderdaten übereinstimmen (z.B. „1a", „2b").'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="klasse-name" className="text-right text-sm">Name</Label>
                <Input
                  id="klasse-name"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="col-span-3"
                  placeholder="z.B. 1a"
                  autoFocus
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Speichern...' : (editingKlasse ? 'Änderungen speichern' : 'Klasse erstellen')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Klasse wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Soll die Klasse „{klasseToDelete?.name}" wirklich gelöscht werden?
              Alle Spielzuweisungen für diese Klasse werden ebenfalls entfernt.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setKlasseToDelete(null)}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
