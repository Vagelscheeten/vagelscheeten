import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Crown, Download, FileText, Filter } from 'lucide-react';
import { exportGesamtauswertungCSV, exportGesamtauswertungPDF } from './exportHelpers';
import { GesamtauswertungItem } from './types';

interface GesamtauswertungProps {
  data: GesamtauswertungItem[];
  isLoading: boolean;
}

export const GesamtauswertungTabelle: React.FC<GesamtauswertungProps> = ({ data, isLoading }) => {
  const [nurVollstaendig, setNurVollstaendig] = useState(false);
  const [selectedKlasse, setSelectedKlasse] = useState<string | null>(null);
  
  // Extrahiere verfügbare Klassen aus den Daten
  const klassen = [...new Set(data.map(item => item.klasse))].sort();
  
  // Filtere Daten nach ausgewählter Klasse und Vollständigkeit
  const filteredData = data.filter(item => {
    if (selectedKlasse && item.klasse !== selectedKlasse) return false;
    if (nurVollstaendig && item.status !== 'vollständig') return false;
    return true;
  });
  
  // Gruppiere Daten nach Klassen für die Anzeige
  const gruppiertNachKlasse: Record<string, typeof data> = {};
  filteredData.forEach(item => {
    if (!gruppiertNachKlasse[item.klasse]) {
      gruppiertNachKlasse[item.klasse] = [];
    }
    gruppiertNachKlasse[item.klasse].push(item);
  });
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={selectedKlasse === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedKlasse(null)}
          >
            Alle Klassen
          </Button>
          
          {klassen.map(klasse => (
            <Button
              key={klasse}
              variant={selectedKlasse === klasse ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedKlasse(klasse)}
            >
              Klasse {klasse}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={nurVollstaendig ? "default" : "outline"}
            size="sm"
            onClick={() => setNurVollstaendig(!nurVollstaendig)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            {nurVollstaendig ? "Alle anzeigen" : "Nur vollständig"}
          </Button>
          
          <Button 
            onClick={() => exportGesamtauswertungCSV(selectedKlasse, nurVollstaendig)}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          
          <Button 
            onClick={() => exportGesamtauswertungPDF(selectedKlasse, nurVollstaendig)}
            size="sm"
            className="flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>
      
      {Object.entries(gruppiertNachKlasse).map(([klasse, klassenData]) => (
        <div key={klasse} className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="bg-gray-50 p-4 border-b">
            <h3 className="text-lg font-semibold">Klasse {klasse}</h3>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Platz</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Geschlecht</TableHead>
                  <TableHead>Gruppe</TableHead>
                  <TableHead className="text-right">Gesamtpunkte</TableHead>
                  <TableHead className="text-right">Spiele</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {klassenData.map((item) => (
                  <TableRow key={item.kind_id}>
                    <TableCell className="font-medium">{item.rang}</TableCell>
                    <TableCell>
                      {item.kind_name}
                      {item.ist_koenig && <span title="König"><Crown className="inline-block ml-2 text-yellow-500 h-4 w-4" /></span>}
                      {item.ist_koenigin && <span title="Königin"><Crown className="inline-block ml-2 text-pink-500 h-4 w-4" /></span>}
                    </TableCell>
                    <TableCell>{item.geschlecht}</TableCell>
                    <TableCell>{item.spielgruppe_name}</TableCell>
                    <TableCell className="text-right font-semibold">{item.gesamtpunkte}</TableCell>
                    <TableCell className="text-right">{item.anzahl_spiele}/{item.gesamt_spiele}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'vollständig' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
      
      {Object.keys(gruppiertNachKlasse).length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          {isLoading ? (
            "Lade Daten..."
          ) : (
            "Keine Ergebnisse gefunden. Bitte passe die Filter an oder stelle sicher, dass Ergebnisse vorhanden sind."
          )}
        </div>
      )}
      
      <div className="bg-gray-50 p-4 rounded-lg border mt-6">
        <h4 className="font-semibold mb-2">Legende:</h4>
        <ul className="space-y-1 text-sm">
          <li className="flex items-center gap-2">
            <Crown className="text-yellow-500 h-4 w-4" /> König (bester Junge der Klasse)
          </li>
          <li className="flex items-center gap-2">
            <Crown className="text-pink-500 h-4 w-4" /> Königin (bestes Mädchen der Klasse)
          </li>
          <li className="mt-2">
            <strong>Punktevergabe:</strong> 1. Platz = 10 Punkte, 2. Platz = 9 Punkte, ... 10. Platz = 1 Punkt
          </li>
        </ul>
      </div>
    </div>
  );
};
