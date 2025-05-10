// Sidebar für Admin-Bereich
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const adminLinks = [
  { href: '/admin', label: 'Übersicht' },
  { href: '/admin/user', label: 'Userverwaltung' },
  { href: '/admin/gruppen', label: 'Kinder & Gruppen' },
  { href: '/admin/klassen', label: 'Klassen' },
  { href: '/admin/spiele', label: 'Spiele' },
  { href: '/admin/helfer', label: 'Helfer' },
  { href: '/admin/sponsoren', label: 'Sponsoren' },
  { href: '/admin/auswertung', label: 'Auswertung' },
  { href: '/admin/reporting', label: 'Reporting' },
  { href: '/admin/settings', label: 'Einstellungen' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Close sidebar when navigating
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar when user clicks outside on smaller screens
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (window.innerWidth < 1024 && sidebarOpen) {
        // Prüfen, ob das Klick-Element außerhalb der Sidebar und nicht der Toggle-Button ist
        const target = e.target as HTMLElement;
        if (!target.closest('aside') && !target.closest('button.sidebar-toggle')) {
          setSidebarOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  // Stelle sicher, dass die Sidebar-Toggles richtig funktionieren
  useEffect(() => {
    const handleResize = () => {
      // Bei großen Bildschirmen, setze sidebarOpen auf true, damit die Sidebar auf großen Bildschirmen
      // immer sichtbar ist, aber auf kleinen nur bei Bedarf
      if (window.innerWidth >= 1024) {
        // Nichts tun, CSS übernimmt das
      } else {
        // Auf kleineren Bildschirmen Sidebar schließen
        setSidebarOpen(false);
      }
    };
    
    // Initial ausführen
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <>
      {/* Mobile toggle button */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="sidebar-toggle fixed top-16 left-4 z-50 bg-white p-2 rounded-md shadow-md lg:hidden"
        aria-label={sidebarOpen ? 'Menü schließen' : 'Menü öffnen'}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed top-14 left-0 h-[calc(100vh-56px)] bg-white border-r shadow-md z-40
          transition-transform duration-300 ease-in-out overflow-hidden
          w-56 sm:w-56
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="h-14 flex items-center px-6 font-bold text-lg border-b">Admin-Menü</div>
        <nav className="flex-1 flex flex-col gap-1 px-2 py-4 overflow-y-auto">
          {adminLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`py-2 px-4 rounded text-sm sm:text-base font-medium hover:bg-gray-100 transition-colors whitespace-nowrap ${link.href === '/admin' ? (pathname === '/admin' ? 'bg-gray-200 font-bold' : '') : pathname.startsWith(link.href) ? 'bg-gray-200 font-bold' : ''}`}
              onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
