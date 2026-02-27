'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Send, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

type Event = {
  id: string;
  name: string;
  jahr: number;
  datum: string | null;
  anmeldeschluss: string | null;
};

type Aufgabe = {
  id: string;
  titel: string;
  beschreibung: string | null;
  zeitfenster: string;
  bedarf: number;
};

type Spende = {
  id: string;
  titel: string;
  beschreibung: string | null;
  anzahl_benoetigt: number;
};

type Klasse = {
  id: string;
  name: string;
};

type GeschwisterKind = {
  vorname: string;
  nachname: string;
  klasse: string;
};

export default function AnmeldungPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data from Supabase
  const [event, setEvent] = useState<Event | null>(null);
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [spenden, setSpenden] = useState<Spende[]>([]);
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  
  // Form data
  const [kindVorname, setKindVorname] = useState('');
  const [kindNachname, setKindNachname] = useState('');
  const [kindKlasse, setKindKlasse] = useState('');
  const [elternEmail, setElternEmail] = useState('');
  const [selectedAufgaben, setSelectedAufgaben] = useState<string[]>([]);
  const [selectedSpenden, setSelectedSpenden] = useState<string[]>([]);
  const [kommentar, setKommentar] = useState('');
  const [istSpringer, setIstSpringer] = useState(false);
  const [springerZeitfenster, setSpringerZeitfenster] = useState<'vormittag' | 'nachmittag' | 'beides'>('vormittag');
  const [geschwister, setGeschwister] = useState<GeschwisterKind[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient();
        
        // Get active event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('ist_aktiv', true)
          .single();
        
        if (eventError || !eventData) {
          setError('Kein aktives Event gefunden');
          setLoading(false);
          return;
        }
        
        // Check deadline
        if (eventData.anmeldeschluss) {
          const deadline = new Date(eventData.anmeldeschluss);
          deadline.setHours(23, 59, 59, 999);
          if (new Date() > deadline) {
            setError('Die Anmeldefrist ist leider abgelaufen');
            setLoading(false);
            return;
          }
        }
        
        setEvent(eventData);
        
        // Get helper tasks
        const { data: aufgabenData } = await supabase
          .from('helferaufgaben')
          .select('*')
          .eq('event_id', eventData.id)
          .order('zeitfenster', { ascending: true });
        
        setAufgaben(aufgabenData || []);
        
        // Get food donations
        const { data: spendenData } = await supabase
          .from('essensspenden_bedarf')
          .select('*')
          .eq('event_id', eventData.id);
        
        setSpenden(spendenData || []);
        
        // Get klassen for this event
        const { data: klassenData } = await supabase
          .from('klassen')
          .select('id, name')
          .eq('event_id', eventData.id)
          .order('name', { ascending: true });
        
        setKlassen(klassenData || []);
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Fehler beim Laden der Daten');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const toggleAufgabe = (id: string) => {
    setSelectedAufgaben(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const toggleSpende = (id: string) => {
    setSelectedSpenden(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const canProceed = () => {
    if (step === 1) {
      const primaryOk = kindVorname.trim() && kindNachname.trim() && kindKlasse && elternEmail.trim();
      const geschwisterOk = geschwister.every(g => g.vorname.trim() && g.nachname.trim() && g.klasse);
      return primaryOk && geschwisterOk;
    }
    return true;
  };

  const addGeschwister = () => {
    if (geschwister.length >= 4) return;
    setGeschwister([...geschwister, { vorname: '', nachname: kindNachname, klasse: '' }]);
  };

  const removeGeschwister = (index: number) => {
    setGeschwister(geschwister.filter((_, i) => i !== index));
  };

  const updateGeschwister = (index: number, field: keyof GeschwisterKind, value: string) => {
    const updated = [...geschwister];
    updated[index] = { ...updated[index], [field]: value };
    setGeschwister(updated);
  };

  const handleSubmit = async () => {
    if (!event) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/anmeldung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind_vorname: kindVorname,
          kind_nachname: kindNachname,
          kind_klasse: kindKlasse,
          eltern_email: elternEmail,
          helfer_aufgaben: selectedAufgaben.map(id => ({ aufgabe_id: id, prioritaet: 1 })),
          essensspenden: selectedSpenden.map(id => ({ spende_id: id, menge: 1 })),
          ist_springer: istSpringer,
          springer_zeitfenster: istSpringer ? springerZeitfenster : null,
          kommentar,
          weitere_kinder: geschwister.length > 0 ? geschwister : undefined,
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Absenden');
      }
      
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-tertiary" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md mx-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Anmeldung nicht möglich</h1>
          <p className="text-gray-600">{error}</p>
          <Link href="/" className="mt-6 inline-block text-tertiary hover:underline">
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md mx-4"
        >
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Fast geschafft!</h1>
          <p className="text-gray-600 mb-4">
            Wir haben eine E-Mail an <strong>{elternEmail}</strong> gesendet.
          </p>
          <p className="text-gray-600">
            Bitte klicke auf den Link in der E-Mail, um deine Anmeldung zu bestätigen.
          </p>
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            📧 Prüfe auch deinen Spam-Ordner, falls du keine E-Mail erhältst.
          </div>
          <Link href="/" className="mt-6 inline-block text-tertiary hover:underline">
            Zurück zur Startseite
          </Link>
        </motion.div>
      </div>
    );
  }

  const vormittagAufgaben = aufgaben.filter(a => a.zeitfenster === 'vormittag');
  const nachmittagAufgaben = aufgaben.filter(a => a.zeitfenster === 'nachmittag');

  return (
    <div className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Anmeldung {event?.name}
          </h1>
          {event?.datum && (
            <p className="text-gray-600">
              {new Date(event.datum).toLocaleDateString('de-DE', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          )}
          {event?.anmeldeschluss && (
            <p className="text-sm text-orange-600 mt-2">
              ⏰ Anmeldeschluss: {new Date(event.anmeldeschluss).toLocaleDateString('de-DE')}
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  s <= step ? 'bg-tertiary text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-1 ${s < step ? 'bg-tertiary' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Card */}
        <motion.div 
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 sm:p-8"
        >
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Kind-Daten */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Angaben zum Kind</h2>
              
              {/* Kind-Felder */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
                  <input
                    type="text"
                    value={kindVorname}
                    onChange={(e) => setKindVorname(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tertiary focus:border-tertiary"
                    placeholder="z.B. Max"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
                  <input
                    type="text"
                    value={kindNachname}
                    onChange={(e) => setKindNachname(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tertiary focus:border-tertiary"
                    placeholder="z.B. Mustermann"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Klasse *</label>
                  <select
                    value={kindKlasse}
                    onChange={(e) => setKindKlasse(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tertiary focus:border-tertiary"
                  >
                    <option value="">Bitte wählen...</option>
                    {klassen.map(k => (
                      <option key={k.id} value={k.name}>{k.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Geschwisterkind hinzufügen — direkt unter den Kind-Feldern */}
              {geschwister.length < 4 && (
                <button
                  type="button"
                  onClick={addGeschwister}
                  className="mt-4 flex items-center gap-2 text-sm text-tertiary hover:text-tertiary-dark transition-colors"
                >
                  <Plus size={18} />
                  Geschwisterkind hinzufügen
                </button>
              )}

              {/* Geschwisterkinder */}
              {geschwister.length > 0 && (
                <div className="mt-4 space-y-4">
                  {geschwister.map((g, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 relative">
                      <button
                        type="button"
                        onClick={() => removeGeschwister(index)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                        title="Entfernen"
                      >
                        <Trash2 size={18} />
                      </button>
                      <p className="text-sm font-medium text-gray-500 mb-3">Geschwisterkind {index + 1}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Vorname *</label>
                          <input
                            type="text"
                            value={g.vorname}
                            onChange={(e) => updateGeschwister(index, 'vorname', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tertiary focus:border-tertiary text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Nachname *</label>
                          <input
                            type="text"
                            value={g.nachname}
                            onChange={(e) => updateGeschwister(index, 'nachname', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tertiary focus:border-tertiary text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Klasse *</label>
                          <select
                            value={g.klasse}
                            onChange={(e) => updateGeschwister(index, 'klasse', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tertiary focus:border-tertiary text-sm"
                          >
                            <option value="">Bitte wählen...</option>
                            {klassen.map(k => (
                              <option key={k.id} value={k.name}>{k.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* E-Mail — nach den Kinder-Feldern */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail der Eltern *</label>
                  <input
                    type="email"
                    value={elternEmail}
                    onChange={(e) => setElternEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tertiary focus:border-tertiary"
                    placeholder="z.B. eltern@example.de"
                  />
                  <p className="mt-1 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <strong>Wichtig:</strong> Du erhältst eine E-Mail mit einem Bestätigungslink. Erst wenn du diesen Link anklickst, ist die Anmeldung gültig.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Helfer-Aufgaben */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Helfer-Aufgaben</h2>
              <p className="text-gray-600 mb-6">
                Wähle aus, welche Aufgaben du übernehmen möchtest. Mehrfachauswahl möglich!
              </p>
              
              {vormittagAufgaben.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                    Vormittag
                  </h3>
                  <div className="space-y-2">
                    {vormittagAufgaben.map(aufgabe => (
                      <label
                        key={aufgabe.id}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedAufgaben.includes(aufgabe.id)
                            ? 'border-tertiary bg-tertiary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAufgaben.includes(aufgabe.id)}
                          onChange={() => toggleAufgabe(aufgabe.id)}
                          className="mt-1 h-5 w-5 text-tertiary rounded"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{aufgabe.titel}</div>
                          {aufgabe.beschreibung && (
                            <div className="text-sm text-gray-500">{aufgabe.beschreibung}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {nachmittagAufgaben.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-orange-400 rounded-full"></span>
                    Nachmittag
                  </h3>
                  <div className="space-y-2">
                    {nachmittagAufgaben.map(aufgabe => (
                      <label
                        key={aufgabe.id}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedAufgaben.includes(aufgabe.id)
                            ? 'border-tertiary bg-tertiary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAufgaben.includes(aufgabe.id)}
                          onChange={() => toggleAufgabe(aufgabe.id)}
                          className="mt-1 h-5 w-5 text-tertiary rounded"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{aufgabe.titel}</div>
                          {aufgabe.beschreibung && (
                            <div className="text-sm text-gray-500">{aufgabe.beschreibung}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {aufgaben.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  Keine Helfer-Aufgaben verfügbar.
                </p>
              )}
              
              {/* Springer Option */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-purple-400 rounded-full"></span>
                  Flexible Hilfe (Springer)
                </h3>
                <label
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    istSpringer
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={istSpringer}
                    onChange={(e) => setIstSpringer(e.target.checked)}
                    className="mt-1 h-5 w-5 text-purple-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Ich bin Springer</div>
                    <div className="text-sm text-gray-500">Wir teilen dich flexibel für eine Aufgabe ein, wo gerade Hilfe benötigt wird.</div>
                    
                    {istSpringer && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-gray-700">Wann bist du verfügbar?</p>
                        <div className="flex flex-wrap gap-2">
                          <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all ${
                            springerZeitfenster === 'vormittag' ? 'border-purple-500 bg-purple-100' : 'border-gray-200'
                          }`}>
                            <input
                              type="radio"
                              name="springerZeit"
                              checked={springerZeitfenster === 'vormittag'}
                              onChange={() => setSpringerZeitfenster('vormittag')}
                              className="text-purple-600"
                            />
                            <span>Vormittag</span>
                          </label>
                          <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all ${
                            springerZeitfenster === 'nachmittag' ? 'border-purple-500 bg-purple-100' : 'border-gray-200'
                          }`}>
                            <input
                              type="radio"
                              name="springerZeit"
                              checked={springerZeitfenster === 'nachmittag'}
                              onChange={() => setSpringerZeitfenster('nachmittag')}
                              className="text-purple-600"
                            />
                            <span>Nachmittag</span>
                          </label>
                          <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all ${
                            springerZeitfenster === 'beides' ? 'border-purple-500 bg-purple-100' : 'border-gray-200'
                          }`}>
                            <input
                              type="radio"
                              name="springerZeit"
                              checked={springerZeitfenster === 'beides'}
                              onChange={() => setSpringerZeitfenster('beides')}
                              className="text-purple-600"
                            />
                            <span>Ganztägig</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Essensspenden */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Essensspenden</h2>
              <p className="text-gray-600 mb-6">
                Möchtest du etwas für das Kuchenbuffet mitbringen?
              </p>
              
              <div className="space-y-2">
                {spenden.map(spende => (
                  <label
                    key={spende.id}
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedSpenden.includes(spende.id)
                        ? 'border-tertiary bg-tertiary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpenden.includes(spende.id)}
                      onChange={() => toggleSpende(spende.id)}
                      className="mt-1 h-5 w-5 text-tertiary rounded"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{spende.titel}</div>
                      {spende.beschreibung && (
                        <div className="text-sm text-gray-500">{spende.beschreibung}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              
              {spenden.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  Keine Essensspenden-Kategorien verfügbar.
                </p>
              )}
            </div>
          )}

          {/* Step 4: Zusammenfassung */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Zusammenfassung</h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">{geschwister.length > 0 ? 'Kinder' : 'Kind'}</h3>
                  <p className="text-gray-600">
                    <strong>{kindVorname} {kindNachname}</strong>, Klasse {kindKlasse}
                  </p>
                  {geschwister.map((g, i) => (
                    <p key={i} className="text-gray-600 mt-1">
                      <strong>{g.vorname} {g.nachname}</strong>, Klasse {g.klasse}
                    </p>
                  ))}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">E-Mail</h3>
                  <p className="text-gray-600">{elternEmail}</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Helfer-Aufgaben</h3>
                  {istSpringer ? (
                    <p className="text-purple-600">
                      <strong>Springer ({springerZeitfenster === 'beides' ? 'ganztägig' : springerZeitfenster})</strong>
                    </p>
                  ) : selectedAufgaben.length > 0 ? (
                    <ul className="text-gray-600 space-y-1">
                      {selectedAufgaben.map(id => {
                        const aufgabe = aufgaben.find(a => a.id === id);
                        return aufgabe && <li key={id}>• {aufgabe.titel}</li>;
                      })}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Keine ausgewählt</p>
                  )}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Essensspenden</h3>
                  {selectedSpenden.length > 0 ? (
                    <ul className="text-gray-600 space-y-1">
                      {selectedSpenden.map(id => {
                        const spende = spenden.find(s => s.id === id);
                        return spende && <li key={id}>• {spende.titel}</li>;
                      })}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Keine ausgewählt</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Anmerkungen (optional)
                  </label>
                  <textarea
                    value={kommentar}
                    onChange={(e) => setKommentar(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tertiary focus:border-tertiary"
                    placeholder="z.B. Zeitliche Einschränkungen, Fragen, etc."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            {step > 1 ? (
              <button
                onClick={() => { setStep(step - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ChevronLeft size={20} />
                Zurück
              </button>
            ) : (
              <div />
            )}
            
            {step < 4 ? (
              <button
                onClick={() => { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-3 bg-tertiary text-white rounded-lg hover:bg-tertiary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Anmeldung absenden
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>

        {/* Footer info */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Nach dem Absenden erhältst du eine E-Mail zur Bestätigung.<br />
          Deine Daten werden nur für die Organisation des Vogelschießens verwendet.
        </p>
      </div>
    </div>
  );
}
