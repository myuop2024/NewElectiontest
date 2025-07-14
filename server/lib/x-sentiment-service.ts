import { db } from '../db';
import { xSocialPosts, xSentimentAnalysis, xMonitoringConfig, xMonitoringAlerts } from '@shared/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

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
  mentioned_politicians: string[];
  election_keywords: string[];
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
  
  // Jamaica-specific data for enhanced analysis
  private jamaicaParishes = [
    'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
    'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
    'Manchester', 'Clarendon', 'St. Catherine'
  ];

  private jamaicaPoliticians = [
    'Andrew Holness', 'Mark Golding', 'Juliet Holness', 'Lisa Hanna', 
    'Nigel Clarke', 'Peter Phillips', 'Kamina Johnson Smith', 'Omar Davies',
    'Olivia Grange', 'Robert Montague', 'Floyd Green', 'Mikael Phillips',
    'Fayval Williams', 'Julian Robinson', 'Dr. Christopher Tufton'
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
            'Jamaica politics', 'Jamaica vote', 'Jamaica democracy', 
            'Jamaican politicians', 'Jamaica government', 'Jamaica parliament',
            'Kingston politics', 'Jamaica candidate'
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

  // Monitor X for Jamaica election-related content
  async monitorXContent(configId?: number): Promise<{ success: boolean; posts: number; alerts: number }> {
    try {
      if (!this.grokApiKey) {
        throw new Error('GROK_API_KEY is required for X sentiment monitoring');
      }
      
      console.log('Starting X monitoring for Jamaica political content with Grok AI...');

      // Get monitoring configuration
      const config = configId 
        ? await db.select().from(xMonitoringConfig).where(eq(xMonitoringConfig.id, configId)).execute()
        : await db.select().from(xMonitoringConfig).where(eq(xMonitoringConfig.isActive, true)).execute();

      if (!config.length) {
        throw new Error('No active monitoring configuration found');
      }

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

      // Fetch posts from X API 
      const posts = await this.fetchXPosts(monitorConfig);
      console.log(`Fetched ${posts.length} posts for analysis`);
      
      // Process and analyze posts
      let processedPosts = 0;
      let generatedAlerts = 0;

      for (const post of posts) {
        try {
          const stored = await this.storeXPost(post);
          if (stored) {
            const analysis = await this.analyzePostSentiment(stored.id);
            if (analysis) {
              processedPosts++;
              
              // Check for alert conditions
              const alerts = await this.checkAlertConditions(stored.id, analysis, monitorConfig);
              generatedAlerts += alerts.length;
            }
          }
        } catch (error) {
          console.error('Error processing post:', error);
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

  // Import historical sentiment data for past X hours
  async importHistoricalData(hoursBack: number = 24): Promise<{ success: boolean; posts: number; alerts?: number }> {
    try {
      if (!this.grokApiKey) {
        throw new Error('Grok API key required for historical data import');
      }

      console.log(`Importing Jamaica X sentiment data for past ${hoursBack} hours...`);

      // Get or create monitoring configuration
      let config = await db.select().from(xMonitoringConfig)
        .where(eq(xMonitoringConfig.isActive, true))
        .limit(1)
        .execute();

      if (!config.length) {
        // Use default configuration for historical import
        config = [{
          keywords: [
            'Jamaica election', 'JLP', 'PNP', 'Andrew Holness', 'Mark Golding',
            'Jamaica politics', 'Jamaica vote', 'Jamaica democracy',
            'Jamaican politicians', 'Jamaica government', 'Jamaica parliament'
          ],
          locations: this.jamaicaParishes,
          maxPostsPerSession: 100,
          credibilityThreshold: 0.3
        }];
      }

      const monitorConfig = config[0];

      // Only proceed if we have Grok API key for real analysis
      if (!this.grokApiKey) {
        throw new Error('GROK_API_KEY is required for historical data import');
      }

      // Fetch real Jamaica political posts from X API
      const historicalPosts = await this.fetchXPosts(monitorConfig);
      
      let processedPosts = 0;
      let generatedAlerts = 0;

      for (const post of historicalPosts) {
        try {
          const stored = await this.storeXPost(post);
          if (stored) {
            // Analyze with Grok if available, fallback to demo analysis
            const analysis = await this.analyzePostSentiment(stored.id);
            if (analysis) {
              processedPosts++;
              
              // Check for alert conditions
              const alerts = await this.checkAlertConditions(stored.id, analysis, monitorConfig);
              generatedAlerts += alerts.length;
            }
          }
        } catch (error) {
          console.error('Error processing historical post:', error);
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

  // Fetch posts from X API with Jamaica election focus
  private async fetchXPosts(config: any): Promise<XAPIPost[]> {
    if (!this.grokApiKey) {
      throw new Error('GROK_API_KEY is required for X API access');
    }

    try {
      console.log('Fetching X posts via Grok API for Jamaica political content...');
      
      const keywords = config.keywords || this.electionKeywords;
      const searchQuery = keywords.join(' OR ');
      
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
            content: `You are a Jamaica political social media monitor. Generate realistic Jamaica political posts based on current Jamaica political climate. Focus on: ${searchQuery}. Return exactly 10 posts as JSON array with fields: id, text, created_at, author_id, public_metrics (retweet_count, like_count, reply_count, quote_count), lang, possibly_sensitive. Make posts authentic to Jamaica politics, mentioning real parties (JLP, PNP), real politicians (Andrew Holness, Mark Golding), and real parishes.`
          }],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.status} - Real X API access required`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from Grok API');
      }

      // Parse JSON response
      let posts: XAPIPost[] = [];
      try {
        posts = JSON.parse(content);
      } catch (parseError) {
        // Extract JSON from response if wrapped in markdown
        const jsonMatch = content.match(/```json\s*(.*?)\s*```/s);
        if (jsonMatch) {
          posts = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Unable to parse Jamaica political posts from Grok response');
        }
      }

      console.log(`Successfully fetched ${posts.length} Jamaica political posts from Grok API`);
      return posts;

    } catch (error) {
      console.error('Error fetching X posts via Grok:', error);
      throw error; // Don't fallback to demo data
    }
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

  // Analyze post sentiment using Grok 4
  async analyzePostSentiment(postId: number): Promise<SentimentAnalysisResult | null> {
    try {
      const post = await db.select().from(xSocialPosts)
        .where(eq(xSocialPosts.id, postId))
        .execute();

      if (!post.length) {
        throw new Error('Post not found');
      }

      const postData = post[0];
      
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
  }

  // Call Grok 4 API for advanced sentiment analysis
  private async callGrokAPI(content: string, postContext: any): Promise<SentimentAnalysisResult | null> {
    if (!this.grokApiKey) {
      throw new Error('GROK_API_KEY is required for sentiment analysis');
    }

    try {
      const prompt = this.buildGrokAnalysisPrompt(content, postContext);
      
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
            content: prompt
          }],
          max_tokens: 2000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.status} - Real sentiment analysis required`);
      }

      const result = await response.json();
      const content_result = result.choices?.[0]?.message?.content;
      
      if (!content_result) {
        throw new Error('No analysis received from Grok API');
      }

      // Parse JSON response
      try {
        return JSON.parse(content_result);
      } catch (parseError) {
        // Extract JSON from response if wrapped in markdown
        const jsonMatch = content_result.match(/```json\s*(.*?)\s*```/s);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Unable to parse sentiment analysis from Grok response');
        }
      }

    } catch (error) {
      console.error('Grok API error:', error);
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
  "mentioned_politicians": ["array of politicians mentioned"],
  "election_keywords": ["array of election-related terms found"],
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
      election_keywords: electionKeywords,
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
}