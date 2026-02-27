'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function AnmeldungLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 -mt-6 md:-mx-8 flex flex-col min-h-[calc(100vh-0px)]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/startseite" className="flex items-center gap-2.5">
            <Image
              src="/2025_Logo_transparent.png"
              alt="Melsdörper Vagelscheeten"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="font-semibold text-lg text-slate-800 hidden sm:inline">
              Vagelscheeten
            </span>
          </Link>
          <Link
            href="/startseite"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Zur Webseite</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1">
        {children}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} Förderverein der Regenbogenschule Melsdorf e.V.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/datenschutz" className="hover:text-slate-600 transition-colors">
              Datenschutz
            </Link>
            <span>&middot;</span>
            <Link href="/impressum" className="hover:text-slate-600 transition-colors">
              Impressum
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
