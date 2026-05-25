'use client';
import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/leiter') ||
    pathname.startsWith('/anmeldung') ||
    pathname.startsWith('/spielbetreuer') ||
    pathname.startsWith('/live')
  )
    return null;
  return <Footer />;
}
