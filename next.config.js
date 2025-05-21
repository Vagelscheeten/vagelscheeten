// Next.js Konfiguration: Turbopack deaktivieren, Webpack nutzen
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript type checking during build for faster builds
  typescript: {
    // Disable type checking during build (only for production builds)
    ignoreBuildErrors: true,
  },
  
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
