'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { RouteMap, RouteButton } from "@/components/route/RouteComponents";
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ImageUpload } from '@/components/ImageUpload';

// Typen für die Daten aus Supabase
type Game = {
  id: string;
  name: string;
  beschreibung: string;
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
    <div className="relative group flex flex-col items-center justify-center px-6 py-4">
      <div className="absolute inset-0 bg-white/10 rounded-2xl backdrop-blur-sm group-hover:bg-white/20 transition-all duration-300 border border-white/20"></div>
      <span className="relative text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/90">{value}</span>
      <span className="relative text-sm font-medium text-white/90 mt-1">{label}</span>
    </div>
  );
};

const calculateTimeLeft = (targetDate: Date) => {
  const difference = targetDate.getTime() - new Date().getTime();
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
};

const EventCountdown = ({ targetDate }: { targetDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="relative flex justify-center items-center space-x-6 p-6">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl backdrop-blur-md"></div>
      <CountdownItem value={timeLeft.days} label="Tage" />
      <div className="w-2 h-2 bg-white/40 rounded-full"></div>
      <CountdownItem value={timeLeft.hours} label="Stunden" />
      <div className="w-2 h-2 bg-white/40 rounded-full"></div>
      <CountdownItem value={timeLeft.minutes} label="Minuten" />
      <div className="w-2 h-2 bg-white/40 rounded-full"></div>
      <CountdownItem value={timeLeft.seconds} label="Sekunden" />
    </div>
  );
};

// Icon-Mapping für die Spiele
const gameIcons: {[key: string]: string} = {
  'Eierlauf': '🥚',
  'Dosenwerfen': '🎯',
  'Sackhüpfen': '🦘',
  'Wassertransport': '💧',
  'Seilziehen': '🔄',
  'Zielwerfen': '🎯',
  'Hindernislauf': '🏃‍♂️',
  'Nageln': '🔨',
  'Vogel abschießen': '🐦',
  'Luftballons': '🎈',
  'Staffellauf': '🏃‍♀️',
  'Schubkarre': '🛠️',
};

const getGameIcon = (name: string) => {
  // Suche nach partiellen Übereinstimmungen im Spielnamen
  const key = Object.keys(gameIcons).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? gameIcons[key] : '🎮';
};

