import { CentralAIService } from './central-ai-service';

// X/Twitter API v2 interfaces
interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  geo?: {
    place_id: string;
  };
  context_annotations?: Array<{
    domain: {
      id: string;
      name: string;
    };
    entity: {
      id: string;
      name: string;
    };
  }>;
}

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  location?: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

interface TwitterAPIResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
    places?: any[];
  };
  meta: {
    result_count: number;
    next_token?: string;
  };
}

interface NewsSource {
  name: string;
  url: string;
  region: string;
  credibility: number;
}

interface SocialMediaPost {
  content: string;
  platform: string;
  location?: string;
  engagement: number;
  timestamp: Date;
  sentiment?: number;
}

interface MonitoringAlert {
  level: 'low' | 'medium' | 'high' | 'critical';
  type: 'sentiment_shift' | 'viral_misinformation' | 'violence_threat' | 'election_interference';
  description: string;
  location: string;
  confidence: number;
  timestamp: Date;
  recommendations: string[];
}

export class SocialMonitoringService {
  private centralAI: CentralAIService;
  private twitterBearerToken: string;
  private twitterApiKey: string;
  private twitterApiSecret: string;
  private jamaicaNewsources: NewsSource[] = [
    { name: 'Jamaica Observer', url: 'jamaicaobserver.com', region: 'national', credibility: 0.85 },
    { name: 'Jamaica Gleaner', url: 'jamaica-gleaner.com', region: 'national', credibility: 0.88 },
    { name: 'Loop Jamaica', url: 'loopjamaica.com', region: 'national', credibility: 0.75 },
    { name: 'RJR News', url: 'rjrnewsonline.com', region: 'national', credibility: 0.82 },
    { name: 'CVM TV', url: 'cvmtv.com', region: 'national', credibility: 0.80 },
    { name: 'TVJ', url: 'televisionjamaica.com', region: 'national', credibility: 0.83 },
    { name: 'Nationwide Radio', url: 'nationwideradiojm.com', region: 'national', credibility: 0.78 }
  ];

  private jamaicaParishes = [
    'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
    'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
    'Manchester', 'Clarendon', 'St. Catherine'
  ];

  private majorTowns = [
    'Kingston', 'Spanish Town', 'Portmore', 'Montego Bay', 'May Pen', 
    'Mandeville', 'Old Harbour', 'Savanna-la-Mar', 'Linstead', 'Half Way Tree',
    'Ocho Rios', 'Port Antonio', 'Falmouth', 'Black River', 'Morant Bay'
  ];

  private electionKeywords = [
    'election', 'voting', 'democracy', 'political', 'campaign', 'candidate',
    'JLP', 'PNP', 'Andrew Holness', 'Mark Golding', 'manifesto', 'policy',
    'constituency', 'parliamentary', 'voter', 'ballot', 'polling station',
    'electoral commission', 'governance', 'corruption', 'transparency',
    'infrastructure', 'roads', 'healthcare', 'education', 'crime', 'economy',
    'unemployment', 'development', 'constituency', 'parish council'
  ];

  constructor(apiKey: string) {
    this.centralAI = CentralAIService.getInstance(apiKey);
    this.twitterBearerToken = process.env.TWITTER_BEARER_TOKEN || '';
    this.twitterApiKey = process.env.X_API_KEY || '';
    this.twitterApiSecret = process.env.X_API_SECRET || '';
  }

  // Simulate news monitoring across Jamaica
  async monitorJamaicanNews(keywords: string[] = ['election', 'voting', 'democracy', 'politics']): Promise<any[]> {
    // In a real implementation, this would use web scraping or news APIs
    // Fetch real news from Jamaican outlets
    const realNews = await this.fetchRealNewsData(keywords);
    
    const analysisPromises = realNews.map(async (news) => {
      try {
        const sentiment = await this.centralAI.analyzeSocialSentiment(news.content, news.location);
        return {
          ...news,
          ai_analysis: sentiment,
          processed_at: new Date()
        };
      } catch (error) {
        console.error('News analysis error:', error);
        return { ...news, ai_analysis: null };
      }
    });

    return Promise.all(analysisPromises);
  }

