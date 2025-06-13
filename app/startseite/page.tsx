'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, Variants } from 'framer-motion';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};
import { Button } from "@/components/ui/button";
import { RouteMap } from "@/components/route/RouteComponents";
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ImageUpload } from '@/components/ImageUpload';

// Typen für die Daten aus Supabase
type Game = {
  id: string;
  name: string;
  beschreibung: string;
  icon?: string | null;
};

type GalleryImage = {
  id: number;
  name: string;
  url: string;
};

type DownloadFile = {
  id: number;
  name: string;
  url: string;
};

// UI-Komponenten
const CountdownItem = ({ value, label }: { value: number; label: string }) => {
  return (
    <div className="relative group flex flex-col items-center justify-center px-2 py-1 xs:px-3 sm:px-4 lg:px-6 max-w-[60px] xs:max-w-[70px] sm:max-w-[90px] lg:max-w-[120px]">
      <div className="absolute inset-0 bg-white/10 rounded-lg backdrop-blur-sm group-hover:bg-white/20 transition-all duration-300 border border-white/20"></div>
      <span className="relative text-lg xs:text-xl sm:text-3xl lg:text-5xl font-bold text-white">
        {value}
      </span>
      <span className="relative text-[10px] xs:text-xs sm:text-sm lg:text-base font-medium text-white/80">
        {label}
      </span>
    </div>
  );
};

const calculateTimeLeft = (targetDate: Date): { days: number; hours: number; minutes: number; seconds: number; isPast: boolean; isToday: boolean } => {
  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();
  
  const isToday = now.getFullYear() === targetDate.getFullYear() &&
                  now.getMonth() === targetDate.getMonth() &&
                  now.getDate() === targetDate.getDate();

  const isPast = difference < 0 && !isToday;

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isPast, isToday };
};

const EventCountdown = ({ targetDate }: { targetDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    // Clear interval if the event is past to prevent unnecessary updates
    if (timeLeft.isPast) {
      clearInterval(timer);
    }

    return () => clearInterval(timer);
  }, [targetDate, timeLeft.isPast]); // Add timeLeft.isPast to dependencies

  if (timeLeft.isToday) {
    return (
      <div className="text-center p-6 sm:p-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg max-w-2xl mx-auto">
        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
          Heute ist es soweit!
        </p>
        <p className="text-sm sm:text-md lg:text-lg text-white/90 mt-2">
          Wir wünschen allen Kindern viel Erfolg sowie den Helfern und Besuchern einen fantastischen Tag beim Vogelschießen in Melsdorf!
        </p>
      </div>
    );
  }

  if (timeLeft.isPast) {
    return (
      <div className="text-center p-6 sm:p-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg max-w-2xl mx-auto">
        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
          Das Vogelschießen 2025 ist vorbei.
        </p>
        <p className="text-sm sm:text-md lg:text-lg text-white/90 mt-2">
          Vielen Dank an alle Teilnehmer, Helfer, Sponsoren und Besucher! Ergebnisse und Fotos folgen in Kürze.
        </p>
      </div>
    );
  }

  // Only show countdown if not past and not today
  if (timeLeft.days < 0 && !timeLeft.isToday) { // Ensure countdown doesn't show for past dates if somehow isPast is false
    return null; 
  }

  return (
    <div className="flex justify-center items-center space-x-2 xs:space-x-3 sm:space-x-4 lg:space-x-6">
      <CountdownItem value={timeLeft.days < 0 ? 0 : timeLeft.days} label="Tage" />
      <div className="w-1 h-1 xs:w-1.5 xs:h-1.5 sm:w-2 sm:h-2 lg:w-3 lg:h-3 bg-white/30 rounded-full"></div>
      <CountdownItem value={timeLeft.hours < 0 ? 0 : timeLeft.hours} label="Std" />
      <div className="w-1 h-1 xs:w-1.5 xs:h-1.5 sm:w-2 sm:h-2 lg:w-3 lg:h-3 bg-white/30 rounded-full"></div>
      <CountdownItem value={timeLeft.minutes < 0 ? 0 : timeLeft.minutes} label="Min" />
      <div className="w-1 h-1 xs:w-1.5 xs:h-1.5 sm:w-2 sm:h-2 lg:w-3 lg:h-3 bg-white/30 rounded-full"></div>
      <CountdownItem value={timeLeft.seconds < 0 ? 0 : timeLeft.seconds} label="Sek" />
    </div>
  );
};

// Funktion zur Bestimmung des Icons für ein Spiel basierend auf der Logik aus der Spieleverwaltung

