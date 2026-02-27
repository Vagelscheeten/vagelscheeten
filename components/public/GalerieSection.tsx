'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { SectionWrapper } from './SectionWrapper';
import { PageHeader } from './PageHeader';

type GalleryImage = {
  id: number;
  name: string;
  url: string;
};

interface GalerieSectionProps {
  images: GalleryImage[];
  loading?: boolean;
}

// Vary rotation per slot so the grid looks naturally scattered
const rotations = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];

function ImagePreview({
  image,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: {
  image: GalleryImage;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrevious) onPrevious();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrevious, hasNext, hasPrevious]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="relative w-full h-full flex items-center justify-center">
          <Image src={image.url} alt="Vogelschießen Foto" width={1200} height={800} className="object-contain max-h-[85vh] rounded-lg" />
        </div>
        {hasPrevious && (
          <button className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all" onClick={(e) => { e.stopPropagation(); onPrevious(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {hasNext && (
          <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all" onClick={(e) => { e.stopPropagation(); onNext(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function GalerieSection({ images, loading = false }: GalerieSectionProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 8;
  const totalPages = Math.ceil(images.length / imagesPerPage);
  const pageImages = images.slice((currentPage - 1) * imagesPerPage, currentPage * imagesPerPage);

  return (
    <SectionWrapper id="galerie" bgColor="bg-gradient-to-b from-white to-slate-50">
      <PageHeader
        badge="📸 Fotogalerie"
        title="Impressionen"
        subtitle="Schöne Momente des Vagelscheetens festgehalten"
      />

      {loading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-300" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex flex-col items-center gap-3 text-slate-400">
            <span className="text-5xl opacity-40">📷</span>
            <p className="text-lg font-light">Noch keine Bilder vorhanden</p>
          </div>
        </div>
      ) : (
        <>
          {/* Polaroid grid — extra padding so rotated edges don't clip */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 md:gap-8 max-w-6xl mx-auto py-4 px-2">
            {pageImages.map((image, index) => {
              const rotation = rotations[index % rotations.length];
              return (
                <motion.div
                  key={image.id}
                  className={`${rotation} hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-pointer bg-white p-2.5 pb-8 shadow-lg rounded-sm`}
                  onClick={() => setSelectedImage(image)}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: (index % 4) * 0.07, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="aspect-square overflow-hidden bg-slate-100">
                    <Image
                      src={image.url}
                      alt="Vogelschießen Foto"
                      width={300}
                      height={300}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {images.length > imagesPerPage && (
            <div className="flex justify-center mt-12 gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Zurück
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Weiter →
              </button>
            </div>
          )}

          {selectedImage && (
            <ImagePreview
              image={selectedImage}
              onClose={() => setSelectedImage(null)}
              onNext={() => {
                const idx = images.findIndex(img => img.id === selectedImage.id);
                if (idx < images.length - 1) setSelectedImage(images[idx + 1]);
              }}
              onPrevious={() => {
                const idx = images.findIndex(img => img.id === selectedImage.id);
                if (idx > 0) setSelectedImage(images[idx - 1]);
              }}
              hasNext={images.findIndex(img => img.id === selectedImage.id) < images.length - 1}
              hasPrevious={images.findIndex(img => img.id === selectedImage.id) > 0}
            />
          )}
        </>
      )}
    </SectionWrapper>
  );
}
