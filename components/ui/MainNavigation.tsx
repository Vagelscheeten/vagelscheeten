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
  { href: "/startseite#kontakt", label: "Kontakt" },
];

// import { useAuth } from '@/context/AuthContext'; - temporarily commented out

export default function MainNavigation() {
  const pathname = usePathname();
  if (pathname.startsWith('/leiter')) {
    return null;
  }
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Lokaler State für Auth-Status (vorübergehend, bis AuthContext-Problem behoben)
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Beim ersten Laden und nach Auth-Änderungen prüfen, ob Admin
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

  // Funktion für sanftes Scrollen zu Ankern
  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Nur auf der Startseite und bei Hash-Links anwenden
    if (pathname === '/startseite' && href.includes('#')) {
      e.preventDefault();
      const targetId = href.substring(href.indexOf('#') + 1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 100, // Offset für Navbar
          behavior: 'smooth'
        });
        // URL aktualisieren, ohne Seitenneuladen
        window.history.pushState(null, '', href);
      }
    }
  };
  

  
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
      <nav className={`w-full z-40 transition-all duration-300 ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4 flex items-center justify-between w-full bg-white shadow-sm">
          {/* Logo und Text links */}
          <div className="flex items-center">
            <Link href="/startseite" className="flex items-center gap-2">
              <Image 
                src="/2025_Logo_transparent.png" 
                alt="Melsdörper Vagelscheeten" 
                width={32} 
                height={32} 
                className="h-8 w-8 hover:opacity-80 transition-opacity"
              />
              <span className="font-semibold text-lg">Vagelscheeten</span>
            </Link>
          </div>
          
          {/* Desktop: Horizontal Links (zentriert) */}
          <div className="hidden md:flex items-center justify-center space-x-10 text-base font-semibold">
  {/* Infos Dropdown */}
  <div className="relative group">
    <button className="px-3 py-2 hover:text-red-500 focus:outline-none transition-colors duration-200">
      Infos
    </button>
    <div className="absolute left-0 mt-2 w-40 bg-white rounded-md shadow-lg py-2 z-50 border border-gray-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity">
      {infoLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={(e) => handleSmoothScroll(e, link.href)}
          className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-100 hover:text-red-500 transition-colors duration-200"
        >
          {link.label}
        </Link>
      ))}
    </div>
  </div>
  {/* Galerie und Kontakt */}
  {navLinks.map((link) => {
    const isActive = pathname === link.href ||
      (pathname === '/startseite' && link.href.includes('#') && pathname + link.href.substring(link.href.indexOf('#')) === link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={(e) => handleSmoothScroll(e, link.href)}
        className={`px-3 py-2 text-base font-semibold transition-colors duration-200 text-gray-600 hover:text-gray-900 ${isActive ? 'text-gray-900 font-bold' : ''}`}
      >
        {link.label}
      </Link>
    );
  })}
</div>

          {/* Rechte Seite: Spenden-Button, Admin-Bereich und Logout */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Spenden-Button nur für nicht-Admins */}
            {!isAdmin && (
              <Link 
                href="/startseite#spenden" 
                onClick={(e) => handleSmoothScroll(e, '/startseite#spenden')}
                className="hidden sm:inline bg-yellow-400 hover:bg-yellow-500 px-1.5 py-0.5 rounded-sm text-[10px] font-medium transition-colors duration-200 shadow-sm w-auto max-w-[90px] text-center sm:px-3 sm:py-1.5 sm:rounded-lg sm:text-xs sm:max-w-[110px]"
              >
                Jetzt spenden
              </Link>
            )}
            
            {/* Admin Link oder Login Button - nur auf größeren Bildschirmen */}
            {isLoggedIn ? (
              <div className="hidden sm:block relative admin-menu-container">
                <button 
                  onClick={() => setAdminMenuOpen(!adminMenuOpen)} 
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin
                </button>
                
                {adminMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <Link href="/admin/" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Dashboard
                    </Link>
                    <Link href="/admin/helfer" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Helferverwaltung
                    </Link>
                    <Link href="/admin/gruppen" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Kinder und Gruppen
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:block">
                <Link href="/login" className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login
                </Link>
              </div>
            )}
            
            {/* User Email & Logout - Email nur auf größeren Bildschirmen */}
            <div className="flex items-center gap-2 sm:gap-4">
              {isLoggedIn && userEmail && (
                <span className="text-xs font-medium text-gray-500 hidden md:inline">
                  {userEmail.length > 15 ? userEmail.substring(0, 12) + '...' : userEmail}
                </span>
              )}
              {isLoggedIn && (
                <button 
                  onClick={handleLogout} 
                  className="hidden sm:flex text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200 items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              )}
              {/* Login Button wurde in die Admin/Login-Sektion verschoben */}
            </div>

            {/* Mobile: Hamburger Menü - nur auf kleinen Bildschirmen */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setOpen(!open)} 
                className="text-gray-700 hover:text-gray-900 focus:outline-none transition-colors duration-200 p-1"
                aria-label="Menü öffnen"
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
  <div className="bg-white shadow-lg py-2 animate-fadeIn fixed top-[56px] left-0 right-0 z-50 max-h-[calc(100vh-56px)] overflow-y-auto">
    <div className="px-4 space-y-1">
      {/* Infos Dropdown (mobile, aufklappbar) */}
      <MobileDropdown label="Infos">
        {infoLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block py-2 pl-4 text-base font-medium text-gray-700 hover:text-red-500 transition-colors duration-200"
            onClick={(e) => {
              handleSmoothScroll(e, link.href);
              setOpen(false);
            }}
          >
            {link.label}
          </Link>
        ))}
      </MobileDropdown>
      {/* Galerie und Kontakt */}
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
            onClick={(e) => {
              handleSmoothScroll(e, link.href);
              setOpen(false);
            }}
          >
            {link.label}
          </Link>
        );
      })}
      {isLoggedIn && (
        <MobileDropdown label="Admin-Bereich">
          <Link 
            href="/admin/dashboard" 
            className="block py-2 pl-4 text-base font-medium text-gray-700 hover:text-red-500 transition-colors duration-200"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <Link 
            href="/admin/user" 
            className="block py-2 pl-4 text-base font-medium text-gray-700 hover:text-red-500 transition-colors duration-200"
            onClick={() => setOpen(false)}
          >
            Nutzerverwaltung
          </Link>
          <Link 
            href="/admin/helfer" 
            className="block py-2 pl-4 text-base font-medium text-gray-700 hover:text-red-500 transition-colors duration-200"
            onClick={() => setOpen(false)}
          >
            Helferverwaltung
          </Link>
          <Link 
            href="/admin/teilnahmen" 
            className="block py-2 pl-4 text-base font-medium text-gray-700 hover:text-red-500 transition-colors duration-200"
            onClick={() => setOpen(false)}
          >
            Teilnehmerverwaltung
          </Link>
        </MobileDropdown>
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