const getGameIcon = (game: Game): string => {
  // Wenn ein Icon in der Datenbank gespeichert ist, dieses verwenden
  if (game.icon) return game.icon;
  
  // Ansonsten ein passendes Icon basierend auf dem Namen auswählen
  const name = (game.name || '').toLowerCase();
  
  if (name.includes('schießen') || name.includes('armbrust')) return '🏹';
  if (name.includes('ball') || name.includes('werfen')) return '🎯';
  if (name.includes('fisch')) return '🐟';
  if (name.includes('glücksrad')) return '🎡';
  if (name.includes('stiefel') || name.includes('gummistiefel')) return '👢';
  if (name.includes('schatz')) return '💰';
  if (name.includes('rennen') || name.includes('roller')) return '🛴';
  if (name.includes('draht')) return '⚡';
  if (name.includes('schwamm')) return '🧽';
  if (name.includes('wäsche')) return '👕';
  
  // Standardicon, falls keine Übereinstimmung gefunden wurde
  return '🎮';
};

const GameCard = ({ game, onClick }: { game: Game; onClick: (game: Game) => void }) => {
  const icon = getGameIcon(game);
  
  return (
    <div 
      className="card card-tertiary hover:shadow-lg cursor-pointer transition-all duration-300 hover:-translate-y-2 overflow-hidden group"
      onClick={() => onClick(game)}
    >
      <div className="card-header flex items-center">
        <div className="mr-3 text-3xl bg-pastel-green w-12 h-12 rounded-full flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-tertiary-dark">{game.name || 'Unbenanntes Spiel'}</h3>
      </div>
      <div className="card-body">
        <p className="text-gray-600 line-clamp-3">{game.beschreibung || 'Keine Beschreibung verfügbar'}</p>
      </div>
      <div className="card-footer pt-4 mt-auto flex justify-end">
        <span className="text-tertiary font-medium flex items-center group-hover:translate-x-1 transition-transform">
          Details anzeigen
          <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </span>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end p-4">
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const GalleryImageComponent = ({ image }: { image: GalleryImage }) => {
  return (
    <div className="relative group transform transition-all duration-500 hover:scale-105">
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="relative bg-white p-4 rounded-3xl shadow-xl">
        <Image
          src={image.url}
          alt={image.name}
          width={400}
          height={400}
          className="rounded-2xl shadow-md transform transition-transform duration-500 group-hover:shadow-2xl"
          style={{ objectFit: 'cover' }}
        />
      </div>
    </div>
  );
};

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<null | 'success' | 'error'>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');
    
    try {
      // Senden der Daten an unsere neue API-Route
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Ein Fehler ist aufgetreten');
      }
      
      // Die Speicherung erfolgt jetzt nur noch in der API-Route
      console.log('Kontaktanfrage erfolgreich gesendet:', result);
      
      setSubmitStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch (error: any) {
      console.error('Fehler beim Senden des Formulars:', error);
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Ein unbekannter Fehler ist aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Name</label>
        <input 
          type="text" 
          id="name" 
          name="name" 
          value={formData.name} 
          onChange={handleChange}
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-tertiary focus:border-tertiary shadow-sm transition-colors"
          placeholder="Dein Name"
          required 
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">E-Mail</label>
        <input 
          type="email" 
          id="email" 
          name="email" 
          value={formData.email} 
          onChange={handleChange}
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-tertiary focus:border-tertiary shadow-sm transition-colors"
          placeholder="deine@email.de"
        />
      </div>
      
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Nachricht</label>
        <textarea 
          id="message" 
          name="message" 
          rows={4} 
          value={formData.message} 
          onChange={handleChange}
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-tertiary focus:border-tertiary shadow-sm transition-colors"
          placeholder="Deine Nachricht an uns"
          required
        ></textarea>
      </div>
      
      <div>
        <button 
          type="submit" 
          className="w-full bg-tertiary hover:bg-tertiary-dark text-white font-medium py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-tertiary focus:ring-offset-2 flex items-center justify-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Wird gesendet...
            </>
          ) : (
            <>
              Nachricht senden
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
            </>
          )}
        </button>
      </div>
      
      {submitStatus === 'success' && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <p className="font-medium">Vielen Dank für deine Nachricht! Wir werden uns so schnell wie möglich bei dir melden.</p>
          </div>
        </div>
      )}
      
      {submitStatus === 'error' && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="font-medium">Es ist ein Fehler aufgetreten: {errorMessage || 'Bitte versuche es später erneut.'}</p>
          </div>
        </div>
      )}
    </form>
  );
};

