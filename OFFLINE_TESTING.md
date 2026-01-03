# Testing Offline PWA Functionality

## Important: Service Worker Cache Reset Required

After rebuilding, you MUST:
1. **Unregister the old service worker** in DevTools → Application → Service Workers → Unregister
2. **Clear all caches** in DevTools → Application → Cache Storage → Delete all
3. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)
4. **Visit pages while online** to populate the cache:
   - Visit `/` (home page)
   - Visit `/games/number-puzzle`
5. **Then test offline** by enabling "Offline" in DevTools → Network tab

## Current Configuration

- All pages use `CacheFirst` strategy (serves from cache immediately)
- Pages are precached: `/` and `/games/number-puzzle`
- Static assets use `CacheFirst` (1 year cache)
- Next.js chunks use `CacheFirst` (1 year cache)

## If Still Not Working

1. Check service worker is active: DevTools → Application → Service Workers
2. Check cache storage: DevTools → Application → Cache Storage → Look for "pages" cache
3. Check network tab: Requests should show "(from ServiceWorker)" when offline
4. Verify service worker file: Check `public/sw.js` contains `CacheFirst` for pages

