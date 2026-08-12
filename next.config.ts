import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from "next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  serverExternalPackages: ['unpdf', 'pdfjs-dist'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', '@radix-ui/react-icons'],
    serverActions: {
      bodySizeLimit: '25mb',
    },
    staleTimes: {
      dynamic: 0,
    },
  },
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  excludeDefaultMomentLocales: true,
};

export default withMDX(nextConfig);