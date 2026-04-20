'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login?redirectTo=' + encodeURIComponent(window.location.pathname));
        return;
      }
      
      setIsAuthenticated(true);
      setIsLoading(false);
    };
    
    checkAuth();
  }, [router]);
  
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-screen w-full"
        style={{ backgroundColor: 'var(--color-admin-bg)' }}
      >
        <Loader2
          className="h-10 w-10 animate-spin"
          style={{ color: 'var(--color-admin-ink-muted)' }}
        />
      </div>
    );
  }

  // Nur rendern, wenn authentifiziert
  return isAuthenticated ? (
    <div
      className="full-bleed -mt-6 lg:pl-60 transition-all duration-300 min-h-screen text-admin-ink"
      style={{ backgroundColor: 'var(--color-admin-bg)' }}
    >
      {children}
    </div>
  ) : null;
}


