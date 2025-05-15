'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ImageUpload } from '@/components/ImageUpload';
import { Image as ImageIcon, Trash2, ArrowLeft, CheckCircle, AlertCircle, X } from 'lucide-react';

// Typ für ein Galeriebild
type GalleryImage = {
  id: number;
  name: string;
  url: string;
  size?: number;
  created_at?: string;
};

export default function AdminGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Laden der Bilder aus Supabase Storage
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const supabase = createClient();
        const { data, error } = await supabase
          .storage
          .from('galerie')
          .list('');
          
        if (error) throw error;
        
        // Konvertieren der Dateien in das GalleryImage-Format
        const imageFiles = (data || []).filter(file => 
          file.name.match(/\.(jpeg|jpg|png|gif|webp)$/i)
        );
        
        const galleryImages: GalleryImage[] = await Promise.all(
          imageFiles.map(async (file, index) => {
            const { data: { publicUrl } } = supabase
              .storage
              .from('galerie')
              .getPublicUrl(file.name);
              
            return {
              id: index + 1,
              name: file.name,
              url: publicUrl,
              size: file.metadata?.size,
              created_at: file.created_at
            };
          })
        );
        
        setImages(galleryImages);
      } catch (error) {
        console.error('Fehler beim Laden der Bilder:', error);
        setError('Die Bilder konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchImages();
  }, [refreshTrigger]);
  
  // Bild löschen
  const handleDeleteImage = async (imageName: string) => {
    try {
      setDeleteLoading(imageName);
      setError(null);
      console.log(`Versuche Bild zu löschen: ${imageName}`);
      
      const supabase = createClient();
      
      // Prüfen, ob der Benutzer angemeldet ist
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        console.error('Fehler: Benutzer ist nicht angemeldet');
        setError('Sie müssen angemeldet sein, um Bilder zu löschen. Bitte melden Sie sich an und versuchen Sie es erneut.');
        return;
      }
      
      console.log('Authentifizierungsstatus:', {
        angemeldet: !!sessionData?.session,
        userId: sessionData?.session?.user?.id,
        role: sessionData?.session?.user?.role
      });
      
      // Zuerst prüfen, ob die Datei existiert
      const { data: fileExists, error: fileCheckError } = await supabase
        .storage
        .from('galerie')
        .list('', {
          search: imageName
        });
        
      if (fileCheckError) {
        console.error('Fehler beim Überprüfen der Datei:', fileCheckError);
        setError(`Fehler beim Überprüfen der Datei: ${fileCheckError.message}`);
        return;
      }
      
      if (!fileExists || fileExists.length === 0) {
        console.error('Datei existiert nicht:', imageName);
        setError(`Die Datei "${imageName}" existiert nicht im Storage.`);
        return;
      }
      
      console.log('Datei gefunden, versuche zu löschen mit API-Route:', fileExists);
      
      // Löschen über die API-Route mit Admin-Rechten
      const response = await fetch('/api/galerie/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageName }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('API Löschfehler:', result.error);
        setError(`Fehler beim Löschen: ${result.error}`);
        return;
      }
      
      console.log('API Löschergebnis:', result);
      
      // Lokale Bilderliste aktualisieren, um das gelöschte Bild sofort zu entfernen
      setImages(prevImages => prevImages.filter(img => img.name !== imageName));
      
      // Kurze Verzögerung, dann Neuladung der Bilder vom Server
      setTimeout(async () => {
        try {
          // Erneut Bilder vom Server laden, um sicherzustellen, dass die Liste aktuell ist
          const { data: refreshData, error: refreshError } = await supabase
            .storage
            .from('galerie')
            .list('');
            
          if (!refreshError && refreshData) {
            // Konvertieren der Dateien in das GalleryImage-Format
            const imageFiles = refreshData.filter(file => 
              file.name.match(/\.(jpeg|jpg|png|gif|webp)$/i)
            );
            
            const galleryImages: GalleryImage[] = await Promise.all(
              imageFiles.map(async (file, index) => {
                const { data: { publicUrl } } = supabase
                  .storage
                  .from('galerie')
                  .getPublicUrl(file.name);
                  
                return {
                  id: index + 1,
                  name: file.name,
                  url: publicUrl,
                  size: file.metadata?.size,
                  created_at: file.created_at
                };
              })
            );
            
            setImages(galleryImages);
          }
        } catch (refreshErr) {
          console.error('Fehler beim Aktualisieren der Bilderliste:', refreshErr);
        }
      }, 1000);
      
      // Erfolgs-Benachrichtigung anzeigen
      setNotification({ type: 'success', message: 'Bild erfolgreich gelöscht!' });
      
      // Automatisch nach 5 Sekunden ausblenden
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    } catch (error: any) {
      console.error('Fehler beim Löschen des Bildes:', error);
      setError(`Das Bild konnte nicht gelöscht werden: ${error?.message || 'Unbekannter Fehler'}`);
    } finally {
      setDeleteLoading(null);
    }
  };
  
  // Formatieren der Dateigröße
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unbekannt';
    
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Formatieren des Datums
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unbekannt';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Schließen der Benachrichtigung
  const closeNotification = () => {
    setNotification(null);
  };
  
  return (
    <div className="p-8 relative">
      {/* Benachrichtigungs-Modal */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 flex items-center p-4 mb-4 shadow-lg rounded-lg ${notification.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'} transition-all duration-300 transform animate-fade-in-right`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
            )}
            <div className="text-sm font-medium mr-6 text-gray-800">
              {notification.message}
            </div>
            <button
              type="button"
              className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg p-1.5 inline-flex h-8 w-8 focus:ring-2 focus:ring-gray-300"
              onClick={closeNotification}
            >
              <span className="sr-only">Schließen</span>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      <div className="mb-6 flex items-center">
        <Link href="/admin" className="text-gray-600 hover:text-gray-900 mr-4">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold">Galerie verwalten</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <ImageIcon className="mr-2 h-5 w-5" />
          Neue Bilder hochladen
        </h2>
        <p className="text-gray-600 mb-4">
          Laden Sie hier neue Bilder für die Galerie hoch. Unterstützte Formate: JPG, PNG, GIF, WEBP. 
          Maximale Dateigröße: 5MB.
        </p>
        <ImageUpload />
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Vorhandene Bilder</h2>
        
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Bilder werden geladen...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Keine Bilder vorhanden.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vorschau
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dateiname
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Größe
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hochgeladen am
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {images.map((image) => (
                  <tr key={image.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative h-16 w-16 rounded overflow-hidden">
                        <Image 
                          src={image.url} 
                          alt={image.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{image.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatFileSize(image.size)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(image.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteImage(image.name)}
                        disabled={deleteLoading === image.name}
                        className={`text-red-600 hover:text-red-900 focus:outline-none ${deleteLoading === image.name ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {deleteLoading === image.name ? (
                          <span className="inline-flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Löschen...
                          </span>
                        ) : (
                          <span className="inline-flex items-center">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Löschen
                          </span>
                        )}
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
