import type {NextConfig} from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: /\/api\/.*$/i,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /.*\/suivi\/.*$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "tracking-pages",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 3600, // 1 hour
          }
        }
      },
      {
        urlPattern: /.*\/commander.*$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "order-pages",
          expiration: {
            maxEntries: 1,
            maxAgeSeconds: 3600,
          }
        }
      }
    ]
  }
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default withPWA(nextConfig);
