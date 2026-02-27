'use client';
import React, { useState, useEffect, ReactNode } from 'react';

// Mobile Dropdown für Touchgeräte
function MobileDropdown({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        className="w-full text-left py-2 text-base font-semibold text-gray-700 hover:text-red-500 transition-colors duration-200 flex items-center justify-between"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {label}
        <svg
          className={`w-4 h-4 ml-2 inline transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <div className="pl-2 border-l border-gray-200">{children}</div>
      )}
    </div>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// Menüpunkte für die Navigation
const infoLinks = [
  { href: "/startseite#spiele", label: "Spiele" },
  { href: "/startseite#ablauf", label: "Ablauf" },
  { href: "/startseite#route", label: "Route" },
];
const navLinks = [
  { href: "/startseite#galerie", label: "Galerie" },
  { href: "/faq", label: "FAQ" },
  { href: "/startseite#kontakt", label: "Kontakt" },
];

export default function MainNavigation() {
  const pathname = usePathname();
  if (pathname.startsWith('/leiter') || pathname.startsWith('/admin') || pathname.startsWith('/anmeldung')) {
    return null;
  }
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Lokaler State für Auth-Status
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  useEffect(() => {
    (async () => {
      try {
        const supabase = (await import('@/lib/supabase/client')).createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setIsLoggedIn(true);
          setUserEmail(user.email);
          setIsAdmin(user.user_metadata?.rolle === 'admin');
        } else {
          setIsAdmin(false);
          setIsLoggedIn(false);
        }
      } catch {
        setIsAdmin(false);
        setIsLoggedIn(false);
      }
    })();
  }, []);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname === '/startseite' && href.includes('#')) {
      e.preventDefault();
      const targetId = href.substring(href.indexOf('#') + 1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 100,
          behavior: 'smooth'
        });
        window.history.pushState(null, '', href);
      }
    }
  };
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (adminMenuOpen && !target.closest('.admin-menu-container')) {
        setAdminMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [adminMenuOpen]);

  const handleLogout = async () => {
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <nav className={`w-full z-40 sticky top-0 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-100' : ''}`}>
        <div className={`max-w-7xl mx-auto transition-all duration-300 ${scrolled ? 'px-5' : 'px-3 pt-3'}`}>
          <div className={`flex items-center justify-between w-full px-5 py-3 transition-all duration-300 ${scrolled ? '' : 'bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60'}`}>
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/startseite" className="flex items-center gap-3">
                <Image 
                  src="/2025_Logo_transparent.png" 
                  alt="Melsdörper Vagelscheeten" 
                  width={64} 
                  height={64} 
                  className="h-16 w-16 hover:opacity-80 transition-opacity"
                />
                <span className="font-semibold text-xl sm:text-2xl md:text-3xl text-slate-800">Vagelscheeten</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center justify-center space-x-8 text-base font-semibold">
              <div className="relative group">
                <button className="px-3 py-2 text-base font-semibold text-slate-600 hover:text-melsdorf-orange focus:outline-none transition-colors duration-200">
                  Infos
                </button>
                <div className="absolute left-0 top-full w-full h-2 z-40"></div>
                <div className="absolute left-0 top-full pt-1 w-40 z-50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity duration-200">
                  <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg py-1 border border-white/60">
                    {infoLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={(e) => handleSmoothScroll(e, link.href)}
                        className="block px-4 py-2 text-base text-slate-600 hover:bg-melsdorf-beige/50 hover:text-melsdorf-orange transition-colors duration-200 rounded-lg mx-1"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              
              {navLinks.map((link) => {
                const isActive = pathname === link.href ||
                  (pathname === '/startseite' && link.href.includes('#') && pathname + link.href.substring(link.href.indexOf('#')) === link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                    className={`px-3 py-2 text-base font-semibold transition-colors duration-200 text-slate-600 hover:text-melsdorf-orange ${isActive ? 'text-slate-900 font-bold' : ''}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Rechte Seite */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {!isAdmin && (
                <Link 
                  href="/startseite#spenden" 
                  onClick={(e) => handleSmoothScroll(e, '/startseite#spenden')}
                  className="hidden sm:inline-flex items-center bg-accent hover:bg-melsdorf-orange px-4 py-2 rounded-full text-xs font-bold text-slate-900 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Jetzt spenden
                </Link>
              )}
              
              {isLoggedIn ? (
                <div className="hidden sm:block relative admin-menu-container">
                  <button onClick={() => setAdminMenuOpen(!adminMenuOpen)} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Admin
                  </button>
                  {adminMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <Link href="/admin/" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Dashboard</Link>
                      <Link href="/admin/helfer" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Helferverwaltung</Link>
                      <Link href="/admin/gruppen" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Kinder und Gruppen</Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden sm:block">
                  <Link href="/login" className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                    Login
                  </Link>
                </div>
              )}
              
              <div className="flex items-center gap-2 sm:gap-4">
                {isLoggedIn && userEmail && <span className="text-xs font-medium text-gray-500 hidden md:inline">{userEmail.length > 15 ? userEmail.substring(0, 12) + '...' : userEmail}</span>}
                {isLoggedIn && (
                  <button onClick={handleLogout} className="hidden sm:flex text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200 items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span>Logout</span>
                  </button>
                )}
              </div>

              {/* Mobile Hamburger */}
              <div className="md:hidden flex items-center">
                <button onClick={() => setOpen(!open)} className="text-gray-700 hover:text-gray-900 focus:outline-none p-1">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {open ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {open && (
          <div className="bg-white shadow-lg py-2 fixed top-[56px] left-0 right-0 z-50 max-h-[calc(100vh-56px)] overflow-y-auto">
            <div className="px-4 space-y-1">
              <MobileDropdown label="Infos">
                {infoLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="block py-2 pl-4 text-base font-medium text-gray-700 hover:text-melsdorf-orange" onClick={(e) => { handleSmoothScroll(e, link.href); setOpen(false); }}>{link.label}</Link>
                ))}
              </MobileDropdown>
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (pathname === '/startseite' && link.href.includes('#') && pathname + link.href.substring(link.href.indexOf('#')) === link.href);
                return (
                  <Link key={link.href} href={link.href} className={`block py-2 text-base font-medium transition-colors duration-200 ${isActive ? 'text-melsdorf-orange border-l-2 border-melsdorf-orange pl-3' : 'text-gray-700 hover:text-melsdorf-orange pl-1'}`} onClick={(e) => { handleSmoothScroll(e, link.href); setOpen(false); }}>{link.label}</Link>
                );
              })}
              {isLoggedIn && (
                <MobileDropdown label="Admin-Bereich">
                  <Link href="/admin" className="block py-2 pl-4 text-base font-medium text-gray-700 hover:text-melsdorf-orange" onClick={() => setOpen(false)}>Dashboard</Link>
                  <Link href="/admin/helfer" className="block py-2 pl-4 text-base font-medium text-gray-700 hover:text-melsdorf-orange" onClick={() => setOpen(false)}>Helferverwaltung</Link>
                </MobileDropdown>
              )}
              {isLoggedIn ? (
                <button onClick={() => { setOpen(false); handleLogout(); }} className="block w-full text-left py-2 text-base font-medium text-gray-700 hover:text-melsdorf-orange pl-1">Logout</button>
              ) : (
                <Link href="/login" className="block py-2 text-base font-medium text-gray-700 hover:text-melsdorf-orange pl-1" onClick={() => setOpen(false)}>Login</Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
