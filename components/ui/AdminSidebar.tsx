// Sidebar für Admin-Bereich
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  return (
    <aside className="hidden md:flex flex-col w-56 fixed top-14 left-0 h-[calc(100vh-56px)] bg-white border-r shadow-md z-40">
      <div className="h-14 flex items-center px-6 font-bold text-lg border-b">Admin-Menü</div>
      <nav className="flex-1 flex flex-col gap-1 px-2 py-4">
        {adminLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`py-2 px-4 rounded text-base font-medium hover:bg-gray-100 transition-colors ${link.href === '/admin' ? (pathname === '/admin' ? 'bg-gray-200 font-bold' : '') : pathname.startsWith(link.href) ? 'bg-gray-200 font-bold' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
