const DEFAULT_TTL_MS = 25_000;

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
  inflight: Promise<T> | null;
};

const caches = new Map<string, CacheEntry<unknown>>();

export function invalidateTmsLoadCache(key?: string): void {
  if (key) {
    caches.delete(key);
    return;
  }
  caches.clear();
}

export function seedTmsLoadCache<T>(key: string, data: T): void {
  caches.set(key, { data, fetchedAt: Date.now(), inflight: null });
}

/** Dedupe network loads; return cached data when still fresh. */
export async function cachedLoad<T>(
  key: string,
  load: () => Promise<T>,
  options?: { force?: boolean; ttlMs?: number },
): Promise<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const now = Date.now();
  const entry = caches.get(key) as CacheEntry<T> | undefined;

  if (!options?.force && entry && now - entry.fetchedAt < ttlMs) {
    return entry.data;
  }

  if (!options?.force && entry?.inflight) {
    return entry.inflight;
  }

  const inflight = load()
    .then((data) => {
      caches.set(key, { data, fetchedAt: Date.now(), inflight: null });
      return data;
    })
    .catch((error) => {
      const current = caches.get(key) as CacheEntry<T> | undefined;
      if (current) current.inflight = null;
      throw error;
    });

  caches.set(key, {
    data: entry?.data as T,
    fetchedAt: entry?.fetchedAt ?? 0,
    inflight,
  });

  return inflight;
}
