'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ImageUpload } from '@/components/ImageUpload';
import { Image as ImageIcon, Trash2, ArrowLeft } from 'lucide-react';

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
      console.log('Sitzungsstatus:', sessionData?.session ? 'Angemeldet' : 'Nicht angemeldet');
      
      // Löschen versuchen
      const { data, error } = await supabase
        .storage
        .from('galerie')
        .remove([imageName]);
        
      if (error) {
        console.error('Löschfehler:', error);
        setError(`Fehler beim Löschen: ${error.message}. Stellen Sie sicher, dass der Bucket die richtigen Berechtigungen hat.`);
        return;
      }
      
      console.log('Löschergebnis:', data);
      
      // Aktualisieren der Bilderliste
      setRefreshTrigger(prev => prev + 1);
      alert('Bild erfolgreich gelöscht!');
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

  return (
    <div className="p-8">
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
