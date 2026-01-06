'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Service workers are disabled in development mode by next-pwa
    // Only register in production
    if (process.env.NODE_ENV === 'development') {
      console.log('Service Worker registration skipped in development mode');
      return;
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      let updateInterval: NodeJS.Timeout | null = null;
      let registration: ServiceWorkerRegistration | null = null;
      let handleVisibilityChange: (() => void) | null = null;
      let handleUpdateFound: (() => void) | null = null;
      let handleControllerChange: (() => void) | null = null;
      let retryTimeout: NodeJS.Timeout | null = null;
      let retryCount = 0;
      const maxRetries = 3;
      const pageLoadTime = Date.now(); // Track when page loaded to prevent immediate reloads

      const registerServiceWorker = async () => {
        try {
          // First, check if service worker file is accessible
          // Mobile browsers are stricter about 404s
          try {
            const response = await fetch('/sw.js', { method: 'HEAD', cache: 'no-store' });
            if (!response.ok) {
              console.error('Service Worker file not accessible:', response.status, response.statusText);
              return;
            }
          } catch (fetchError) {
            console.error('Failed to fetch service worker file:', fetchError);
            // Retry after a delay for mobile browsers
            if (retryCount < maxRetries) {
              retryCount++;
              retryTimeout = setTimeout(() => {
                registerServiceWorker();
              }, 2000 * retryCount); // Exponential backoff
              return;
            }
            return;
          }

          // Check for existing registrations first (mobile browsers can be picky)
          const existingRegistrations = await navigator.serviceWorker.getRegistrations();
          for (const existingReg of existingRegistrations) {
            if (existingReg.scope === window.location.origin + '/') {
              registration = existingReg;
              console.log('Found existing service worker registration');
              break;
            }
          }

          // Register if not already registered
          if (!registration) {
            // For mobile browsers, don't specify scope explicitly - let it default
            registration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/',
              updateViaCache: 'none', // Always check for updates on mobile
            });
            console.log('Service Worker registered successfully:', registration.scope);
          }
          
          // Check if service worker is already controlling the page
          if (navigator.serviceWorker.controller) {
            console.log('Service Worker is controlling the page');
          } else {
            console.log('Service Worker registered but not yet controlling');
          }
          
          // Set up update checking and event listeners
          if (registration) {
            // Check for updates periodically (mobile browsers need explicit checks)
            updateInterval = setInterval(() => {
              try {
                registration?.update();
              } catch (updateError) {
                console.error('Error checking for service worker updates:', updateError);
              }
            }, 60 * 60 * 1000); // Every hour
            
            // Check on page visibility change (iOS Safari and Android Chrome specific)
            handleVisibilityChange = () => {
              if (!document.hidden && registration) {
                try {
                  registration.update();
                } catch (updateError) {
                  console.error('Error updating service worker on visibility change:', updateError);
                }
              }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);
            
            // Listen for update found
            handleUpdateFound = () => {
              const newWorker = registration?.installing || registration?.waiting;
              if (newWorker) {
                const handleStateChange = () => {
                  console.log('Service worker state changed:', newWorker.state);
                  if (newWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      // New service worker available
                      console.log('New service worker available');
                    } else {
                      // Service worker activated for the first time
                      console.log('Service worker activated for the first time');
                    }
                  } else if (newWorker.state === 'activated') {
                    console.log('Service worker activated');
                    // Don't force reload here - let the controllerchange event handle it
                    // This prevents blank screens during initial load
                  }
                };
                newWorker.addEventListener('statechange', handleStateChange);
                // Also check current state immediately
                handleStateChange();
              }
            };
            registration.addEventListener('updatefound', handleUpdateFound);

            // Listen for controller change (new service worker took control)
            // Only reload if this is a new service worker taking control, not the initial activation
            handleControllerChange = () => {
              // Check if we already have a controller (meaning a new one just took over)
              if (navigator.serviceWorker.controller) {
                // Only reload if we're in production and this isn't the initial load
                // Skip reload in development to avoid blank screens
                // Also skip if page just loaded (within 2 seconds) to prevent reload loops
                const timeSinceLoad = Date.now() - pageLoadTime;
                if (process.env.NODE_ENV === 'production' && timeSinceLoad > 2000) {
                  // Use a small delay to ensure the new service worker is ready
                  setTimeout(() => {
                    console.log('Service worker controller changed, reloading...');
                    window.location.reload();
                  }, 100);
                } else {
                  console.log('Service worker controller changed (skipping reload - too soon after page load or dev mode)');
                }
              }
            };
            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

            // Listen for service worker errors (mobile browsers are stricter)
            navigator.serviceWorker.addEventListener('error', (event) => {
              console.error('Service Worker error:', event);
            });

            // Listen for service worker messages for debugging
            navigator.serviceWorker.addEventListener('message', (event) => {
              console.log('Service Worker message:', event.data);
            });

            // Don't check for updates immediately after registration
            // This can cause errors when the service worker is in a transitional state
            // Updates will happen automatically via the periodic check and visibility change handlers

            // Check service worker state periodically (mobile browsers can be flaky)
            const checkServiceWorkerState = () => {
              if (registration) {
                if (registration.installing) {
                  console.log('Service worker installing');
                } else if (registration.waiting) {
                  console.log('Service worker waiting');
                } else if (registration.active) {
                  console.log('Service worker active');
                  if (!navigator.serviceWorker.controller) {
                    console.warn('Service worker is active but not controlling the page');
                  }
                }
              }
            };
            
            // Check state after a delay to allow service worker to initialize
            setTimeout(checkServiceWorkerState, 2000);
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error);
          // Log more details for debugging on mobile
          if (error instanceof Error) {
            console.error('Error details:', {
              message: error.message,
              name: error.name,
              stack: error.stack,
            });
          }
          
          // Retry registration for mobile browsers (they can be flaky)
          if (retryCount < maxRetries) {
            retryCount++;
            retryTimeout = setTimeout(() => {
              registerServiceWorker();
            }, 2000 * retryCount); // Exponential backoff
          }
        }
      };

      // Mobile browsers may need to wait for page to be fully loaded
      // Use requestIdleCallback if available, otherwise use a small delay
      const scheduleRegistration = () => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(registerServiceWorker, { timeout: 2000 });
        } else {
          // Fallback: small delay to ensure page is ready
          setTimeout(registerServiceWorker, 100);
        }
      };

      if (document.readyState === 'complete') {
        // Page fully loaded
        scheduleRegistration();
      } else if (document.readyState === 'interactive') {
        // DOM ready, but resources may still be loading
        scheduleRegistration();
      } else {
        // Wait for page load
        window.addEventListener('load', scheduleRegistration, { once: true });
      }

      // Cleanup function
      return () => {
        if (updateInterval) {
          clearInterval(updateInterval);
        }
        if (retryTimeout) {
          clearTimeout(retryTimeout);
        }
        if (handleVisibilityChange) {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
        if (registration && handleUpdateFound) {
          registration.removeEventListener('updatefound', handleUpdateFound);
        }
        if (handleControllerChange) {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        }
      };
    } else {
      console.log('Service Worker not supported in this browser');
    }
  }, []);

  return null;
}

