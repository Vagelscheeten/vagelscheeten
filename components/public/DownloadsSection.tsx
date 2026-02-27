'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { SectionWrapper } from './SectionWrapper';
import { PageHeader } from './PageHeader';

type DownloadFile = {
  id: number;
  name: string;
  url: string;
};

interface DownloadsSectionProps {
  files: DownloadFile[];
  labels?: Record<string, string>;
  loading?: boolean;
}

export function DownloadsSection({ files, labels = {}, loading = false }: DownloadsSectionProps) {
  return (
    <SectionWrapper id="downloads" bgColor="bg-gradient-to-b from-pastel-blue/10 to-white">
      <PageHeader
        badge="📥 Materialien"
        title="Downloads"
        subtitle="Hier findest du wichtige Dokumente und Materialien zum Herunterladen"
      />

      {loading ? (
        <div className="text-center py-12 bg-white/80 rounded-2xl shadow-md max-w-4xl mx-auto">
          <div className="animate-pulse flex flex-col items-center p-8">
            <div className="w-16 h-16 bg-melsdorf-green/20 rounded-full mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-melsdorf-green/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <p className="text-gray-600">Dateien werden geladen...</p>
          </div>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-md max-w-4xl mx-auto">
          <div className="p-8">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600">Derzeit sind keine Dateien vorhanden.</p>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {files.map((file, index) => (
              <motion.a
                key={file.id}
                href={file.url}
                download={file.name}
                className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="p-6 flex items-start">
                  <div className="bg-gradient-to-br from-melsdorf-green to-melsdorf-green p-3 rounded-xl mr-5 shadow-sm">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-xl text-gray-900 mb-1 group-hover:text-melsdorf-green transition-colors">{labels[file.name] || file.name}</h3>
                    <div className="mt-3 flex items-center text-melsdorf-green font-medium">
                      <span>Herunterladen</span>
                      <svg className="ml-1 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      )}
    </SectionWrapper>
  );
}
