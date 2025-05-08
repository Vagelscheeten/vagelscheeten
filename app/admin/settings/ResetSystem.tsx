'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function ResetSystem() {
  const [confirmText, setConfirmText] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const expectedConfirmText = 'RESET VOGELSCHIESSEN';
  
  const startReset = () => {
    if (confirmText !== expectedConfirmText) {
      toast.error('Bitte geben Sie den exakten Bestätigungstext ein.');
      return;
    }
    
    if (!understood) {
      toast.error('Sie müssen bestätigen, dass Sie die Konsequenzen verstehen.');
      return;
    }
    
    // Countdown starten
    setCountdown(5);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          executeReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const executeReset = async () => {
    setIsResetting(true);
    setResult(null);
    
    try {
      const supabase = createClient();
      
      // Lösche nur die folgenden Tabellen
      const tables = [
        'kind_spielgruppe_zuordnung',
        'ergebnisse',
        'helfer_zuteilungen',
        'essensspenden_rueckmeldungen',
        'helfer_rueckmeldungen',
        'event_spiele',
        'spielgruppen',
        'kinder',
        'klassen'
        // NICHT löschen: 'spiele', 'sponsoren', 'settings'
      ];
      
      // Protokolliere die Tabellen, die gelöscht werden sollen
      console.log('Folgende Tabellen werden gelöscht:', tables);
      
      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .not('id', 'is', null);
        
        if (error) {
          throw new Error(`Fehler beim Löschen der Tabelle ${table}: ${error.message}`);
        }
      }
      
      setResult({
        success: true,
        message: 'System wurde erfolgreich zurückgesetzt. Alle Daten wurden gelöscht.'
      });
      
      toast.success('System wurde erfolgreich zurückgesetzt');
    } catch (error) {
      console.error('Reset error:', error);
      setResult({
        success: false,
        message: `Fehler beim Zurücksetzen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      });
      toast.error('Fehler beim Zurücksetzen des Systems');
    } finally {
      setIsResetting(false);
      setConfirmText('');
      setUnderstood(false);
      setCountdown(0);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {result && (
        <Alert className="mb-6" variant={result.success ? 'default' : 'destructive'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{result.success ? 'Erfolg' : 'Fehler'}</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}
      
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Warnung!</AlertTitle>
        <AlertDescription>
          Diese Aktion wird ALLE Daten aus der Datenbank löschen. Dies umfasst:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Alle Kinder und Klassen</li>
            <li>Alle Spielgruppen und Zuordnungen</li>
            <li>Alle Helfer-Rückmeldungen und Zuteilungen</li>
            <li>Alle Ergebnisse und Auswertungen</li>
            <li>Alle Essensspenden-Rückmeldungen</li>
            <li>Alle Spiele und Sponsoren</li>
            <li>Alle System-Einstellungen</li>
          </ul>
          Diese Aktion kann nicht rückgängig gemacht werden!
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded bg-gray-50">
          <Checkbox
            id="terms"
            checked={understood}
            onCheckedChange={(checked) => setUnderstood(checked as boolean)}
            className="h-5 w-5 border-2 border-gray-400"
          />
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Ich verstehe, dass diese Aktion nicht rückgängig gemacht werden kann
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Geben Sie 'RESET VOGELSCHIESSEN' ein um fortzufahren:</label>
          <Input
            placeholder="RESET VOGELSCHIESSEN"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isResetting}
          />
        </div>

        <Button
          variant="destructive"
          onClick={startReset}
          disabled={isResetting || !understood || confirmText !== expectedConfirmText}
          className="w-full sm:w-auto text-white bg-red-600 hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-red-300 disabled:text-white border-2 border-red-700 p-6 text-lg font-bold"
        >
          {isResetting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              System wird zurückgesetzt...
            </>
          ) : countdown > 0 ? (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              System wird in {countdown} Sekunden zurückgesetzt
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              System zurücksetzen
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
