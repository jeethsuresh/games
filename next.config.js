const withPWA = require('next-pwa')({
  dest: 'public',
  register: false, // Disable automatic registration - we handle it manually for iOS Safari compatibility
  skipWaiting: true,
  // Note: next-pwa disables caching in development mode by default
  // To test offline capabilities, use production mode: npm run build && npm start
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Static assets - use NetworkFirst so we can inject online/offline logic
    {
      urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    // Manifest and service worker files
    {
      urlPattern: /^https?:\/\/.*\/(manifest\.json|sw\.js|workbox-.*\.js)$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pwa-files',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
      },
    },
    // Next.js static chunks and CSS
    {
      urlPattern: /^https?:\/\/.*\/_next\/static\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    // Next.js data routes
    {
      urlPattern: /^https?:\/\/.*\/_next\/data\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 1 day
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // HTML pages - use NetworkFirst so we can inject online/offline logic
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
      handler: 'NetworkFirst',
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