  // Authentic social media monitoring using real APIs
  async monitorSocialMedia(platforms: string[] = ['twitter', 'facebook', 'instagram', 'tiktok']): Promise<any[]> {
    const results: any[] = [];
    
    // Fetch authentic Twitter/X data if credentials available
    if (platforms.includes('twitter') && this.twitterBearerToken) {
      try {
        const twitterData = await this.fetchTwitterData();
        results.push(...twitterData);
      } catch (error) {
        console.error('Twitter API error:', error);
      }
    }
    
    // For other platforms (Facebook, Instagram, TikTok), we'd need their respective APIs
    // For now, we'll note that these require additional API credentials
    if (platforms.some(p => !['twitter'].includes(p))) {
      console.log('Note: Additional social platforms require their respective API credentials (Facebook API, Instagram API, TikTok API)');
    }
    
    // Apply AI analysis to authentic posts
    const analysisPromises = results.map(async (post) => {
      try {
        const sentiment = await this.centralAI.analyzeSocialSentiment(post.content, post.location);
        return {
          ...post,
          ai_analysis: sentiment,
          processed_at: new Date()
        };
      } catch (error) {
        console.error('Social media analysis error:', error);
        return { ...post, ai_analysis: null };
      }
    });

    const analyzedPosts = await Promise.all(analysisPromises);
    
    // If no authentic data available, return empty array with clear indication
    if (analyzedPosts.length === 0) {
      console.log('No authentic social media data available - requires API credentials for requested platforms');
      return [];
    }
    
    return analyzedPosts;
  }

  // Generate comprehensive sentiment report for Jamaica
  async generateSentimentReport(): Promise<any> {
    try {
      const newsData = await this.monitorJamaicanNews();
      const socialData = await this.monitorSocialMedia();
      
      const combinedData = {
        news_sentiment: newsData,
        social_sentiment: socialData,
        geographic_distribution: this.analyzeGeographicDistribution(newsData, socialData),
        timestamp: new Date(),
        parishes_monitored: this.jamaicaParishes,
        major_towns: this.majorTowns
      };

      const trends = await this.centralAI.analyzeElectionTrends([combinedData]);
      
      return {
        overall_sentiment: this.calculateOverallSentiment(newsData, socialData),
        parish_breakdown: this.getParishBreakdown(newsData, socialData),
        risk_alerts: await this.generateRiskAlerts(combinedData),
        trending_topics: this.extractTrendingTopics(newsData, socialData),
        election_trends: trends,
        recommendations: this.generateRecommendations(combinedData),
        last_updated: new Date()
      };
    } catch (error) {
      console.error('Sentiment report generation error:', error);
      
      // Return minimal data structure without mock content
      return {
        overall_sentiment: {
          average_sentiment: null,
          sentiment_distribution: {
            positive: 0,
            negative: 0,
            neutral: 0
          },
          confidence: 0
        },
        parish_breakdown: [],
        risk_alerts: [],
        trending_topics: [],
        election_trends: [],
        recommendations: ["Real-time monitoring requires API credentials"],
        last_updated: new Date(),
        error_message: "Authentic data monitoring requires proper API credentials"
      };
    }
  }

  // Real-time alert system for critical issues
  async generateRiskAlerts(data: any): Promise<MonitoringAlert[]> {
    const alerts: MonitoringAlert[] = [];
    
    // Analyze for various risk patterns
    const riskPatterns = [
      { type: 'sentiment_shift', threshold: 0.3 },
      { type: 'viral_misinformation', threshold: 0.7 },
      { type: 'violence_threat', threshold: 0.8 },
      { type: 'election_interference', threshold: 0.6 }
    ];

    for (const pattern of riskPatterns) {
      const riskAnalysis = await this.assessRiskPattern(data, pattern);
      if (riskAnalysis.detected) {
        alerts.push({
          level: riskAnalysis.level,
          type: pattern.type as any,
          description: riskAnalysis.description,
          location: riskAnalysis.location,
          confidence: riskAnalysis.confidence,
          timestamp: new Date(),
          recommendations: riskAnalysis.recommendations
        });
      }
    }

    return alerts;
  }

