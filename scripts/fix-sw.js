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

// CRITICAL: Replace ALL NetworkFirst handlers with CacheFirst
// This ensures NO network requests are made - everything comes from cache
// Network requests should only happen in background for updates, not during fetch events
swContent = swContent.replace(
  /new e\.NetworkFirst\(\{cacheName:"next-data"/g,
  'new e.CacheFirst({cacheName:"next-data"'
);

// Replace any other NetworkFirst handlers
swContent = swContent.replace(
  /new e\.NetworkFirst\(/g,
  'new e.CacheFirst('
);

// CRITICAL: Modify ALL CacheFirst strategies to prevent network requests
// We override fetchOptions to prevent network, and add error handling
// This ensures NO network requests during fetch events - everything from cache only
swContent = swContent.replace(
  /new e\.CacheFirst\(\{cacheName:"([^"]+)"/g,
  (match, cacheName) => {
    // Check if plugins array already exists  
    const hasPlugins = match.includes('plugins:');
    // Plugin that prevents network requests entirely
    // Using 'only-if-cached' makes fetch fail if not in cache, preventing network
    // fetchDidFail provides fallback to check cache one more time before giving up
    const pluginCode = `{fetchOptions:{cache:"only-if-cached"},fetchDidFail:async({originalRequest})=>{try{const cache=await caches.open("${cacheName}");const response=await cache.match(originalRequest);if(response)return response}catch(e){}return new Response("",{status:503,statusText:"Service Unavailable - Resource not cached"})}}`;
    
    if (hasPlugins) {
      // Add our plugin to existing plugins array
      return match.replace(
        /plugins:\[/,
        `plugins:[${pluginCode},`
      );
    } else {
      // Add plugins array with our plugin
      return match + `,plugins:[${pluginCode}]`;
    }
  }
);

// Remove non-existent app-build-manifest.json from precache (App Router doesn't generate this)
// This file causes 404 errors during precaching
swContent = swContent.replace(
  /\{url:"\/_next\/app-build-manifest\.json"[^}]*\},?/g,
  ''
);

// Remove _buildManifest.js from precache (App Router doesn't generate this consistently)
// This file causes 404 errors during precaching
swContent = swContent.replace(
  /\{url:"\/_next\/static\/[^"]+\/_buildManifest\.js"[^}]*\},?/g,
  ''
);

// Remove _ssgManifest.js from precache if it doesn't exist (App Router doesn't always generate this)
swContent = swContent.replace(
  /\{url:"\/_next\/static\/[^"]+\/_ssgManifest\.js"[^}]*\},?/g,
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
console.log('✓ Fixed service worker: All routes use CacheFirst with network requests disabled');
console.log('✓ Network requests are prevented - everything served from cache only');

