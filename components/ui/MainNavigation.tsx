'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// Menüpunkte für die Navigation
const navLinks = [
  { href: "/startseite#spiele", label: "Spiele" },
  { href: "/startseite#ablauf", label: "Ablauf" },
  { href: "/startseite#route", label: "Route" },
  { href: "/startseite#spenden", label: "Spenden" },
  { href: "/startseite#galerie", label: "Galerie" },
  { href: "/startseite#kontakt", label: "Kontakt" },
  { href: "/startseite#downloads", label: "Downloads" },
];

export default function MainNavigation() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();
  
  // Funktion für sanftes Scrollen zu Ankern
  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Nur auf der Startseite und bei Hash-Links anwenden
    if (pathname === '/startseite' && href.includes('#')) {
      e.preventDefault();
      
      const targetId = href.split('#')[1];
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        // Sanftes Scrollen zum Zielelement
        targetElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
        
        // URL aktualisieren, ohne die Seite neu zu laden
        window.history.pushState(null, '', href);
        
        // Mobile Menü schließen, falls geöffnet
        if (open) setOpen(false);
      }
    }
  };

  // Admin-Status aus Supabase holen
  useEffect(() => {
    (async () => {
      try {
        const supabase = (await import('@/lib/supabase/client')).createClient();
        const { data } = await supabase.auth.getUser();
        setIsAdmin(!!data.user);
        setIsLoggedIn(!!data.user);
      } catch {
        setIsAdmin(false);
        setIsLoggedIn(false);
      }
    })();
  }, []);
  
  // Scroll-Event-Handler
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
  
  // Event-Handler zum Schließen des Admin-Menüs beim Klicken außerhalb
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

  // Logout-Funktion
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
      {/* Moderne, schlichte Navigation */}
      <nav className={`w-full fixed top-0 left-0 z-40 transition-all duration-300 ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16 w-full bg-white">
          {/* Logo links */}
          <div className="flex items-center">
            <Link href="/startseite" className="flex items-center">
              <Image 
                src="/2025_Logo_transparent.png" 
                alt="Melsdörper Vagelscheeten" 
                width={40} 
                height={40} 
                className="hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>
          
          {/* Desktop: Horizontal Links */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || 
                (pathname === '/startseite' && link.href.includes('#') && pathname + link.href.substring(link.href.indexOf('#')) === link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                  className={`px-2 py-1 text-sm font-medium transition-colors duration-200
                    text-gray-600 hover:text-gray-900
                    ${isActive ? 'text-gray-900' : ''}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Admin-Bereich und Logout */}
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <div className="relative admin-menu-container">
                <button 
                  onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                  className="text-sm font-medium text-gray-600 hover:text-red-500 transition-colors duration-200 flex items-center"
                >
                  Admin-Bereich
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {adminMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg rounded-md py-1 z-50">
                    <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Dashboard
                    </Link>
                    <Link href="/admin/galerie" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Galerie verwalten
                    </Link>
                  </div>
                )}
              </div>
            )}
            {isLoggedIn ? (
              <button 
                onClick={handleLogout} 
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                Logout
              </button>
            ) : (
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
                <span className="text-gray-400 mr-1">→</span> Login
              </Link>
            )}

            {/* Mobile: Hamburger Menü */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setOpen(!open)} 
                className="text-gray-700 hover:text-red-500 focus:outline-none transition-colors duration-200"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {open ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: Dropdown Menü */}
        {open && (
          <div className="md:hidden bg-white shadow-lg py-2 animate-fadeIn">
            <div className="px-6 space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || 
                  (pathname === '/startseite' && link.href.includes('#') && pathname + link.href.substring(link.href.indexOf('#')) === link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block py-2 text-base font-medium transition-colors duration-200 ${isActive 
                      ? 'text-red-500 border-l-2 border-red-500 pl-3' 
                      : 'text-gray-700 hover:text-red-500 pl-1'}`}
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="block py-2 text-base font-medium text-gray-700 hover:text-red-500 transition-colors duration-200 pl-1"
                  onClick={() => setOpen(false)}
                >
                  Admin-Bereich
                </Link>
              )}
              {isLoggedIn ? (
                <button 
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }} 
                  className="block w-full text-left py-2 text-base font-medium text-gray-700 hover:text-red-500 transition-colors duration-200 pl-1"
                >
                  Logout
                </button>
              ) : (
                <Link 
                  href="/login" 
                  className="block py-2 text-base font-medium text-gray-700 hover:text-red-500 transition-colors duration-200 pl-1"
                  onClick={() => setOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

