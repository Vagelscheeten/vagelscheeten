'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, CheckCircle2, AlertCircle, Info, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Phase4KommunizierenProps {
  eventId: string;
  onRefresh: () => void;
}

interface BenachrichtigungsStats {
  zuSenden: number;
  bereitsGesendet: number;
  ohneEmail: number;
}

interface VorschauEmail {
  kindName: string;
  kindKlasse: string;
  aufgabeTitel: string;
  aufgabeBeschreibung: string | null;
  zeitfenster: string;
  elternEmail: string;
  weitereKinder: { vorname: string; nachname: string; klasse: string }[];
}

export function Phase4Kommunizieren({ eventId, onRefresh }: Phase4KommunizierenProps) {
  const [stats, setStats] = useState<BenachrichtigungsStats | null>(null);
  const [vorschau, setVorschau] = useState<VorschauEmail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [ergebnis, setErgebnis] = useState<{ gesendet: number; fehler: number } | null>(null);

  const ladeDaten = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    // Anmeldungen mit Zuteilungs-Info
    const { data: anmeldungen } = await supabase
      .from('anmeldungen')
      .select(`
        id, kind_vorname, kind_nachname, kind_klasse, eltern_email, verifiziert, benachrichtigt_am, weitere_kinder_json
      `)
      .eq('event_id', eventId)
      .eq('verifiziert', true);

    if (!anmeldungen) { setIsLoading(false); return; }

    const bereitsGesendet = anmeldungen.filter(a => a.benachrichtigt_am).length;
    const mitEmail = anmeldungen.filter(a => a.eltern_email && !a.benachrichtigt_am);
    const ohneEmail = anmeldungen.filter(a => !a.eltern_email && !a.benachrichtigt_am);

    setStats({
      zuSenden: mitEmail.length,
      bereitsGesendet,
      ohneEmail: ohneEmail.length,
    });

    // Vorschau mit erstem zugewiesenen Helfer
    if (mitEmail.length > 0) {
      const erste = mitEmail[0];

      // Kind-ID finden, um die richtige Zuteilung zu laden
      const { data: kindMatch } = await supabase
        .from('kinder')
        .select('id')
        .eq('event_id', eventId)
        .ilike('vorname', erste.kind_vorname)
        .ilike('nachname', erste.kind_nachname)
        .limit(1);

      const kindId = kindMatch?.[0]?.id;

      // Zuteilung für dieses Kind laden
      let aufgabeTitel = 'Helfer-Aufgabe';
      let aufgabeBeschreibung: string | null = null;
      let zeitfenster = '';

      if (kindId) {
        const { data: zuteilungData } = await supabase
          .from('helfer_zuteilungen')
          .select(`
            zeitfenster,
            aufgabe:helferaufgaben(titel, beschreibung)
          `)
          .eq('event_id', eventId)
          .eq('kind_id', kindId)
          .limit(1);

        if (zuteilungData && zuteilungData.length > 0) {
          const z = zuteilungData[0];
          const aufgabe = Array.isArray(z.aufgabe) ? z.aufgabe[0] : z.aufgabe;
          aufgabeTitel = aufgabe?.titel || 'Helfer-Aufgabe';
          aufgabeBeschreibung = aufgabe?.beschreibung || null;
          zeitfenster = z.zeitfenster || '';
        }
      }

      setVorschau({
        kindName: `${erste.kind_vorname} ${erste.kind_nachname}`,
        kindKlasse: erste.kind_klasse || '',
        aufgabeTitel,
        aufgabeBeschreibung,
        zeitfenster,
        elternEmail: erste.eltern_email || '',
        weitereKinder: (erste as any).weitere_kinder_json || [],
      });
    }

    setIsLoading(false);
  }, [eventId]);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  const handleSenden = async () => {
    setConfirming(false);
    setIsSending(true);
    setErgebnis(null);

    try {
      const res = await fetch('/api/helfer/benachrichtigung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });

      const data = await res.json();

      if (data.erfolg) {
        setErgebnis({ gesendet: data.gesendet, fehler: data.fehler || 0 });
        toast.success(`${data.gesendet} E-Mails gesendet`);
        ladeDaten();
        onRefresh();
      } else {
        toast.error(data.error || 'Fehler beim Senden');
      }
    } catch {
      toast.error('Fehler beim Senden');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" size={24} /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Eltern-Benachrichtigung</p>
          <p>Es werden E-Mails an alle verifizierten Anmeldungen gesendet, die noch nicht benachrichtigt wurden. Jede E-Mail enthält die zugeteilte Helfer-Aufgabe.</p>
        </div>
      </div>

      {/* Status-Karten */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.zuSenden}</div>
            <div className="text-xs text-slate-500 mt-1">Zu senden</div>
          </div>
          <div className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.bereitsGesendet}</div>
            <div className="text-xs text-slate-500 mt-1">Bereits gesendet</div>
          </div>
          <div className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-400">{stats.ohneEmail}</div>
            <div className="text-xs text-slate-500 mt-1">Ohne E-Mail</div>
          </div>
        </div>
      )}

      {/* Hinweis: externe Helfer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-sm text-amber-800">
        <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
        <span>Manuell hinzugefügte und externe Helfer werden nicht per E-Mail benachrichtigt — bitte direkt kontaktieren.</span>
      </div>

      {/* E-Mail Vorschau */}
      {vorschau && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">E-Mail Vorschau <span className="font-normal text-slate-400">(exemplarisch)</span></h3>
          <div className="bg-white border rounded-xl p-4 font-mono text-sm space-y-2">
            <div className="text-slate-500 border-b pb-2 mb-3">
              <div><span className="text-slate-400">An:</span> {vorschau.elternEmail}</div>
              <div><span className="text-slate-400">Betreff:</span> Helfer-Zuteilung beim Melsdörper Vagelscheeten ({vorschau.weitereKinder.length > 0 ? `Familie ${vorschau.kindName.split(' ').pop()}` : vorschau.kindName})</div>
            </div>
            <p className="font-sans">Hallo!</p>
            <p className="font-sans">Vielen Dank für die Anmeldung als Helfer zum Melsdörper Vagelscheeten ({vorschau.weitereKinder.length > 0 ? 'Kinder' : 'Kind'}: <strong>{vorschau.kindName}</strong>, Klasse {vorschau.kindKlasse}{vorschau.weitereKinder.map(k => `; ${k.vorname} ${k.nachname}, Klasse ${k.klasse}`).join('')}).</p>
            <p className="font-sans">Folgende Aufgabe wurde zugeteilt:</p>
            <div className="bg-slate-50 rounded-lg p-3 font-sans space-y-1">
              <p><strong>Aufgabe:</strong> {vorschau.aufgabeTitel}</p>
              {vorschau.aufgabeBeschreibung && <p className="text-slate-600 text-xs">{vorschau.aufgabeBeschreibung}</p>}
              <p><strong>Zeitfenster:</strong> {vorschau.zeitfenster}</p>
            </div>
            <p className="font-sans">Vielen Dank für die Unterstützung!</p>
            <p className="font-sans text-slate-500 text-xs">Bei Fragen: orgateam@vagelscheeten.de</p>
          </div>
        </div>
      )}

      {/* Sende-Button */}
      {stats && stats.zuSenden > 0 && !ergebnis && (
        <>
          {!confirming ? (
            <Button
              onClick={() => setConfirming(true)}
              disabled={isSending}
              className="w-full gap-2"
              size="lg"
            >
              <Send size={16} />
              {stats.zuSenden} Eltern benachrichtigen
            </Button>
          ) : (
            <div className="bg-slate-50 border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">E-Mails wirklich senden?</p>
              <p className="text-sm text-slate-600">Es werden {stats.zuSenden} E-Mails gesendet. Diese Aktion kann nicht rückgängig gemacht werden.</p>
              <div className="flex gap-2">
                <Button onClick={handleSenden} disabled={isSending} className="gap-2">
                  {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Ja, jetzt senden
                </Button>
                <Button variant="outline" onClick={() => setConfirming(false)}>Abbrechen</Button>
              </div>
            </div>
          )}
        </>
      )}

      {stats && stats.zuSenden === 0 && stats.bereitsGesendet > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
          <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-semibold">Alle Eltern wurden bereits benachrichtigt.</p>
            <p className="mt-0.5">{stats.bereitsGesendet} E-Mails gesendet.</p>
          </div>
        </div>
      )}

      {/* Ergebnis */}
      {ergebnis && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
          <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-semibold">{ergebnis.gesendet} E-Mails erfolgreich gesendet.</p>
            {ergebnis.fehler > 0 && (
              <p className="text-amber-700 mt-0.5">{ergebnis.fehler} Fehler beim Senden.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
