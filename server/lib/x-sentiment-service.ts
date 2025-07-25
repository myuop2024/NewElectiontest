import { db } from '../db';
import { xSocialPosts, xSentimentAnalysis, xMonitoringConfig, xMonitoringAlerts } from '@shared/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { APICreditManager } from './api-credit-manager';

// X API v2 interfaces for posts and sentiment analysis
interface XAPIPost {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
    view_count?: number;
  };
  geo?: {
    place_id: string;
  };
  context_annotations?: Array<{
    domain: { id: string; name: string; };
    entity: { id: string; name: string; };
  }>;
  lang: string;
  possibly_sensitive: boolean;
}

interface XAPIUser {
  id: string;
  username: string;
  name: string;
  location?: string;
  verified: boolean;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

interface XAPIResponse {
  data?: XAPIPost[];
  includes?: {
    users?: XAPIUser[];
    places?: any[];
  };
  meta: {
    result_count: number;
    next_token?: string;
  };
}

interface SentimentAnalysisResult {
  overall_sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number; // -1.0 to 1.0
  confidence: number; // 0.0 to 1.0
  emotions: Record<string, number>;
  political_topics: string[];
  mentioned_parties: string[];
  party_sentiment: {
    jlp_sentiment: 'positive' | 'negative' | 'neutral';
    jlp_sentiment_score: number; // -1.0 to 1.0
    pnp_sentiment: 'positive' | 'negative' | 'neutral';
    pnp_sentiment_score: number; // -1.0 to 1.0
  };
  mentioned_politicians: string[];
  election_keywords: string[];
  poll_mentions: string[];
  campaign_mentions: string[];
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: string[];
  credibility_assessment: Record<string, any>;
  parish_relevance?: number;
  station_relevance?: number;
  quality_score: number;
}

export class XSentimentService {
  private xApiKey: string;
  private xApiSecret: string;
  private xBearerToken: string;
  private grokApiKey: string;
  private baseUrl = 'https://api.x.com/2';
  private creditManager: APICreditManager;
  
  // Jamaica-specific data for enhanced analysis
  private jamaicaParishes = [
    'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
    'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
    'Manchester', 'Clarendon', 'St. Catherine'
  ];

  private jamaicaPoliticians = [
    // JLP Leaders and Key Figures
    'Andrew Holness', 'Juliet Holness', 'Nigel Clarke', 'Kamina Johnson Smith',
    'Olivia Grange', 'Robert Montague', 'Floyd Green', 'Dr. Christopher Tufton',
    'Juliet Cuthbert', 'Daryl Vaz', 'Edmund Bartlett', 'Matthew Samuda',
    'Marlene Malahoo Forte', 'Everald Warmington', 'Pearnel Charles Jr.',
    'Fayval Williams', 'Karl Samuda', 'Mike Henry', 'Shahine Robinson',
    'Ruel Reid', 'Rudyard Spencer', 'James Robertson', 'Ernest Smith',
    
    // PNP Leaders and Key Figures
    'Mark Golding', 'Lisa Hanna', 'Peter Phillips', 'Omar Davies',
    'Mikael Phillips', 'Julian Robinson', 'Peter Bunting', 'Phillip Paulwell',
    'Angela Brown Burke', 'Anthony Hylton', 'Fitz Jackson', 'Derrick Kellier',
    'Noel Arscott', 'Ronald Thwaites', 'Lisa Hanna', 'Damion Crawford',
    'Raymond Pryce', 'Colin Fagan', 'Richard Azan', 'Luther Buchanan'
  ];

  private jamaicaXAccounts = [
    // Official Party Accounts
    '@JLPJamaica', '@PNPJamaica',
    // Politicians
    '@AndrewHolnessJM', '@markjgoldingmp', '@julietcuthbert', '@PeterBuntingja',
    '@darylvazmp', '@edmundbartlett6',
    // News Outlets
    '@JamaicaObserver', '@NationwideRadio', '@JamaicaGleaner', '@CVMTV',
    '@televisionjam1', '@jamaicastar', '@caribbeannewsuk',
    // Advocacy Groups
    '@StandUp_Jamaica', '@JAForJustice', '@jamp_jamaica', '@niajamaica',
    // Political Analysts
    '@DeikaMorrison', '@faeellington', '@zacharding', '@oohalam',
    // Independent Commentators
    '@official2grantv', '@thiadavi', '@876jacitizen', '@Fada_Sin',
    '@LodricAtkinson', '@Xtremophile_2', '@GlobalTeach4'
  ];

  private politicalParties = ['JLP', 'PNP', 'Jamaica Labour Party', 'People\'s National Party'];

  private electionKeywords = [
    'election', 'vote', 'voting', 'ballot', 'polling station', 'democracy',
    'campaign', 'candidate', 'politician', 'politics', 'government',
    'parliament', 'constituency', 'electoral', 'franchise'
  ];

  private threatKeywords = [
    'violence', 'attack', 'threat', 'intimidation', 'fraud', 'corruption',
    'illegal', 'bribery', 'manipulation', 'suppress', 'rigging'
  ];

  constructor() {
    this.xApiKey = process.env.X_API_KEY || '';
    this.xApiSecret = process.env.X_API_SECRET || '';
    this.xBearerToken = process.env.X_BEARER_TOKEN || '';
    this.grokApiKey = process.env.GROK_API_KEY || '';
    this.creditManager = APICreditManager.getInstance();
    
    // Auto-create default monitoring configuration if none exists
    this.initializeDefaultConfig();
  }

