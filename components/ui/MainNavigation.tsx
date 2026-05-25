'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// ─── Mobile Dropdown ──────────────────────────────────────────
function MobileDropdown({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left py-2.5 text-base font-semibold text-ink hover:text-melsdorf-red transition-colors flex items-center justify-between"
      >
        {label}
        <svg
          className={`w-4 h-4 ml-2 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && <div className="pl-3 border-l border-ink/10 ml-1">{children}</div>}
    </div>
  );
}

// ─── Links ────────────────────────────────────────────────────
const infoLinks = [
  { href: '/startseite#spiele', label: 'Spiele' },
  { href: '/startseite#ablauf', label: 'Ablauf' },
  { href: '/startseite#route',  label: 'Route' },
];
const navLinks = [
  { href: '/startseite#galerie', label: 'Galerie' },
  { href: '/faq',                label: 'FAQ' },
  { href: '/startseite#kontakt', label: 'Kontakt' },
];

export default function MainNavigation() {
  // Alle Hooks zuerst — NIE nach frühem return (Rules of Hooks)
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [liveAktiv, setLiveAktiv] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = (await import('@/lib/supabase/client')).createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsLoggedIn(true);
          setUserEmail(user.email ?? null);
          setIsAdmin(user.user_metadata?.rolle === 'admin');
        } else {
          setIsAdmin(false);
          setIsLoggedIn(false);
        }
        // Live-Stand-Link nur am Event-Tag (Berlin-Zeit)
        const { data: event } = await supabase
          .from('events')
          .select('datum')
          .eq('ist_aktiv', true)
          .maybeSingle();
        const heute = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
        setLiveAktiv(!!event && event.datum === heute);
      } catch {
        setIsAdmin(false);
        setIsLoggedIn(false);
      }
    })();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (adminMenuOpen && !target.closest('.admin-menu-container')) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [adminMenuOpen]);

  // Conditional rendering nach Hooks
  const isHidden =
    pathname.startsWith('/leiter') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/anmeldung') ||
    pathname.startsWith('/spielbetreuer') ||
    pathname.startsWith('/live');
  if (isHidden) return null;

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname === '/startseite' && href.includes('#')) {
      e.preventDefault();
      const targetId = href.substring(href.indexOf('#') + 1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        window.scrollTo({ top: targetElement.offsetTop - 90, behavior: 'smooth' });
        window.history.pushState(null, '', href);
      }
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const linkBase =
    'text-[0.95rem] font-semibold text-ink-soft hover:text-melsdorf-red transition-colors';

  return (
    <nav
      className={`w-full sticky top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? 'bg-paper/90 backdrop-blur-lg border-b border-ink/8'
          : 'bg-transparent'
      }`}
      style={{ borderBottomColor: scrolled ? 'color-mix(in srgb, var(--color-ink) 8%, transparent)' : undefined }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between py-3">

          {/* ── Logo ────────────────────────────────────────── */}
          <Link href="/startseite" className="flex items-center gap-3 group">
            <Image
              src="/Logo%20farbig.png"
              alt="Melsdörper Vagelscheeten"
              width={56}
              height={56}
              className="h-12 w-12 md:h-14 md:w-14 transition-opacity group-hover:opacity-85"
            />
            <span
              className="font-display text-ink hidden sm:block"
              style={{
                fontSize: '1.45rem',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                lineHeight: 1,
                fontVariationSettings: '"SOFT" 50, "opsz" 48',
              }}
            >
              Vagelscheeten
            </span>
          </Link>

          {/* ── Desktop-Nav ─────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-7">
            {/* Infos Dropdown */}
            <div className="relative group">
              <button className={`${linkBase} flex items-center gap-1`}>
                Infos
                <svg className="w-3.5 h-3.5 mt-0.5 opacity-60 transition-transform group-hover:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="absolute left-0 top-full w-2 h-2" />
              <div className="absolute left-0 top-full pt-2 w-44 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                <div
                  className="py-2 rounded-xl"
                  style={{
                    background: 'var(--color-paper-soft)',
                    border: '1px solid color-mix(in srgb, var(--color-ink) 10%, transparent)',
                    boxShadow: '0 12px 32px -12px rgba(26,20,16,0.22)',
                  }}
                >
                  {infoLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleSmoothScroll(e, link.href)}
                      className="block px-4 py-2 text-[0.95rem] text-ink-soft hover:text-melsdorf-red hover:bg-ink/[0.03] transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className={linkBase}
              >
                {link.label}
              </Link>
            ))}

            {liveAktiv && (
              <Link
                href="/live"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-melsdorf-red/10 text-melsdorf-red text-sm font-semibold hover:bg-melsdorf-red/15 transition-colors"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-melsdorf-red opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-melsdorf-red"></span>
                </span>
                Live
              </Link>
            )}
          </div>

          {/* ── Rechte Seite ────────────────────────────────── */}
          <div className="flex items-center gap-3">

            {/* Spenden CTA */}
            {!isAdmin && (
              <Link
                href="/startseite#spenden"
                onClick={(e) => handleSmoothScroll(e, '/startseite#spenden')}
                className="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-melsdorf-red hover:bg-melsdorf-red-dark text-paper-soft text-sm font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-px"
              >
                Spenden
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}

            {/* Auth */}
            {isLoggedIn ? (
              <div className="hidden sm:block relative admin-menu-container">
                <button
                  onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                  className="text-xs font-medium text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin
                </button>
                {adminMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-xl py-1.5 z-50"
                    style={{
                      background: 'var(--color-paper-soft)',
                      border: '1px solid color-mix(in srgb, var(--color-ink) 10%, transparent)',
                      boxShadow: '0 12px 32px -12px rgba(26,20,16,0.22)',
                    }}
                  >
                    <Link href="/admin/" className="block px-4 py-2 text-sm text-ink-soft hover:bg-ink/[0.03] hover:text-ink">Dashboard</Link>
                    <Link href="/admin/helfer" className="block px-4 py-2 text-sm text-ink-soft hover:bg-ink/[0.03] hover:text-ink">Helferverwaltung</Link>
                    <Link href="/admin/gruppen" className="block px-4 py-2 text-sm text-ink-soft hover:bg-ink/[0.03] hover:text-ink">Kinder & Gruppen</Link>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:flex text-xs font-medium text-ink-muted hover:text-ink transition-colors items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login
              </Link>
            )}

            {isLoggedIn && userEmail && (
              <span className="text-xs font-medium text-ink-muted hidden lg:inline">
                {userEmail.length > 18 ? userEmail.substring(0, 15) + '…' : userEmail}
              </span>
            )}
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="hidden sm:flex text-xs font-medium text-ink-muted hover:text-ink transition-colors items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-1.5 rounded-lg text-ink hover:bg-ink/[0.05] transition-colors"
              aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                {open
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menü ─────────────────────────────────────── */}
      {open && (
        <div
          className="md:hidden fixed top-[68px] left-0 right-0 z-50 max-h-[calc(100vh-68px)] overflow-y-auto"
          style={{
            background: 'var(--color-paper-soft)',
            borderTop: '1px solid color-mix(in srgb, var(--color-ink) 8%, transparent)',
            boxShadow: '0 12px 32px -12px rgba(26,20,16,0.18)',
          }}
        >
          <div className="px-6 py-4 space-y-1">
            {liveAktiv && (
              <Link
                href="/live"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 mb-2 py-2.5 px-3 -mx-1 rounded-lg bg-melsdorf-red/10 text-melsdorf-red font-semibold"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-melsdorf-red opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-melsdorf-red"></span>
                </span>
                Live-Stand
              </Link>
            )}
            <MobileDropdown label="Infos">
              {infoLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-2 pl-3 text-[0.95rem] font-medium text-ink-soft hover:text-melsdorf-red"
                  onClick={(e) => { handleSmoothScroll(e, link.href); setOpen(false); }}
                >
                  {link.label}
                </Link>
              ))}
            </MobileDropdown>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2.5 text-[0.95rem] font-semibold text-ink hover:text-melsdorf-red transition-colors"
                onClick={(e) => { handleSmoothScroll(e, link.href); setOpen(false); }}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/startseite#spenden"
              onClick={(e) => { handleSmoothScroll(e, '/startseite#spenden'); setOpen(false); }}
              className="mt-3 inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full bg-melsdorf-red text-paper-soft text-sm font-semibold w-full sm:w-auto"
            >
              Jetzt spenden
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>

            {isLoggedIn && (
              <MobileDropdown label="Admin-Bereich">
                <Link href="/admin" className="block py-2 pl-3 text-[0.95rem] font-medium text-ink-soft hover:text-melsdorf-red" onClick={() => setOpen(false)}>Dashboard</Link>
                <Link href="/admin/helfer" className="block py-2 pl-3 text-[0.95rem] font-medium text-ink-soft hover:text-melsdorf-red" onClick={() => setOpen(false)}>Helferverwaltung</Link>
              </MobileDropdown>
            )}
            {isLoggedIn ? (
              <button onClick={() => { setOpen(false); handleLogout(); }} className="block w-full text-left py-2.5 text-[0.95rem] font-semibold text-ink-muted hover:text-ink">
                Logout
              </button>
            ) : (
              <Link href="/login" className="block py-2.5 text-[0.95rem] font-semibold text-ink-muted hover:text-ink" onClick={() => setOpen(false)}>
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