// Bildvorschau-Komponente
const ImagePreview = ({ 
  image, 
  onClose, 
  onNext, 
  onPrevious, 
  hasNext, 
  hasPrevious 
}: { 
  image: GalleryImage, 
  onClose: () => void, 
  onNext: () => void, 
  onPrevious: () => void, 
  hasNext: boolean, 
  hasPrevious: boolean 
}) => {
  // Schließen bei Escape-Taste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrevious) onPrevious();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrevious, hasNext, hasPrevious]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {/* Schließen-Button */}
        <button 
          className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors"
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Bild */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={image.url}
            alt="Vogelschießen Foto"
            width={1200}
            height={800}
            className="object-contain max-h-[85vh] rounded-lg"
          />
        </div>
        
        {/* Navigation */}
        {hasPrevious && (
          <button 
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
            onClick={(e) => { e.stopPropagation(); onPrevious(); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {hasNext && (
          <button 
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default function Startseite() {
  // Datum des nächsten Vogelschießens
  const eventDate = new Date('2025-06-14T10:00:00');
  
  // Refs für Scroll-Navigation
  const ablaufRef = useRef<HTMLDivElement>(null);
  const spieleRef = useRef<HTMLDivElement>(null);
  const spendenRef = useRef<HTMLDivElement>(null);
  const galerieRef = useRef<HTMLDivElement>(null);
  const kontaktRef = useRef<HTMLDivElement>(null);
  const downloadsRef = useRef<HTMLDivElement>(null);
  
  // State für Daten aus Supabase
  const [games, setGames] = useState<Game[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [downloadFiles, setDownloadFiles] = useState<DownloadFile[]>([]);
  const [loading, setLoading] = useState({
    games: true,
    gallery: true,
    downloads: true
  });
  
  // State für Modal und Galerie
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 8; // Anzahl der Bilder pro Seite
  
  // State für Fehlermeldungen
  const [error, setError] = useState<string | null>(null);

  // Laden der Spiele aus Supabase
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setError(null);
        const supabase = createClient();
        
        // Debug: Log Supabase URL and connection
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        
        const { data, error: supabaseError } = await supabase
          .from('spiele')
          .select('*')
          .order('id');
        
        // Debug: Log raw response
        console.log('Supabase response:', { data, error: supabaseError });
          
        if (supabaseError) {
          console.error('Fehler beim Laden der Spiele:', supabaseError);
          setError('Die Spiele konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
          return;
        }
        
        if (!data || data.length === 0) {
          const msg = 'Keine Spiele in der Datenbank gefunden';
          console.error(msg);
          setError(msg);
          return;
        }

        // Validiere die Spieldaten - nur essentielle Felder
        const invalidGames = data.filter(game => 
          !game.id || !game.name // Nur ID und Name sind required
        );

        if (invalidGames.length > 0) {
          console.error('Spiele mit fehlenden Daten:', invalidGames);
          // Zeige die Spiele trotzdem an, aber logge den Fehler
        }

        // Debug: Log valid games
        console.log('Gültige Spiele:', data);
        
        setGames(data);
      } catch (error) {
        console.error('Fehler beim Laden der Spiele:', error);
        setError('Ein unbekannter Fehler ist aufgetreten');
      } finally {
        setLoading(prev => ({ ...prev, games: false }));
      }
    };
    
    fetchGames();
  }, []);
  
  // Laden der Galerie-Bilder aus Supabase
  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        console.log('Starte Laden der Galerie-Bilder...');
        const supabase = createClient();
        
        // Debug: Überprüfen der Supabase-Verbindung
        console.log('Supabase Client für Galerie erstellt');
        
        const { data, error } = await supabase
          .storage
          .from('galerie')
          .list('');
          
        if (error) {
          console.error('Fehler beim Auflisten der Galerie-Dateien:', error);
          return;
        }
        
        console.log('Galerie-Dateien geladen:', data);
        
        if (!data || data.length === 0) {
          console.log('Keine Bilder im Galerie-Bucket gefunden');
          setGalleryImages([]);
          return;
        }
        
        // Konvertieren der Dateien in das GalleryImage-Format
        const imageFiles = data.filter(file => 
          file.name.match(/\.(jpeg|jpg|png|gif|webp)$/i)
        );
        
        console.log('Gefilterte Bilddateien:', imageFiles);
        
        const images: GalleryImage[] = [];
        
        for (const file of imageFiles) {
          try {
            const { data: { publicUrl } } = supabase
              .storage
              .from('galerie')
              .getPublicUrl(file.name);
              
            images.push({
              id: images.length + 1,
              name: file.name,
              url: publicUrl
            });
          } catch (urlError) {
            console.error(`Fehler beim Abrufen der URL für ${file.name}:`, urlError);
          }
        }
        
        console.log('Verarbeitete Galerie-Bilder:', images);
        setGalleryImages(images);
      } catch (error) {
        console.error('Fehler beim Laden der Galerie-Bilder:', error);
      } finally {
        setLoading(prev => ({ ...prev, gallery: false }));
      }
    };
    
    fetchGalleryImages();
  }, []);
  
  // Laden der Download-Dateien aus Supabase
  useEffect(() => {
    const fetchDownloadFiles = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .storage
          .from('downloads')
          .list('');
          
        if (error) throw error;
        
        // Konvertieren der Dateien in das DownloadFile-Format
        const files: DownloadFile[] = await Promise.all(
          (data || []).map(async (file, index) => {
            const { data: { publicUrl } } = supabase
              .storage
              .from('downloads')
              .getPublicUrl(file.name);
              
            return {
              id: index + 1,
              name: file.name,
              url: publicUrl
            };
          })
        );
        
        setDownloadFiles(files);
      } catch (error) {
        console.error('Error fetching download files:', error);
      } finally {
        setLoading(prev => ({ ...prev, downloads: false }));
      }
    };
    
    fetchDownloadFiles();
  }, []);
  
  // Scroll-Funktion für die Navigation
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <div className="w-full bg-white">
      {/* Hero-Sektion */}
      <div className="w-full relative bg-gray-900 min-h-[320px] sm:min-h-[420px] md:min-h-[540px] lg:min-h-[640px] xl:min-h-[720px] flex items-center">
        {/* Hintergrundbild */}
        <Image 
          src="/hero.jpg" 
          alt="Melsdörper Vagelscheeten Hintergrund" 
          fill
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
          quality={90}
          priority
        />
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        {/* Inhalt */}
        <div className="relative z-20 flex flex-col items-center w-full px-4 py-6 sm:py-10 text-center max-w-4xl mx-auto">
  <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-2 xs:mb-3 sm:mb-4 lg:mb-6 leading-[1.15] sm:leading-[1.2] lg:leading-[1.3]" style={{ fontFamily: 'var(--font-poppins)' }}>
    Melsdörper Vagelscheeten 2025
  </h1>
  <div className="text-sm xs:text-base sm:text-lg lg:text-2xl text-white/90 font-light mb-4 xs:mb-6 sm:mb-8 lg:mb-10">
    Samstag, 14. Juni · Regenbogenschule Melsdorf
  </div>
  <div className="flex justify-center items-center space-x-2 xs:space-x-3 sm:space-x-4 mb-2 xs:mb-3 sm:mb-4">
    <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <EventCountdown targetDate={eventDate} />
                </motion.div>
  </div>
  <p className="text-white text-xs xs:text-sm sm:text-base lg:text-xl mb-1 xs:mb-2 sm:mb-4 lg:mb-6 max-w-full">
    Mach den Tag möglich – mit Deiner Spende.
  </p>
  <a 
    href="#spenden"
    onClick={(e) => {
      e.preventDefault();
      scrollToSection(spendenRef);
    }}
    className="bg-yellow-400 hover:bg-yellow-500 text-black rounded-full w-[90%] max-w-xs lg:max-w-md px-2 py-2 xs:px-4 xs:py-3 lg:px-8 lg:py-4 text-sm xs:text-base lg:text-xl font-bold shadow-lg inline-block mb-1 sm:mb-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
  >
    Jetzt mit einer Spende helfen
  </a>
