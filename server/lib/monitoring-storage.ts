import { MonitoringAIService } from './monitoring-ai-service';

interface MonitoringTarget {
  id: string;
  name: string;
  url: string;
  type: 'social_media' | 'news_site' | 'blog' | 'government' | 'other';
  keywords: string[];
  parish?: string;
  constituency?: string;
  active: boolean;
  lastChecked?: string;
  status?: 'active' | 'error' | 'paused';
  description?: string;
  ai_assessment?: {
    relevance: number;
    confidence: number;
    reasoning: string;
    jamaica_focus: number;
    political_coverage: number;
    reliability: number;
    update_frequency: 'high' | 'medium' | 'low';
    language: 'english' | 'patois' | 'mixed';
    assessed_at: string;
  };
}

interface MonitoringConfig {
  id: string;
  name: string;
  targets: MonitoringTarget[];
  keywords: string[];
  parishes: string[];
  constituencies: string[];
  frequency: number; // minutes
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface BulkSiteResult {
  success: boolean;
  sites: Array<{
    url: string;
    name?: string;
    added: boolean;
    target?: MonitoringTarget;
    error?: string;
  }>;
  summary: {
    total_processed: number;
    successfully_added: number;
    failed: number;
    average_relevance: number;
  };
}

export class MonitoringStorage {
  private aiService: MonitoringAIService;
  private configs: Map<string, MonitoringConfig>;
  private targets: Map<string, MonitoringTarget>;

  constructor() {
    this.aiService = new MonitoringAIService();
    this.configs = new Map();
    this.targets = new Map();
    this.initializeDefaultConfig();
  }

