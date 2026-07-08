import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['unpdf', 'pdfjs-dist'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', '@radix-ui/react-icons'],
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    return [
      {
        source: "/docs",
        destination: "/docs/index.html",
      },
      {
        source: "/docs/:path*",
        destination: "/docs/:path*",
      },
    ];
  },
};

export default nextConfig;