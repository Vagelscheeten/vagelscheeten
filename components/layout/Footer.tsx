import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const quickLinks = [
  { href: '/startseite#ablauf',   label: 'Ablauf' },
  { href: '/startseite#spiele',   label: 'Spiele' },
  { href: '/startseite#spenden',  label: 'Spenden' },
  { href: '/startseite#galerie',  label: 'Galerie' },
  { href: '/faq',                 label: 'FAQ' },
  { href: '/startseite#kontakt',  label: 'Kontakt' },
];

const legalLinks = [
  { href: '/impressum',   label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutzerklärung' },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white mt-auto">
      <div className="container-main py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link href="/startseite" className="flex items-center gap-3 group w-fit">
              <Image
                src="/2025_Logo_transparent.png"
                alt="Melsdörper Vagelscheeten"
                width={52}
                height={52}
                className="invert opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <span className="font-bold text-lg text-white/90 group-hover:text-white transition-colors leading-tight">
                Melsdörper<br />Vagelscheeten
              </span>
            </Link>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Navigation
            </h3>
            <ul className="space-y-2">
              {quickLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-300 hover:text-melsdorf-orange transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Address + Legal */}
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                Veranstaltungsort
              </h3>
              <address className="not-italic text-slate-300 text-sm leading-relaxed">
                Regenbogenschule Melsdorf<br />
                Dorfstraße 13<br />
                24109 Melsdorf
              </address>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                Rechtliches
              </h3>
              <ul className="space-y-2">
                {legalLinks.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-slate-300 hover:text-melsdorf-orange transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-main py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} Förderverein der Regenbogenschule Melsdorf e.V.
          </p>
        </div>
      </div>
    </footer>
  );
}