  private initializeDefaultConfig() {
    const defaultConfig: MonitoringConfig = {
      id: "jamaica_election_monitoring",
      name: "Jamaica Election Intelligence Monitoring",
      targets: [
        {
          id: "jamaica_observer",
          name: "Jamaica Observer",
          url: "https://www.jamaicaobserver.com/feed/",
          type: "news_site",
          keywords: ["election", "JLP", "PNP", "Andrew Holness", "Mark Golding", "politics", "voting"],
          parish: "Kingston",
          active: true,
          status: "active",
          description: "Primary Jamaica news source for political coverage",
          lastChecked: new Date().toISOString(),
          ai_assessment: {
            relevance: 95,
            confidence: 90,
            reasoning: "Primary Jamaica news outlet with extensive political coverage",
            jamaica_focus: 100,
            political_coverage: 95,
            reliability: 90,
            update_frequency: "high",
            language: "english",
            assessed_at: new Date().toISOString()
          }
        },
        {
          id: "jamaica_gleaner",
          name: "Jamaica Gleaner",
          url: "https://jamaica-gleaner.com/feed",
          type: "news_site",
          keywords: ["election", "democracy", "government", "parliament", "constituency"],
          parish: "Kingston",
          active: true,
          status: "active",
          description: "Leading Jamaica newspaper for political news",
          lastChecked: new Date().toISOString(),
          ai_assessment: {
            relevance: 90,
            confidence: 85,
            reasoning: "Established Jamaica newspaper with strong political reporting",
            jamaica_focus: 100,
            political_coverage: 90,
            reliability: 95,
            update_frequency: "high",
            language: "english",
            assessed_at: new Date().toISOString()
          }
        },
        {
          id: "nationwide_radio",
          name: "Nationwide Radio",
          url: "https://nationwideradiojm.com/feed/",
          type: "news_site",
          keywords: ["election", "voting", "campaign", "candidate", "Jamaica politics"],
          parish: "Kingston",
          active: true,
          status: "active",
          description: "Jamaica radio news and political coverage",
          lastChecked: new Date().toISOString(),
          ai_assessment: {
            relevance: 85,
            confidence: 80,
            reasoning: "Jamaica radio station with political news coverage",
            jamaica_focus: 100,
            political_coverage: 80,
            reliability: 85,
            update_frequency: "medium",
            language: "english",
            assessed_at: new Date().toISOString()
          }
        },
        {
          id: "x_jamaica_politics",
          name: "X (Twitter) Jamaica Politics",
          url: "https://twitter.com/search?q=Jamaica%20election%20OR%20JLP%20OR%20PNP",
          type: "social_media",
          keywords: ["Jamaica election", "JLP", "PNP", "Andrew Holness", "Mark Golding", "Jamaica politics"],
          parish: "All Parishes",
          active: true,
          status: "active",
          description: "Social media monitoring for Jamaica political discourse",
          lastChecked: new Date().toISOString(),
          ai_assessment: {
            relevance: 80,
            confidence: 75,
            reasoning: "Social media platform with real-time political discourse",
            jamaica_focus: 70,
            political_coverage: 85,
            reliability: 60,
            update_frequency: "high",
            language: "mixed",
            assessed_at: new Date().toISOString()
          }
        }
      ],
      keywords: [
        "election", "voting", "democracy", "political", "campaign", "candidate",
        "JLP", "PNP", "Andrew Holness", "Mark Golding", "manifesto", "policy",
        "constituency", "parliamentary", "voter", "ballot", "polling station",
        "electoral commission", "governance", "corruption", "transparency",
        "infrastructure", "roads", "healthcare", "education", "crime", "economy",
        "unemployment", "development", "parish council"
      ],
      parishes: [
        'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
        'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
        'Manchester', 'Clarendon', 'St. Catherine'
      ],
      constituencies: [],
      frequency: 30, // 30 minutes
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.configs.set(defaultConfig.id, defaultConfig);
    
    // Index targets for quick lookup
    defaultConfig.targets.forEach(target => {
      this.targets.set(target.id, target);
    });
  }

  async getAllConfigs(): Promise<MonitoringConfig[]> {
    return Array.from(this.configs.values());
  }

  async getConfigById(configId: string): Promise<MonitoringConfig | null> {
    return this.configs.get(configId) || null;
  }

  async addTarget(targetData: Partial<MonitoringTarget>): Promise<MonitoringTarget> {
    const targetId = `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Assess site relevance using AI
    let aiAssessment;
    try {
      const assessment = await this.aiService.assessSiteRelevance(
        targetData.url!, 
        targetData.name
      );
      
      aiAssessment = {
        relevance: assessment.relevance,
        confidence: assessment.confidence,
        reasoning: assessment.reasoning,
        jamaica_focus: assessment.jamaica_focus,
        political_coverage: assessment.political_coverage,
        reliability: assessment.reliability,
        update_frequency: assessment.update_frequency,
        language: assessment.language,
        assessed_at: new Date().toISOString()
      };

      // Use AI-recommended keywords if available
      if (assessment.recommended_keywords.length > 0) {
        targetData.keywords = assessment.recommended_keywords;
      }

      // Use AI-determined content type
      if (assessment.content_type) {
        targetData.type = assessment.content_type;
      }

    } catch (error) {
      console.error('AI assessment failed for target:', targetData.url, error);
      // Continue without AI assessment
    }

    const newTarget: MonitoringTarget = {
      id: targetId,
      name: targetData.name!.trim(),
      url: targetData.url!.trim(),
      type: targetData.type || 'news_site',
      keywords: Array.isArray(targetData.keywords) ? targetData.keywords.filter(k => k.trim()) : [],
      parish: targetData.parish || 'All Parishes',
      constituency: targetData.constituency || '',
      description: targetData.description?.trim() || '',
      active: true,
      status: 'active',
      lastChecked: new Date().toISOString(),
      ai_assessment: aiAssessment
    };

    // Add to storage
    this.targets.set(targetId, newTarget);

    // Add to default config
    const defaultConfig = this.configs.get('jamaica_election_monitoring');
    if (defaultConfig) {
      defaultConfig.targets.push(newTarget);
      defaultConfig.updated_at = new Date().toISOString();
    }

    console.log(`[MONITORING] Target added with AI assessment: ${newTarget.name} (Relevance: ${aiAssessment?.relevance || 'N/A'}%)`);

    return newTarget;
  }

  async addBulkSites(sites: Array<{ url: string; name?: string }>): Promise<BulkSiteResult> {
    const results: Array<{ url: string; name?: string; added: boolean; target?: MonitoringTarget; error?: string }> = [];
    let totalRelevance = 0;
    let successfullyAdded = 0;

    for (const site of sites) {
      try {
        // Check if URL already exists
        const existingTarget = Array.from(this.targets.values()).find(
          t => t.url.toLowerCase() === site.url.toLowerCase()
        );

        if (existingTarget) {
          results.push({
            url: site.url,
            name: site.name,
            added: false,
            error: 'URL already exists in monitoring targets'
          });
          continue;
        }

        // Add the target
        const target = await this.addTarget({
          name: site.name || this.extractNameFromUrl(site.url),
          url: site.url,
          type: 'news_site', // Will be updated by AI assessment
          keywords: [], // Will be updated by AI assessment
          active: true
        });

        results.push({
          url: site.url,
          name: site.name,
          added: true,
          target
        });

        if (target.ai_assessment) {
          totalRelevance += target.ai_assessment.relevance;
        }
        successfullyAdded++;

        // Add delay to avoid overwhelming the AI service
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        results.push({
          url: site.url,
          name: site.name,
          added: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const averageRelevance = successfullyAdded > 0 ? totalRelevance / successfullyAdded : 0;

    return {
      success: successfullyAdded > 0,
      sites: results,
      summary: {
        total_processed: sites.length,
        successfully_added: successfullyAdded,
        failed: sites.length - successfullyAdded,
        average_relevance: Math.round(averageRelevance)
      }
    };
  }

  async deleteTarget(targetId: string): Promise<boolean> {
    // Check if it's a default target
    const defaultTargets = ['jamaica_observer', 'jamaica_gleaner', 'nationwide_radio', 'x_jamaica_politics'];
    if (defaultTargets.includes(targetId)) {
      throw new Error('Cannot delete default monitoring targets. Use pause instead.');
    }

    const target = this.targets.get(targetId);
    if (!target) {
      return false;
    }

    // Remove from storage
    this.targets.delete(targetId);

    // Remove from configs
    for (const config of this.configs.values()) {
      config.targets = config.targets.filter(t => t.id !== targetId);
      config.updated_at = new Date().toISOString();
    }

    console.log(`[MONITORING] Target deleted: ${target.name}`);
    return true;
  }

  async toggleTarget(targetId: string, active: boolean): Promise<boolean> {
    const target = this.targets.get(targetId);
    if (!target) {
      return false;
    }

    target.active = active;
    target.status = active ? 'active' : 'paused';
    target.lastChecked = new Date().toISOString();

    // Update in configs
    for (const config of this.configs.values()) {
      const configTarget = config.targets.find(t => t.id === targetId);
      if (configTarget) {
        configTarget.active = active;
        configTarget.status = target.status;
        configTarget.lastChecked = target.lastChecked;
        config.updated_at = new Date().toISOString();
      }
    }

    console.log(`[MONITORING] Target ${target.name} ${active ? 'activated' : 'paused'}`);
    return true;
  }

  async getTargetById(targetId: string): Promise<MonitoringTarget | null> {
    return this.targets.get(targetId) || null;
  }

  async getAllTargets(): Promise<MonitoringTarget[]> {
    return Array.from(this.targets.values());
  }

  async updateTarget(targetId: string, updates: Partial<MonitoringTarget>): Promise<MonitoringTarget | null> {
    const target = this.targets.get(targetId);
    if (!target) {
      return null;
    }

    // Update target
    Object.assign(target, updates);
    target.lastChecked = new Date().toISOString();

    // Update in configs
    for (const config of this.configs.values()) {
      const configTarget = config.targets.find(t => t.id === targetId);
      if (configTarget) {
        Object.assign(configTarget, updates);
        configTarget.lastChecked = target.lastChecked;
        config.updated_at = new Date().toISOString();
      }
    }

    return target;
  }

  private extractNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      return hostname.split('.')[0].replace(/[^a-zA-Z]/g, ' ').trim();
    } catch {
      return 'Unknown Site';
    }
  }

  // Get monitoring statistics
  async getMonitoringStats(): Promise<{
    total_targets: number;
    active_targets: number;
    paused_targets: number;
    error_targets: number;
    average_relevance: number;
    high_relevance_targets: number;
    last_updated: string;
  }> {
    const targets = Array.from(this.targets.values());
    const activeTargets = targets.filter(t => t.active);
    const pausedTargets = targets.filter(t => !t.active);
    const errorTargets = targets.filter(t => t.status === 'error');
    
    const relevanceScores = targets
      .map(t => t.ai_assessment?.relevance || 0)
      .filter(score => score > 0);
    
    const averageRelevance = relevanceScores.length > 0 
      ? relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length 
      : 0;

    const highRelevanceTargets = targets.filter(t => (t.ai_assessment?.relevance || 0) >= 80).length;

    return {
      total_targets: targets.length,
      active_targets: activeTargets.length,
      paused_targets: pausedTargets.length,
      error_targets: errorTargets.length,
      average_relevance: Math.round(averageRelevance),
      high_relevance_targets: highRelevanceTargets,
      last_updated: new Date().toISOString()
    };
  }
} 