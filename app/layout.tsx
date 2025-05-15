import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Poppins } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { Toaster } from "sonner"; // Import Toaster from sonner package
import MainNavigation from "@/components/ui/MainNavigation";
import AdminSidebarWrapper from "@/components/ui/AdminSidebarWrapper";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import { Footer } from "@/components/layout/Footer";
// import { AuthProvider } from "@/context/AuthContext"; // Temporarily disabled

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
          <Footer />
        </div>
        <Toaster richColors />
        <ScrollToTopButton />
      </body>
    </html>
  );
}
