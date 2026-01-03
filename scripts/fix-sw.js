const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'public', 'sw.js');

if (!fs.existsSync(swPath)) {
  console.log('Service worker not found, skipping fix');
  process.exit(0);
}

let swContent = fs.readFileSync(swPath, 'utf8');

// Replace the automatic "/" route NetworkFirst with CacheFirst
// This ensures pages are served from cache IMMEDIATELY when offline
swContent = swContent.replace(
  /e\.registerRoute\("\/",new e\.(NetworkFirst|StaleWhileRevalidate)\(\{cacheName:"start-url"/g,
  'e.registerRoute("/",new e.CacheFirst({cacheName:"start-url"'
);

// Also change all StaleWhileRevalidate for pages to CacheFirst for offline-first behavior
swContent = swContent.replace(
  /new e\.StaleWhileRevalidate\(\{cacheName:"pages"/g,
  'new e.CacheFirst({cacheName:"pages"'
);

// Remove non-existent app-build-manifest.json from precache (App Router doesn't generate this)
// This file causes 404 errors during precaching
swContent = swContent.replace(
  /\{url:"\/_next\/app-build-manifest\.json"[^}]*\},?/g,
  ''
);

// Remove "/" from precache - it's a redirect (307) which Workbox can't precache
// The redirect goes to /games/number-puzzle which is already in precache
swContent = swContent.replace(
  /\{url:"\/",revision:null\},?/g,
  ''
);

// Ensure pages are in precache - they should already be there from next.config.js
// But verify and add if missing
const precacheMatch = swContent.match(/e\.precacheAndRoute\(\[(.*?)\],\{ignoreURLParametersMatching/);
if (precacheMatch) {
  const precacheArray = precacheMatch[1];
  // Add pages if they're not already there
  if (!precacheArray.includes('{url:"/games/number-puzzle"')) {
    swContent = swContent.replace(
      /(e\.precacheAndRoute\(\[)(.*?)(\],\{ignoreURLParametersMatching)/,
      (match, start, array, end) => {
        // Add pages before the closing bracket
        const pagesToAdd = ',{url:"/games/number-puzzle",revision:null}';
        return start + array + pagesToAdd + end;
      }
    );
    console.log('✓ Added pages to precache');
  } else {
    console.log('✓ Pages already in precache');
  }
}

fs.writeFileSync(swPath, swContent, 'utf8');
console.log('✓ Fixed service worker: Changed all page routes to CacheFirst for offline support');

