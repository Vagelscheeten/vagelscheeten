'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Edit, Trash2, UserPlus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SpendenRueckmeldungenTabelle } from './SpendenRueckmeldungenTabelle';
import { SpendenBedarfForm } from './SpendenBedarfForm';
import { ManuelleEssensspendeZuweisungModal } from './ManuelleEssensspendeZuweisungModal';
import { SpendenBedarf, SpendenBedarfMitSumme, SpendenRueckmeldung } from './types';

// --- Bedarf-Karte (lokal) ---

function BedarfKarte({
  bedarf,
  onEdit,
  onDelete,
  onManuelleZuweisung,
}: {
  bedarf: SpendenBedarfMitSumme;
  onEdit: (b: SpendenBedarf) => void;
  onDelete: (id: string) => void;
  onManuelleZuweisung: (b: SpendenBedarfMitSumme) => void;
}) {
  const pct = bedarf.prozentAbdeckung;
  const barColor =
    pct >= 100 ? 'bg-green-500' : pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const isFull = bedarf.summeRueckmeldungen >= bedarf.anzahl_benoetigt;

  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{bedarf.titel}</h3>
          {bedarf.beschreibung && (
            <p className="text-sm text-slate-500 mt-0.5">{bedarf.beschreibung}</p>
          )}
        </div>
        {isFull && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
      </div>

      {/* Fortschrittsbalken */}
      <div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <p className="text-sm text-slate-600 mt-1 text-right font-medium">
          {bedarf.summeRueckmeldungen} / {bedarf.anzahl_benoetigt}
        </p>
      </div>

      {/* Aktionen */}
      <div className="flex gap-2 mt-auto pt-1">
        {!isFull && (
          <Button variant="outline" size="sm" onClick={() => onManuelleZuweisung(bedarf)}>
            <UserPlus className="h-4 w-4 mr-1" /> Zuweisen
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onEdit(bedarf)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(bedarf.id)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// --- Hauptseite ---

export default function EssensspendenPage() {
  const [bedarfe, setBedarfe] = useState<SpendenBedarf[]>([]);
  const [rueckmeldungen, setRueckmeldungen] = useState<SpendenRueckmeldung[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);

  // Form-Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBedarf, setSelectedBedarf] = useState<SpendenBedarf | null>(null);

  // Manuelle Zuweisung
  const [isZuweisungModalOpen, setIsZuweisungModalOpen] = useState(false);
  const [vorausgewaehlterBedarfId, setVorausgewaehlterBedarfId] = useState<string | undefined>(undefined);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();

      const { data: activeEvent, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('ist_aktiv', true)
        .single();

      if (eventError || !activeEvent) {
        console.error('Kein aktives Event gefunden:', eventError);
        setIsLoading(false);
        return;
      }

      setEventId(activeEvent.id);

      const [bedarfeRes, rueckmeldungenRes] = await Promise.all([
        supabase
          .from('essensspenden_bedarf')
          .select('*')
          .eq('event_id', activeEvent.id)
          .order('titel'),
        supabase
          .from('essensspenden_rueckmeldungen')
          .select(`*, spende:spende_id(id, titel, beschreibung, anzahl_benoetigt)`)
          .eq('event_id', activeEvent.id)
          .order('erstellt_am', { ascending: false }),
      ]);

      if (bedarfeRes.error) {
        console.error('Fehler beim Laden der Bedarfe:', bedarfeRes.error);
        toast.error('Bedarfe konnten nicht geladen werden.');
      } else {
        setBedarfe(bedarfeRes.data || []);
      }

      if (rueckmeldungenRes.error) {
        console.error('Fehler beim Laden der Rückmeldungen:', rueckmeldungenRes.error);
        toast.error('Rückmeldungen konnten nicht geladen werden.');
      } else {
        setRueckmeldungen(rueckmeldungenRes.data || []);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [refreshTrigger]);

  const refresh = () => setRefreshTrigger((p) => p + 1);

  // Bedarfe mit Summen berechnen
  const bedarfeMitSummen: SpendenBedarfMitSumme[] = bedarfe.map((bedarf) => {
    const summeRueckmeldungen = rueckmeldungen
      .filter((r) => r.spende_id === bedarf.id)
      .reduce((sum, r) => sum + r.menge, 0);

    const prozentAbdeckung =
      bedarf.anzahl_benoetigt > 0
        ? Math.min(100, Math.round((summeRueckmeldungen / bedarf.anzahl_benoetigt) * 100))
        : 0;

    return { ...bedarf, summeRueckmeldungen, prozentAbdeckung };
  });

  // Bedarf bearbeiten
  const handleEditBedarf = (bedarf: SpendenBedarf) => {
    setSelectedBedarf(bedarf);
    setIsFormOpen(true);
  };

  // Bedarf löschen
  const handleDeleteBedarf = async (bedarfId: string) => {
    if (!window.confirm('Möchtest du diesen Bedarf wirklich löschen? Alle zugehörigen Rückmeldungen werden ebenfalls gelöscht.')) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from('essensspenden_bedarf').delete().eq('id', bedarfId);

    if (error) {
      console.error('Fehler beim Löschen des Bedarfs:', error);
      toast.error('Bedarf konnte nicht gelöscht werden.');
    } else {
      toast.success('Bedarf erfolgreich gelöscht.');
      refresh();
    }
  };

  // Rückmeldung löschen
  const handleDeleteRueckmeldung = async (rueckmeldungId: string) => {
    if (!window.confirm('Möchtest du diese Rückmeldung wirklich löschen?')) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from('essensspenden_rueckmeldungen').delete().eq('id', rueckmeldungId);

    if (error) {
      console.error('Fehler beim Löschen der Rückmeldung:', error);
      toast.error('Rückmeldung konnte nicht gelöscht werden.');
    } else {
      toast.success('Rückmeldung erfolgreich gelöscht.');
      refresh();
    }
  };

  // Manuelle Zuweisung
  const handleManuelleZuweisung = (bedarf?: SpendenBedarfMitSumme) => {
    setVorausgewaehlterBedarfId(bedarf?.id);
    setIsZuweisungModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Lade Daten...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Essensspenden</h1>
        <Button onClick={() => { setSelectedBedarf(null); setIsFormOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Neuen Bedarf hinzufügen
        </Button>
      </div>

      {/* Bedarfe als Karten */}
      {bedarfeMitSummen.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">
          Noch keine Bedarfe angelegt. Erstelle einen neuen Bedarf, um loszulegen.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bedarfeMitSummen.map((b) => (
            <BedarfKarte
              key={b.id}
              bedarf={b}
              onEdit={handleEditBedarf}
              onDelete={handleDeleteBedarf}
              onManuelleZuweisung={handleManuelleZuweisung}
            />
          ))}
        </div>
      )}

      {/* Rückmeldungen */}
      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Rückmeldungen ({rueckmeldungen.length})
          </h2>
          {bedarfeMitSummen.length > 0 && (
            <Button variant="outline" onClick={() => handleManuelleZuweisung()}>
              <UserPlus className="mr-2 h-4 w-4" /> Manuell zuweisen
            </Button>
          )}
        </div>
        <SpendenRueckmeldungenTabelle
          rueckmeldungen={rueckmeldungen}
          onDelete={handleDeleteRueckmeldung}
        />
      </div>

      {/* Modals */}
      {isFormOpen && eventId && (
        <SpendenBedarfForm
          bedarf={selectedBedarf}
          eventId={eventId}
          onClose={() => { setIsFormOpen(false); setSelectedBedarf(null); }}
          onSubmit={() => { setIsFormOpen(false); setSelectedBedarf(null); refresh(); }}
        />
      )}

      {isZuweisungModalOpen && eventId && (
        <ManuelleEssensspendeZuweisungModal
          open={isZuweisungModalOpen}
          onClose={() => { setIsZuweisungModalOpen(false); setVorausgewaehlterBedarfId(undefined); }}
          alleBedarfe={bedarfeMitSummen}
          vorausgewaehlterBedarfId={vorausgewaehlterBedarfId}
          eventId={eventId}
          onSave={() => { setIsZuweisungModalOpen(false); setVorausgewaehlterBedarfId(undefined); refresh(); }}
        />
      )}
    </div>
  );
}
