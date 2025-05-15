import React, { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode'; // Stellen Sie sicher, dass dieses Paket installiert ist

interface PDFViewerProps {
  gruppen: Array<{
    id: string;
    name: string;
    leiter_zugangscode: string;
    teamleiter?: {
      vorname: string;
      nachname: string;
      klasse?: string;
    } | null;
  }>;
  onClose: () => void;
}

export function PDFViewer({ gruppen, onClose }: PDFViewerProps) {
  const [qrCodes, setQRCodes] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // QR-Codes für alle Gruppen generieren
  useEffect(() => {
    const generateQRCodes = async () => {
      const codes: Record<string, string> = {};
      
      for (const gruppe of gruppen) {
        try {
          const url = 'https://www.vagelscheeten.de/leiter/login';
          const qrDataUrl = await QRCode.toDataURL(url, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
          codes[gruppe.id] = qrDataUrl;
        } catch (err) {
          console.error(`Fehler beim Generieren des QR-Codes für ${gruppe.name}:`, err);
        }
      }
      
      setQRCodes(codes);
    };
    
    generateQRCodes();
  }, [gruppen]);

  // Erstellen der HTML-Vorlage für den PDF-Download
  const renderTemplate = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Teamleiter-Anleitungen</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .page-break { page-break-after: always; }
          .instructions { margin-top: 30px; margin-bottom: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
          .group-name { font-size: 24px; font-weight: bold; color: #2d3748; margin-bottom: 15px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 18px; font-weight: bold; color: #4a5568; margin-bottom: 8px; }
          .qr-container { display: flex; align-items: center; justify-content: center; margin: 20px 0; }
          .qr-code { width: 200px; height: 200px; }
          .login-info { background-color: #f7fafc; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .credential { font-family: monospace; background-color: #edf2f7; padding: 5px 10px; border-radius: 4px; }
          .note { font-style: italic; color: #718096; }
          .contact { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
          .url-link { color: #3182ce; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1 style="text-align: center; margin-bottom: 30px;">Anleitungen für Teamleiter</h1>
        
        ${gruppen.map((gruppe, index) => `
          <div class="instructions">
            <div class="group-name">${gruppe.name}</div>
            
            ${gruppe.teamleiter ? `
              <div class="section">
                <div class="section-title">Teamleiter:</div>
                <p>${gruppe.teamleiter.vorname} ${gruppe.teamleiter.nachname}${gruppe.teamleiter.klasse ? ` (Klasse: ${gruppe.teamleiter.klasse})` : ''}</p>
              </div>
            ` : `
              <div class="section">
                <p class="note">Kein Teamleiter zugewiesen!</p>
              </div>
            `}
            
            <div class="section">
              <div class="section-title">QR-Code für Login:</div>
              <div class="qr-container">
                <img class="qr-code" src="${qrCodes[gruppe.id] || ''}" alt="QR-Code für Login">
              </div>
              <p>Scanne diesen Code mit deinem Smartphone, um direkt zur Login-Seite zu gelangen.</p>
              <p>Oder besuche diese URL: <a class="url-link" href="https://www.vagelscheeten.de/leiter/login">www.vagelscheeten.de/leiter/login</a></p>
            </div>
            
            <div class="section">
              <div class="section-title">Zugangsdaten:</div>
              <div class="login-info">
                <p><strong>Gruppenname:</strong> <span class="credential">${gruppe.name}</span></p>
                <p><strong>Zugangscode:</strong> <span class="credential">${gruppe.leiter_zugangscode}</span></p>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">Anweisungen:</div>
              <p>
                Bitte logge dich mit den oben genannten Zugangsdaten auf der Website ein. 
                Nach erfolgreicher Anmeldung kannst du die Ergebnisse deiner Gruppe direkt über dein Smartphone erfassen.
              </p>
            </div>
            
            <div class="contact">
              <p class="note">
                Bei Fragen oder Problemen wende dich bitte an das Organisationsteam des Vogelschiessens.
              </p>
            </div>
          </div>
          ${index < gruppen.length - 1 ? '<div class="page-break"></div>' : ''}
        `).join('')}
      </body>
      </html>
    `;
  };

  // Funktion zum Generieren und Herunterladen des PDFs
  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const template = renderTemplate();
      
      // Erstellen des Blobs aus dem HTML-Template
      const blob = new Blob([template], { type: 'text/html' });
      
      // Erstellen einer URL für den Blob
      const url = URL.createObjectURL(blob);
      
      // Erstellen eines temporären Link-Elements zum Herunterladen
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Teamleiter-Anleitungen.html';
      
      // Klicken auf den Link zum Starten des Downloads
      document.body.appendChild(link);
      link.click();
      
      // Aufräumen
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setIsGenerating(false);
    } catch (error) {
      console.error('Fehler beim Generieren des PDFs:', error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Teamleiter-Anleitungen</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Body */}
        <div className="overflow-auto flex-grow p-6">
          {Object.keys(qrCodes).length < gruppen.length ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p>QR-Codes werden generiert...</p>
            </div>
          ) : gruppen.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Keine Gruppen vorhanden.</p>
              <p className="text-sm text-gray-400 mt-2">
                Bitte erstelle zuerst Gruppen in der Gruppenverwaltung.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-700">
                  <strong>Hinweis:</strong> Diese Vorschau zeigt an, wie die generierten Anleitungen aussehen werden. 
                  Klicke auf "Anleitungen herunterladen", um eine HTML-Datei zu erhalten, die du drucken kannst.
                </p>
              </div>
              
              {gruppen.map((gruppe) => (
                <div 
                  key={gruppe.id} 
                  className="border rounded-lg overflow-hidden shadow-sm"
                >
                  <div className="p-4 bg-gray-50 border-b">
                    <h3 className="text-lg font-bold">{gruppe.name}</h3>
                    {gruppe.teamleiter ? (
                      <p className="text-sm text-gray-600">
                        Teamleiter: {gruppe.teamleiter.vorname} {gruppe.teamleiter.nachname}
                        {gruppe.teamleiter.klasse && ` (Klasse: ${gruppe.teamleiter.klasse})`}
                      </p>
                    ) : (
                      <p className="text-sm text-red-500">Kein Teamleiter zugewiesen!</p>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <div className="mb-6 flex justify-center">
                      {qrCodes[gruppe.id] ? (
                        <img 
                          src={qrCodes[gruppe.id]} 
                          alt="QR-Code" 
                          className="w-40 h-40"
                        />
                      ) : (
                        <div className="w-40 h-40 bg-gray-200 flex items-center justify-center">
                          <p className="text-gray-500">QR-Code wird geladen...</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center mb-4">
                      <p>URL: <a href="https://www.vagelscheeten.de/leiter/login" className="text-blue-600 hover:underline">www.vagelscheeten.de/leiter/login</a></p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      <div className="mb-2">
                        <span className="font-semibold">Gruppenname:</span> <span className="bg-gray-200 px-2 py-0.5 rounded">{gruppe.name}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Zugangscode:</span> <span className="bg-gray-200 px-2 py-0.5 rounded">{gruppe.leiter_zugangscode}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      Bitte logge dich mit den oben genannten Zugangsdaten auf der Website ein. 
                      Nach erfolgreicher Anmeldung kannst du die Ergebnisse deiner Gruppe direkt über dein Smartphone erfassen.
                    </p>
                    
                    <p className="text-sm italic text-gray-500 border-t pt-4 mt-4">
                      Bei Fragen oder Problemen wende dich bitte an das Organisationsteam des Vogelschiessens.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer mit Download-Button */}
        <div className="flex justify-end items-center p-4 border-t">
          <Button
            variant="default"
            onClick={generatePDF}
            disabled={isGenerating || Object.keys(qrCodes).length < gruppen.length}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird generiert...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Anleitungen herunterladen
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
