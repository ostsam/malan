// Global render cache to prevent duplicate server component renders in React Strict Mode
const renderCache = new Map<string, Promise<any>>();

// Cache cleanup to prevent memory leaks
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, promise] of renderCache.entries()) {
      // Clean up cache entries older than 1 minute
      if (now - (promise as any).timestamp > 60000) {
        renderCache.delete(key);
      }
    }
  }, 60000); // Run cleanup every minute
}

export function getCachedRender<T>(
  key: string,
  renderFn: () => Promise<T>
): Promise<T> {
  if (!renderCache.has(key)) {
    const promise = renderFn();
    (promise as any).timestamp = Date.now();
    renderCache.set(key, promise);

    // Start cleanup on first cache entry
    startCleanup();
  }

  return renderCache.get(key)!;
}

export function clearRenderCache() {
  renderCache.clear();
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
