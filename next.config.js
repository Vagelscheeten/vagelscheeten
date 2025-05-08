// Next.js Konfiguration: Turbopack deaktivieren, Webpack nutzen
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'tszftlhczgynzqelbcpu.supabase.co', // Supabase Storage Domain
      'via.placeholder.com' // Placeholder-Bilder für die Entwicklung
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tszftlhczgynzqelbcpu.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
