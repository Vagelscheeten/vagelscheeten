'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { ImageUpload } from '@/components/ImageUpload';

// Typ für ein Galeriebild
interface GalleryImage {
  id: string;
  url: string;
  title: string;
  year: number;
  description?: string;
}

// Platzhalterbilder für die Entwicklung
const placeholderImages = [
  { id: '1', url: 'https://via.placeholder.com/600x400/2563eb/ffffff?text=Vogelschie%C3%9Fen+2024', title: 'Umzug 2024', year: 2024, description: 'Der festliche Umzug durch Melsdorf' },
  { id: '2', url: 'https://via.placeholder.com/600x400/2563eb/ffffff?text=K%C3%B6nigspaar+2024', title: 'Königspaar 2024', year: 2024, description: 'Die stolzen Königspaare aller Klassenstufen' },
  { id: '3', url: 'https://via.placeholder.com/600x400/2563eb/ffffff?text=Armbrustschie%C3%9Fen', title: 'Armbrustschießen', year: 2024, description: 'Konzentration beim Armbrustschießen' },
  { id: '4', url: 'https://via.placeholder.com/600x400/2563eb/ffffff?text=Siegerehrung+2023', title: 'Siegerehrung 2023', year: 2023, description: 'Feierliche Siegerehrung mit Kronenübergabe' },
  { id: '5', url: 'https://via.placeholder.com/600x400/2563eb/ffffff?text=Spielstationen', title: 'Spielstationen', year: 2023, description: 'Die verschiedenen Spielstationen auf dem Schulgelände' },
  { id: '6', url: 'https://via.placeholder.com/600x400/2563eb/ffffff?text=Gl%C3%BCcksrad', title: 'Glücksrad', year: 2023, description: 'Spannung am Glücksrad' },
  { id: '7', url: 'https://via.placeholder.com/600x400/2563eb/ffffff?text=Festumzug+2022', title: 'Festumzug 2022', year: 2022, description: 'Der bunte Festumzug durch die Straßen von Melsdorf' },
  { id: '8', url: 'https://via.placeholder.com/600x400/2563eb/ffffff?text=Gummistiefelweitwurf', title: 'Gummistiefelweitwurf', year: 2022, description: 'Beim beliebten Gummistiefelweitwurf' },
  { id: '9', url: 'https://via.placeholder.com/600x400/2563eb/ffffff?text=Vogelschie%C3%9Fen+2021', title: 'Vogelschießen 2021', year: 2021, description: 'Impressionen vom Vogelschießen 2021' },
];

// Galerie-Bild-Komponente
const GalleryImage = ({ image, onClick }: { image: GalleryImage; onClick: () => void }) => {
  return (
    <div 
      className="relative overflow-hidden rounded-lg shadow-md cursor-pointer group h-64"
      onClick={onClick}
    >
      <Image 
        src={image.url} 
        alt={image.title} 
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-80 transition-opacity group-hover:opacity-100">
        <div className="absolute bottom-0 left-0 p-4 text-white">
          <h3 className="text-lg font-semibold">{image.title}</h3>
          <p className="text-sm opacity-90">{image.year}</p>
        </div>
      </div>
    </div>
  );
};

// Lightbox-Komponente
const ImageLightbox = ({ image, onClose }: { image: GalleryImage; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] w-full p-4">
        <button 
          className="absolute top-4 right-4 z-10 text-white text-2xl bg-black/50 w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/70"
          onClick={onClose}
        >
          ×
        </button>
        <div className="relative h-[70vh] w-full" onClick={(e) => e.stopPropagation()}>
          <Image 
            src={image.url} 
            alt={image.title} 
            fill
            className="object-contain"
          />
        </div>
        <div className="bg-black/70 p-4 text-white mt-2 rounded">
          <h3 className="text-xl font-bold">{image.title}</h3>
          <p className="text-sm opacity-80 mb-2">Jahr: {image.year}</p>
          {image.description && <p>{image.description}</p>}
        </div>
      </div>
    </div>
  );
};

// Hauptkomponente
const GalleryPage = ({ images }: { images: GalleryImage[] }) => {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  
  // Alle verfügbaren Jahre aus den Bildern extrahieren
  const years = [...new Set(images.map(img => img.year))].sort((a, b) => b - a);
  
  // Bilder nach Jahr filtern
  const filteredImages = filterYear 
    ? images.filter(img => img.year === filterYear)
    : images;
  
  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">📸 Galerie</h1>
        <p className="text-lg text-gray-700 mb-6">
          Bilder und Impressionen vom Vogelschießen der Regenbogenschule Melsdorf – 
          Erinnerungen an vergangene Jahre und aktuelle Highlights.
        </p>
        
        {/* Upload-Komponente */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Neue Bilder hochladen</h2>
          <ImageUpload />
        </div>
      </div>
      
      {/* Filteroption nach Jahr */}
      <div className="mb-8 flex flex-wrap gap-2">
        <button 
          className={`px-4 py-2 rounded-full text-sm font-medium ${filterYear === null ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
          onClick={() => setFilterYear(null)}
        >
          Alle Jahre
        </button>
        {years.map(year => (
          <button 
            key={year}
            className={`px-4 py-2 rounded-full text-sm font-medium ${filterYear === year ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            onClick={() => setFilterYear(year)}
          >
            {year}
          </button>
        ))}
      </div>
      
      {/* Bildergalerie */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredImages.map(image => (
          <GalleryImage 
            key={image.id} 
            image={image} 
            onClick={() => setSelectedImage(image)}
          />
        ))}
      </div>
      
      {/* Hinweis, wenn keine Bilder vorhanden sind */}
      {filteredImages.length === 0 && (
        <div className="text-center py-12 bg-gray-100 rounded-lg">
          <p className="text-gray-600">
            {filterYear 
              ? `Für das Jahr ${filterYear} sind keine Bilder verfügbar.` 
              : 'Aktuell sind keine Bilder in der Galerie verfügbar.'}
          </p>
        </div>
      )}
      
      {/* Lightbox */}
      {selectedImage && (
        <ImageLightbox 
          image={selectedImage} 
          onClose={() => setSelectedImage(null)}
        />
      )}
      
      {/* Information für Eltern */}
      <div className="mt-12 bg-blue-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Hinweis für Eltern</h2>
        <p className="mb-4">
          Die hier gezeigten Bilder sind öffentlich zugänglich. Falls Sie nicht möchten, dass Ihr Kind auf 
          Bildern des Vogelschießens erscheint, teilen Sie uns dies bitte rechtzeitig mit.
        </p>
        <p>
          Haben Sie schöne Bilder vom Vogelschießen, die Sie mit uns teilen möchten? 
          Wir freuen uns über Ihre Zusendungen! Bitte kontaktieren Sie uns über das Kontaktformular.
        </p>
      </div>
    </main>
  );
};

// Server-Komponente zum Laden der Bilder aus Supabase
export default async function Galerie() {
  // Hier könnten wir später die Bilder aus Supabase Storage laden
  // const supabase = await createClient();
  // const { data, error } = await supabase.storage.from('gallery').list();
  
  // Für die Entwicklung verwenden wir Platzhalterbilder
  const images = placeholderImages;
  
  return <GalleryPage images={images} />;
}
