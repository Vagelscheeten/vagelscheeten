import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Poppins } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "sonner"; // Import Toaster from sonner package
import MainNavigation from "@/components/ui/MainNavigation";
import AdminSidebarWrapper from "@/components/ui/AdminSidebarWrapper";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vogelschießen 2025 - Regenbogenschule",
  description: "Das Vogelschießen der Regenbogenschule - Ein Fest für Kinder, Eltern und Besucher",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // SSR/CSR: Fallback für Pathname
  let pathname = '';
  if (typeof window !== 'undefined') {
    pathname = window.location.pathname;
  }
  // Fallback für SSR (Next.js 13+ kann usePathname nur clientseitig)
  const isAdmin = typeof window !== 'undefined' ? pathname.startsWith('/admin') : false;

  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${inter.variable} antialiased bg-background flex flex-col min-h-screen font-poppins`}
        suppressHydrationWarning
      >
        <MainNavigation />
        <AdminSidebarWrapper />
        <div className="flex flex-col flex-grow transition-all duration-300">
          <main className="container-main py-6 flex-grow">
            {children}
          </main>
          
          <footer className="bg-neutral text-white py-8 mt-auto">
            <div className="container-main">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-xl font-bold mb-4">Vogelschießen 2025</h3>
                  <p className="text-gray-300">Ein Fest der Regenbogenschule für Kinder, Eltern und Besucher.</p>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-4">Kontakt</h3>
                  <p className="text-gray-300">Regenbogenschule<br />Musterstraße 123<br />12345 Musterstadt</p>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-4">Links</h3>
                  <ul className="space-y-2">
                    <li><Link href="/kontakt" className="text-gray-300 hover:text-white">Kontakt & Anfahrt</Link></li>
                    <li><Link href="/downloads" className="text-gray-300 hover:text-white">Downloads</Link></li>
                    <li><Link href="/faq" className="text-gray-300 hover:text-white">FAQ & Elterninfos</Link></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
                &copy; {new Date().getFullYear()} Regenbogenschule. Alle Rechte vorbehalten.
              </div>
            </div>
          </footer>
        </div>
        <Toaster richColors />
        <ScrollToTopButton />
      </body>
    </html>
  );
}