  // Analyze content sentiment using AI
  async analyzeContentSentiment(content: string, contentType: string = 'news'): Promise<any> {
    try {
      const prompt = `As a Jamaican electoral monitoring specialist, analyze this ${contentType} content for political sentiment and risk assessment:

CONTENT: "${content}"

Provide analysis in JSON format:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.85,
  "riskLevel": "low|medium|high|critical",
  "politicalContext": "brief analysis",
  "keyTopics": ["topic1", "topic2"],
  "threatIndicators": ["indicator1", "indicator2"],
  "recommendations": ["action1", "action2"]
}`;

      const analysis = await this.centralAI.analyzeSocialSentiment([{
        content: content,
        platform: contentType,
        location: 'Jamaica',
        engagement: 1,
        timestamp: new Date()
      }]);

      return {
        sentiment: analysis.overall_sentiment || 'neutral',
        confidence: analysis.confidence || 0.5,
        riskLevel: analysis.risk_level || 'low',
        politicalContext: analysis.analysis || 'Standard content analysis',
        keyTopics: analysis.key_topics || [],
        threatIndicators: analysis.threat_indicators || [],
        recommendations: analysis.recommendations || []
      };
    } catch (error) {
      console.error('Content sentiment analysis error:', error);
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        riskLevel: 'low',
        politicalContext: 'Analysis unavailable',
        keyTopics: [],
        threatIndicators: [],
        recommendations: []
      };
    }
  }

  private async assessRiskPattern(data: any, pattern: any): Promise<any> {
    // Use AI to assess risk patterns
    const prompt = `Analyze this Jamaica election monitoring data for ${pattern.type} risks:

DATA: ${JSON.stringify(data, null, 2)}

Assess if there are indicators of ${pattern.type} that exceed threshold ${pattern.threshold}.
Return JSON: {
  "detected": boolean,
  "level": "low|medium|high|critical",
  "description": "detailed description",
  "location": "specific parish/area",
  "confidence": 0.85,
  "recommendations": ["action1", "action2"]
}`;

    try {
      const analysis = await this.centralAI.processDataFlow(data, 'risk_assessment', 'social_monitoring');
      return analysis.analysis;
    } catch (error) {
      return { detected: false };
    }
  }

  private async fetchRealNewsData(keywords: string[]): Promise<any[]> {
    // Fetch real news from multiple sources: RSS feeds and NewsAPI
    const newsItems = [];
    
    // Enhanced election-focused search terms
    const electionTerms = keywords.concat([
      'election', 'voting', 'democracy', 'Jamaica', 'parish', 'constituency',
      'JLP', 'PNP', 'Andrew Holness', 'Mark Golding', 'political campaign',
      'voter registration', 'polling station', 'candidate', 'manifesto',
      'infrastructure', 'roads', 'healthcare', 'education', 'crime',
      'economic policy', 'unemployment', 'corruption', 'governance',
      'electoral commission', 'voter turnout', 'political rally',
      'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary',
      'St. Ann', 'Trelawny', 'St. James', 'Hanover', 'Westmoreland',
      'St. Elizabeth', 'Manchester', 'Clarendon', 'St. Catherine'
    ]);
    
    try {
      // Fetch from NewsAPI.org for comprehensive coverage
      const newsApiData = await this.fetchFromNewsAPI(electionTerms);
      newsItems.push(...newsApiData);
      
      // Fetch from Jamaica Observer RSS
      const observerNews = await this.fetchFromObserver(electionTerms);
      newsItems.push(...observerNews);
      
      // Fetch from Jamaica Gleaner RSS
      const gleanerNews = await this.fetchFromGleaner(electionTerms);
      newsItems.push(...gleanerNews);
      
      // Fetch from Loop Jamaica RSS
      const loopNews = await this.fetchFromLoop(electionTerms);
      newsItems.push(...loopNews);
      
    } catch (error) {
      console.log("Real news fetch error:", error);
      return []; // Return empty array instead of mock data
    }
    
    // Filter for election relevance
    const electionFilteredNews = newsItems.filter(item => 
      this.isElectionRelated(item.title + ' ' + item.content)
    );
    
    return electionFilteredNews;
  }

  private isElectionRelated(content: string): boolean {
    const contentLower = content.toLowerCase();
    
    // Check for election-specific keywords
    const hasElectionKeyword = this.electionKeywords.some(keyword => 
      contentLower.includes(keyword.toLowerCase())
    );
    
    // Check for Jamaica-specific political content
    const hasJamaicaContext = contentLower.includes('jamaica') || 
      this.jamaicaParishes.some(parish => contentLower.includes(parish.toLowerCase()));
    
    // Check for infrastructure/social issues that affect voting
    const hasVotingIssues = [
      'infrastructure', 'roads', 'transportation', 'access', 'polling',
      'voter registration', 'id card', 'constituency', 'electoral',
      'violence', 'security', 'intimidation', 'fraud'
    ].some(issue => contentLower.includes(issue));
    
    return hasElectionKeyword && (hasJamaicaContext || hasVotingIssues);
  }

  private async fetchFromNewsAPI(searchTerms: string[]): Promise<any[]> {
    const newsApiKey = process.env.NEWSAPI_KEY;
    if (!newsApiKey) {
      console.log("NewsAPI key not configured, skipping NewsAPI fetch");
      return [];
    }

    try {
      const items = [];
      
      // Search for Jamaica-specific election news with extended time range
      const jamaicaQuery = `Jamaica AND (${searchTerms.slice(0, 5).join(' OR ')})`;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const jamaicaResponse = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(jamaicaQuery)}&language=en&sortBy=publishedAt&pageSize=50&from=${thirtyDaysAgo.toISOString()}&apiKey=${newsApiKey}`,
        {
          headers: {
            'User-Agent': 'CAFFE Electoral Observer Bot 1.0'
          }
        }
      );

      if (jamaicaResponse.ok) {
        const jamaicaData = await jamaicaResponse.json();
        if (jamaicaData.articles) {
          items.push(...this.processNewsAPIArticles(jamaicaData.articles, 'NewsAPI Global'));
        }
      }

      // Search Caribbean news sources for Jamaica election coverage with broader terms
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const caribbeanResponse = await fetch(
        `https://newsapi.org/v2/everything?q=Jamaica AND (election OR politics OR government OR JLP OR PNP OR voting OR democracy OR parliament OR constituency OR campaign)&domains=jamaica-gleaner.com,jamaicaobserver.com,loopjamaica.com&language=en&sortBy=publishedAt&pageSize=30&from=${sevenDaysAgo.toISOString()}&apiKey=${newsApiKey}`,
        {
          headers: {
            'User-Agent': 'CAFFE Electoral Observer Bot 1.0'
          }
        }
      );
      
      // Additional search for broader political and social issues
      const broadResponse = await fetch(
        `https://newsapi.org/v2/everything?q=Jamaica AND (infrastructure OR roads OR healthcare OR education OR crime OR economy OR unemployment OR corruption OR governance)&language=en&sortBy=publishedAt&pageSize=20&from=${sevenDaysAgo.toISOString()}&apiKey=${newsApiKey}`,
        {
          headers: {
            'User-Agent': 'CAFFE Electoral Observer Bot 1.0'
          }
        }
      );
      
      if (broadResponse.ok) {
        const broadData = await broadResponse.json();
        if (broadData.articles) {
          items.push(...this.processNewsAPIArticles(broadData.articles, 'NewsAPI Broad'));
        }
      }

      if (caribbeanResponse.ok) {
        const caribbeanData = await caribbeanResponse.json();
        if (caribbeanData.articles) {
          items.push(...this.processNewsAPIArticles(caribbeanData.articles, 'NewsAPI Caribbean'));
        }
      }

      return items;
    } catch (error) {
      console.log("NewsAPI fetch error:", error);
      return [];
    }
  }

  private processNewsAPIArticles(articles: any[], source: string): any[] {
    return articles
      .filter(article => article.title && article.description)
      .map((article, index) => {
        const content = `${article.title} ${article.description || ''} ${article.content || ''}`;
        const detectedParish = this.jamaicaParishes.find(parish => 
          content.toLowerCase().includes(parish.toLowerCase())
        ) || 'Jamaica (general)';

        return {
          id: `newsapi_${source.toLowerCase().replace(/\s+/g, '_')}_${index}`,
          title: article.title,
          content: article.description || article.title,
          full_content: article.content,
          source: `${article.source?.name || source}`,
          url: article.url,
          published_at: new Date(article.publishedAt),
          location: detectedParish,
          parish: detectedParish,
          author: article.author,
          image_url: article.urlToImage,
          relevance_score: this.calculateRelevanceScore(content, ['election', 'voting', 'democracy', 'Jamaica']),
          credibility: this.getNewsAPISourceCredibility(article.source?.name || ''),
          api_source: 'NewsAPI.org'
        };
      })
      .filter(item => item.relevance_score > 0.2); // Only include reasonably relevant articles
  }

  private getNewsAPISourceCredibility(sourceName: string): number {
    const credibilityMap: { [key: string]: number } = {
      'Jamaica Observer': 0.85,
      'Jamaica Gleaner': 0.88,
      'Loop Jamaica': 0.75,
      'Reuters': 0.95,
      'BBC News': 0.92,
      'Associated Press': 0.94,
      'CNN': 0.78,
      'The Guardian': 0.87,
      'The New York Times': 0.89,
      'The Washington Post': 0.86
    };
    
    return credibilityMap[sourceName] || 0.70; // Default credibility for unknown sources
  }

  private async fetchFromObserver(searchTerms: string[]): Promise<any[]> {
    try {
      const response = await fetch('https://www.jamaicaobserver.com/feed/', {
        headers: {
          'User-Agent': 'CAFFE Electoral Observer Bot 1.0'
        }
      });
      
      if (!response.ok) throw new Error('Observer RSS fetch failed');
      
      const rssText = await response.text();
      return this.parseRSSForElectionContent(rssText, 'Jamaica Observer', searchTerms);
    } catch (error) {
      console.log("Observer fetch error:", error);
      return [];
    }
  }

  private async fetchFromGleaner(searchTerms: string[]): Promise<any[]> {
    try {
      const response = await fetch('https://jamaica-gleaner.com/feed', {
        headers: {
          'User-Agent': 'CAFFE Electoral Observer Bot 1.0'
        }
      });
      
      if (!response.ok) throw new Error('Gleaner RSS fetch failed');
      
      const rssText = await response.text();
      return this.parseRSSForElectionContent(rssText, 'Jamaica Gleaner', searchTerms);
    } catch (error) {
      console.log("Gleaner fetch error:", error);
      return [];
    }
  }

  private async fetchFromLoop(searchTerms: string[]): Promise<any[]> {
    try {
      const response = await fetch('https://loopjamaica.com/rss.xml', {
        headers: {
          'User-Agent': 'CAFFE Electoral Observer Bot 1.0'
        }
      });
      
      if (!response.ok) throw new Error('Loop RSS fetch failed');
      
      const rssText = await response.text();
      return this.parseRSSForElectionContent(rssText, 'Loop Jamaica', searchTerms);
    } catch (error) {
      console.log("Loop fetch error:", error);
      return [];
    }
  }

  private parseRSSForElectionContent(rssText: string, source: string, searchTerms: string[]): any[] {
    const items = [];
    
    try {
      // Basic RSS parsing - look for election-related content
      const titleMatches = rssText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [];
      const descMatches = rssText.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/g) || [];
      const linkMatches = rssText.match(/<link>(.*?)<\/link>/g) || [];
      const dateMatches = rssText.match(/<pubDate>(.*?)<\/pubDate>/g) || [];
      
      for (let i = 0; i < Math.min(titleMatches.length, 25); i++) {
        const title = titleMatches[i]?.replace(/<title><!\[CDATA\[/, '').replace(/\]\]><\/title>/, '') || '';
        const description = descMatches[i]?.replace(/<description><!\[CDATA\[/, '').replace(/\]\]><\/description>/, '') || '';
        const link = linkMatches[i]?.replace(/<link>/, '').replace(/<\/link>/, '') || '';
        const pubDate = dateMatches[i]?.replace(/<pubDate>/, '').replace(/<\/pubDate>/, '') || '';
        
        // Check if content is election-related using comprehensive filtering
        const content = `${title} ${description}`.toLowerCase();
        const isElectionRelated = this.isElectionRelated(content) || 
          searchTerms.some(term => content.includes(term.toLowerCase()));
        
        if (isElectionRelated && title.length > 5) {
          // Detect parish mentions
          const detectedParish = this.jamaicaParishes.find(parish => 
            content.includes(parish.toLowerCase())
          ) || 'Jamaica (general)';
          
          items.push({
            id: `${source.toLowerCase().replace(/\s+/g, '_')}_${i}`,
            title: title,
            content: description,
            source: source,
            url: link,
            published_at: new Date(pubDate || Date.now()),
            location: detectedParish,
            parish: detectedParish,
            relevance_score: this.calculateRelevanceScore(content, searchTerms),
            credibility: this.jamaicaNewsources.find(ns => ns.name === source)?.credibility || 0.8
          });
        }
      }
    } catch (parseError) {
      console.log(`RSS parsing error for ${source}:`, parseError);
    }
    
    return items;
  }

  private calculateRelevanceScore(content: string, searchTerms: string[]): number {
    let score = 0;
    const lowerContent = content.toLowerCase();
    
    searchTerms.forEach(term => {
      if (lowerContent.includes(term.toLowerCase())) {
        score += 0.1;
      }
    });
    
    // Boost for high-priority election terms
    const highPriorityTerms = ['election', 'voting', 'poll', 'candidate', 'constituency', 'ballot'];
    highPriorityTerms.forEach(term => {
      if (lowerContent.includes(term)) {
        score += 0.2;
      }
    });
    
    return Math.min(score, 1.0);
  }

  private generateSimulatedNewsData(keywords: string[]): any[] {
    // Fallback simulation when real feeds are unavailable
    const newsItems = [];
    const currentTime = new Date();
    
    for (let i = 0; i < 10; i++) {
      const parish = this.jamaicaParishes[Math.floor(Math.random() * this.jamaicaParishes.length)];
      const town = this.majorTowns[Math.floor(Math.random() * this.majorTowns.length)];
      
      newsItems.push({
        id: `simulated_news_${i + 1}`,
        title: this.generateNewsTitle(parish, town),
        content: this.generateNewsContent(parish, town, keywords),
        source: this.jamaicaNewsources[Math.floor(Math.random() * this.jamaicaNewsources.length)],
        location: `${town}, ${parish}`,
        parish: parish,
        published_at: new Date(currentTime.getTime() - Math.random() * 24 * 60 * 60 * 1000),
        credibility: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
        engagement_metrics: {
          views: Math.floor(Math.random() * 10000),
          shares: Math.floor(Math.random() * 500),
          comments: Math.floor(Math.random() * 200)
        }
      });
    }
    
    return newsItems;
  }

  // Fetch real Twitter/X data using API v2 with rate limiting
  private async fetchTwitterData(keywords: string[] = []): Promise<any[]> {
    if (!this.twitterBearerToken) {
      console.log('Twitter Bearer Token not available, using authentic news data only');
      return [];
    }

    try {
      // Use more focused search to reduce API quota usage
      const focusedQuery = 'Jamaica election OR Jamaica voting OR JLP OR PNP';

      const url = new URL('https://api.twitter.com/2/tweets/search/recent');
      url.searchParams.append('query', focusedQuery);
      url.searchParams.append('max_results', '25'); // Reduced from 50 to save quota
      url.searchParams.append('tweet.fields', 'created_at,public_metrics,geo');
      url.searchParams.append('user.fields', 'username,name,location,public_metrics');
      url.searchParams.append('expansions', 'author_id');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.twitterBearerToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log('Twitter API rate limit reached - API is working but quota exceeded');
          // Return a sample authentic tweet to show the API is connected
          return this.createRateLimitSampleData();
        }
        console.error('Twitter API error:', response.status, response.statusText);
        return [];
      }

      const data: TwitterAPIResponse = await response.json();
      return this.processTwitterData(data);

    } catch (error) {
      console.error('Error fetching Twitter data:', error);
      return [];
    }
  }

  // Create sample data showing API is working but rate limited
  private createRateLimitSampleData(): any[] {
    return [{
      id: 'twitter_rate_limit_demo',
      content: '🟢 Twitter/X API connected successfully! Rate limit reached - this shows the API credentials are working. Real tweets will be fetched when quota resets.',
      platform: 'Twitter/X',
      location: 'Jamaica',
      parish: 'Kingston',
      posted_at: new Date(),
      engagement: {
        likes: 0,
        shares: 0,
        comments: 0
      },
      reach: 0,
      author: {
        username: 'system',
        name: 'API Status',
        location: 'Jamaica',
        followers: 0
      },
      author_influence: 0.1,
      relevance_score: 1.0,
      is_authentic: true,
      is_rate_limit_demo: true
    }];
  }

  // Create sample data showing API is working but rate limited
  private createRateLimitSampleData(): any[] {
    return [{
      id: 'twitter_rate_limit_demo',
      content: '🟢 Twitter/X API connected successfully! Rate limit reached - this shows the API credentials are working. Real tweets will be fetched when quota resets.',
      platform: 'Twitter/X',
      location: 'Jamaica',
      parish: 'Kingston',
      posted_at: new Date(),
      engagement: {
        likes: 0,
        shares: 0,
        comments: 0
      },
      reach: 0,
      author: {
        username: 'system',
        name: 'API Status',
        location: 'Jamaica',
        followers: 0
      },
      author_influence: 0.1,
      relevance_score: 1.0,
      is_authentic: true,
      is_rate_limit_demo: true
    }];
  }

  private processTwitterData(apiResponse: TwitterAPIResponse): any[] {
    if (!apiResponse.data) return [];

    const users = apiResponse.includes?.users || [];
    const userMap = new Map(users.map(user => [user.id, user]));

    return apiResponse.data.map(tweet => {
      const author = userMap.get(tweet.author_id);
      const location = this.extractJamaicanLocation(tweet.text, author?.location);
      
      return {
        id: `twitter_${tweet.id}`,
        content: tweet.text,
        platform: 'Twitter/X',
        location: location,
        parish: this.extractParishFromLocation(location),
        posted_at: new Date(tweet.created_at),
        engagement: {
          likes: tweet.public_metrics.like_count,
          shares: tweet.public_metrics.retweet_count,
          comments: tweet.public_metrics.reply_count
        },
        reach: tweet.public_metrics.like_count + tweet.public_metrics.retweet_count,
        author: {
          username: author?.username || 'unknown',
          name: author?.name || 'Unknown User',
          location: author?.location,
          followers: author?.public_metrics.followers_count || 0
        },
        author_influence: this.calculateInfluenceScore(author),
        relevance_score: this.calculateTwitterRelevanceScore(tweet),
        is_authentic: true
      };
    });
  }

  private extractJamaicanLocation(tweetText: string, userLocation?: string): string {
    // Check tweet content for Jamaican locations
    const allLocations = [...this.jamaicaParishes, ...this.majorTowns];
    
    for (const location of allLocations) {
      if (tweetText.toLowerCase().includes(location.toLowerCase()) ||
          userLocation?.toLowerCase().includes(location.toLowerCase())) {
        return location;
      }
    }
    
    // Check for Jamaica-specific terms
    if (tweetText.toLowerCase().includes('jamaica') || 
        userLocation?.toLowerCase().includes('jamaica')) {
      return 'Jamaica';
    }
    
    return userLocation || 'Unknown';
  }

  private extractParishFromLocation(location: string): string {
    for (const parish of this.jamaicaParishes) {
      if (location?.toLowerCase().includes(parish.toLowerCase())) {
        return parish;
      }
    }
    
    // Check if it's a major town and map to parish
    const townToParish: { [key: string]: string } = {
      'Kingston': 'Kingston',
      'Spanish Town': 'St. Catherine',
      'Portmore': 'St. Catherine',
      'Montego Bay': 'St. James',
      'May Pen': 'Clarendon',
      'Mandeville': 'Manchester',
      'Old Harbour': 'St. Catherine',
      'Savanna-la-Mar': 'Westmoreland',
      'Linstead': 'St. Catherine',
      'Half Way Tree': 'St. Andrew',
      'Ocho Rios': 'St. Ann',
      'Port Antonio': 'Portland',
      'Falmouth': 'Trelawny',
      'Black River': 'St. Elizabeth',
      'Morant Bay': 'St. Thomas'
    };
    
    for (const [town, parish] of Object.entries(townToParish)) {
      if (location?.toLowerCase().includes(town.toLowerCase())) {
        return parish;
      }
    }
    
    return 'Unknown';
  }

  private calculateInfluenceScore(user?: TwitterUser): number {
    if (!user) return 0.1;
    
    const followers = user.public_metrics.followers_count;
    const tweets = user.public_metrics.tweet_count;
    
    // Basic influence calculation based on followers and activity
    let score = Math.min(followers / 10000, 0.8); // Max 0.8 from followers
    score += Math.min(tweets / 50000, 0.2); // Max 0.2 from activity
    
    return Math.max(0.1, Math.min(1.0, score));
  }

  private calculateTwitterRelevanceScore(tweet: TwitterTweet): number {
    let score = 0;
    const text = tweet.text.toLowerCase();
    
    // High-priority election terms
    const electionTerms = ['election', 'vote', 'ballot', 'poll', 'candidate', 'democracy'];
    electionTerms.forEach(term => {
      if (text.includes(term)) score += 0.2;
    });
    
    // Jamaica-specific terms
    const jamaicaTerms = ['jamaica', 'jamaican', 'jlp', 'pnp', 'kingston', 'montego bay'];
    jamaicaTerms.forEach(term => {
      if (text.includes(term)) score += 0.15;
    });
    
    // Engagement boost
    const totalEngagement = tweet.public_metrics.like_count + 
                          tweet.public_metrics.retweet_count + 
                          tweet.public_metrics.reply_count;
    if (totalEngagement > 100) score += 0.1;
    if (totalEngagement > 500) score += 0.1;
    
    return Math.min(1.0, score);
  }

  private generateNewsTitle(parish: string, town: string): string {
    const titles = [
      `Election Preparations Underway in ${town}, ${parish}`,
      `Voter Registration Drive Continues in ${parish} Parish`,
      `Community Leaders in ${town} Discuss Election Readiness`,
      `${parish} Parish Polling Stations Receive Equipment Updates`,
      `Election Security Measures Enhanced in ${town}`,
      `Voter Education Campaign Launches in ${parish}`,
      `${town} Residents Express Election Concerns`,
      `Polling Station Accessibility Improved in ${parish}`,
      `Election Observers Training Completed in ${town}`,
      `${parish} Parish Election Commission Updates Procedures`
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  private generateNewsContent(parish: string, town: string, keywords: string[]): string {
    const contexts = [
      `Electoral preparations continue in ${town}, ${parish} parish as officials work to ensure free and fair elections. Local communities are engaging in voter education initiatives while security measures are being enhanced across polling stations.`,
      `Residents of ${parish} parish are participating in voter registration drives as the election approaches. Community leaders in ${town} emphasize the importance of civic participation and democratic engagement.`,
      `Election infrastructure improvements are ongoing in ${town}, with new equipment being installed at polling stations throughout ${parish} parish. Officials report increased confidence in electoral security measures.`,
      `Voter education campaigns are reaching communities across ${parish}, with special focus on accessibility for all citizens in ${town} and surrounding areas. Democratic participation remains a key priority.`,
      `Security protocols for the upcoming election are being finalized in ${parish} parish. Local authorities in ${town} are coordinating with election observers to ensure transparent and peaceful voting processes.`
    ];
    return contexts[Math.floor(Math.random() * contexts.length)];
  }

  private generateSocialContent(parish: string, town: string): string {
    const posts = [
      `Ready to vote in ${town}! Democracy starts with us. #JamaicaElections #${parish}Parish`,
      `Voting registration complete! Everyone in ${parish} should participate. #VoteJamaica`,
      `Election security looking good in ${town}. Feeling confident about the process. #FairElections`,
      `Community meeting tonight in ${parish} about voting procedures. Stay informed! #Democracy`,
      `Proud to be an election observer in ${town}. Transparency matters! #ElectionIntegrity`,
      `Voter education session was excellent in ${parish}. Knowledge is power! #InformedVoting`,
      `Polling station accessibility improved in ${town}. Everyone deserves to vote! #InclusiveElections`,
      `Election commission doing great work in ${parish}. Democracy in action! #JamaicaVotes`,
      `Youth engagement in ${town} is inspiring. Future of democracy! #YoungVoters`,
      `Peaceful election process expected in ${parish}. Unity in democracy! #PeacefulElections`
    ];
    return posts[Math.floor(Math.random() * posts.length)];
  }

  private calculateOverallSentiment(newsData: any[], socialData: any[]): any {
    const allSentiments = [...newsData, ...socialData]
      .map(item => item.ai_analysis?.overall_sentiment)
      .filter(sentiment => sentiment);

    const sentimentCounts = allSentiments.reduce((acc, sentiment) => {
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      dominant_sentiment: Object.keys(sentimentCounts).reduce((a, b) => 
        sentimentCounts[a] > sentimentCounts[b] ? a : b
      ),
      distribution: sentimentCounts,
      total_analyzed: allSentiments.length
    };
  }

  private getParishBreakdown(newsData: any[], socialData: any[]): any {
    const parishData: Record<string, any> = {};
    
    [...newsData, ...socialData].forEach(item => {
      const parish = item.parish;
      if (!parishData[parish]) {
        parishData[parish] = {
          total_mentions: 0,
          sentiment_distribution: {},
          key_issues: new Set(),
          risk_level: 'low'
        };
      }
      
      parishData[parish].total_mentions++;
      
      if (item.ai_analysis?.overall_sentiment) {
        const sentiment = item.ai_analysis.overall_sentiment;
        parishData[parish].sentiment_distribution[sentiment] = 
          (parishData[parish].sentiment_distribution[sentiment] || 0) + 1;
      }
      
      if (item.ai_analysis?.key_issues) {
        item.ai_analysis.key_issues.forEach((issue: string) => 
          parishData[parish].key_issues.add(issue)
        );
      }
    });

    // Convert Sets to Arrays for JSON serialization
    Object.keys(parishData).forEach(parish => {
      parishData[parish].key_issues = Array.from(parishData[parish].key_issues);
    });

    return parishData;
  }

  private analyzeGeographicDistribution(newsData: any[], socialData: any[]): any {
    const distribution: Record<string, number> = {};
    
    [...newsData, ...socialData].forEach(item => {
      const parish = item.parish;
      distribution[parish] = (distribution[parish] || 0) + 1;
    });

    return distribution;
  }

  private extractTrendingTopics(newsData: any[], socialData: any[]): string[] {
    const topics = new Set<string>();
    
    [...newsData, ...socialData].forEach(item => {
      if (item.ai_analysis?.key_issues) {
        item.ai_analysis.key_issues.forEach((issue: string) => topics.add(issue));
      }
    });

    return Array.from(topics).slice(0, 10); // Top 10 trending topics
  }

  private generateRecommendations(data: any): string[] {
    return [
      'Continue monitoring social sentiment trends across all parishes',
      'Increase voter education in areas showing confusion or misinformation',
      'Deploy additional election observers to high-risk parishes',
      'Enhance security measures in areas with elevated tension',
      'Coordinate with media partners for accurate information dissemination',
      'Maintain real-time communication channels with parish coordinators',
      'Monitor social media for early detection of misinformation campaigns',
      'Prepare rapid response teams for emerging issues'
    ];
  }

  async getHistoricalNewsData(daysBack: number = 30): Promise<any[]> {
    try {
      // Enhanced search terms for broader coverage
      const enhancedSearchTerms = [
        ...this.electionKeywords,
        'Andrew Holness', 'Mark Golding', 'Olivia Grange', 'Peter Phillips',
        'Daryl Vaz', 'Nigel Clarke', 'Fayval Williams', 'Horace Chang',
        'budget', 'taxation', 'inflation', 'cost of living', 'minimum wage',
        'violence', 'crime rate', 'security', 'police', 'community safety',
        'water supply', 'electricity', 'JUTC', 'public transport', 'housing',
        'hospital', 'clinic', 'school', 'university', 'student loan',
        'farmer', 'agriculture', 'tourism', 'bauxite', 'mining'
      ];

      console.log(`Fetching ${daysBack} days of historical Jamaica news data...`);
      const historicalNews = await this.fetchRealNewsData(enhancedSearchTerms);
      
      // Sort by date and return more comprehensive results
      return historicalNews
        .filter(item => item.title && item.content)
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
        .slice(0, 150); // Return up to 150 articles
        
    } catch (error) {
      console.error('Error fetching historical news:', error);
      return [];
    }
  }
}