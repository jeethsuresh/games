const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Note: next-pwa disables caching in development mode by default
  // To test offline capabilities, use production mode: npm run build && npm start
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Cache static assets (icons, images, fonts) with CacheFirst - most specific first
    {
      urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    // Cache manifest and service worker
    {
      urlPattern: /^https?:\/\/.*\/(manifest\.json|sw\.js|workbox-.*\.js)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'pwa-files',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
      },
    },
    // Cache Next.js static chunks and CSS
    {
      urlPattern: /^https?:\/\/.*\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    // Cache Next.js data routes with NetworkFirst
    {
      urlPattern: /^https?:\/\/.*\/_next\/data\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 1 day
        },
        networkTimeoutSeconds: 3,
      },
    },
    // Cache root "/" route explicitly - must come before general pages route
    // This overrides next-pwa's automatic NetworkFirst route for "/"
    {
      urlPattern: /^https?:\/\/[^/]+\/?$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24, // 1 day
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Cache HTML pages - CRITICAL for offline support
    // Use CacheFirst: serves from cache IMMEDIATELY, only fetches if not cached
    // This ensures pages work offline - they must be visited once while online first
    {
      urlPattern: ({ url, request }) => {
        // Exclude _next routes, API routes, and files with extensions
        if (url.pathname.startsWith('/_next/') || 
            url.pathname.startsWith('/api/') ||
            url.pathname.match(/\.(js|css|json|png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot|map)$/)) {
          return false;
        }
        // Only cache navigation requests or HTML responses
        return request.mode === 'navigate' || 
               request.headers.get('accept')?.includes('text/html') ||
               (!url.pathname.includes('.'));
      },
      handler: 'CacheFirst',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24, // 1 day
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)