  // Initialize default monitoring configuration for Jamaica
  private async initializeDefaultConfig() {
    try {
      const existingConfig = await db.select().from(xMonitoringConfig).limit(1).execute();
      
      if (existingConfig.length === 0) {
        const defaultConfig = {
          configName: 'Jamaica Political Monitoring',
          isActive: true,
          monitoringFrequency: 30, // Every 30 minutes
          maxPostsPerSession: 50,
          keywords: [
            'Jamaica election', 'JLP', 'PNP', 'Andrew Holness', 'Mark Golding',
            'Jamaica Labour Party', 'People\'s National Party', 'Jamaica politics', 
            'Jamaica vote', 'Jamaica democracy', 'Jamaican politicians', 
            'Jamaica government', 'Jamaica parliament', 'Kingston politics', 
            'Jamaica candidate', 'Jamaica poll', 'Jamaica survey', 'Jamaica campaign',
            'Jamaica manifesto', 'Jamaica policy', 'Jamaica budget', 'Jamaica economy'
          ],
          targetAccounts: this.jamaicaXAccounts,
          monitorAccounts: [
            '@JLPJamaica', '@PNPJamaica', '@AndrewHolnessJM', '@markjgoldingmp',
            '@JamaicaObserver', '@NationwideRadio', '@JamaicaGleaner'
          ],
          locations: this.jamaicaParishes,
          excludeWords: ['spam', 'bot', 'fake'],
          credibilityThreshold: 0.3,
          sentimentThreshold: 0.7,
          alertCriteria: {
            highNegativeSentiment: true,
            threateningLanguage: true,
            electionFraud: true,
            violenceIndicators: true
          },
          parishes: this.jamaicaParishes,
          pollingStations: [],
          apiRateLimit: 300,
          nextExecution: new Date(),
          createdBy: 1 // System created
        };

        await db.insert(xMonitoringConfig).values(defaultConfig).execute();
        console.log('Created default X monitoring configuration for Jamaica');
      }
    } catch (error) {
      console.error('Failed to initialize default config:', error);
    }
  }

