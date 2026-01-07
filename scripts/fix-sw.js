const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'public', 'sw.js');

if (!fs.existsSync(swPath)) {
  console.log('Service worker not found, skipping fix');
  process.exit(0);
}

let swContent = fs.readFileSync(swPath, 'utf8');

// Custom strategy: Online = NetworkOnly (don't cache), Offline = CacheFirst (serve from cache)
// We'll inject plugins into all NetworkFirst handlers to implement this behavior

// Helper function to create online/offline aware plugin
// Strategy: When online, don't cache responses. When offline, serve from cache only.
const createOnlineOfflinePlugin = (cacheName) => {
  // Plugin that:
  // 1. When online: prevents caching (cacheWillUpdate returns null) - this makes it NetworkOnly behavior
  // 2. When offline: NetworkFirst will try network (fails), then automatically check cache
  // 3. fetchDidFail: provides explicit cache fallback when network fails (offline scenario)
  return `{cacheWillUpdate:async({response})=>{try{if(typeof navigator!=="undefined"&&navigator.onLine!==undefined&&navigator.onLine)return null}catch(e){}return response},fetchDidFail:async({originalRequest})=>{try{const cache=await caches.open("${cacheName}");const cachedResponse=await cache.match(originalRequest);if(cachedResponse)return cachedResponse}catch(e){}return new Response("",{status:503,statusText:"Service Unavailable - Resource not cached"})}}`;
};

// Replace the automatic "/" route with online/offline aware strategy
swContent = swContent.replace(
  /e\.registerRoute\("\/",new e\.(NetworkFirst|StaleWhileRevalidate|CacheFirst)\(\{cacheName:"start-url"/g,
  (match) => {
    const pluginCode = createOnlineOfflinePlugin('start-url');
    return match.replace(
      /(cacheName:"start-url")/,
      `$1,plugins:[${pluginCode}]`
    );
  }
);

// Modify all NetworkFirst handlers to be online/offline aware
swContent = swContent.replace(
  /new e\.NetworkFirst\(\{cacheName:"([^"]+)"/g,
  (match, cacheName) => {
    const hasPlugins = match.includes('plugins:');
    const pluginCode = createOnlineOfflinePlugin(cacheName);
    
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

// Also handle StaleWhileRevalidate - convert to NetworkFirst with online/offline logic
swContent = swContent.replace(
  /new e\.StaleWhileRevalidate\(\{cacheName:"([^"]+)"/g,
  (match, cacheName) => {
    const hasPlugins = match.includes('plugins:');
    const pluginCode = createOnlineOfflinePlugin(cacheName);
    // Replace StaleWhileRevalidate with NetworkFirst
    const newMatch = match.replace('StaleWhileRevalidate', 'NetworkFirst');
    
    if (hasPlugins) {
      return newMatch.replace(
        /plugins:\[/,
        `plugins:[${pluginCode},`
      );
    } else {
      return newMatch + `,plugins:[${pluginCode}]`;
    }
  }
);

// Handle any CacheFirst handlers - convert to NetworkFirst with online/offline logic
swContent = swContent.replace(
  /new e\.CacheFirst\(\{cacheName:"([^"]+)"/g,
  (match, cacheName) => {
    const hasPlugins = match.includes('plugins:');
    const pluginCode = createOnlineOfflinePlugin(cacheName);
    // Replace CacheFirst with NetworkFirst
    const newMatch = match.replace('CacheFirst', 'NetworkFirst');
    
    if (hasPlugins) {
      return newMatch.replace(
        /plugins:\[/,
        `plugins:[${pluginCode},`
      );
    } else {
      return newMatch + `,plugins:[${pluginCode}]`;
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
console.log('✓ Fixed service worker: Online = NetworkOnly (no cache), Offline = CacheFirst (cache only)');
console.log('✓ When online: requests go to network and responses are NOT cached');
console.log('✓ When offline: requests are served from cache only');

