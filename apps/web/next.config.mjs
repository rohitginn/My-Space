import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set tracing root to workspace root to prevent recursive crawler leaks
  outputFileTracingRoot: path.join(__dirname, '../../'),

  // Automatically tree-shake heavy barrel exports in dev mode (saves ~70% RAM)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
    ],
  },

  // Automatically drop inactive compiled pages from dev server memory after 15s
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
    pagesBufferLength: 2,
  },

  // Prevent Webpack watcher from recursively scanning pnpm store and node_modules
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: [
          '**/.git/**',
          '**/.pnpm-store/**',
          '**/node_modules/.cache/**',
          '**/.next/**',
        ],
      };
    }
    return config;
  },

  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;

