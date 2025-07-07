// Service Worker for Malan Chatbot
// Caches wordlist data and API responses for offline access

const CACHE_NAME = "malan-chatbot-v1";
const STATIC_CACHE = "malan-static-v1";
const API_CACHE = "malan-api-v1";

// Files to cache for offline access
const STATIC_FILES = [
  "/",
  "/wordlist",
  "/dashboard",
  "/static/js/bundle.js",
  "/static/css/main.css",
];

// API endpoints to cache
const API_ENDPOINTS = [
  "/api/wordlist",
  "/api/dict",
  "/api/stats",
  "/api/history",
];

// Install event - cache static files
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Caching static files");
      return cache.addAll(STATIC_FILES);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== STATIC_CACHE &&
            cacheName !== API_CACHE
          ) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (API_ENDPOINTS.some((endpoint) => url.pathname.startsWith(endpoint))) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static files
  if (request.method === "GET") {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

// Handle API requests with cache-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", error);
  }

  // Fallback to cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log("[SW] Serving from cache:", request.url);
    return cachedResponse;
  }

  // Return offline response for wordlist
  if (request.url.includes("/api/wordlist")) {
    return new Response(
      JSON.stringify({
        items: [],
        pagination: { hasMore: false, nextCursor: null, prevCursor: null },
        message: "Offline mode - no cached data available",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Return offline response for other APIs
  return new Response(
    JSON.stringify({
      error: "Offline mode - no cached data available",
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log("[SW] Static file fetch failed:", error);

    // Return offline page for navigation requests
    if (request.mode === "navigate") {
      return caches.match("/");
    }
  }
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("[SW] Background sync triggered");
    event.waitUntil(performBackgroundSync());
  }
});

async function performBackgroundSync() {
  // Sync any pending wordlist changes when back online
  try {
    const pendingChanges = await getPendingChanges();
    for (const change of pendingChanges) {
      await syncChange(change);
    }
  } catch (error) {
    console.log("[SW] Background sync failed:", error);
  }
}

async function getPendingChanges() {
  // This would typically read from IndexedDB
  // For now, return empty array
  return [];
}

async function syncChange(change) {
  // Sync individual changes to the server
  try {
    const response = await fetch("/api/wordlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    });

    if (response.ok) {
      console.log("[SW] Successfully synced change:", change);
    }
  } catch (error) {
    console.log("[SW] Failed to sync change:", error);
  }
}

// Push notifications (for future use)
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  const options = {
    body: event.data ? event.data.text() : "New word added to your list!",
    icon: "/logo.svg",
    badge: "/logo.svg",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(self.registration.showNotification("Malan Chatbot", options));
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");
  event.notification.close();

  event.waitUntil(clients.openWindow("/wordlist"));
});
