// Sidebar für Admin-Bereich
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Menu, X, LayoutDashboard, Clock, HelpCircle, Crown, Settings,
  CalendarDays, GraduationCap, Gamepad2, UserCheck,
  Image, Download, BarChart3, FileText, Wrench, ArrowLeft,
  ChevronDown, UserCog,
} from 'lucide-react';

const adminGroups = [
  {
    title: 'Webseite',
    items: [
      { href: '/admin/ablauf', label: 'Ablaufplan', icon: Clock },
      { href: '/admin/faq', label: 'FAQ', icon: HelpCircle },
      { href: '/admin/historie', label: 'Historie', icon: Crown },
      { href: '/admin/galerie', label: 'Galerie', icon: Image },
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
  // Alle Gruppen standardmäßig aufgeklappt
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

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="sidebar-toggle fixed top-4 left-4 z-50 bg-white text-slate-700 p-2 rounded-lg shadow-md border border-slate-200 lg:hidden"
        aria-label={sidebarOpen ? 'Menü schließen' : 'Menü öffnen'}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-40
          w-60 flex flex-col
          bg-white border-r border-slate-100
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Brand header */}
        <div className="h-14 flex items-center px-5 shrink-0 border-b border-slate-100">
          <span
            className="font-bold text-base text-slate-800"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Vagel<span className="text-[#F2A03D]">scheeten</span>
          </span>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Admin
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">

          {/* Dashboard */}
          <Link
            href="/admin"
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mb-1
              ${isActive('/admin')
                ? 'bg-orange-50 text-[#F2A03D] border-l-2 border-[#F2A03D] rounded-l-none pl-[10px]'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }
            `}
            onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
          >
            <LayoutDashboard
              size={17}
              className={isActive('/admin') ? 'text-[#F2A03D]' : 'text-slate-400'}
            />
            <span>Übersicht</span>
          </Link>

          {/* Collapsible groups */}
          {adminGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.title);
            // Gruppe aufklappen wenn ein Item aktiv ist
            const hasActive = group.items.some(i => isActive(i.href));

            return (
              <div key={group.title} className="mt-5">
                {/* Klickbarer Gruppen-Header */}
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-3 mb-1 group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">
                    {group.title}
                  </span>
                  <ChevronDown
                    size={11}
                    className={`text-slate-300 group-hover:text-slate-500 transition-all duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>

                {/* Items — animiertes Ein-/Ausklappen */}
                <div
                  className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                          ${active
                            ? 'bg-orange-50 text-[#F2A03D] border-l-2 border-[#F2A03D] rounded-l-none pl-[10px]'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }
                        `}
                        onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                      >
                        <Icon
                          size={16}
                          className={active ? 'text-[#F2A03D]' : 'text-slate-400'}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-4 pt-3 pb-4 border-t border-slate-100 space-y-1">
          {/* Userverwaltung — systemseitig, getrennt vom Event-Bereich */}
          <Link
            href="/admin/user"
            className={`flex items-center gap-2 text-xs rounded-md px-2 py-1.5 transition-colors ${
              isActive('/admin/user')
                ? 'text-[#F2A03D] bg-orange-50 font-medium'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
          >
            <UserCog size={13} />
            Userverwaltung
          </Link>

          {/* Trennlinie */}
          <div className="border-t border-slate-100 my-1" />

          {/* Zur Webseite */}
          <Link
            href="/startseite"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-700 transition-colors px-2 py-1"
          >
            <ArrowLeft size={13} />
            Zur Webseite
          </Link>
        </div>
      </aside>
    </>
  );
}
