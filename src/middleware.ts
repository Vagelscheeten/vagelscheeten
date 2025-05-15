import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Aktualisiere die Auth-Session
  const response = await updateSession(request);

  // Check für Admin-Bereich
  const url = new URL(request.url);
  const isAdminRoute = url.pathname.startsWith('/admin');

  if (isAdminRoute) {
    // Supabase Client erstellen und Benutzer prüfen
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = await import('@supabase/ssr').then(
      ({ createServerClient }) => 
      createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() { /* Nur Lese-Zugriff für die Authentifizierungsprüfung */ },
          remove() { /* Nur Lese-Zugriff für die Authentifizierungsprüfung */ },
        },
      })
    );

    // Benutzer authentifiziert?
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Umleitung zur Login-Seite
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectTo', url.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
