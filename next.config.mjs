/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Allow requests from the browser preview origin during development
      allowedDevOrigins: ['127.0.0.1:59672'],
    },
  },
};

export default nextConfig;
