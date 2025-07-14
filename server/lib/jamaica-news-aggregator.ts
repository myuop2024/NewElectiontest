import { SocialMonitoringService } from './social-monitoring-service';

interface NewsSource {
  id: string;
  name: string;
  type: 'rss' | 'website' | 'twitter';
  url: string;
  isActive: boolean;
  priority: number; // 1-5, higher is more important
  electionRelevance: number; // 1-10, how likely to contain election content
}

interface ProcessedArticle {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: Date;
  extractedAt: Date;
  isDuplicate: boolean;
  relevanceScore: number;
  electionKeywords: string[];
  parishMentions: string[];
  sentimentAnalysis: {
    sentiment: string;
    confidence: number;
    riskLevel: string;
  };
  aiAnalysis?: {
    summary: string;
    keyPoints: string[];
    actionRequired: boolean;
  };
}

export class JamaicaNewsAggregator {
  private sources: NewsSource[] = [
    // Primary Jamaica News Sources
    {
      id: 'gleaner_main',
      name: 'Jamaica Gleaner',
      type: 'rss',
      url: 'https://jamaica-gleaner.com/feed',
      isActive: true,
      priority: 5,
      electionRelevance: 9
    },
    {
      id: 'gleaner_politics',
      name: 'Jamaica Gleaner - Politics',
      type: 'rss', 
      url: 'https://jamaica-gleaner.com/section/politics/feed',
      isActive: true,
      priority: 5,
      electionRelevance: 10
    },
    {
      id: 'gleaner_news',
      name: 'Jamaica Gleaner - News',
      type: 'rss',
      url: 'https://jamaica-gleaner.com/section/news/feed',
      isActive: true,
      priority: 5,
      electionRelevance: 8
    },
    {
      id: 'observer_main',
      name: 'Jamaica Observer',
      type: 'rss',
      url: 'https://www.jamaicaobserver.com/feed/',
      isActive: true,
      priority: 5,
      electionRelevance: 9
    },
    {
      id: 'observer_politics',
      name: 'Jamaica Observer - Politics',
      type: 'rss',
      url: 'https://www.jamaicaobserver.com/category/politics/feed/',
      isActive: true,
      priority: 5,
      electionRelevance: 10
    },
    {
      id: 'observer_news',
      name: 'Jamaica Observer - News',
      type: 'rss',
      url: 'https://www.jamaicaobserver.com/category/news/feed/',
      isActive: true,
      priority: 5,
      electionRelevance: 8
    },
    {
      id: 'nationwide_vote2020',
      name: 'Nationwide Radio - Vote 2020',
      type: 'website',
      url: 'https://nationwideradiojm.com/category/vote2020/',
      isActive: true,
      priority: 4,
      electionRelevance: 10
    },
    {
      id: 'nationwide_main',
      name: 'Nationwide Radio',
      type: 'rss',
      url: 'https://nationwideradiojm.com/feed/',
      isActive: true,
      priority: 4,
      electionRelevance: 7
    }
  ];

  private socialMediaSources = [
    { handle: 'AndrewHolnessJM', name: 'Andrew Holness (PM)', priority: 5, role: 'government' },
    { handle: 'MarkJGolding', name: 'Mark Golding (Opposition Leader)', priority: 5, role: 'opposition' },
    { handle: 'DamionMitch', name: 'Damion Mitchell', priority: 4, role: 'media' },
    { handle: 'JamaicaGleaner', name: 'Jamaica Gleaner', priority: 5, role: 'media' },
    { handle: 'JamaicaObserver', name: 'Jamaica Observer', priority: 5, role: 'media' },
    { handle: 'NationwideRadio', name: 'Nationwide Radio', priority: 4, role: 'media' },
    { handle: 'CVMTV', name: 'CVM TV', priority: 4, role: 'media' },
    { handle: 'ClydeWilliams46', name: 'Clyde Williams', priority: 3, role: 'commentator' },
    { handle: 'Raggahmufinzent', name: 'Ragga Muffin', priority: 3, role: 'commentator' },
    { handle: '5Solae', name: '5Solae', priority: 3, role: 'commentator' }
  ];