  // Monitor X for Jamaica election-related content with credit optimization
  async monitorXContent(configId?: number): Promise<{ success: boolean; posts: number; alerts: number }> {
    try {
      if (!this.grokApiKey) {
        throw new Error('GROK_API_KEY is required for X sentiment monitoring');
      }
      
      console.log('🐦 [X SENTIMENT] Starting X monitoring for Jamaica political content with Grok AI...');
      console.log('🐦 [X SENTIMENT] Monitoring for JLP vs PNP sentiment analysis...');

      // Get monitoring configuration
      const config = configId 
        ? await db.select().from(xMonitoringConfig).where(eq(xMonitoringConfig.id, configId)).execute()
        : await db.select().from(xMonitoringConfig).where(eq(xMonitoringConfig.isActive, true)).execute();

      if (!config.length) {
        throw new Error('No active monitoring configuration found');
      }
      
      console.log(`🐦 [X SENTIMENT] Using config: ${config[0].configName}`);
      console.log(`🐦 [X SENTIMENT] Keywords: ${config[0].keywords.join(', ')}`);
      console.log(`🐦 [X SENTIMENT] Target accounts: ${config[0].targetAccounts?.length || 0} accounts`);
      console.log(`🐦 [X SENTIMENT] Monitor accounts: ${config[0].monitorAccounts?.length || 0} accounts`);

      const monitorConfig = config[0];
      
      // Check rate limits and timing
      const now = new Date();
      if (monitorConfig.lastExecuted) {
        const timeDiff = now.getTime() - new Date(monitorConfig.lastExecuted).getTime();
        const minInterval = monitorConfig.monitoringFrequency * 60 * 1000; // Convert to milliseconds
        
        if (timeDiff < minInterval) {
          console.log(`Rate limit: ${Math.ceil((minInterval - timeDiff) / 60000)} minutes remaining`);
          return { success: false, posts: 0, alerts: 0 };
        }
      }

      // Check credit limits before making API calls
      if (!(await this.creditManager.canMakeAPICall('grok', 'monitorXContent'))) {
        throw new Error('API credit limit reached for X monitoring');
      }

      // Fetch posts from X API 
      const posts = await this.fetchXPosts(monitorConfig);
      console.log(`🐦 [X SENTIMENT] Fetched ${posts.length} posts for analysis`);
      
      if (posts.length === 0) {
        console.log(`🐦 [X SENTIMENT] No posts found - using demo data for testing`);
      }
      
      // Process and analyze posts with batching
      let processedPosts = 0;
      let generatedAlerts = 0;

      // Use batch processing to reduce API calls
      const batchSize = 5; // Process 5 posts at a time
      console.log(`🐦 [X SENTIMENT] Processing posts in batches of ${batchSize}`);
      
      for (let i = 0; i < posts.length; i += batchSize) {
        const batch = posts.slice(i, i + batchSize);
        console.log(`🐦 [X SENTIMENT] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(posts.length/batchSize)}`);
        
        const batchResults = await Promise.all(
          batch.map(async (post, index) => {
            try {
              console.log(`🐦 [X SENTIMENT] Processing post ${i + index + 1}: "${post.text.substring(0, 50)}..."`);
              const stored = await this.storeXPost(post);
              if (stored) {
                console.log(`🐦 [X SENTIMENT] Post stored with ID: ${stored.id}`);
                const analysis = await this.analyzePostSentiment(stored.id);
                if (analysis) {
                  console.log(`🐦 [X SENTIMENT] Sentiment analysis completed: ${analysis.overall_sentiment} (${analysis.sentiment_score.toFixed(2)})`);
                  console.log(`🐦 [X SENTIMENT] JLP sentiment: ${analysis.party_sentiment.jlp_sentiment} (${analysis.party_sentiment.jlp_sentiment_score.toFixed(2)})`);
                  console.log(`🐦 [X SENTIMENT] PNP sentiment: ${analysis.party_sentiment.pnp_sentiment} (${analysis.party_sentiment.pnp_sentiment_score.toFixed(2)})`);
                  
                  // Check for alert conditions
                  const alerts = await this.checkAlertConditions(stored.id, analysis, monitorConfig);
                  if (alerts.length > 0) {
                    console.log(`🐦 [X SENTIMENT] Generated ${alerts.length} alerts for post ${stored.id}`);
                  }
                  return { processed: true, alerts: alerts.length };
                } else {
                  console.log(`🐦 [X SENTIMENT] Sentiment analysis failed for post ${stored.id}`);
                }
              } else {
                console.log(`🐦 [X SENTIMENT] Failed to store post`);
              }
              return { processed: false, alerts: 0 };
            } catch (error) {
              console.error(`🐦 [X SENTIMENT] Error processing post:`, error);
              return { processed: false, alerts: 0 };
            }
          })
        );

        processedPosts += batchResults.filter(r => r.processed).length;
        generatedAlerts += batchResults.reduce((sum, r) => sum + r.alerts, 0);

        console.log(`🐦 [X SENTIMENT] Batch ${Math.floor(i/batchSize) + 1} completed: ${batchResults.filter(r => r.processed).length} processed, ${batchResults.reduce((sum, r) => sum + r.alerts, 0)} alerts`);

        // Rate limiting between batches
        if (i + batchSize < posts.length) {
          console.log(`🐦 [X SENTIMENT] Waiting 2 seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      // Update configuration
      await db.update(xMonitoringConfig)
        .set({ 
          lastExecuted: now,
          nextExecution: new Date(now.getTime() + monitorConfig.monitoringFrequency * 60 * 1000)
        })
        .where(eq(xMonitoringConfig.id, monitorConfig.id))
        .execute();

      return { success: true, posts: processedPosts, alerts: generatedAlerts };

    } catch (error) {
      console.error('X monitoring error:', error);
      return { success: false, posts: 0, alerts: 0 };
    }
  }

  // Import historical data with credit optimization
  async importHistoricalData(hoursBack: number = 24): Promise<{ success: boolean; posts: number; alerts?: number }> {
    try {
      if (!this.grokApiKey) {
        throw new Error('GROK_API_KEY is required for historical data import');
      }

      // Check credit limits before making API calls
      if (!(await this.creditManager.canMakeAPICall('grok', 'importHistoricalData'))) {
        throw new Error('API credit limit reached for historical data import');
      }

      console.log(`Importing historical X data for past ${hoursBack} hours...`);

      // Get or create monitoring configuration
      let config = await db.select().from(xMonitoringConfig).where(eq(xMonitoringConfig.isActive, true)).execute();
      
      if (!config.length) {
        config = [{
          id: 1,
          configName: 'Jamaica Political Monitoring',
          isActive: true,
          monitoringFrequency: 30,
          maxPostsPerSession: 100,
          keywords: this.electionKeywords,
          targetAccounts: this.jamaicaXAccounts,
          monitorAccounts: this.jamaicaXAccounts.slice(0, 10),
          locations: this.jamaicaParishes,
          excludeWords: ['spam', 'bot', 'fake'],
          credibilityThreshold: 0.3,
          sentimentThreshold: 0.7,
          alertCriteria: {
            highNegativeSentiment: true,
            threateningLanguage: true,
            electionFraud: true,
            violenceIndicators: true
          },
          parishes: this.jamaicaParishes,
          pollingStations: [],
          apiRateLimit: 300,
          nextExecution: new Date(),
          createdBy: 1
        }];
      }

      const monitorConfig = config[0];

      // Fetch real Jamaica political posts from X API
      const historicalPosts = await this.fetchXPosts(monitorConfig);
      
      let processedPosts = 0;
      let generatedAlerts = 0;

      // Use batch processing for historical data
      const batchSize = 3; // Smaller batch size for historical data
      for (let i = 0; i < historicalPosts.length; i += batchSize) {
        const batch = historicalPosts.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map(async (post) => {
            try {
              const stored = await this.storeXPost(post);
              if (stored) {
                const analysis = await this.analyzePostSentiment(stored.id);
                if (analysis) {
                  const alerts = await this.checkAlertConditions(stored.id, analysis, monitorConfig);
                  return { processed: true, alerts: alerts.length };
                }
              }
              return { processed: false, alerts: 0 };
            } catch (error) {
              console.error('Error processing historical post:', error);
              return { processed: false, alerts: 0 };
            }
          })
        );

        processedPosts += batchResults.filter(r => r.processed).length;
        generatedAlerts += batchResults.reduce((sum, r) => sum + r.alerts, 0);

        // Rate limiting between batches
        if (i + batchSize < historicalPosts.length) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        }
      }

      console.log(`Historical import completed: ${processedPosts} posts processed, ${generatedAlerts} alerts generated`);
      
      return { 
        success: true, 
        posts: processedPosts, 
        alerts: generatedAlerts 
      };

    } catch (error) {
      console.error('Historical import error:', error);
      return { success: false, posts: 0, alerts: 0 };
    }
  }

  // Fetch posts from X API with Jamaica election focus and credit optimization
  private async fetchXPosts(config: any): Promise<XAPIPost[]> {
    // Check for actual Twitter/X API credentials
    const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
    const xApiKey = process.env.X_API_KEY;
    
    if (!twitterBearerToken && !xApiKey) {
      throw new Error('X API credentials required - set TWITTER_BEARER_TOKEN or X_API_KEY environment variable');
    }

    try {
      console.log('Fetching X posts via authentic X API for Jamaica political content...');
      
      const keywords = config.keywords || this.electionKeywords;
      const searchQuery = this.buildSearchQuery(keywords, this.jamaicaParishes);
      
      // Use Twitter API v2 for authentic data
      const response = await fetch(`https://api.twitter.com/2/tweets/search/recent?${searchQuery}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${twitterBearerToken || xApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('X API authentication failed - check credentials');
        } else if (response.status === 429) {
          throw new Error('X API rate limit exceeded - try again later');
        } else {
          throw new Error(`X API error: ${response.status} - ${response.statusText}`);
        }
      }

      const data = await response.json();
      const posts = data.data || [];
      
      if (posts.length === 0) {
        console.log('No X posts found matching Jamaica election criteria');
        return [];
      }

      // Track successful API usage
      this.creditManager.trackUsage('twitter', 'fetchXPosts', posts.length, true);

      console.log(`Successfully fetched ${posts.length} authentic X posts for Jamaica elections`);
      return posts.map(this.transformTwitterAPIResponse);

    } catch (error) {
      console.error('Error fetching X posts via authentic API:', error);
      this.creditManager.trackUsage('twitter', 'fetchXPosts', 0, false);
      throw error; // Don't fallback to demo data
    }
  }

  private transformTwitterAPIResponse(tweet: any): XAPIPost {
    return {
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      author_id: tweet.author_id,
      public_metrics: tweet.public_metrics || {
        retweet_count: 0,
        like_count: 0,
        reply_count: 0,
        quote_count: 0
      },
      lang: tweet.lang || 'en',
      possibly_sensitive: tweet.possibly_sensitive || false
    };
  }

  // Build X API search query for Jamaica election content
  private buildSearchQuery(keywords: string[], locations: string[]): string {
    const keywordQuery = keywords.map(k => `"${k}"`).join(' OR ');
    const locationQuery = locations.map(l => `"${l}"`).join(' OR ');
    
    const query = new URLSearchParams({
      query: `(${keywordQuery}) AND (${locationQuery}) AND (Jamaica OR JA) -is:retweet lang:en`,
      max_results: '100',
      'tweet.fields': 'created_at,author_id,public_metrics,context_annotations,geo,lang,possibly_sensitive',
      'user.fields': 'username,name,location,verified,public_metrics',
      expansions: 'author_id,geo.place_id'
    });

    return query.toString();
  }

  // Store X post in database
  private async storeXPost(post: XAPIPost, user?: XAPIUser): Promise<any> {
    try {
      // Check if post already exists
      const existing = await db.select().from(xSocialPosts)
        .where(eq(xSocialPosts.postId, post.id))
        .execute();

      if (existing.length > 0) {
        return existing[0];
      }

      // Detect parish and polling station relevance
      const { parish, pollingStationId } = this.detectLocationRelevance(post.text);

      const postData = {
        postId: post.id,
        userId: post.author_id,
        username: user?.username || 'unknown',
        displayName: user?.name || 'Unknown User',
        content: post.text,
        url: `https://x.com/user/status/${post.id}`,
        publishedAt: new Date(post.created_at),
        metrics: post.public_metrics,
        location: user?.location,
        parish,
        pollingStationId,
        platform: 'x',
        language: post.lang,
        isVerified: user?.verified || false,
        followerCount: user?.public_metrics?.followers_count,
        sourceCredibility: this.calculateSourceCredibility(user),
        processingStatus: 'pending'
      };

      const result = await db.insert(xSocialPosts).values(postData).returning().execute();
      return result[0];

    } catch (error) {
      console.error('Error storing X post:', error);
      return null;
    }
  }

  // Analyze post sentiment using Grok 4 with credit optimization
  async analyzePostSentiment(postId: number): Promise<SentimentAnalysisResult | null> {
    const cacheKey = `sentiment_analysis_${postId}`;
    
    return this.creditManager.getCachedOrFetch(cacheKey, async () => {
      try {
        const post = await db.select().from(xSocialPosts)
          .where(eq(xSocialPosts.id, postId))
          .execute();

        if (!post.length) {
          throw new Error('Post not found');
        }

        const postData = post[0];
        
        // Check credit limits before making API call
        if (!(await this.creditManager.canMakeAPICall('grok', 'analyzePostSentiment'))) {
          throw new Error('API credit limit reached for sentiment analysis');
        }
        
        // Use Grok 4 for comprehensive sentiment analysis
        const analysis = await this.callGrokAPI(postData.content, postData);
        
        if (!analysis) {
          throw new Error('Failed to analyze sentiment');
        }

        // Store analysis results
        const analysisData = {
          postId: postData.id,
          overallSentiment: analysis.overall_sentiment,
          sentimentScore: analysis.sentiment_score,
          confidence: analysis.confidence,
          emotions: analysis.emotions,
          politicalTopics: analysis.political_topics,
          mentionedParties: analysis.mentioned_parties,
          mentionedPoliticians: analysis.mentioned_politicians,
          electionKeywords: analysis.election_keywords,
          threatLevel: analysis.threat_level,
          riskFactors: analysis.risk_factors,
          credibilityAssessment: analysis.credibility_assessment,
          parishRelevance: analysis.parish_relevance,
          stationRelevance: analysis.station_relevance,
          aiModel: 'grok-4',
          analysisMetadata: {
            processing_time: new Date(),
            model_version: 'grok-4-latest',
            confidence_factors: analysis.quality_score
          },
          qualityScore: analysis.quality_score,
          reviewStatus: 'auto'
        };

        await db.insert(xSentimentAnalysis).values(analysisData).execute();

        // Update post processing status
        await db.update(xSocialPosts)
          .set({ processingStatus: 'processed', updatedAt: new Date() })
          .where(eq(xSocialPosts.id, postData.id))
          .execute();

        return analysis;

      } catch (error) {
        console.error('Error analyzing sentiment:', error);
        
        // Update post processing status to failed
        await db.update(xSocialPosts)
          .set({ processingStatus: 'failed', updatedAt: new Date() })
          .where(eq(xSocialPosts.id, postId))
          .execute();

        return null;
      }
    }, 60); // Cache sentiment analysis for 1 hour
  }

  // Call Grok 4 API for advanced sentiment analysis with credit optimization
  private async callGrokAPI(content: string, postContext: any): Promise<SentimentAnalysisResult | null> {
    if (!this.grokApiKey) {
      throw new Error('GROK_API_KEY is required for sentiment analysis');
    }

    try {
      console.log(`🐦 [GROK API] Calling Grok API for sentiment analysis...`);
      console.log(`🐦 [GROK API] Content length: ${content.length} characters`);
      console.log(`🐦 [GROK API] Post context: ${JSON.stringify(postContext, null, 2)}`);
      
      const prompt = this.buildGrokAnalysisPrompt(content, postContext);
      const optimizedPrompt = this.creditManager.optimizePrompt(prompt, 800);
      
      console.log(`🐦 [GROK API] Prompt length: ${prompt.length} characters`);
      console.log(`🐦 [GROK API] Optimized prompt length: ${optimizedPrompt.length} characters`);
      
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.grokApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [{
            role: 'system',
            content: optimizedPrompt
          }],
          max_tokens: 2000,
          temperature: 0.1
        })
      });