</div>
</div>
      
      {/* Ablaufplan mit ausreichend Abstand */}
      <div id="ablauf" className="py-20 bg-pastel-blue mt-8" ref={ablaufRef}>
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-white rounded-full text-secondary font-medium text-sm mb-3 shadow-sm">Programm 2025</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>Ablaufplan</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">Unser buntes Programm für einen unvergesslichen Tag des Melsdörper Vagelscheeten 2025</p>
          </div>
          
          <div className="max-w-4xl mx-auto relative">
            {/* Zeitleiste */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-secondary via-tertiary to-accent rounded-full overflow-hidden z-0"></div>
            
            {/* 08:00 Uhr */}
            <div className="mb-20 relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-2 z-10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-secondary to-secondary-light border-4 border-white shadow-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center mt-8 md:mt-0">
                <div className="md:w-1/2 md:pr-12 md:text-right mb-8 md:mb-0 pt-8 md:pt-0">
                  <div className="bg-white rounded-2xl shadow-md p-6 md:ml-auto transition-all duration-300 hover:shadow-lg hover:-translate-y-2 border-b-4 border-secondary">
                    <div className="text-xl font-bold text-secondary mb-1">8.00 Uhr</div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Treffen für alle Helfer und Betreuer</h4>
                  </div>
                </div>
                <div className="md:w-1/2 md:pl-12"></div>
              </div>
            </div>
            
            {/* 08:50 Uhr */}
            <div className="mb-20 relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-2 z-10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-secondary to-secondary-light border-4 border-white shadow-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5 5 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center mt-8 md:mt-0">
                <div className="md:w-1/2 md:pr-12"></div>
                <div className="md:w-1/2 md:pl-12 md:text-left mb-8 md:mb-0 pt-8 md:pt-0">
                  <div className="bg-white rounded-2xl shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 border-b-4 border-secondary text-red-600">
                    <div className="text-xl font-bold text-secondary mb-1">8.50 Uhr</div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Treffen für alle teilnehmenden Kinder</h4>
                    <div className="mt-2 p-2 bg-red-50 rounded-xl border border-red-200 mb-0">
                      <p className="font-bold text-red-600 flex items-center text-sm">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Bitte mitbringen: eigene Trinkflasche
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 09:00 Uhr */}
            <div className="mb-20 relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-2 z-10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-tertiary to-tertiary-light border-4 border-white shadow-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center mt-8 md:mt-0">
                <div className="md:w-1/2 md:pr-12 md:text-right mb-8 md:mb-0 pt-8 md:pt-0">
                  <div className="bg-white rounded-2xl shadow-md p-6 md:ml-auto transition-all duration-300 hover:shadow-lg hover:-translate-y-2 border-b-4 border-tertiary">
                    <div className="text-xl font-bold text-tertiary mb-1">9.00 Uhr</div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Eröffnung der Wettspiele mit dem traditionellen Bändertanz</h4>
                  </div>
                </div>
                <div className="md:w-1/2 md:pl-12"></div>
              </div>
            </div>
            
            {/* 11:30 Uhr */}
            <div className="mb-20 relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-2 z-10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-tertiary to-tertiary-light border-4 border-white shadow-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center mt-8 md:mt-0">
                <div className="md:w-1/2 md:pr-12"></div>
                <div className="md:w-1/2 md:pl-12 md:text-left mb-8 md:mb-0 pt-8 md:pt-0">
                  <div className="bg-white rounded-2xl shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 border-b-4 border-tertiary">
                    <div className="text-xl font-bold text-tertiary mb-1">ca. 11.30 Uhr</div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Gemeinsamer Abschluss</h4>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mittagspause */}
            <div className="mb-20 relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-2 z-10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-light border-4 border-white shadow-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center mt-8 md:mt-0">
                <div className="md:w-1/2 md:pr-12 md:text-right mb-8 md:mb-0 pt-8 md:pt-0">
                  <div className="bg-gradient-to-r from-accent-light to-accent rounded-2xl shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 border border-white/50">
                    <h4 className="text-2xl font-bold text-gray-800 flex items-center">
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      Mittagspause
                    </h4>
                  </div>
                </div>
                <div className="md:w-1/2 md:pl-12"></div>
              </div>
            </div>
            
            {/* 14:00 Uhr */}
            <div className="mb-20 relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-2 z-10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-light border-4 border-white shadow-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7l3 2 4-5 4 5 3-2-1 5c-1 1-2 1-3 1H8c-1 0-2 0-3-1L4 7z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16v1m4-1v1m-2-1v1"></path></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center mt-8 md:mt-0">
                <div className="md:w-1/2 md:pr-12"></div>
                <div className="md:w-1/2 md:pl-12 md:text-left mb-8 md:mb-0 pt-8 md:pt-0">
                  <div className="bg-white rounded-2xl shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 border-b-4 border-primary">
                    <div className="text-xl font-bold text-primary mb-1">14.00 Uhr</div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Bändertanz, Aufführung der Schulkinder, Proklamation der Königspaare, Übergabe der Klassengeschenke</h4>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 14:45 Uhr */}
            <div className="mb-20 relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-2 z-10">
                <div className="w-14 h-14 rounded-full bg-green-600 border-4 border-white shadow-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center mt-8 md:mt-0">
                <div className="md:w-1/2 md:pr-12 md:text-right mb-8 md:mb-0 pt-8 md:pt-0">
                  <div className="bg-white rounded-2xl shadow-md p-6 md:ml-auto transition-all duration-300 hover:shadow-lg hover:-translate-y-2 border-b-4 border-green-600">
                    <div className="text-xl font-bold text-green-600 mb-1">14.45 Uhr</div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Festumzug durch das geschmückte Dorf</h4>
                    <p className="text-gray-600">mit Blumenstock – kleiner Blumenstrauß, der an einen Stock gebunden ist</p>
                  </div>
                </div>
                <div className="md:w-1/2 md:pl-12"></div>
              </div>
            </div>
            
            {/* 15:30 Uhr */}
            <div className="mb-20 relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-2 z-10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-light border-4 border-white shadow-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 100-4h14a2 2 0 100 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6l2 4 4-4 2 4"></path></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center mt-8 md:mt-0">
                <div className="md:w-1/2 md:pr-12"></div>
                <div className="md:w-1/2 md:pl-12 md:text-left mb-8 md:mb-0 pt-8 md:pt-0">
                  <div className="bg-white rounded-2xl shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 border-b-4 border-accent">
                    <div className="text-xl font-bold text-accent-dark mb-1">ca. 15.30 Uhr</div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Picknick mit Kaffee und Kuchen auf dem Schulgelände</h4>
                    <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200">
                      <p className="font-bold text-red-600 mb-2">Bitte mitbringen:</p>
                      <ul className="text-red-600 space-y-1 pl-4">
                        <li>Eigene Kaltgetränke (Für Kaffee ist gesorgt!)</li>
                        <li>Kaffeebecher / Geschirr / Besteck</li>
                        <li>Picknickdecke / Sitzgelegenheit, etc.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 17:00 Uhr */}
            <div className="mb-20 relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-2 z-10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-light border-4 border-white shadow-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center mt-8 md:mt-0">
                <div className="md:w-1/2 md:pr-12 md:text-right mb-8 md:mb-0 pt-8 md:pt-0">
                  <div className="bg-white rounded-2xl shadow-md p-6 md:ml-auto transition-all duration-300 hover:shadow-lg hover:-translate-y-2 border-b-4 border-accent">
                    <div className="text-xl font-bold text-accent-dark mb-1">ca. 17.00 Uhr</div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Aufräumen und Ende</h4>
                  </div>
                </div>
                <div className="md:w-1/2 md:pl-12"></div>
              </div>
            </div>
            

          </div>
        </div>
      </div>
      
      {/* Einladung */}
      <div className="py-24 bg-white">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>Schön, wenn ihr dabei seid!</h2>
            <p className="text-gray-700 max-w-2xl mx-auto mb-4">Wir laden alle Melsdorfer*innen und Freund*innen der Regenbogenschule herzlich ein, mit uns einen fröhlichen Nachmittag auf der Schulwiese zu verbringen.</p>
            <p className="text-gray-700 max-w-2xl mx-auto">Gemeinsam genießen wir ein Picknick mit Kaffee und Kuchen unter freiem Himmel.</p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="card card-tertiary p-8 md:p-10">
              <div className="card-body mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Bitte mitbringen:</h3>
                <ul className="space-y-3 text-gray-700 pl-5">
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>Eigene Kaltgetränke (Kaffee gibt's vor Ort)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>Kaffeebecher, Geschirr, Besteck</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>Picknickdecke oder Sitzgelegenheit</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-center text-gray-700 italic">
                  Für Kaffee und Kuchen ist gesorgt – wir freuen uns auf euch!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Umzugsroute */}
      <div id="route" className="py-20 bg-gradient-to-b from-pastel-green/10 to-pastel-blue/20">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-white rounded-full text-primary font-medium text-sm mb-3 shadow-sm">🚜 Festumzug</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>Umzugsroute</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">Der Festumzug ist einer der Höhepunkte des Tages! Folge unserer Route durch das festlich geschmückte Dorf</p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-all duration-500 border border-white/50">
              <div className="aspect-[16/9] relative">
                <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
                  <RouteMap />
                </motion.div>
              </div>
              <div className="p-8 bg-white">
                <div className="flex items-start mb-4">
                  <div className="bg-primary-light/20 p-3 rounded-full mr-4">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Festumzug durch Melsdorf</h3>
                    <p className="text-gray-700">
                      Der Umzug startet an der Regenbogenschule und führt über die Köhlerkoppel, die Dorfstraße, Kieler Weg, am Dom, Rothenberg, Schlichtingstraße und Rotenhofer Weg zurück zu der Regenbogenschule.
                      Alle freuen sich über jedes geschmückte Haus entlang der Route!
                    </p>
                  </div>
                </div>
                {/* Button wurde entfernt, da jetzt die interaktive Karte verwendet wird */}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Spiele-Sektion */}
      <motion.div
        id="spiele"
        className="py-24 bg-pastel-green/30"
        ref={spieleRef}
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-white rounded-full text-tertiary font-medium text-sm mb-3 shadow-sm">🎮 Spaß für alle</span>
            <motion.h2
              className="text-4xl md:text-5xl font-bold text-center text-tertiary mb-12 md:mb-16"
              style={{ fontFamily: 'var(--font-poppins)' }}
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              Unsere Spiele
            </motion.h2>
            <p className="text-gray-700 max-w-2xl mx-auto">Entdecke unsere spannenden Wettbewerbe und Spiele beim diesjährigen Melsdörper Vagelscheeten</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {loading.games ? (
              <div className="col-span-full bg-white rounded-2xl shadow-md p-12 text-center">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-12 w-12 bg-tertiary/20 rounded-full mb-4"></div>
                  <div className="h-4 w-48 bg-tertiary/20 rounded mb-3"></div>
                  <div className="h-3 w-64 bg-gray-100 rounded mb-2"></div>
                  <div className="h-3 w-56 bg-gray-100 rounded mb-2"></div>
                  <div className="h-3 w-60 bg-gray-100 rounded"></div>
                  <p className="text-gray-500 mt-4">Spiele werden geladen...</p>
                </div>
              </div>
            ) : error ? (
              <div className="col-span-full text-center bg-red-50 rounded-xl p-8 shadow-sm border border-red-100">
                <div className="text-red-500 mb-3 flex justify-center">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            ) : games.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl shadow-md p-12 text-center">
                <div className="flex flex-col items-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <p className="text-gray-500">Keine Spiele gefunden.</p>
                </div>
              </div>
            ) : (
              games.map((game, index) => (
                <motion.div
                  key={game.id} // Ensure key is on the motion component if it's the direct child of map
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
                >
                  <GameCard
                    game={game}
                    onClick={setSelectedGame}
                  />
                </motion.div>
              ))
                
            )}
          </div>
          
          {/* Spielhinweis */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-md p-8 border-l-4 border-tertiary">
              <div className="flex items-start">
                <div className="text-tertiary mr-4 flex-shrink-0">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Hinweis zu den Spielen</h3>
                  <p className="text-gray-600">In jedem Spiel erhalten die besten zehn Kinder Punkte – von 10 bis 1. Am Ende werden pro Klasse die Punkte addiert: Das Mädchen und der Junge mit den meisten Punkten werden Königin und König ihrer Klasse.
                  Alle Klassen erhalten für ihre Teilnahme ein gemeinsames Geschenk – einen individuellen Klassenausflug. Die "Schulis" aus dem Kindergarten bekommen eine kleine Aufmerksamkeit.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
          
      </motion.div>

      {/* Modal für Spieldetails */}
      <Modal isOpen={selectedGame !== null} onClose={() => setSelectedGame(null)}>
        {selectedGame && (
          <div>
            <h3 className="text-2xl font-bold text-tertiary-dark mb-4">{selectedGame?.name || 'Spieldetails'}</h3>
            
            <div className="mb-4">
              <h4 className="text-lg font-medium text-gray-800 mb-1">Beschreibung</h4>
              <p className="text-gray-700">{selectedGame?.beschreibung || 'Keine Beschreibung verfügbar'}</p>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Spenden-Sektion */}
      <motion.div
        id="spenden"
        className="py-20 bg-white"
        ref={spendenRef}
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-yellow-100 rounded-full text-yellow-800 font-medium text-sm mb-3 shadow-sm">💰 Unterstützen</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>Spenden</h2>
            <h3 className="text-2xl font-semibold text-primary mb-6">🎁 Hilf mit, den Kindern einen unvergesslichen Tag zu schenken!</h3>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-lg p-8 md:p-10 border border-accent/10">
              <div className="flex flex-col md:flex-row gap-10 items-start">
                <div className="md:w-1/2">
                  <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                    Das Vogelschießen wird ausschließlich durch Spenden finanziert.
                  </p>
                  
                  <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                    Mit deiner Unterstützung ermöglichst du den Kindern einen tollen Tag voller Spiel, Gemeinschaft und Freude – und hilfst bei der Finanzierung der Klassenausflüge.
                  </p>
                  
                  <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                    Unsere Helfer*innen sind im Ort unterwegs und sammeln Spenden persönlich ein.
                  </p>
                  
                  <p className="text-gray-700 text-lg font-medium">
                    Alternativ kannst du ganz bequem per Überweisung spenden.
                  </p>
                </div>
                
                <div className="md:w-1/2">
                  <div className="bg-yellow-50 rounded-xl p-6 shadow-sm border border-yellow-100">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6">💳 So kannst du spenden</h3>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm text-gray-600">Kontoinhaber:</span>
                        <span className="font-semibold text-base text-gray-800">Förderverein der Regenbogenschule Melsdorf</span>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm text-gray-600">IBAN:</span>
                        <span className="font-semibold text-base font-mono text-gray-800">DE12 3456 7890 1234 5678 90</span>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm text-gray-600">BIC:</span>
                        <span className="font-semibold text-base font-mono text-gray-800">ABCDEFGHIJK</span>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm text-gray-600">Verwendungszweck:</span>
                        <span className="font-semibold text-base text-gray-800">Spende Vogelschießen 2025</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Galerie-Sektion */}
      <div id="galerie" className="py-24 bg-gradient-to-b from-white to-gray-50" ref={galerieRef}>
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-primary/10 rounded-full text-primary font-medium text-sm mb-3 shadow-sm">📸 Fotogalerie</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>Impressionen</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">Schöne Momente des Vagelscheetens festgehalten</p>
          </div>

          {loading.gallery ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
              </div>
            </div>
          ) : galleryImages.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100 p-12 max-w-3xl mx-auto">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-[2rem] blur-2xl"></div>
                <div className="relative space-y-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
                    <span className="text-3xl opacity-50">📷</span>
                  </div>
                  <p className="text-2xl text-gray-400 font-light">Noch keine Bilder vorhanden</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                {galleryImages
                  .slice((currentPage - 1) * imagesPerPage, currentPage * imagesPerPage)
                  .map(image => (
                    <div 
                      key={image.id} 
                      className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                      onClick={() => setSelectedImage(image)}
                    >
                      <div className="aspect-square overflow-hidden">
                        <Image 
                          src={image.url} 
                          alt="Vogelschießen Foto"
                          width={300}
                          height={300}
                          className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-all duration-300">
                        <div className="text-white opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
              
              {/* Paginierung */}
              {galleryImages.length > imagesPerPage && (
                <div className="flex justify-center mt-12 space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-md ${currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
                  >
                    ← Zurück
                  </button>
                  
                  {Array.from({ length: Math.ceil(galleryImages.length / imagesPerPage) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-md ${currentPage === page ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(galleryImages.length / imagesPerPage)))}
                    disabled={currentPage === Math.ceil(galleryImages.length / imagesPerPage)}
                    className={`px-4 py-2 rounded-md ${currentPage === Math.ceil(galleryImages.length / imagesPerPage) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
                  >
                    Weiter →
                  </button>
                </div>
              )}
              
              {/* Bildvorschau-Modal */}
              {selectedImage && (
                <ImagePreview 
                  image={selectedImage}
                  onClose={() => setSelectedImage(null)}
                  onNext={() => {
                    const currentIndex = galleryImages.findIndex(img => img.id === selectedImage.id);
                    if (currentIndex < galleryImages.length - 1) {
                      setSelectedImage(galleryImages[currentIndex + 1]);
                    }
                  }}
                  onPrevious={() => {
                    const currentIndex = galleryImages.findIndex(img => img.id === selectedImage.id);
                    if (currentIndex > 0) {
                      setSelectedImage(galleryImages[currentIndex - 1]);
                    }
                  }}
                  hasNext={galleryImages.findIndex(img => img.id === selectedImage.id) < galleryImages.length - 1}
                  hasPrevious={galleryImages.findIndex(img => img.id === selectedImage.id) > 0}
                />
              )}
            </>
          )}
          

        </div>
      </div>
      
      {/* Kontakt-Sektion */}
      <motion.div
        id="kontakt"
        className="py-16 bg-gray-50"
        ref={kontaktRef}
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-green-700 mb-8 text-center">Kontakt</h2>
          
          <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-8">
            <p className="text-gray-700 mb-6">
              Hast du Fragen zum Vogelschießen? Kontaktiere uns gerne!
            </p>
            
            <ContactForm />
          </div>
        </div>
      </motion.div>
      
      {/* Downloads-Sektion */}
      <div id="downloads" className="py-20 bg-gradient-to-b from-pastel-blue/10 to-white" ref={downloadsRef}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-white rounded-full text-primary font-medium text-sm mb-3 shadow-sm">📥 Materialien</span>
            <motion.h2
            className="text-4xl font-bold text-gray-900 mb-4" 
            style={{ fontFamily: 'var(--font-poppins)' }}
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            Downloads
          </motion.h2>
            <p className="text-gray-700 max-w-2xl mx-auto">Hier findest du wichtige Dokumente und Materialien zum Herunterladen</p>
          </div>
          
          {loading.downloads ? (
            <div className="text-center py-12 bg-white/80 rounded-2xl shadow-md max-w-4xl mx-auto">
              <div className="animate-pulse flex flex-col items-center p-8">
                <div className="w-16 h-16 bg-primary/20 rounded-full mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg>
                </div>
                <p className="text-gray-600">Dateien werden geladen...</p>
              </div>
            </div>
          ) : downloadFiles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-md max-w-4xl mx-auto">
              <div className="p-8">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <p className="text-gray-600">Derzeit sind keine Dateien vorhanden.</p>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {downloadFiles.map(file => (
                  <a 
                    key={file.id}
                    href={file.url} 
                    download={file.name}
                    className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group"
                  >
                    <div className="p-6 flex items-start">
                      <div className="bg-gradient-to-br from-primary-light to-primary p-3 rounded-xl mr-5 shadow-sm">
                        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-xl text-gray-900 mb-1 group-hover:text-primary transition-colors">{file.name}</h3>
                        <div className="mt-3 flex items-center text-primary font-medium">
                          <span>Herunterladen</span>
                          <svg className="ml-1 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