  private electionKeywords = [
    'election', 'voting', 'vote', 'ballot', 'poll', 'polling', 'democracy',
    'candidate', 'campaign', 'constituency', 'parliament', 'government',
    'opposition', 'JLP', 'PNP', 'electoral', 'commission', 'ECJ',
    'observer', 'monitoring', 'integrity', 'fraud', 'irregularity',
    'registration', 'voter', 'turnout', 'results', 'tally'
  ];

  private jamaicanParishes = [
    'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary',
    'St. Ann', 'Trelawny', 'St. James', 'Hanover', 'Westmoreland',
    'St. Elizabeth', 'Manchester', 'Clarendon', 'St. Catherine'
  ];

  private processedArticles: Map<string, ProcessedArticle> = new Map();
  private duplicateHashes: Set<string> = new Set();
  private socialMonitoring: SocialMonitoringService;

  constructor(geminiApiKey: string) {
    this.socialMonitoring = new SocialMonitoringService(geminiApiKey);
  }

  // Main aggregation method
  async aggregateAllSources(): Promise<ProcessedArticle[]> {
    console.log('Starting comprehensive Jamaica news aggregation...');
    
    const allArticles: ProcessedArticle[] = [];
    
    // Fetch from RSS feeds
    for (const source of this.sources.filter(s => s.isActive && s.type === 'rss')) {
      try {
        const articles = await this.fetchFromRSSSource(source);
        allArticles.push(...articles);
      } catch (error) {
        console.error(`Failed to fetch from ${source.name}:`, error);
      }
    }

    // Fetch from website sources
    for (const source of this.sources.filter(s => s.isActive && s.type === 'website')) {
      try {
        const articles = await this.fetchFromWebsiteSource(source);
        allArticles.push(...articles);
      } catch (error) {
        console.error(`Failed to fetch from ${source.name}:`, error);
      }
    }

    // Remove duplicates and score articles
    const uniqueArticles = await this.deduplicateAndScore(allArticles);
    
    // Sort by relevance and recency
    return uniqueArticles.sort((a, b) => {
      const scoreWeight = 0.7;
      const timeWeight = 0.3;
      const aScore = (a.relevanceScore * scoreWeight) + (this.getRecencyScore(a.publishedAt) * timeWeight);
      const bScore = (b.relevanceScore * scoreWeight) + (this.getRecencyScore(b.publishedAt) * timeWeight);
      return bScore - aScore;
    });
  }

