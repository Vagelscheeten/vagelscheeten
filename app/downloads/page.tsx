import React from 'react';
import { createClient } from '@/lib/supabase/server';

// Typ für ein Dokument
interface Document {
  id: string;
  title: string;
  description?: string;
  category: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  created_at?: string;
  updated_at?: string;
}

// Statische Dokumente für die Entwicklung
const staticDocuments: Document[] = [
  {
    id: '1',
    title: 'Elternbrief Vogelschießen 2025',
    description: 'Informationen zum Ablauf, Zeitplan und wichtige Hinweise für Eltern',
    category: 'Eltern',
    file_url: '/documents/elternbrief-vogelschiessen-2025.pdf',
    file_size: 245000,
    file_type: 'application/pdf'
  },
  {
    id: '2',
    title: 'Anmeldeformular Helfer',
    description: 'Formular für Eltern, die beim Vogelschießen helfen möchten',
    category: 'Eltern',
    file_url: '/documents/helfer-anmeldung.pdf',
    file_size: 125000,
    file_type: 'application/pdf'
  },
  {
    id: '3',
    title: 'Sponsoring-Paket 2025',
    description: 'Informationen für potenzielle Sponsoren mit Preisen und Leistungen',
    category: 'Sponsoren',
    file_url: '/documents/sponsoring-paket-2025.pdf',
    file_size: 1800000,
    file_type: 'application/pdf'
  },
  {
    id: '4',
    title: 'Spendenformular',
    description: 'Formular für Geld- und Sachspenden',
    category: 'Sponsoren',
    file_url: '/documents/spendenformular.pdf',
    file_size: 105000,
    file_type: 'application/pdf'
  },
  {
    id: '5',
    title: 'Spielregeln für Helfer',
    description: 'Detaillierte Erklärung aller Spiele für Helfer und Betreuer',
    category: 'Organisation',
    file_url: '/documents/spielregeln-helfer.pdf',
    file_size: 350000,
    file_type: 'application/pdf'
  },
  {
    id: '6',
    title: 'Checkliste Vogelschießen',
    description: 'Organisatorische Checkliste für die Vorbereitung',
    category: 'Organisation',
    file_url: '/documents/checkliste.pdf',
    file_size: 85000,
    file_type: 'application/pdf'
  },
  {
    id: '7',
    title: 'Presseberichte 2024',
    description: 'Zusammenstellung der Presseberichte vom letzten Vogelschießen',
    category: 'Presse',
    file_url: '/documents/presse-2024.pdf',
    file_size: 4200000,
    file_type: 'application/pdf'
  },
  {
    id: '8',
    title: 'Bildergalerie 2024 (ZIP)',
    description: 'Alle Bilder vom Vogelschießen 2024 als ZIP-Datei',
    category: 'Medien',
    file_url: '/documents/bilder-2024.zip',
    file_size: 25000000,
    file_type: 'application/zip'
  }
];

// Formatierung der Dateigröße
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// Icon für Dateityp
function getFileIcon(fileType: string): string {
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('zip') || fileType.includes('rar')) return '💾';
  if (fileType.includes('image') || fileType.includes('jpg') || fileType.includes('png')) return '🖼️';
  if (fileType.includes('word') || fileType.includes('doc')) return '📝';
  if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('xls')) return '📈';
  return '📁';
}

export default async function Downloads() {
  // Hier könnten wir später die Dokumente aus Supabase Storage laden
  // const supabase = await createClient();
  // const { data, error } = await supabase.storage.from('documents').list();
  
  // Für die Entwicklung verwenden wir statische Dokumente
  const documents = staticDocuments;
  
  // Dokumente nach Kategorie gruppieren
  const documentsByCategory: Record<string, Document[]> = {};
  documents.forEach(doc => {
    if (!documentsByCategory[doc.category]) {
      documentsByCategory[doc.category] = [];
    }
    documentsByCategory[doc.category].push(doc);
  });
  
  // Kategorien in alphabetischer Reihenfolge
  const categories = Object.keys(documentsByCategory).sort();
  
  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">⬇️ Downloads</h1>
        <p className="text-lg text-gray-700">
          Hier finden Sie wichtige Dokumente, Formulare und Materialien zum Vogelschießen 
          der Regenbogenschule Melsdorf zum Herunterladen.
        </p>
      </div>
      
      {/* Kategorien-Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <div className="flex flex-wrap -mb-px">
          {categories.map((category, index) => (
            <a 
              key={category}
              href={`#${category.toLowerCase().replace(/\s+/g, '-')}`}
              className="inline-block p-4 border-b-2 border-transparent hover:text-blue-600 hover:border-blue-600"
            >
              {category}
            </a>
          ))}
        </div>
      </div>
      
      {/* Dokumente nach Kategorie */}
      <div className="space-y-10">
        {categories.map(category => (
          <div key={category} id={category.toLowerCase().replace(/\s+/g, '-')} className="scroll-mt-20">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
              {category === 'Eltern' && <span className="mr-2">👪</span>}
              {category === 'Sponsoren' && <span className="mr-2">💰</span>}
              {category === 'Organisation' && <span className="mr-2">📅</span>}
              {category === 'Presse' && <span className="mr-2">📰</span>}
              {category === 'Medien' && <span className="mr-2">🎥</span>}
              {category}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documentsByCategory[category].map(doc => (
                <a 
                  key={doc.id} 
                  href={doc.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white rounded-lg border p-4 flex hover:shadow-md transition-shadow"
                >
                  <div className="mr-4 text-4xl flex-shrink-0">
                    {doc.file_type ? getFileIcon(doc.file_type) : '📁'}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-lg text-blue-600">{doc.title}</h3>
                    {doc.description && <p className="text-sm text-gray-600 mb-2">{doc.description}</p>}
                    <div className="flex items-center text-xs text-gray-500">
                      {doc.file_type && (
                        <span className="mr-3">
                          {doc.file_type.split('/')[1]?.toUpperCase() || doc.file_type}
                        </span>
                      )}
                      {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                    </div>
                  </div>
                  <div className="self-center ml-2 text-blue-500">
                    <span className="text-xl">⬇️</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Hinweis */}
      <div className="mt-12 bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Hinweis zu den Dokumenten</h2>
        <p className="mb-4">
          Alle Dokumente stehen im PDF-Format zur Verfügung und können mit dem Adobe Reader oder 
          anderen PDF-Betrachtern geöffnet werden. Sollten Sie Probleme beim Öffnen oder Herunterladen 
          haben, kontaktieren Sie uns bitte.
        </p>
        <p>
          Einige Dokumente werden regelmäßig aktualisiert. Bitte stellen Sie sicher, dass Sie 
          immer die aktuelle Version verwenden, indem Sie das Dokument direkt von dieser Seite herunterladen.
        </p>
      </div>
    </main>
  );
}
