'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Settings, Loader2, Upload, Trash2, ImageIcon, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/admin';

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
      { subheader: 'Kopfbereich (über den Karten)' },
      { key: 'badge', label: 'Kleine Überschrift in Schreibschrift (z.B. „Herzlich willkommen")', type: 'text' as const },
      { key: 'titel', label: 'Große Überschrift (z.B. „Schön, wenn ihr dabei seid!")', type: 'text' as const },
      { key: 'text1', label: 'Beschreibungstext, Absatz 1', type: 'textarea' as const },
      { key: 'text2', label: 'Beschreibungstext, Absatz 2', type: 'textarea' as const },

      { subheader: 'Linke Karte (orange „Wann")' },
      { key: 'card1_kicker', label: 'Kleines orangenes Label oben (z.B. „Wann")', type: 'text' as const },
      { key: 'card1_titel', label: 'Karten-Titel (z.B. „Nachmittag-Programm")', type: 'text' as const },
      { key: 'card1_text', label: 'Karten-Fließtext', type: 'textarea' as const },

      { subheader: 'Mittlere Karte (grün „Wo")' },
      { key: 'card2_kicker', label: 'Kleines grünes Label oben (z.B. „Wo")', type: 'text' as const },
      { key: 'card2_titel', label: 'Karten-Titel (z.B. „Auf der Schulwiese")', type: 'text' as const },
      { key: 'card2_text', label: 'Karten-Fließtext', type: 'textarea' as const },

      { subheader: 'Rechte Karte (rot „Mitbringen")' },
      { key: 'card3_kicker', label: 'Kleines rotes Label oben (z.B. „Mitbringen")', type: 'text' as const },
      { key: 'card3_titel', label: 'Karten-Titel (z.B. „Picknick-Checkliste")', type: 'text' as const },
      { key: 'mitbringen', label: 'Punkte der Checkliste (eine Zeile pro Punkt)', type: 'list' as const },

      { subheader: 'Abschluss (unter den Karten)' },
      { key: 'fussnote', label: 'Zitierter Schluss-Satz (kursiv, in Anführungszeichen)', type: 'text' as const },
    ],
  },
];

type FieldDef =
  | { subheader: string; key?: undefined; label?: undefined; type?: undefined }
  | { key: string; label: string; type: 'text' | 'textarea' | 'list'; subheader?: undefined };

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

  const updateField = (settingKey: string, fieldKey: string, value: string | string[]) => {
    setSettings(prev => ({
      ...prev,
      [settingKey]: {
        ...(prev[settingKey] || {}),
        [fieldKey]: value,
      },
    }));
  };

  const updateListItem = (settingKey: string, fieldKey: string, index: number, value: string) => {
    const current = (settings[settingKey]?.[fieldKey] as string[] | undefined) ?? [];
    const next = [...current];
    next[index] = value;
    updateField(settingKey, fieldKey, next);
  };

  const addListItem = (settingKey: string, fieldKey: string) => {
    const current = (settings[settingKey]?.[fieldKey] as string[] | undefined) ?? [];
    updateField(settingKey, fieldKey, [...current, '']);
  };

  const removeListItem = (settingKey: string, fieldKey: string, index: number) => {
    const current = (settings[settingKey]?.[fieldKey] as string[] | undefined) ?? [];
    updateField(settingKey, fieldKey, current.filter((_, i) => i !== index));
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
      <PageShell title="Seiteneinstellungen">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-admin-ink-muted" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Seiteneinstellungen"
      description="Globale Texte und Inhalte der öffentlichen Webseite verwalten."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Seiteneinstellungen' }]}
    >
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
                  {(config.fields as FieldDef[]).map((field, idx) => {
                    if (field.subheader) {
                      return (
                        <div key={`sub-${idx}`} className="md:col-span-2 mt-4 first:mt-0">
                          <div className="flex items-center gap-3">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                              {field.subheader}
                            </h4>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        </div>
                      );
                    }
                    const isWide = field.type === 'textarea' || field.type === 'list';
                    return (
                      <div key={field.key} className={isWide ? 'md:col-span-2' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                        {field.type === 'textarea' ? (
                          <textarea
                            value={(values[field.key] as string) || ''}
                            onChange={(e) => updateField(config.key, field.key, e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                          />
                        ) : field.type === 'list' ? (
                          <div className="space-y-2">
                            {((values[field.key] as string[] | undefined) ?? []).map((item, i) => (
                              <div key={i} className="flex gap-2">
                                <input
                                  type="text"
                                  value={item}
                                  onChange={(e) => updateListItem(config.key, field.key, i, e.target.value)}
                                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                  placeholder={`Punkt ${i + 1}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeListItem(config.key, field.key, i)}
                                  className="flex items-center justify-center w-11 h-11 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                                  aria-label="Punkt entfernen"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addListItem(config.key, field.key)}
                              className="flex items-center px-4 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors text-sm"
                            >
                              <Plus className="w-4 h-4 mr-1.5" />
                              Punkt hinzufügen
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={(values[field.key] as string) || ''}
                            onChange={(e) => updateField(config.key, field.key, e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                        )}
                      </div>
                    );
                  })}
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
    </PageShell>
  );
}
