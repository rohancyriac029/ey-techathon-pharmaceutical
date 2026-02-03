// Cache version - increment this to invalidate all cached results when logic changes
const CACHE_VERSION = 'v4';

class CacheService {
  private cache = new Map<string, any>();
  private initialized = false;

  constructor() {
    // Clear cache on service initialization (server restart)
    this.clear();
    console.log('🗑️ Cache cleared on startup (version:', CACHE_VERSION + ')');
    this.initialized = true;
  }

  get(key: string): any | undefined {
    return this.cache.get(this.versionedKey(key));
  }

  set(key: string, value: any): void {
    this.cache.set(this.versionedKey(key), value);
  }

  has(key: string): boolean {
    return this.cache.has(this.versionedKey(key));
  }

  delete(key: string): boolean {
    return this.cache.delete(this.versionedKey(key));
  }

  clear(): void {
    this.cache.clear();
  }

  // Add version prefix to invalidate old cache entries
  private versionedKey(key: string): string {
    return `${CACHE_VERSION}:${key}`;
  }

  // Create a normalized cache key from query text
  // Now includes extracted condition/indication for better granularity
  createKey(queryText: string): string {
    const normalized = queryText
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '');
    
    // Extract condition from query for more specific caching
    let condition = 'all';
    if (normalized.includes('nsclc') || normalized.includes('nslc') || normalized.includes('lung cancer') || normalized.includes('oncology')) {
      condition = 'nsclc';
    } else if (normalized.includes('copd') || normalized.includes('respiratory') || normalized.includes('pulmonary')) {
      condition = 'copd';
    } else if (normalized.includes('diabetes') || normalized.includes('t2d') || normalized.includes('type 2')) {
      condition = 'diabetes';
    } else if (normalized.includes('arthritis') || normalized.includes('rheumatoid')) {
      condition = 'ra';
    } else if (normalized.includes('cardiovascular') || normalized.includes('heart') || normalized.includes('cholesterol')) {
      condition = 'cv';
    } else if (normalized.includes('hypertension') || normalized.includes('blood pressure')) {
      condition = 'htn';
    }

    return `${condition}:${normalized}`;
  }
}

export const cacheService = new CacheService();
