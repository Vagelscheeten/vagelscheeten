// Sidebar für Admin-Bereich
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Menu, X, LayoutDashboard, Clock, HelpCircle, Crown, Settings,
  CalendarDays, GraduationCap, Gamepad2, UserCheck,
  Image as ImageIcon, Download, BarChart3, FileText, Wrench, ArrowLeft,
  ChevronDown, UserCog, Inbox,
} from 'lucide-react';

const adminGroups = [
  {
    title: 'Webseite',
    items: [
      { href: '/admin/ablauf', label: 'Ablaufplan', icon: Clock },
      { href: '/admin/faq', label: 'FAQ', icon: HelpCircle },
      { href: '/admin/historie', label: 'Historie', icon: Crown },
      { href: '/admin/galerie', label: 'Galerie', icon: ImageIcon },
      { href: '/admin/downloads', label: 'Downloads', icon: Download },
      { href: '/admin/einstellungen', label: 'Seiteneinstellungen', icon: Settings },
    ],
  },
  {
    title: 'Organisation',
    items: [
      { href: '/admin/events', label: 'Events', icon: CalendarDays },
      { href: '/admin/spiele', label: 'Spiele', icon: Gamepad2 },
      { href: '/admin/klassen', label: 'Klassen', icon: GraduationCap },
      { href: '/admin/gruppen', label: 'Kinder & Gruppen', icon: GraduationCap },
      { href: '/admin/helfer', label: 'Helfer', icon: UserCheck },
      { href: '/admin/postfach', label: 'Postfach', icon: Inbox },
    ],
  },
  {
    title: 'Auswertung',
    items: [
      { href: '/admin/auswertung', label: 'Auswertung', icon: BarChart3 },
      { href: '/admin/reporting', label: 'Reporting', icon: FileText },
      { href: '/admin/settings', label: 'Einstellungen', icon: Wrench },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(adminGroups.map(g => g.title))
  );

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (window.innerWidth < 1024 && sidebarOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('aside') && !target.closest('button.sidebar-toggle')) {
          setSidebarOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth < 1024) setSidebarOpen(false); };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleMobileClose = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="sidebar-toggle fixed top-4 left-4 z-50 bg-admin-surface text-admin-ink p-2 rounded-md shadow-sm border border-admin-border lg:hidden hover:bg-admin-surface-hover transition-colors"
        aria-label={sidebarOpen ? 'Menü schließen' : 'Menü öffnen'}
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 backdrop-blur-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-admin-ink) 30%, transparent)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-40
          w-60 flex flex-col
          bg-admin-surface border-r border-admin-border
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Brand header */}
        <div className="h-14 flex items-center px-5 shrink-0 border-b border-admin-border">
          <span
            className="font-semibold text-[0.95rem] text-admin-ink tracking-[-0.01em]"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Vagel<span className="text-admin-accent">scheeten</span>
          </span>
          <span
            className="ml-auto text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-admin-ink-muted"
            style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
          >
            Admin
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5">

          {/* Dashboard */}
          <Link
            href="/admin"
            onClick={handleMobileClose}
            className="relative group block"
          >
            {(() => {
              const active = isActive('/admin');
              return (
                <div
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[0.88rem] font-medium transition-all mb-1 ${
                    active
                      ? 'text-admin-accent bg-admin-accent-bg'
                      : 'text-admin-ink-soft hover:text-admin-ink hover:bg-admin-surface-hover'
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                      style={{ backgroundColor: 'var(--color-admin-accent)' }}
                    />
                  )}
                  <LayoutDashboard size={16} />
                  <span>Übersicht</span>
                </div>
              );
            })()}
          </Link>

          {adminGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.title);
            return (
              <div key={group.title} className="mt-5">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-2.5 mb-1 group"
                >
                  <span
                    className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-admin-ink-muted group-hover:text-admin-ink-soft transition-colors"
                  >
                    {group.title}
                  </span>
                  <ChevronDown
                    size={11}
                    className={`text-admin-ink-muted/60 group-hover:text-admin-ink-muted transition-all duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>

                <div
                  className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
                    isExpanded ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleMobileClose}
                        className="relative block"
                      >
                        <div
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[0.88rem] font-medium transition-all ${
                            active
                              ? 'text-admin-accent bg-admin-accent-bg'
                              : 'text-admin-ink-soft hover:text-admin-ink hover:bg-admin-surface-hover'
                          }`}
                        >
                          {active && (
                            <span
                              aria-hidden
                              className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                              style={{ backgroundColor: 'var(--color-admin-accent)' }}
                            />
                          )}
                          <Icon size={14} className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-3 pt-2.5 pb-3 border-t border-admin-border space-y-0.5">
          <Link
            href="/admin/user"
            onClick={handleMobileClose}
            className={`flex items-center gap-2 text-[0.78rem] rounded-md px-2 py-1.5 transition-colors ${
              isActive('/admin/user')
                ? 'text-admin-accent bg-admin-accent-bg font-medium'
                : 'text-admin-ink-muted hover:text-admin-ink hover:bg-admin-surface-hover'
            }`}
          >
            <UserCog size={12} />
            Userverwaltung
          </Link>

          <div className="border-t border-admin-border my-1" />

          <Link
            href="/startseite"
            className="flex items-center gap-2 text-[0.78rem] text-admin-ink-muted hover:text-admin-ink transition-colors px-2 py-1"
          >
            <ArrowLeft size={12} />
            Zur Webseite
          </Link>
        </div>
      </aside>
    </>
  );
}