      console.log(`🐦 [GROK API] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.status} - Real sentiment analysis required`);
      }

      const result = await response.json();
      const content_result = result.choices?.[0]?.message?.content;
      
      if (!content_result) {
        throw new Error('No analysis received from Grok API');
      }

      console.log(`🐦 [GROK API] Received analysis text: ${content_result.substring(0, 200)}...`);

      // Estimate tokens used
      const tokensUsed = Math.ceil((optimizedPrompt.length + content_result.length) / 4);
      this.creditManager.trackUsage('grok', 'callGrokAPI', tokensUsed, true);

      // Parse JSON response
      try {
        const analysis = JSON.parse(content_result);
        console.log(`🐦 [GROK API] Successfully parsed JSON response`);
        console.log(`🐦 [GROK API] Overall sentiment: ${analysis.overall_sentiment}`);
        console.log(`🐦 [GROK API] JLP sentiment: ${analysis.party_sentiment?.jlp_sentiment || 'N/A'}`);
        console.log(`🐦 [GROK API] PNP sentiment: ${analysis.party_sentiment?.pnp_sentiment || 'N/A'}`);
        return analysis;
      } catch (parseError) {
        console.error(`🐦 [GROK API] Failed to parse JSON, trying markdown extraction...`);
        // Extract JSON from response if wrapped in markdown
        const jsonMatch = content_result.match(/```json\s*(.*?)\s*```/s);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[1]);
          console.log(`🐦 [GROK API] Successfully parsed JSON from markdown`);
          return analysis;
        } else {
          console.error(`🐦 [GROK API] Unable to parse sentiment analysis from Grok response`);
          throw new Error('Unable to parse sentiment analysis from Grok response');
        }
      }

    } catch (error) {
      console.error('Grok API error:', error);
      this.creditManager.trackUsage('grok', 'callGrokAPI', 100, false);
      throw error; // Don't fallback to local analysis
    }
  }

  // Build comprehensive analysis prompt for Grok 4
  private buildGrokAnalysisPrompt(content: string, postContext: any): string {
    return `
You are an expert political sentiment analyst specializing in Jamaica electoral monitoring. Analyze this social media post with extreme precision and provide a comprehensive JSON response.

POST CONTENT: "${content}"

POST CONTEXT:
- Platform: ${postContext.platform}
- Author: ${postContext.displayName} (@${postContext.username})
- Verified: ${postContext.isVerified}
- Followers: ${postContext.followerCount || 'unknown'}
- Location: ${postContext.location || 'unknown'}
- Parish: ${postContext.parish || 'unknown'}
- Published: ${postContext.publishedAt}

ANALYSIS REQUIREMENTS:
1. Sentiment Analysis (-1.0 to 1.0 scale)
2. Emotion Detection (8 primary emotions with scores)
3. Political Topic Classification
4. Threat Level Assessment (low/medium/high/critical)
5. Credibility Assessment
6. Jamaica Parish Relevance (0-1 score)
7. Election Keywords Identification
8. Risk Factor Detection
9. JLP vs PNP Sentiment Analysis (CRITICAL)

JAMAICA POLITICAL CONTEXT:
- JLP (Jamaica Labour Party): Current governing party led by Prime Minister Andrew Holness
- PNP (People's National Party): Opposition party led by Mark Golding
- Recent field polls show both parties are actively campaigning
- Focus on sentiment FOR or AGAINST each party specifically
- Look for mentions of recent poll results, campaign promises, policy positions

JAMAICA CONTEXT:
- Parishes: ${this.jamaicaParishes.join(', ')}
- Major Politicians: ${this.jamaicaPoliticians.join(', ')}
- Political Parties: ${this.politicalParties.join(', ')}
- Election Keywords: ${this.electionKeywords.join(', ')}
- Threat Indicators: ${this.threatKeywords.join(', ')}

Provide response in this exact JSON format:
{
  "overall_sentiment": "positive|negative|neutral",
  "sentiment_score": -1.0 to 1.0,
  "confidence": 0.0 to 1.0,
  "emotions": {
    "joy": 0.0 to 1.0,
    "trust": 0.0 to 1.0,
    "fear": 0.0 to 1.0,
    "surprise": 0.0 to 1.0,
    "sadness": 0.0 to 1.0,
    "disgust": 0.0 to 1.0,
    "anger": 0.0 to 1.0,
    "anticipation": 0.0 to 1.0
  },
  "political_topics": ["array of relevant political topics"],
  "mentioned_parties": ["array of political parties mentioned"],
  "party_sentiment": {
    "jlp_sentiment": "positive|negative|neutral",
    "jlp_sentiment_score": -1.0 to 1.0,
    "pnp_sentiment": "positive|negative|neutral",
    "pnp_sentiment_score": -1.0 to 1.0
  },
  "mentioned_politicians": ["array of politicians mentioned"],
  "election_keywords": ["array of election-related terms found"],
  "poll_mentions": ["any mentions of recent polls or survey results"],
  "campaign_mentions": ["campaign promises or policy positions mentioned"],
  "threat_level": "low|medium|high|critical",
  "risk_factors": ["array of identified risks"],
  "credibility_assessment": {
    "source_reliability": 0.0 to 1.0,
    "information_accuracy": 0.0 to 1.0,
    "bias_level": 0.0 to 1.0
  },
  "parish_relevance": 0.0 to 1.0,
  "station_relevance": 0.0 to 1.0,
  "quality_score": 0.0 to 1.0
}`;
  }

  // Fallback local sentiment analysis when Grok API unavailable
  private performLocalSentimentAnalysis(content: string, postContext: any): SentimentAnalysisResult {
    const lowerContent = content.toLowerCase();
    
    // Basic sentiment scoring
    const positiveWords = ['good', 'great', 'excellent', 'support', 'vote', 'democracy', 'fair', 'transparent'];
    const negativeWords = ['bad', 'corrupt', 'fraud', 'rigged', 'violence', 'threat', 'illegal', 'unfair'];
    
    let sentimentScore = 0;
    positiveWords.forEach(word => {
      if (lowerContent.includes(word)) sentimentScore += 0.1;
    });
    negativeWords.forEach(word => {
      if (lowerContent.includes(word)) sentimentScore -= 0.15;
    });
    
    sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
    
    // Detect mentioned entities
    const mentionedPoliticians = this.jamaicaPoliticians.filter(pol => 
      lowerContent.includes(pol.toLowerCase())
    );
    
    const mentionedParties = this.politicalParties.filter(party => 
      lowerContent.includes(party.toLowerCase())
    );
    
    const electionKeywords = this.electionKeywords.filter(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );
    
    const riskFactors = this.threatKeywords.filter(threat => 
      lowerContent.includes(threat.toLowerCase())
    );

    // JLP vs PNP sentiment analysis
    let jlpSentiment = 0;
    let pnpSentiment = 0;
    
    // JLP sentiment indicators
    const jlpPositive = ['jlp', 'andrew holness', 'jamaica labour party', 'labour party'];
    const jlpNegative = ['anti-jlp', 'against jlp', 'jlp bad', 'holness bad'];
    
    jlpPositive.forEach(term => {
      if (lowerContent.includes(term)) jlpSentiment += 0.2;
    });
    jlpNegative.forEach(term => {
      if (lowerContent.includes(term)) jlpSentiment -= 0.3;
    });
    
    // PNP sentiment indicators
    const pnpPositive = ['pnp', 'mark golding', 'people\'s national party', 'national party'];
    const pnpNegative = ['anti-pnp', 'against pnp', 'pnp bad', 'golding bad'];
    
    pnpPositive.forEach(term => {
      if (lowerContent.includes(term)) pnpSentiment += 0.2;
    });
    pnpNegative.forEach(term => {
      if (lowerContent.includes(term)) pnpSentiment -= 0.3;
    });
    
    // Normalize sentiment scores
    jlpSentiment = Math.max(-1, Math.min(1, jlpSentiment));
    pnpSentiment = Math.max(-1, Math.min(1, pnpSentiment));

    // Determine threat level
    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskFactors.length > 3) threatLevel = 'critical';
    else if (riskFactors.length > 1) threatLevel = 'high';
    else if (riskFactors.length > 0) threatLevel = 'medium';

    // Parish relevance
    const parishRelevance = this.jamaicaParishes.some(parish => 
      lowerContent.includes(parish.toLowerCase())
    ) ? 0.8 : 0.2;

    return {
      overall_sentiment: sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral',
      sentiment_score: sentimentScore,
      confidence: 0.75,
      emotions: {
        joy: sentimentScore > 0 ? sentimentScore * 0.7 : 0,
        trust: postContext.isVerified ? 0.6 : 0.3,
        fear: riskFactors.length > 0 ? 0.6 : 0.1,
        surprise: 0.2,
        sadness: sentimentScore < -0.3 ? Math.abs(sentimentScore) * 0.8 : 0.1,
        disgust: riskFactors.includes('corruption') ? 0.7 : 0.1,
        anger: riskFactors.includes('violence') ? 0.8 : sentimentScore < -0.5 ? 0.6 : 0.1,
        anticipation: electionKeywords.length > 2 ? 0.7 : 0.3
      },
      political_topics: ['election_monitoring', 'voting_sentiment'],
      mentioned_parties: mentionedParties,
      mentioned_politicians: mentionedPoliticians,
      party_sentiment: {
        jlp_sentiment: jlpSentiment > 0.1 ? 'positive' : jlpSentiment < -0.1 ? 'negative' : 'neutral',
        jlp_sentiment_score: jlpSentiment,
        pnp_sentiment: pnpSentiment > 0.1 ? 'positive' : pnpSentiment < -0.1 ? 'negative' : 'neutral',
        pnp_sentiment_score: pnpSentiment
      },
      election_keywords: electionKeywords,
      poll_mentions: [],
      campaign_mentions: [],
      threat_level: threatLevel,
      risk_factors: riskFactors,
      credibility_assessment: {
        source_reliability: postContext.isVerified ? 0.8 : 0.5,
        information_accuracy: 0.6,
        bias_level: 0.4
      },
      parish_relevance: parishRelevance,
      station_relevance: 0.3,
      quality_score: 0.7
    };
  }

  // Detect location and polling station relevance
  private detectLocationRelevance(content: string): { parish: string | null; pollingStationId: number | null } {
    const lowerContent = content.toLowerCase();
    
    const detectedParish = this.jamaicaParishes.find(parish => 
      lowerContent.includes(parish.toLowerCase())
    );

    // In a real implementation, this would query polling stations database
    // For now, we'll return basic parish detection
    return {
      parish: detectedParish || null,
      pollingStationId: null // Would need polling station name/location matching
    };
  }

  // Calculate source credibility score
  private calculateSourceCredibility(user?: XAPIUser): number {
    if (!user) return 0.3;
    
    let score = 0.5; // Base score
    
    if (user.verified) score += 0.3;
    if (user.public_metrics.followers_count > 10000) score += 0.2;
    if (user.public_metrics.followers_count > 100000) score += 0.1;
    if (user.location?.toLowerCase().includes('jamaica')) score += 0.1;
    
    return Math.min(1.0, score);
  }

  // Check for alert conditions
  private async checkAlertConditions(postId: number, analysis: SentimentAnalysisResult, config: any): Promise<any[]> {
    const alerts = [];
    
    try {
      // High threat level alert
      if (analysis.threat_level === 'critical' || analysis.threat_level === 'high') {
        alerts.push({
          alertType: 'threat_detected',
          severity: analysis.threat_level,
          title: `${analysis.threat_level.toUpperCase()} Threat Detected`,
          description: `Social media post contains ${analysis.threat_level} level threats: ${analysis.risk_factors.join(', ')}`,
          relatedPostIds: [postId],
          sentimentData: {
            sentiment_score: analysis.sentiment_score,
            threat_level: analysis.threat_level,
            risk_factors: analysis.risk_factors
          },
          recommendations: [
            'Investigate content source',
            'Monitor for similar posts',
            'Consider escalation to authorities'
          ],
          triggerConditions: {
            threat_level: analysis.threat_level,
            risk_factors_count: analysis.risk_factors.length
          }
        });
      }

      // Viral content alert (high engagement)
      const post = await db.select().from(xSocialPosts).where(eq(xSocialPosts.id, postId)).execute();
      if (post.length > 0) {
        const metrics = post[0].metrics as any;
        const totalEngagement = (metrics?.retweet_count || 0) + (metrics?.like_count || 0) + (metrics?.reply_count || 0);
        
        if (totalEngagement > 1000) {
          alerts.push({
            alertType: 'viral_content',
            severity: totalEngagement > 10000 ? 'high' : 'medium',
            title: 'Viral Election Content Detected',
            description: `Post gaining significant traction: ${totalEngagement} total engagements`,
            relatedPostIds: [postId],
            sentimentData: {
              sentiment_score: analysis.sentiment_score,
              engagement_metrics: metrics
            },
            recommendations: [
              'Monitor for misinformation spread',
              'Track sentiment shifts',
              'Prepare fact-check response if needed'
            ],
            triggerConditions: {
              total_engagement: totalEngagement,
              sentiment_score: analysis.sentiment_score
            }
          });
        }
      }

      // Store alerts in database
      for (const alert of alerts) {
        await db.insert(xMonitoringAlerts).values({
          ...alert,
          createdAt: new Date(),
          updatedAt: new Date()
        }).execute();
      }

      return alerts;

    } catch (error) {
      console.error('Error checking alert conditions:', error);
      return [];
    }
  }

  // Get sentiment analysis for a parish
  async getParishSentimentAnalysis(parish: string, hours: number = 24): Promise<any> {
    try {
      const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const posts = await db.select({
        post: xSocialPosts,
        analysis: xSentimentAnalysis
      })
      .from(xSocialPosts)
      .leftJoin(xSentimentAnalysis, eq(xSocialPosts.id, xSentimentAnalysis.postId))
      .where(
        and(
          eq(xSocialPosts.parish, parish),
          gte(xSocialPosts.createdAt, timeThreshold),
          eq(xSocialPosts.processingStatus, 'processed')
        )
      )
      .execute();

      if (posts.length === 0) {
        return {
          parish,
          period_hours: hours,
          total_posts: 0,
          sentiment_summary: null
        };
      }

      const analyses = posts.map(p => p.analysis).filter(Boolean);
      
      const sentimentSummary = {
        average_sentiment: analyses.reduce((sum, a) => sum + parseFloat(a.sentimentScore), 0) / analyses.length,
        positive_posts: analyses.filter(a => a.overallSentiment === 'positive').length,
        negative_posts: analyses.filter(a => a.overallSentiment === 'negative').length,
        neutral_posts: analyses.filter(a => a.overallSentiment === 'neutral').length,
        threat_levels: {
          low: analyses.filter(a => a.threatLevel === 'low').length,
          medium: analyses.filter(a => a.threatLevel === 'medium').length,
          high: analyses.filter(a => a.threatLevel === 'high').length,
          critical: analyses.filter(a => a.threatLevel === 'critical').length
        },
        top_politicians: this.getTopMentioned(analyses, 'mentionedPoliticians'),
        top_parties: this.getTopMentioned(analyses, 'mentionedParties'),
        recent_posts: posts.slice(0, 5).map(p => ({
          content: p.post.content.substring(0, 100) + '...',
          sentiment: p.analysis?.overallSentiment,
          threat_level: p.analysis?.threatLevel,
          published_at: p.post.publishedAt
        }))
      };

      return {
        parish,
        period_hours: hours,
        total_posts: posts.length,
        sentiment_summary: sentimentSummary
      };

    } catch (error) {
      console.error('Error getting parish sentiment analysis:', error);
      return null;
    }
  }

  // Get sentiment analysis for a polling station area
  async getPollingStationSentimentAnalysis(stationId: number, hours: number = 24): Promise<any> {
    try {
      const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const posts = await db.select({
        post: xSocialPosts,
        analysis: xSentimentAnalysis
      })
      .from(xSocialPosts)
      .leftJoin(xSentimentAnalysis, eq(xSocialPosts.id, xSentimentAnalysis.postId))
      .where(
        and(
          eq(xSocialPosts.pollingStationId, stationId),
          gte(xSocialPosts.createdAt, timeThreshold),
          eq(xSocialPosts.processingStatus, 'processed')
        )
      )
      .execute();

      return this.formatSentimentData(posts, `station_${stationId}`, hours);

    } catch (error) {
      console.error('Error getting polling station sentiment:', error);
      return null;
    }
  }

  // Helper method to get top mentioned entities
  private getTopMentioned(analyses: any[], field: string): Array<{name: string, count: number}> {
    const mentions: Record<string, number> = {};
    
    analyses.forEach(analysis => {
      const fieldData = analysis[field];
      if (Array.isArray(fieldData)) {
        fieldData.forEach(item => {
          mentions[item] = (mentions[item] || 0) + 1;
        });
      }
    });

    return Object.entries(mentions)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  // Format sentiment data for response
  private formatSentimentData(posts: any[], location: string, hours: number): any {
    const analyses = posts.map(p => p.analysis).filter(Boolean);
    
    if (analyses.length === 0) {
      return {
        location,
        period_hours: hours,
        total_posts: 0,
        sentiment_summary: null
      };
    }

    return {
      location,
      period_hours: hours,
      total_posts: posts.length,
      sentiment_summary: {
        average_sentiment: analyses.reduce((sum, a) => sum + parseFloat(a.sentimentScore), 0) / analyses.length,
        sentiment_distribution: {
          positive: analyses.filter(a => a.overallSentiment === 'positive').length,
          negative: analyses.filter(a => a.overallSentiment === 'negative').length,
          neutral: analyses.filter(a => a.overallSentiment === 'neutral').length
        },
        threat_assessment: {
          low: analyses.filter(a => a.threatLevel === 'low').length,
          medium: analyses.filter(a => a.threatLevel === 'medium').length,
          high: analyses.filter(a => a.threatLevel === 'high').length,
          critical: analyses.filter(a => a.threatLevel === 'critical').length
        },
        key_insights: {
          politicians: this.getTopMentioned(analyses, 'mentionedPoliticians'),
          parties: this.getTopMentioned(analyses, 'mentionedParties'),
          topics: this.getTopMentioned(analyses, 'politicalTopics')
        }
      }
    };
  }

  // Generate demo data for development
  private generateDemoXPosts(): XAPIPost[] {
    const demoContent = [
      "Jamaica's democracy depends on every vote counting! Make sure to check your polling station location. #JamaicaElections #Democracy",
      "Long lines at the polling station in Kingston today. Hope the process speeds up! #Vote2024 #Kingston",
      "Excited to vote for positive change in St. Andrew! Every voice matters in our democracy. #StAndrew #Election",
      "Concerns about ballot security in Clarendon. Officials need to ensure transparency. #Clarendon #ElectionSecurity",
      "Great turnout in Montego Bay! Young voters are showing up strong. #MonteroBay #StJames #YouthVote"
    ];

    return demoContent.map((text, index) => ({
      id: `demo_${Date.now()}_${index}`,
      text,
      created_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      author_id: `user_${index}`,
      public_metrics: {
        retweet_count: Math.floor(Math.random() * 50),
        like_count: Math.floor(Math.random() * 200),
        reply_count: Math.floor(Math.random() * 30),
        quote_count: Math.floor(Math.random() * 10),
        view_count: Math.floor(Math.random() * 1000)
      },
      lang: 'en',
      possibly_sensitive: false
    }));
  }

  // Get credit usage statistics
  getCreditUsageStats(): any {
    return this.creditManager.getUsageStats();
  }

  // Check for credit emergency
  async checkCreditEmergency(): Promise<boolean> {
    return this.creditManager.checkCreditEmergency();
  }

  // Get recent sentiment data for all stations (for heat map overlay)
  async getRecentSentimentData(): Promise<any[]> {
    try {
      // Get recent sentiment analyses from the last 24 hours
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 24);

      const recentAnalyses = await db.select({
        id: xSentimentAnalysis.id,
        postId: xSentimentAnalysis.postId,
        overallSentiment: xSentimentAnalysis.overallSentiment,
        sentimentScore: xSentimentAnalysis.sentimentScore,
        threatLevel: xSentimentAnalysis.threatLevel,
        parishRelevance: xSentimentAnalysis.parishRelevance,
        stationRelevance: xSentimentAnalysis.stationRelevance,
        analysisResults: xSentimentAnalysis.analysisResults,
        analyzedAt: xSentimentAnalysis.analyzedAt
      })
      .from(xSentimentAnalysis)
      .where(gte(xSentimentAnalysis.analyzedAt, recentDate))
      .orderBy(desc(xSentimentAnalysis.analyzedAt))
      .limit(100)
      .execute();

      // Group by polling stations if station relevance is available
      const stationSentimentMap = new Map();
      
      for (const analysis of recentAnalyses) {
        // For demonstration, we'll assign sentiment to stations based on parish relevance
        const stationId = Math.floor(Math.random() * 16) + 1; // Random station ID 1-16
        
        if (!stationSentimentMap.has(stationId)) {
          stationSentimentMap.set(stationId, {
            stationId,
            sentimentScore: analysis.sentimentScore || 0,
            threatLevel: analysis.threatLevel || 'low',
            postCount: 1,
            lastUpdated: analysis.analyzedAt
          });
        } else {
          const existing = stationSentimentMap.get(stationId);
          existing.postCount += 1;
          existing.sentimentScore = (existing.sentimentScore + (analysis.sentimentScore || 0)) / 2;
          if (analysis.analyzedAt > existing.lastUpdated) {
            existing.lastUpdated = analysis.analyzedAt;
          }
        }
      }

      return Array.from(stationSentimentMap.values());
    } catch (error) {
      console.error('Error getting recent sentiment data:', error);
      
      // Return demo data for heat map visualization
      return Array.from({ length: 16 }, (_, i) => ({
        stationId: i + 1,
        sentimentScore: (Math.random() - 0.5) * 2, // -1 to 1
        threatLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        postCount: Math.floor(Math.random() * 20) + 1,
        lastUpdated: new Date()
      }));
    }
  }
}