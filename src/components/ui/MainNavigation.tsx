'use client';
import React from "react";
import Link from "next/link";

const navLinks = [
  { href: "/startseite", label: "🏠 Startseite" },
  { href: "/spiele", label: "🎯 Spiele & Ablauf" },
  { href: "/sponsoren", label: "🤝 Sponsoren & Mitmachen" },
  { href: "/faq", label: "❓ FAQ & Elterninfos" },
  { href: "/galerie", label: "📸 Galerie" },
  { href: "/historie", label: "🏆 Historie" },
  { href: "/kontakt", label: "📬 Kontakt & Anfahrt" },
  { href: "/downloads", label: "⬇️ Downloads" },
  { href: "/leiter/erfassen", label: "Leiter: Erfassen" },
];

import AuthButton from './SupabaseAuthButton';

import { useEffect, useState } from "react";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/user", label: "Userverwaltung" },
  { href: "/admin/kinder", label: "Kinder & Gruppen" },
  { href: "/admin/spiele", label: "Spiele" },
  { href: "/admin/helfer", label: "Helfer" },
  { href: "/admin/sponsoren", label: "Sponsoren" },
  { href: "/admin/auswertung", label: "Auswertung" },
  { href: "/admin/reporting", label: "Reporting" },
];

export default function MainNavigation() {
  const [open, setOpen] = React.useState(false);

  // Admin-Status aus Supabase holen (Client-only, daher useEffect)
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const supabase = (await import('@/lib/supabase/client')).createClient();
        const { data } = await supabase.auth.getUser();
        setIsAdmin(!!data.user);
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  return (
    <>
      {/* Topbar Navigation */}
      <nav className="sticky top-0 z-30 w-full bg-white shadow flex items-center justify-between px-4 py-2 min-h-[56px]">
        <div className="flex items-center gap-4">
          {/* Mobile: Hamburger */}
          <button
            className="md:hidden text-2xl mr-2"
            aria-label="Menü öffnen"
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
          <span className="font-bold text-lg">Vogelschießen</span>
        </div>
        {/* Desktop: Horizontal Links */}
        <div className="hidden md:flex gap-2 items-center">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-2 px-3 rounded hover:bg-gray-100 text-base font-medium"
            >
              {link.label}
            </Link>
          ))}
          {/* Admin-Button nur für eingeloggte Admins */}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="ml-2 py-2 px-4 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors text-base font-medium"
            >
              Admin
            </Link>
          )}
        </div>
        {/* Login/Logout Button */}
        <div className="flex items-center gap-2">
          <AuthButton />
        </div>
      </nav>
      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
          <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg p-6 flex flex-col gap-4 z-50">
            <span className="font-bold text-xl mb-4">Navigation</span>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-2 px-2 rounded hover:bg-gray-100 text-lg"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </aside>
        </div>
      )}
    </>
  );
}
