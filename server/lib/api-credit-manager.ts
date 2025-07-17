import { db } from '../db';
import { sql } from 'drizzle-orm';

interface APICreditUsage {
  service: string;
  endpoint: string;
  tokensUsed: number;
  cost: number;
  timestamp: Date;
  success: boolean;
}

interface CreditLimits {
  gemini: {
    daily: number;
    hourly: number;
    perRequest: number;
  };
  grok: {
    daily: number;
    hourly: number;
    perRequest: number;
  };
  news: {
    daily: number;
    hourly: number;
    perRequest: number;
  };
}

interface CacheEntry {
  key: string;
  data: any;
  timestamp: Date;
  ttl: number; // Time to live in milliseconds
}

export class APICreditManager {
  private static instance: APICreditManager;
  private cache: Map<string, CacheEntry> = new Map();
  private creditLimits: CreditLimits;
  private usageTracking: APICreditUsage[] = [];

  constructor() {
    this.creditLimits = {
      gemini: {
        daily: 1000000, // 1M tokens per day
        hourly: 50000,  // 50K tokens per hour
        perRequest: 1000 // 1K tokens per request
      },
      grok: {
        daily: 100000,  // 100K tokens per day
        hourly: 5000,   // 5K tokens per hour
        perRequest: 500  // 500 tokens per request
      },
      news: {
        daily: 1000,    // 1000 requests per day
        hourly: 50,     // 50 requests per hour
        perRequest: 1   // 1 request per call
      }
    };
  }

  static getInstance(): APICreditManager {
    if (!APICreditManager.instance) {
      APICreditManager.instance = new APICreditManager();
    }
    return APICreditManager.instance;
  }

  // Check if we can make an API call without exceeding limits
  async canMakeAPICall(service: string, endpoint: string): Promise<boolean> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const hourlyUsage = this.usageTracking.filter(
      usage => usage.service === service && usage.timestamp > oneHourAgo
    );
    const dailyUsage = this.usageTracking.filter(
      usage => usage.service === service && usage.timestamp > oneDayAgo
    );

    const hourlyTokens = hourlyUsage.reduce((sum, usage) => sum + usage.tokensUsed, 0);
    const dailyTokens = dailyUsage.reduce((sum, usage) => sum + usage.tokensUsed, 0);

    const limits = this.creditLimits[service as keyof CreditLimits];
    if (!limits) return false;

    return hourlyTokens < limits.hourly && dailyTokens < limits.daily;
  }

  // Track API usage
  trackUsage(service: string, endpoint: string, tokensUsed: number, success: boolean): void {
    const usage: APICreditUsage = {
      service,
      endpoint,
      tokensUsed,
      cost: this.calculateCost(service, tokensUsed),
      timestamp: new Date(),
      success
    };

    this.usageTracking.push(usage);
    
    // Keep only last 7 days of usage data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.usageTracking = this.usageTracking.filter(usage => usage.timestamp > sevenDaysAgo);
  }

  // Calculate cost based on service and tokens
  private calculateCost(service: string, tokens: number): number {
    const rates = {
      gemini: 0.000125, // $0.125 per 1K tokens
      grok: 0.0008,     // $0.80 per 1K tokens
      news: 0.001       // $0.001 per request
    };

    const rate = rates[service as keyof typeof rates] || 0;
    return (tokens / 1000) * rate;
  }

  // Cache management
  getCachedData(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = new Date();
    if (now.getTime() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  setCachedData(key: string, data: any, ttlMinutes: number = 30): void {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: new Date(),
      ttl: ttlMinutes * 60 * 1000
    };

    this.cache.set(key, entry);
  }

  // Optimize prompts to reduce token usage
  optimizePrompt(prompt: string, maxTokens: number = 1000): string {
    // Remove unnecessary whitespace and comments
    let optimized = prompt.replace(/\s+/g, ' ').trim();
    
    // Truncate if too long
    if (optimized.length > maxTokens) {
      optimized = optimized.substring(0, maxTokens) + '...';
    }

    return optimized;
  }

  // Batch processing to reduce API calls
  async batchProcess<T>(
    items: T[],
    processor: (item: T) => Promise<any>,
    batchSize: number = 5
  ): Promise<any[]> {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      results.push(...batchResults);
      
      // Rate limiting between batches
      if (i + batchSize < items.length) {
        await this.delay(1000); // 1 second delay
      }
    }

    return results;
  }

  async getCachedOrFetch<T>(
    cacheKey: string, 
    fetchFunction: () => Promise<T>, 
    cacheMinutes: number = 10
  ): Promise<T> {
    try {
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheMinutes * 60 * 1000) {
        console.log(`Cache hit for key: ${cacheKey}`);
        return cached.data;
      }

      console.log(`Cache miss for key: ${cacheKey}, fetching fresh data`);

      const result = await fetchFunction();

      // Cache the result safely
      if (result !== undefined && result !== null) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }

      return result;
    } catch (error) {
      console.error(`Error in getCachedOrFetch for key ${cacheKey}:`, error);

      // Return stale cache if available
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.log(`Returning stale cache for key: ${cacheKey}`);
        return staleCache.data;
      }

      // Create a safe fallback result based on the expected type
      if (cacheKey.includes('sentiment')) {
        return {
          overall_sentiment: 'neutral',
          confidence: 0.1,
          key_issues: [],
          election_relevance: 0.1,
          geographic_focus: ['Jamaica'],
          concerns: ['Service temporarily unavailable'],
          positive_indicators: [],
          risk_level: 'low'
        } as T;
      }

      throw error;
    }
  }

  // Rate limiting
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get usage statistics
  getUsageStats(): any {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats = {
      hourly: {} as Record<string, any>,
      daily: {} as Record<string, any>,
      total: {} as Record<string, any>
    };

    ['gemini', 'grok', 'news'].forEach(service => {
      const hourlyUsage = this.usageTracking.filter(
        usage => usage.service === service && usage.timestamp > oneHourAgo
      );
      const dailyUsage = this.usageTracking.filter(
        usage => usage.service === service && usage.timestamp > oneDayAgo
      );
      const totalUsage = this.usageTracking.filter(
        usage => usage.service === service
      );

      stats.hourly[service] = {
        calls: hourlyUsage.length,
        tokens: hourlyUsage.reduce((sum, usage) => sum + usage.tokensUsed, 0),
        cost: hourlyUsage.reduce((sum, usage) => sum + usage.cost, 0)
      };

      stats.daily[service] = {
        calls: dailyUsage.length,
        tokens: dailyUsage.reduce((sum, usage) => sum + usage.tokensUsed, 0),
        cost: dailyUsage.reduce((sum, usage) => sum + usage.cost, 0)
      };

      stats.total[service] = {
        calls: totalUsage.length,
        tokens: totalUsage.reduce((sum, usage) => sum + usage.tokensUsed, 0),
        cost: totalUsage.reduce((sum, usage) => sum + usage.cost, 0)
      };
    });

    return stats;
  }

  // Clear old cache entries
  cleanupCache(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (now.getTime() - entry.timestamp.getTime() > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Emergency stop if credits are running low
  async checkCreditEmergency(): Promise<boolean> {
    const stats = this.getUsageStats();
    const dailyCost = Object.values(stats.daily).reduce((sum: number, service: any) => sum + service.cost, 0);
    
    // Alert if daily cost exceeds $50
    if (dailyCost > 50) {
      console.warn(`CREDIT EMERGENCY: Daily cost is $${dailyCost.toFixed(2)}`);
      return true;
    }

    return false;
  }
}