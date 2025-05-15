import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-10 mt-auto">
      <div className="container-main mx-auto">
        <div className="grid grid-cols-3 gap-4">
          {/* Logo-Spalte */}
          <div className="col-span-3 md:col-span-1 flex flex-col items-center md:items-start mb-6 md:mb-0">
            <Link href="/" className="inline-block">
              <Image 
                src="/2025_Logo_transparent.png" 
                alt="Melsdörper Vagelscheeten" 
                width={80} 
                height={80} 
                className="invert"
              />
            </Link>
            <p className="text-gray-400 text-sm mt-3">
              © {new Date().getFullYear()} Melsdörper Vagelscheeten
            </p>
          </div>
          
          {/* Adresse-Spalte */}
          <div className="col-span-3 md:col-span-1 text-center mb-6 md:mb-0">
            <h3 className="text-lg font-semibold mb-3">Veranstaltungsort</h3>
            <address className="not-italic text-gray-300 leading-relaxed">
              Regenbogenschule Melsdorf<br />
              Dorfstraße 13<br />
              24109 Melsdorf
            </address>
          </div>
          
          {/* Links-Spalte */}
          <div className="col-span-3 md:col-span-1 flex flex-col items-center md:items-end">
            <h3 className="text-lg font-semibold mb-3 md:text-right w-full">Rechtliches</h3>
            <ul className="space-y-2 md:text-right w-full">
              <li>
                <Link href="/impressum" className="text-gray-300 hover:text-white transition-colors">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="text-gray-300 hover:text-white transition-colors">
                  Datenschutzerklärung
                </Link>
              </li>
            </ul>

          </div>
        </div>
      </div>
    </footer>
  );
}
