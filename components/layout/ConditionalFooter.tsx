'use client';
import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin') || pathname.startsWith('/leiter') || pathname.startsWith('/anmeldung')) return null;
  return <Footer />;
}
