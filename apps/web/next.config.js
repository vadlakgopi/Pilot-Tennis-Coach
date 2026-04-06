/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  },
  // Ensure chunks load from same origin - avoid port mismatch after navigation
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig








