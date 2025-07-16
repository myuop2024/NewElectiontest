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
  private newsApiKey = process.env.NEWS_API_KEY;

  private sources: NewsSource[] = [
    // NewsAPI - Primary real news source
    {
      id: 'newsapi_jamaica',
      name: 'NewsAPI Jamaica',
      type: 'website',
      url: 'https://newsapi.org/v2/everything?q=Jamaica+AND+(election+OR+politics+OR+government)&language=en&sortBy=publishedAt',
      isActive: true,
      priority: 5,
      electionRelevance: 10
    },
    // Primary Jamaica News Sources
    {
      id: 'gleaner_main',
      name: 'Jamaica Gleaner',
      type: 'rss',
      url: 'https://jamaica-gleaner.com/feed',
      isActive: true,
      priority: 4,
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
    console.log('📰 [AGGREGATOR] Starting comprehensive Jamaica news aggregation...');
    console.log('📰 [AGGREGATOR] Focus: Jamaican political news only (JLP vs PNP)');
    console.log('📰 [AGGREGATOR] Filtering: Excluding KFC, sports, weather, entertainment, etc.');
    
    const allArticles: ProcessedArticle[] = [];
    
    // Fetch from RSS feeds
    console.log(`📰 [AGGREGATOR] Fetching from ${this.sources.filter(s => s.isActive && s.type === 'rss').length} RSS sources...`);
    for (const source of this.sources.filter(s => s.isActive && s.type === 'rss')) {
      try {
        console.log(`📰 [AGGREGATOR] Fetching RSS from: ${source.name}`);
        const articles = await this.fetchFromRSSSource(source);
        console.log(`📰 [AGGREGATOR] Got ${articles.length} articles from ${source.name}`);
        allArticles.push(...articles);
      } catch (error) {
        console.error(`📰 [AGGREGATOR] Failed to fetch from ${source.name}:`, error);
      }
    }

    // Fetch from website sources
    console.log(`📰 [AGGREGATOR] Fetching from ${this.sources.filter(s => s.isActive && s.type === 'website').length} website sources...`);
    for (const source of this.sources.filter(s => s.isActive && s.type === 'website')) {
      try {
        console.log(`📰 [AGGREGATOR] Fetching website from: ${source.name}`);
        const articles = await this.fetchFromWebsiteSource(source);
        console.log(`📰 [AGGREGATOR] Got ${articles.length} articles from ${source.name}`);
        allArticles.push(...articles);
      } catch (error) {
        console.error(`📰 [AGGREGATOR] Failed to fetch from ${source.name}:`, error);
      }
    }

    console.log(`📰 [AGGREGATOR] Total articles collected: ${allArticles.length}`);
    
    // Remove duplicates and score articles
    const uniqueArticles = await this.deduplicateAndScore(allArticles);
    console.log(`📰 [AGGREGATOR] After deduplication: ${uniqueArticles.length} articles`);
    
    // Sort by relevance and recency
    const sortedArticles = uniqueArticles.sort((a, b) => {
      const scoreWeight = 0.7;
      const timeWeight = 0.3;
      const aScore = (a.relevanceScore * scoreWeight) + (this.getRecencyScore(a.publishedAt) * timeWeight);
      const bScore = (b.relevanceScore * scoreWeight) + (this.getRecencyScore(b.publishedAt) * timeWeight);
      return bScore - aScore;
    });
    
    console.log(`📰 [AGGREGATOR] Final result: ${sortedArticles.length} relevant Jamaican political articles`);
    console.log(`📰 [AGGREGATOR] Top articles:`);
    sortedArticles.slice(0, 3).forEach((article, index) => {
      console.log(`  ${index + 1}. "${article.title}" (Score: ${article.relevanceScore.toFixed(2)})`);
    });
    
    return sortedArticles;
  }

  private async fetchFromRSSSource(source: NewsSource): Promise<ProcessedArticle[]> {
    console.log(`Fetching RSS from ${source.name}...`);
    
    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'CAFFE Electoral Observer Bot 1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
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
    
    // Handle NewsAPI specially
    if (source.id === 'newsapi_jamaica' && this.newsApiKey) {
      return await this.fetchFromNewsAPI();
    }
    
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

  // Fetch from NewsAPI for real Jamaica news with Gemini AI categorization
  private async fetchFromNewsAPI(): Promise<ProcessedArticle[]> {
    if (!this.newsApiKey) {
      throw new Error('NEWS_API_KEY is required for real Jamaica news data');
    }

    try {
      // More specific query focused on Jamaican political news only
      const url = `https://newsapi.org/v2/everything?q=Jamaica AND (JLP OR PNP OR "Andrew Holness" OR "Mark Golding" OR "Jamaica Labour Party" OR "People's National Party" OR "Jamaica election" OR "Jamaica politics" OR "Jamaica government" OR "Jamaica parliament" OR "Jamaica constituency" OR "Jamaica MP" OR "Jamaica candidate")&language=en&sortBy=publishedAt&pageSize=50&apiKey=${this.newsApiKey}`;
      
      console.log(`🌐 [NEWSAPI] Fetching from URL: ${url.replace(this.newsApiKey, '***API_KEY_HIDDEN***')}`);
      console.log(`🌐 [NEWSAPI] Query: Jamaica AND (JLP OR PNP OR "Andrew Holness" OR "Mark Golding" OR "Jamaica Labour Party" OR "People's National Party" OR "Jamaica election" OR "Jamaica politics" OR "Jamaica government" OR "Jamaica parliament" OR "Jamaica constituency" OR "Jamaica MP" OR "Jamaica candidate")`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CAFFE Electoral Observer Bot 1.0'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const articles: ProcessedArticle[] = [];

      if (data.articles) {
        console.log(`📰 [NEWSAPI] Received ${data.articles.length} articles from NewsAPI`);
        console.log(`📰 [NEWSAPI] Processing first 20 articles...`);
        
        let processedCount = 0;
        let filteredCount = 0;
        
        for (const article of data.articles.slice(0, 20)) {
          console.log(`\n📰 [NEWSAPI] Processing article ${processedCount + 1}/20:`);
          console.log(`📰 [NEWSAPI] Title: "${article.title}"`);
          console.log(`📰 [NEWSAPI] Source: ${article.source?.name || 'Unknown'}`);
          
          // Enhanced filtering to exclude irrelevant content
          if (article.title && article.url && 
              !article.title.includes('[Removed]') &&
              this.isRelevantJamaicanPoliticalContent(article.title, article.description || '')) {
            const processedArticle: ProcessedArticle = {
              id: this.generateArticleId(article.title, 'newsapi'),
              title: this.cleanText(article.title),
              content: this.cleanText(article.description || article.content || ''),
              source: article.source?.name || 'NewsAPI',
              url: article.url,
              publishedAt: new Date(article.publishedAt),
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
            
            // Use Gemini AI for enhanced categorization and analysis
            const geminiAnalysis = await this.analyzeWithGemini(processedArticle);
            if (geminiAnalysis) {
              processedArticle.relevanceScore = geminiAnalysis.relevanceScore;
              processedArticle.electionKeywords = geminiAnalysis.electionKeywords;
              processedArticle.parishMentions = geminiAnalysis.parishMentions;
              processedArticle.sentimentAnalysis = geminiAnalysis.sentimentAnalysis;
            } else {
              // Basic analysis as fallback
              processedArticle.relevanceScore = this.scoreArticleRelevance(processedArticle);
              processedArticle.electionKeywords = this.extractElectionKeywords(processedArticle.title + ' ' + processedArticle.content);
              processedArticle.parishMentions = this.extractParishMentions(processedArticle.title + ' ' + processedArticle.content);
            }
            
            articles.push(processedArticle);
            processedCount++;
            console.log(`✅ [NEWSAPI] Article ${processedCount} ACCEPTED and processed`);
          } else {
            filteredCount++;
            console.log(`❌ [NEWSAPI] Article ${processedCount + 1} FILTERED OUT`);
          }
        }
        
        console.log(`\n📊 [NEWSAPI] SUMMARY:`);
        console.log(`📊 [NEWSAPI] Total articles received: ${data.articles.length}`);
        console.log(`📊 [NEWSAPI] Articles processed: ${processedCount}`);
        console.log(`📊 [NEWSAPI] Articles filtered out: ${filteredCount}`);
        console.log(`📊 [NEWSAPI] Final articles returned: ${articles.length}`);
      }

      console.log(`NewsAPI returned ${articles.length} Jamaica articles with Gemini AI analysis`);
      return articles;

    } catch (error) {
      console.error('NewsAPI fetch failed:', error);
      throw error; // Don't fallback to empty data
    }
  }

  // Analyze article with Gemini AI (with rate limiting)
  private async analyzeWithGemini(article: ProcessedArticle): Promise<any> {
    if (!process.env.GEMINI_API_KEY) {
      return null;
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `
      Analyze this Jamaica news article for electoral relevance and provide detailed categorization:

      TITLE: ${article.title}
      CONTENT: ${article.content}
      SOURCE: ${article.source}

      Please provide a JSON response with:
      {
        "relevanceScore": 1-10 (how relevant to Jamaica elections),
        "electionKeywords": ["array of election-related terms found"],
        "parishMentions": ["array of Jamaica parishes mentioned"],
        "sentimentAnalysis": {
          "sentiment": "positive|negative|neutral",
          "confidence": 0.0-1.0,
          "riskLevel": "low|medium|high|critical"
        },
        "politicalEntities": ["politicians, parties, organizations mentioned"],
        "topicsClassification": ["main topics covered"],
        "criticalityAssessment": "assessment of article importance for electoral monitoring"
      }

      Jamaica Parishes: ${this.jamaicanParishes.join(', ')}
      Election Keywords: ${this.electionKeywords.join(', ')}
      `;

      const response = await genAI.models.generateContent({
        model: 'gemini-1.5-flash', // Use stable model instead of experimental
        contents: prompt
      });

      const analysisText = response.text;
      if (analysisText) {
        // Parse JSON response
        try {
          return JSON.parse(analysisText);
        } catch (parseError) {
          // Extract JSON from response if wrapped in markdown
          const jsonMatch = analysisText.match(/```json\s*(.*?)\s*```/s);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[1]);
          }
        }
      }

      return null;

    } catch (error) {
      // Handle rate limiting gracefully
      if (error.status === 429) {
        console.warn('Gemini API rate limit exceeded, using fallback analysis');
        return null; // Will trigger fallback analysis
      }
      console.error('Gemini analysis error:', error);
      return null;
    }
  }

  // Fallback method for basic relevance scoring when AI is unavailable
  private scoreArticleRelevance(article: ProcessedArticle): number {
    let score = 0;
    const content = (article.title + ' ' + article.content).toLowerCase();
    
    // Check for election keywords
    this.electionKeywords.forEach(keyword => {
      if (content.includes(keyword.toLowerCase())) {
        score += 0.2;
      }
    });
    
    // Check for Jamaica-specific terms
    if (content.includes('jamaica') || content.includes('jamaican')) {
      score += 0.3;
    }
    
    // Check for parish mentions
    this.jamaicanParishes.forEach(parish => {
      if (content.includes(parish.toLowerCase())) {
        score += 0.1;
      }
    });
    
    // Check for political entities
    const politicalTerms = ['jlp', 'pnp', 'holness', 'golding', 'candidate', 'mp', 'constituency'];
    politicalTerms.forEach(term => {
      if (content.includes(term)) {
        score += 0.15;
      }
    });
    
    return Math.min(score, 1.0);
  }

  // Extract election keywords from content
  private extractElectionKeywords(content: string): string[] {
    const keywords: string[] = [];
    const contentLower = content.toLowerCase();
    
    this.electionKeywords.forEach(keyword => {
      if (contentLower.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
      }
    });
    
    return keywords;
  }

  // Extract parish mentions from content
  private extractParishMentions(content: string): string[] {
    const parishes: string[] = [];
    const contentLower = content.toLowerCase();
    
    this.jamaicanParishes.forEach(parish => {
      if (contentLower.includes(parish.toLowerCase())) {
        parishes.push(parish);
      }
    });
    
    return parishes;
  }

  // Enhanced filtering to ensure content is relevant to Jamaican politics
  private isRelevantJamaicanPoliticalContent(title: string, description: string): boolean {
    const content = (title + ' ' + description).toLowerCase();
    
    console.log(`🔍 [NEWS FILTER] Analyzing: "${title}"`);
    console.log(`🔍 [NEWS FILTER] Description: "${description}"`);
    
    // Must contain Jamaica or Jamaican
    if (!content.includes('jamaica') && !content.includes('jamaican')) {
      console.log(`❌ [NEWS FILTER] REJECTED: No Jamaica/Jamaican mention`);
      return false;
    }
    console.log(`✅ [NEWS FILTER] PASSED: Contains Jamaica/Jamaican`);
    
    // Must contain political keywords
    const politicalKeywords = [
      'jlp', 'pnp', 'andrew holness', 'mark golding', 'jamaica labour party', 
      'people\'s national party', 'election', 'politics', 'government', 'parliament',
      'constituency', 'mp', 'candidate', 'minister', 'opposition', 'democracy',
      'vote', 'voting', 'campaign', 'manifesto', 'policy', 'budget', 'economy'
    ];
    
    const foundPoliticalKeywords = politicalKeywords.filter(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    if (foundPoliticalKeywords.length === 0) {
      console.log(`❌ [NEWS FILTER] REJECTED: No political keywords found`);
      console.log(`🔍 [NEWS FILTER] Searched for: ${politicalKeywords.join(', ')}`);
      return false;
    }
    console.log(`✅ [NEWS FILTER] PASSED: Found political keywords: ${foundPoliticalKeywords.join(', ')}`);
    
    // Exclude irrelevant content
    const excludeKeywords = [
      'kfc', 'chicken', 'bucket', 'restaurant', 'food', 'menu', 'fast food',
      'sports', 'football', 'cricket', 'basketball', 'entertainment', 'music',
      'movie', 'celebrity', 'gossip', 'fashion', 'beauty', 'travel', 'tourism',
      'weather', 'hurricane', 'earthquake', 'natural disaster'
    ];
    
    const foundExcludeKeywords = excludeKeywords.filter(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    if (foundExcludeKeywords.length > 0) {
      console.log(`❌ [NEWS FILTER] REJECTED: Found excluded keywords: ${foundExcludeKeywords.join(', ')}`);
      return false;
    }
    
    console.log(`✅ [NEWS FILTER] FINAL RESULT: ACCEPTED - Relevant Jamaican political content`);
    return true;
  }
}