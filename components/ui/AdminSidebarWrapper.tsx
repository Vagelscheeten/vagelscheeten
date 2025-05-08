// Client-Komponente für bedingtes Anzeigen der AdminSidebar
'use client';
import { usePathname } from 'next/navigation';
import AdminSidebar from './AdminSidebar';

export default function AdminSidebarWrapper() {
  const pathname = usePathname();
  if (!pathname.startsWith('/admin')) return null;
  return <AdminSidebar />;
}
