import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      setSuccess(false);
      setUploading(true);

      const files = event.target.files;
      if (!files || files.length === 0) {
        setError('Bitte wählen Sie mindestens ein Bild aus');
        return;
      }

      // Prüfen, ob Supabase konfiguriert ist
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError('Supabase ist nicht korrekt konfiguriert');
        return;
      }

      const supabase = createClient();

      // Hinweis: Der Bucket 'galerie' muss in der Supabase-Konsole erstellt werden
      // mit den richtigen Berechtigungen (RLS-Policies für anonymen Zugriff)
      console.log('Versuche Upload in Bucket "galerie"...');
      
      // Fehlermeldung anzeigen, wenn der Upload fehlschlägt
      try {
        const { data: listData, error: listError } = await supabase.storage.from('galerie').list();
        
        if (listError) {
          console.error('Fehler beim Zugriff auf den Bucket:', listError);
          setError(`Bitte stellen Sie sicher, dass der Bucket 'galerie' in Supabase existiert und die richtigen Berechtigungen hat. Fehlermeldung: ${listError.message}`);
          return;
        }
      } catch (error) {
        console.error('Fehler beim Prüfen des Buckets:', error);
      }

      // Upload each file
      let uploadedCount = 0;
      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError(`${file.name} ist kein gültiges Bildformat`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError(`${file.name} ist zu groß (maximal 5MB)`);
          continue;
        }

        // Create a unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

        console.log(`Versuche Upload von ${file.name} als ${fileName}...`);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('galerie')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setError(`Fehler beim Hochladen von ${file.name}: ${uploadError.message}`);
          continue;
        }
        
        console.log('Upload erfolgreich:', uploadData);
        uploadedCount++;
      }
      
      if (uploadedCount > 0) {
        setSuccess(true);
        setError(null);
        
        // Clear the input
        event.target.value = '';
        
        // Trigger page reload after successful upload
        window.location.reload();
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col items-start gap-4">
        <label className="relative cursor-pointer w-full">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <div className={`px-6 py-3 rounded-lg text-lg font-medium transition-colors w-full flex items-center justify-center
            ${uploading 
              ? 'bg-gray-200 text-gray-500' 
              : 'bg-green-600 text-white hover:bg-green-700 shadow-md'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
            </svg>
            {uploading ? 'Wird hochgeladen...' : 'Bilder hochladen'}
          </div>
        </label>
        {success && (
          <div className="text-green-600 text-base bg-green-50 px-4 py-2 rounded-md border border-green-200 w-full">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Bilder erfolgreich hochgeladen!
            </span>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-red-600 text-base bg-red-50 px-4 py-2 rounded-md border border-red-200">{error}</p>
      )}
    </div>
  );
}