  private async fetchFromRSSSource(source: NewsSource): Promise<ProcessedArticle[]> {
    console.log(`Fetching RSS from ${source.name}...`);
    
    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'CAFFE Electoral Observer Bot 1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      return await this.parseRSSFeed(xmlText, source);
      
    } catch (error) {
      console.error(`RSS fetch failed for ${source.name}:`, error);
      return [];
    }
  }

  private async parseRSSFeed(xmlText: string, source: NewsSource): Promise<ProcessedArticle[]> {
    const articles: ProcessedArticle[] = [];
    
    // Simple XML parsing for RSS items
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const items = xmlText.match(itemRegex) || [];

    for (const item of items.slice(0, 10)) { // Limit to 10 most recent
      try {
        const title = this.extractXMLTag(item, 'title');
        const description = this.extractXMLTag(item, 'description');
        const link = this.extractXMLTag(item, 'link');
        const pubDate = this.extractXMLTag(item, 'pubDate');

        if (title && link) {
          const article: ProcessedArticle = {
            id: this.generateArticleId(title, source.id),
            title: this.cleanText(title),
            content: this.cleanText(description || ''),
            source: source.name,
            url: link,
            publishedAt: this.parseDate(pubDate) || new Date(),
            extractedAt: new Date(),
            isDuplicate: false,
            relevanceScore: 0,
            electionKeywords: [],
            parishMentions: [],
            sentimentAnalysis: {
              sentiment: 'neutral',
              confidence: 0,
              riskLevel: 'low'
            }
          };

          // Score and analyze the article
          await this.scoreAndAnalyzeArticle(article, source);
          articles.push(article);
        }
      } catch (error) {
        console.error('Error parsing RSS item:', error);
      }
    }

    return articles;
  }

  private async fetchFromWebsiteSource(source: NewsSource): Promise<ProcessedArticle[]> {
    console.log(`Fetching website content from ${source.name}...`);
    
    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'CAFFE Electoral Observer Bot 1.0'
        },
        timeout: 15000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const htmlContent = await response.text();
      return await this.parseWebsiteContent(htmlContent, source);
      
    } catch (error) {
      console.error(`Website fetch failed for ${source.name}:`, error);
      return [];
    }
  }

  private async parseWebsiteContent(htmlContent: string, source: NewsSource): Promise<ProcessedArticle[]> {
    const articles: ProcessedArticle[] = [];
    
    // Extract article links and titles from HTML
    const articleRegex = /<a[^>]*href=["']([^"']*)"[^>]*>([^<]*)</gi;
    const matches = [...htmlContent.matchAll(articleRegex)];

    for (const match of matches.slice(0, 15)) { // Limit results
      const url = match[1];
      const title = this.cleanText(match[2]);

      if (title && url && this.isRelevantTitle(title)) {
        const article: ProcessedArticle = {
          id: this.generateArticleId(title, source.id),
          title,
          content: '', // Will be filled by AI analysis if needed
          source: source.name,
          url: this.resolveUrl(url, source.url),
          publishedAt: new Date(), // Current time as fallback
          extractedAt: new Date(),
          isDuplicate: false,
          relevanceScore: 0,
          electionKeywords: [],
          parishMentions: [],
          sentimentAnalysis: {
            sentiment: 'neutral',
            confidence: 0,
            riskLevel: 'low'
          }
        };

        await this.scoreAndAnalyzeArticle(article, source);
        articles.push(article);
      }
    }

    return articles;
  }

  private async scoreAndAnalyzeArticle(article: ProcessedArticle, source: NewsSource): Promise<void> {
    const fullText = `${article.title} ${article.content}`.toLowerCase();
    
    // Find election keywords
    article.electionKeywords = this.electionKeywords.filter(keyword => 
      fullText.includes(keyword.toLowerCase())
    );

    // Find parish mentions
    article.parishMentions = this.jamaicanParishes.filter(parish =>
      fullText.includes(parish.toLowerCase())
    );

    // Calculate relevance score
    let relevanceScore = 0;
    relevanceScore += article.electionKeywords.length * 2; // Election keywords worth 2 points each
    relevanceScore += article.parishMentions.length * 3; // Parish mentions worth 3 points each
    relevanceScore += source.electionRelevance * 0.5; // Source relevance factor
    
    // Bonus for political keywords
    const politicalTerms = ['government', 'parliament', 'minister', 'mp', 'senator', 'party'];
    politicalTerms.forEach(term => {
      if (fullText.includes(term)) relevanceScore += 1;
    });

    article.relevanceScore = Math.min(relevanceScore, 10); // Cap at 10

    // AI Sentiment Analysis for high-relevance articles
    if (article.relevanceScore >= 5) {
      try {
        const aiAnalysis = await this.socialMonitoring.analyzeContentSentiment(
          `${article.title}\n\n${article.content}`,
          'news'
        );
        
        article.sentimentAnalysis = {
          sentiment: aiAnalysis.sentiment || 'neutral',
          confidence: aiAnalysis.confidence || 0,
          riskLevel: this.determineRiskLevel(aiAnalysis, article.electionKeywords)
        };

        // Generate AI summary for critical articles
        if (article.relevanceScore >= 8) {
          article.aiAnalysis = await this.generateAISummary(article);
        }
      } catch (error) {
        console.error('AI analysis failed:', error);
      }
    }
  }

  private async deduplicateAndScore(articles: ProcessedArticle[]): Promise<ProcessedArticle[]> {
    const uniqueArticles: ProcessedArticle[] = [];
    const seenHashes = new Set<string>();
    
    for (const article of articles) {
      const contentHash = this.generateContentHash(article.title, article.content);
      
      if (!seenHashes.has(contentHash)) {
        seenHashes.add(contentHash);
        article.isDuplicate = false;
        uniqueArticles.push(article);
      } else {
        article.isDuplicate = true;
        console.log(`Duplicate detected: ${article.title}`);
      }
    }

    return uniqueArticles;
  }

  // Utility methods
  private extractXMLTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private generateArticleId(title: string, sourceId: string): string {
    const hash = title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
    return `${sourceId}_${hash}_${Date.now()}`;
  }

  private generateContentHash(title: string, content: string): string {
    const text = `${title} ${content}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    return text.substring(0, 50); // Simple hash for duplicate detection
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  private getRecencyScore(publishedAt: Date): number {
    const hoursOld = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 1) return 10;
    if (hoursOld < 6) return 8;
    if (hoursOld < 24) return 6;
    if (hoursOld < 72) return 4;
    return 2;
  }

  private isRelevantTitle(title: string): boolean {
    const titleLower = title.toLowerCase();
    return this.electionKeywords.some(keyword => titleLower.includes(keyword.toLowerCase())) ||
           this.jamaicanParishes.some(parish => titleLower.includes(parish.toLowerCase())) ||
           titleLower.length > 10; // Basic filter for meaningful titles
  }

  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${url}`;
    }
    return url;
  }

  private determineRiskLevel(aiAnalysis: any, electionKeywords: string[]): string {
    if (!aiAnalysis.sentiment) return 'low';
    
    const criticalKeywords = ['fraud', 'irregularity', 'violence', 'protest', 'tension'];
    const hasCriticalTerms = electionKeywords.some(k => criticalKeywords.includes(k));
    
    if (aiAnalysis.sentiment.includes('negative') && hasCriticalTerms) return 'critical';
    if (aiAnalysis.sentiment.includes('concerning') || hasCriticalTerms) return 'high';
    if (electionKeywords.length >= 3) return 'medium';
    return 'low';
  }

  private async generateAISummary(article: ProcessedArticle): Promise<any> {
    try {
      const prompt = `Analyze this Jamaica election news article and provide:
1. A concise summary (2-3 sentences)
2. Key points for electoral observers
3. Whether immediate action is required

Title: ${article.title}
Content: ${article.content}

Respond in JSON format with: summary, keyPoints (array), actionRequired (boolean)`;

      // Use existing AI service
      const response = await this.socialMonitoring.analyzeContentSentiment(prompt, 'analysis');
      
      return {
        summary: article.title, // Fallback
        keyPoints: article.electionKeywords,
        actionRequired: article.relevanceScore >= 9
      };
    } catch (error) {
      console.error('AI summary generation failed:', error);
      return null;
    }
  }

  // Public methods for integration
  getProcessedArticles(): ProcessedArticle[] {
    return Array.from(this.processedArticles.values());
  }

  getHighPriorityAlerts(): ProcessedArticle[] {
    return this.getProcessedArticles().filter(a => 
      a.relevanceScore >= 8 && 
      a.sentimentAnalysis.riskLevel === 'critical'
    );
  }

  getSourceStatistics() {
    const stats = {
      totalSources: this.sources.length,
      activeSources: this.sources.filter(s => s.isActive).length,
      totalArticles: this.processedArticles.size,
      duplicatesFound: Array.from(this.processedArticles.values()).filter(a => a.isDuplicate).length,
      highRelevanceArticles: Array.from(this.processedArticles.values()).filter(a => a.relevanceScore >= 7).length,
      criticalAlerts: this.getHighPriorityAlerts().length
    };
    return stats;
  }
}