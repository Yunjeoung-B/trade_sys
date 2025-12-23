/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  // Disable ESLint during builds (optional, remove if you want ESLint checks)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during builds (we'll check separately)
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
