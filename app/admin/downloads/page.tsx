'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Trash2, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function DownloadsAdmin() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Initialisieren des authentifizierten Supabase-Clients
  const supabase = createClient();
  
  // Funktion zum Bereinigen von Dateinamen (Umlaute und Sonderzeichen entfernen)
  const sanitizeFilename = (filename: string): string => {
    // Umlaute und andere Sonderzeichen ersetzen
    const replacements: {[key: string]: string} = {
      'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue', 'ß': 'ss',
      ' ': '_', '&': 'und', '(': '', ')': '', '[': '', ']': '', '{': '', '}': '',
      '?': '', '!': '', '"': '', '\'': '', '`': '', '´': '', '+': '_plus_',
      '#': '', '%': '_prozent_', '$': '', '€': '_euro_', '@': '_at_'
    };
    
    let sanitized = filename;
    
    // Alle definierten Zeichen ersetzen
    Object.keys(replacements).forEach(char => {
      sanitized = sanitized.split(char).join(replacements[char]);
    });
    
    // Alle anderen nicht-alphanumerischen Zeichen außer Punkt und Unterstrich entfernen
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
    
    return sanitized;
  };

  // Laden der Dateien
  const fetchFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .storage
        .from('downloads')
        .list('');
        
      if (error) throw error;
      
      setFiles(data || []);
    } catch (error: any) {
      console.error('Fehler beim Laden der Dateien:', error);
      toast({
        title: "Fehler",
        description: `Dateien konnten nicht geladen werden: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Datei auswählen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Datei hochladen
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "Fehler",
        description: "Bitte wähle eine Datei aus",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setUploading(true);
      
      // Dateinamen bereinigen (Umlaute und Sonderzeichen entfernen)
      const originalName = selectedFile.name;
      const sanitizedName = sanitizeFilename(originalName);
      
      // Wenn der Dateiname bereinigt wurde, eine Kopie der Datei mit dem neuen Namen erstellen
      let fileToUpload = selectedFile;
      if (sanitizedName !== originalName) {
        fileToUpload = new File([selectedFile], sanitizedName, { type: selectedFile.type });
        console.log(`Dateiname bereinigt: ${originalName} -> ${sanitizedName}`);
      }
      
      const { data, error } = await supabase
        .storage
        .from('downloads')
        .upload(sanitizedName, fileToUpload, {
          cacheControl: '3600',
          upsert: true
        });
        
      // Wenn der Dateiname bereinigt wurde, den Benutzer informieren
      if (sanitizedName !== originalName) {
        toast({
          title: "Hinweis",
          description: `Der Dateiname wurde angepasst: ${originalName} → ${sanitizedName}`,
          variant: "default"
        });
      }
        
      if (error) throw error;
      
      toast({
        title: "Erfolg",
        description: `Datei ${selectedFile.name} erfolgreich hochgeladen`,
        variant: "default"
      });
      
      setSelectedFile(null);
      // Formular zurücksetzen
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Dateien neu laden
      fetchFiles();
    } catch (error: any) {
      console.error('Fehler beim Hochladen:', error);
      toast({
        title: "Fehler",
        description: `Fehler beim Hochladen: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  // Datei löschen
  const handleDelete = async (fileName: string) => {
    if (!confirm(`Möchtest du die Datei "${fileName}" wirklich löschen?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .storage
        .from('downloads')
        .remove([fileName]);
        
      if (error) throw error;
      
      toast({
        title: "Erfolg",
        description: `Datei ${fileName} erfolgreich gelöscht`,
        variant: "default"
      });
      
      // Dateien neu laden
      fetchFiles();
    } catch (error: any) {
      console.error('Fehler beim Löschen:', error);
      toast({
        title: "Fehler",
        description: `Fehler beim Löschen: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Dateien beim Laden der Komponente abrufen
  useEffect(() => {
    fetchFiles();
  }, []);

  // URL für Download generieren
  const getDownloadUrl = (fileName: string) => {
    const { data } = supabase
      .storage
      .from('downloads')
      .getPublicUrl(fileName);
      
    return data.publicUrl;
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Download-Verwaltung</h1>
      </div>
      
      {/* Upload-Formular */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Upload className="mr-2 h-5 w-5" />
          Neue Datei hochladen
        </h2>
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label htmlFor="fileInput" className="block text-sm font-medium text-gray-700 mb-2">
              Datei auswählen
            </label>
            <input
              id="fileInput"
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-white
                hover:file:bg-primary/90"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                Ausgewählte Datei: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          
          <div>
            <Button 
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full"
            >
              {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
            </Button>
          </div>
        </form>
      </div>
      
      {/* Dateien-Liste */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Vorhandene Dateien
        </h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Dateien werden geladen...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Keine Dateien vorhanden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dateiname
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Größe
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Geändert am
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{file.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{(file.metadata?.size / 1024).toFixed(2) || '-'} KB</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {file.updated_at ? new Date(file.updated_at).toLocaleString('de-DE') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a 
                        href={getDownloadUrl(file.name)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 mr-4"
                      >
                        Anzeigen
                      </a>
                      <button
                        onClick={() => handleDelete(file.name)}
                        className="text-red-600 hover:text-red-900 ml-4"
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