const GameCard = ({ game, onClick }: { game: Game; onClick: (game: Game) => void }) => {
  const icon = getGameIcon(game.name || '');
  
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('kontaktanfragen')
        .insert([{
          name: formData.name,
          email: formData.email || null,
          nachricht: formData.message,
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      setSubmitStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
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
        <p className="text-green-600 font-medium">Vielen Dank für Ihre Nachricht!</p>
      )}
      
      {submitStatus === 'error' && (
        <p className="text-red-600 font-medium">Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.</p>
      )}
    </form>
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
  
  // State für Modal
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  
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
        const supabase = createClient();
        const { data, error } = await supabase
          .storage
          .from('galerie')
          .list('');
          
        if (error) throw error;
        
        // Konvertieren der Dateien in das GalleryImage-Format
        const images: GalleryImage[] = await Promise.all(
          (data || []).filter(file => 
            file.name.match(/\.(jpeg|jpg|png|gif|webp)$/i)
          ).map(async (file, index) => {
            const { data: { publicUrl } } = supabase
              .storage
              .from('galerie')
              .getPublicUrl(file.name);
              
            return {
              id: index + 1,
              name: file.name,
              url: publicUrl
            };
          })
        );
        
        setGalleryImages(images);
      } catch (error) {
        console.error('Error fetching gallery images:', error);
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
    <div className="w-full">
      {/* Hero-Sektion mit Hintergrundbild */}
      <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Hintergrundbild mit Overlay */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/hero.jpeg" 
            alt="Melsdörper Vagelscheeten Hintergrund" 
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            quality={90}
            priority
            className="transform scale-105 animate-ken-burns"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/70"></div>
        </div>
        
        <div className="w-full z-10">
          <div className="flex flex-col items-center justify-center text-center space-y-16 max-w-7xl mx-auto px-4 sm:px-6">
            <div className="relative group transform hover:scale-105 transition-all duration-500">
              <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-white/40 to-white/10 blur-2xl group-hover:blur-3xl transition-all duration-500 animate-pulse"></div>
              <Image 
                src="/2025_Logo_transparent.png" 
                alt="Melsdörper Vagelscheeten" 
                width={280} 
                height={280} 
                className="relative drop-shadow-2xl transform group-hover:rotate-3 transition-all duration-500"
                priority
              />
            </div>
            
            <div className="space-y-12">
              <h1 className="text-7xl md:text-9xl font-bold" style={{ fontFamily: 'var(--font-poppins)' }}>
                <div className="relative inline-block">
                  <span className="absolute -inset-8 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 blur-3xl rounded-3xl"></span>
                  <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-white via-white/95 to-white/90 drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
                    Melsdörper<br />Vagelscheeten<br />2025
                  </span>
                </div>
              </h1>
              
              <div className="inline-flex items-center px-8 py-4 bg-white/20 backdrop-blur-md rounded-full shadow-xl border border-white/40 hover:bg-white/30 transition-all duration-300">
                <svg className="w-8 h-8 mr-4 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span className="text-2xl font-bold text-white">Samstag, 14. Juni 2025</span>
              </div>
            </div>
            
            <div className="mt-16 mb-20">
              <EventCountdown targetDate={eventDate} />
            </div>
            
            <div className="mt-12">
              <a 
                href="#spenden"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(spendenRef);
                }}
                className="group relative inline-flex items-center px-10 py-5 text-2xl font-bold text-white overflow-hidden rounded-full transition-all duration-500 transform hover:scale-105"
              >
                <div className="absolute inset-0 w-full h-full transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent via-primary to-accent bg-[length:200%] animate-gradient-x shadow-lg"></div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 bg-white"></div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
                <span className="relative flex items-center">
                  <span className="mr-4 text-3xl filter drop-shadow-glow animate-bounce">💰</span>
                  Jetzt mit einer Spende unterstützen
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 ml-3 transform group-hover:translate-x-2 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>
      
      {/* Ablaufplan */}
      <section id="ablauf" className="py-20 bg-pastel-blue" ref={ablaufRef}>
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
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-12 md:text-right mb-8 md:mb-0">
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
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-12"></div>
                <div className="md:w-1/2 md:pl-12 md:text-left mb-8 md:mb-0">
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
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 010-7.072m12.728 0l3.536-3.536M5.586 8.464L2.05 5"></path></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-12 md:text-right mb-8 md:mb-0">
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
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-12"></div>
                <div className="md:w-1/2 md:pl-12 md:text-left mb-8 md:mb-0">
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
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-12 md:text-right mb-8 md:mb-0">
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
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-12"></div>
                <div className="md:w-1/2 md:pl-12 md:text-left mb-8 md:mb-0">
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
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a2 2 0 104 0 2 2 0 00-4 0zm0 0H9m4 0h7m-4-6h2m-2 0a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-12 md:text-right mb-8 md:mb-0">
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
                  <svg className="w-7 h-7 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-12"></div>
                <div className="md:w-1/2 md:pl-12 md:text-left mb-8 md:mb-0">
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
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-12 md:text-right mb-8 md:mb-0">
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
      </section>
      
      {/* Willkommenstext */}
      <section className="py-20 bg-gradient-to-b from-white to-pastel-blue/30">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-lg p-10 text-center transform hover:-translate-y-1 transition-transform duration-300 border border-secondary/10">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-pastel-yellow rounded-full flex items-center justify-center shadow-md">
                <svg className="w-8 h-8 text-accent-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-poppins)' }}>Alle Melsdorfer*innen und Freunde<br />der Regenbogenschule<br />sind herzlich willkommen!</h2>
            
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              Bitte bringe für das Fest bzw. Picknick am Nachmittag auf der Schulwiese eigene Kaltgetränke / Kaffeebecher / Geschirr / Picknickdecke oder andere Sitzgelegenheit mit.
            </p>
            
            <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200 mb-8">
              <h3 className="text-xl font-bold text-red-600 mb-3">Bitte mitbringen:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Eigene Kaltgetränke (Für Kaffee ist gesorgt!)
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Kaffeebecher / Geschirr / Besteck
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Picknickdecke / Sitzgelegenheit, etc.
                </li>
              </ul>
            </div>
            
            <div className="inline-block bg-accent/20 px-6 py-3 rounded-full mb-6">
              <p className="text-xl font-semibold text-accent-dark">
                Für Kaffee und Kuchen ist gesorgt! ☕️🍰
              </p>
            </div>
            
            <p className="text-xl font-semibold text-secondary animate-pulse">
              Wir freuen uns auf deinen Besuch! 😊
            </p>
          </div>
        </div>
      </section>
      
      {/* Umzugsroute */}
      <section id="route" className="py-20 bg-gradient-to-b from-pastel-green/10 to-pastel-blue/20">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-white rounded-full text-primary font-medium text-sm mb-3 shadow-sm">🚜 Festumzug</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>Umzugsroute</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">Der Festumzug ist einer der Höhepunkte des Tages! Folge unserer Route durch das festlich geschmückte Dorf</p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-all duration-500 border border-white/50">
              <div className="aspect-[16/9] relative">
                <RouteMap />
              </div>
              <div className="p-8 bg-white">
                <div className="flex items-start mb-4">
                  <div className="bg-primary-light/20 p-3 rounded-full mr-4">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Festumzug durch Melsdorf</h3>
                    <p className="text-gray-700">
                      Der Festumzug startet an der Regenbogenschule und führt durch das Dorf Melsdorf.
                      Bitte schmücke dein Haus entlang der Route festlich!
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-center">
                  <RouteButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Spiele-Sektion */}
      <section id="spiele" className="py-24 bg-pastel-green/30" ref={spieleRef}>
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-white rounded-full text-tertiary font-medium text-sm mb-3 shadow-sm">🎮 Spaß für alle</span>
            <h2 className="text-4xl font-bold text-tertiary-dark mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>Unsere Spiele</h2>
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
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            ) : games.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl shadow-md p-12 text-center">
                <div className="flex flex-col items-center">
                  <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <p className="text-gray-500">Keine Spiele gefunden.</p>
                </div>
              </div>
            ) : (
              games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onClick={setSelectedGame}
                />
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
                  <p className="text-gray-600">Alle Kinder erhalten unabhängig von ihrer Platzierung bei den Spielen eine kleine Aufmerksamkeit für die Teilnahme. Die Königspaare werden am Nachmittag bekannt gegeben.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
          
      </section>

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
      <section id="spenden" className="py-20 bg-pastel-yellow/30" ref={spendenRef}>
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-white rounded-full text-accent-dark font-medium text-sm mb-3 shadow-sm">💸 Unterstützen</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>Spenden</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">Helfen Sie mit, den Kindern unvergessliche Erlebnisse zu ermöglichen</p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-lg p-8 md:p-10 border border-accent/10">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="md:w-1/2">
                  <div className="mb-8 flex items-center">
                    <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-accent-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-800">Warum wir Spenden sammeln</h3>
                  </div>
                  
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    Das Vogelschießen wird durch Spenden finanziert. Mit Ihren Spenden ermöglichen wir den Kindern einen schönen Tag und die Finanzierung der Klassenausflüge.
                  </p>
                  
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    Alternativ können Sie auch direkt vor Ort am Vogelschießen-Tag spenden. Sprechen Sie uns gerne an!
                  </p>
                </div>
                
                <div className="md:w-1/2">
                  <div className="bg-gradient-to-br from-accent/5 to-accent/20 rounded-2xl p-8 shadow-sm border border-accent/20 transform hover:scale-[1.02] transition-all duration-300">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 5h18M3 15h18"></path></svg>
                      Bankverbindung
                    </h3>
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between border-b border-accent/10 pb-2">
                        <span className="font-medium text-gray-700">Kontoinhaber:</span>
                        <span className="text-gray-800">Förderverein der Regenbogenschule Melsdorf</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between border-b border-accent/10 pb-2">
                        <span className="font-medium text-gray-700">IBAN:</span>
                        <span className="font-mono text-gray-800">DE12 3456 7890 1234 5678 90</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between border-b border-accent/10 pb-2">
                        <span className="font-medium text-gray-700">BIC:</span>
                        <span className="font-mono text-gray-800">ABCDEFGHIJK</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="font-medium text-gray-700">Verwendungszweck:</span>
                        <span className="text-gray-800">Spende Vogelschießen 2025</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Galerie-Sektion */}
      <section id="galerie" className="py-24 bg-gradient-to-b from-white to-gray-50" ref={galerieRef}>
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Impressionen
            </h2>
            <p className="text-xl text-gray-600">Erinnerungen an unvergessliche Momente</p>
          </div>
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>Impressionen</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">Schöne Momente des Vagelscheetens festgehalten</p>
          </div>
          {/* Upload-Komponente */}
          <div className="max-w-3xl mx-auto mb-12 bg-white rounded-2xl p-6 shadow-lg border border-primary/10">
            <h3 className="text-xl font-semibold text-primary mb-4 text-center">Teile deine Fotos mit uns!</h3>
            <ImageUpload />
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
                    <span className="text-3xl opacity-50">📸</span>
                  </div>
                  <p className="text-2xl text-gray-400 font-light">Noch keine Bilder vorhanden</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {galleryImages.map(image => (
                <div key={image.id} className="polaroid group">
                  <div className="polaroid-image">
                    <Image 
                      src={image.url} 
                      alt={image.name}
                      width={300}
                      height={300}
                      className="object-cover aspect-square w-full h-full"
                    />
                  </div>
                  <p className="polaroid-caption truncate group-hover:text-primary transition-colors">{image.name.replace(/\.[^/.]+$/, "")}</p>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link 
              href="/galerie" 
              className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors shadow-md hover:shadow-lg"
            >
              Zur vollständigen Galerie
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Kontakt-Sektion */}
      <section id="kontakt" className="py-16 bg-gray-50" ref={kontaktRef}>
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-green-700 mb-8 text-center">Kontakt</h2>
          
          <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-8">
            <p className="text-gray-700 mb-6">
              Haben Sie Fragen zum Vogelschießen? Kontaktieren Sie uns gerne!
            </p>
            
            <ContactForm />
          </div>
        </div>
      </section>
      
      {/* Downloads-Sektion */}
      <section id="downloads" className="py-20 bg-gradient-to-b from-pastel-blue/10 to-white" ref={downloadsRef}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-white rounded-full text-primary font-medium text-sm mb-3 shadow-sm">📥 Materialien</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>Downloads</h2>
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
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-4 md:grid-cols-2">
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
          
          <div className="text-center mt-12">
            <Link href="/downloads" className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors shadow-md hover:shadow-lg">
              Alle Downloads anzeigen
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
