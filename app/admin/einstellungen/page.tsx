'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Settings, Loader2, Upload, Trash2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

type SettingsMap = Record<string, Record<string, string | string[]>>;

const SETTINGS_CONFIG = [
  {
    key: 'hero',
    label: 'Hero-Bereich (Texte)',
    icon: '🏠',
    fields: [
      { key: 'titel', label: 'Titel', type: 'text' as const },
      { key: 'untertitel', label: 'Untertitel', type: 'text' as const },
      { key: 'cta_text', label: 'Button-Text', type: 'text' as const },
      { key: 'cta_beschreibung', label: 'Beschreibung unter dem Countdown', type: 'text' as const },
    ],
  },
  {
    key: 'spenden',
    label: 'Spendeninformationen',
    icon: '💰',
    fields: [
      { key: 'kontoinhaber', label: 'Kontoinhaber', type: 'text' as const },
      { key: 'iban', label: 'IBAN', type: 'text' as const },
      { key: 'bic', label: 'BIC', type: 'text' as const },
      { key: 'verwendungszweck_prefix', label: 'Verwendungszweck (Prefix)', type: 'text' as const },
      { key: 'beschreibung_links', label: 'Text links', type: 'textarea' as const },
      { key: 'beschreibung_helfer', label: 'Text Helfer', type: 'textarea' as const },
    ],
  },
  {
    key: 'kontakt',
    label: 'Kontakt & Adresse',
    icon: '📧',
    fields: [
      { key: 'email', label: 'E-Mail-Adresse', type: 'text' as const },
      { key: 'adresse_name', label: 'Name (z.B. Schule)', type: 'text' as const },
      { key: 'adresse_strasse', label: 'Straße', type: 'text' as const },
      { key: 'adresse_plz_ort', label: 'PLZ & Ort', type: 'text' as const },
    ],
  },
  {
    key: 'einladung',
    label: 'Einladungsbereich',
    icon: '🎉',
    fields: [
      { key: 'badge', label: 'Badge (kleines Label über dem Titel)', type: 'text' as const },
      { key: 'titel', label: 'Titel', type: 'text' as const },
      { key: 'text1', label: 'Einladungstext 1', type: 'textarea' as const },
      { key: 'text2', label: 'Einladungstext 2', type: 'textarea' as const },
      { key: 'fussnote', label: 'Fußnote (orangene Karte rechts)', type: 'text' as const },
    ],
  },
];

export default function EinstellungenAdmin() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('seiteneinstellungen').select('key, value');
    if (data) {
      const map: SettingsMap = {};
      for (const row of data) {
        map[row.key] = row.value as Record<string, string | string[]>;
      }
      setSettings(map);
      // Extract hero image URL
      const heroUrl = map.hero?.hero_bild_url as string | undefined;
      if (heroUrl) setHeroImageUrl(heroUrl);
    }
    setLoading(false);
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    const value = settings[key];
    const { error } = await supabase
      .from('seiteneinstellungen')
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) {
      toast.error('Fehler beim Speichern: ' + error.message);
    } else {
      toast.success('Einstellungen gespeichert!');
    }
    setSaving(null);
  };

  const updateField = (settingKey: string, fieldKey: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [settingKey]: {
        ...(prev[settingKey] || {}),
        [fieldKey]: value,
      },
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte wähle eine Bilddatei aus.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Das Bild darf maximal 5 MB groß sein.');
      return;
    }

    setUploadingImage(true);

    try {
      const fileName = `hero-${Date.now()}.${file.name.split('.').pop()}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('hero')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        // If bucket doesn't exist, try galerie bucket as fallback
        const { error: fallbackError } = await supabase.storage
          .from('galerie')
          .upload(`hero/${fileName}`, file, { upsert: true });

        if (fallbackError) {
          toast.error('Fehler beim Hochladen: ' + (fallbackError.message || uploadError.message));
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('galerie')
          .getPublicUrl(`hero/${fileName}`);

        await saveHeroImageUrl(publicUrl);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('hero')
        .getPublicUrl(fileName);

      await saveHeroImageUrl(publicUrl);
    } catch (err) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveHeroImageUrl = async (url: string) => {
    const heroSettings = settings.hero || {};
    const updatedHero = { ...heroSettings, hero_bild_url: url };

    const { error } = await supabase
      .from('seiteneinstellungen')
      .upsert({ key: 'hero', value: updatedHero, updated_at: new Date().toISOString() });

    if (error) {
      toast.error('Fehler beim Speichern der Bild-URL: ' + error.message);
    } else {
      setHeroImageUrl(url);
      setSettings(prev => ({ ...prev, hero: updatedHero }));
      toast.success('Hero-Bild erfolgreich hochgeladen!');
    }
  };

  const handleRemoveImage = async () => {
    if (!confirm('Hero-Bild wirklich entfernen? Es wird wieder das Standard-Bild verwendet.')) return;

    const heroSettings = settings.hero || {};
    const { hero_bild_url, ...rest } = heroSettings as Record<string, string | string[]>;

    const { error } = await supabase
      .from('seiteneinstellungen')
      .upsert({ key: 'hero', value: rest, updated_at: new Date().toISOString() });

    if (!error) {
      setHeroImageUrl(null);
      setSettings(prev => ({ ...prev, hero: rest }));
      toast.success('Hero-Bild entfernt. Standard-Bild wird verwendet.');
    }
  };

  if (loading) {
    return (
      <main className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Seiteneinstellungen</h1>
        <p className="text-sm text-slate-500 mt-1">Globale Texte und Inhalte der öffentlichen Webseite verwalten</p>
      </div>

      <div className="space-y-8">
        {/* Hero-Bild Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2 text-2xl">🖼️</span>
              Hero-Hintergrundbild
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Preview */}
              <div className="md:w-1/2">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300">
                  {heroImageUrl ? (
                    <Image
                      src={heroImageUrl}
                      alt="Hero-Hintergrundbild"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="w-12 h-12 mb-2" />
                      <p className="text-sm">Standard-Bild (/hero.jpg)</p>
                    </div>
                  )}
                </div>
                {heroImageUrl && (
                  <p className="text-xs text-gray-500 mt-2 truncate">
                    Aktuelles Bild: {heroImageUrl.split('/').pop()}
                  </p>
                )}
              </div>

              {/* Upload controls */}
              <div className="md:w-1/2 flex flex-col justify-center">
                <p className="text-gray-700 mb-4">
                  Lade ein neues Hintergrundbild für den Hero-Bereich der Startseite hoch.
                  Empfohlen: Querformat, mind. 1920×1080 Pixel, max. 5 MB.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 mr-2" />
                    )}
                    {uploadingImage ? 'Wird hochgeladen...' : 'Bild hochladen'}
                  </button>

                  {heroImageUrl && (
                    <button
                      onClick={handleRemoveImage}
                      className="flex items-center px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Entfernen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Text-based settings */}
        {SETTINGS_CONFIG.map(config => {
          const values = settings[config.key] || {};
          return (
            <Card key={config.key}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="mr-2 text-2xl">{config.icon}</span>
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.fields.map(field => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={(values[field.key] as string) || ''}
                          onChange={(e) => updateField(config.key, field.key, e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                      ) : (
                        <input
                          type="text"
                          value={(values[field.key] as string) || ''}
                          onChange={(e) => updateField(config.key, field.key, e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => handleSave(config.key)}
                    disabled={saving === config.key}
                    className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving === config.key ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5 mr-2" />
                    )}
                    Speichern
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
