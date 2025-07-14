import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { analyzeTweetSentiment, batchAnalyzeTweets, generateSentimentReport } from '../services/grok-sentiment';
import { db } from '../db';
import { socialMediaPosts, sentimentAnalysis } from '../../shared/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

const router = Router();

// Mock Twitter/X API integration for demonstration
// In production, this would connect to actual Twitter API
const mockTweets = [
  {
    id: '1',
    text: 'Great turnout at the polling station in Kingston today! Democracy in action 🗳️ #JamaicaElections',
    author: '@JamaicaVoter1',
    location: 'Kingston, Jamaica',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    text: 'Concerned about long lines at polling stations in St. Andrew. Hope everyone gets to vote! #VoteJamaica',
    author: '@ConcernedCitizen',
    location: 'St. Andrew, Jamaica',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '3',
    text: 'Peaceful election day in Portland. Proud to be Jamaican! 🇯🇲 #ElectionDay',
    author: '@PortlandPride',
    location: 'Portland, Jamaica',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: '4',
    text: 'Issues with ballot machines in Clarendon causing delays. Officials working to resolve. #JamaicaElections',
    author: '@NewsReporter',
    location: 'Clarendon, Jamaica',
    created_at: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: '5',
    text: 'Amazing organization at the St. Catherine polling station! Quick and efficient voting process.',
    author: '@HappyVoter',
    location: 'St. Catherine, Jamaica',
    created_at: new Date(Date.now() - 5400000).toISOString()
  }
];

/**
 * Get live social media sentiment analysis
 */
router.get('/live-analysis', requireAuth, async (req, res) => {
  try {
    const { parish, hours = 24, limit = 100 } = req.query;
    
    // In production, this would fetch from Twitter API
    // For now, we'll use mock data and analyze it with Grok
    
    let tweets = mockTweets;
    
    // Filter by parish if specified
    if (parish && typeof parish === 'string') {
      tweets = tweets.filter(tweet => 
        tweet.location?.toLowerCase().includes(parish.toLowerCase()) ||
        tweet.text.toLowerCase().includes(parish.toLowerCase())
      );
    }
    
    // Limit results
    tweets = tweets.slice(0, Number(limit));
    
    // Analyze tweets with Grok API
    const analyses = await batchAnalyzeTweets(
      tweets.map(tweet => ({
        text: tweet.text,
        author: tweet.author,
        location: tweet.location
      }))
    );
    
    // Combine tweet data with analysis
    const results = tweets.map((tweet, index) => ({
      id: tweet.id,
      text: tweet.text,
      author: tweet.author,
      location: tweet.location,
      createdAt: tweet.created_at,
      ...analyses[index]
    }));
    
    // Store in database
    for (const result of results) {
      await db.insert(socialMediaPosts).values({
        platform: 'twitter',
        postId: result.id,
        author: result.author,
        content: result.text,
        location: result.location,
        createdAt: new Date(result.createdAt)
      }).onConflictDoUpdate({
        target: [socialMediaPosts.postId],
        set: {
          content: sql`excluded.content`,
          location: sql`excluded.location`,
          updatedAt: new Date()
        }
      });
      
      await db.insert(sentimentAnalysis).values({
        postId: result.id,
        sentiment: result.sentiment,
        confidence: result.confidence,
        relevanceScore: result.relevanceScore,
        topics: result.topics,
        parish: result.parish,
        riskLevel: result.analysis.riskLevel,
        summary: result.analysis.summary,
        keyPoints: result.analysis.keyPoints,
        isActionable: result.analysis.actionable
      }).onConflictDoUpdate({
        target: [sentimentAnalysis.postId],
        set: {
          sentiment: sql`excluded.sentiment`,
          confidence: sql`excluded.confidence`,
          relevanceScore: sql`excluded.relevance_score`,
          topics: sql`excluded.topics`,
          parish: sql`excluded.parish`,
          riskLevel: sql`excluded.risk_level`,
          summary: sql`excluded.summary`,
          keyPoints: sql`excluded.key_points`,
          isActionable: sql`excluded.is_actionable`,
          updatedAt: new Date()
        }
      });
    }
    
    res.json({
      success: true,
      data: results,
      total: results.length,
      filters: { parish, hours }
    });
  } catch (error) {
    console.error('Error in live sentiment analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze social media sentiment' 
    });
  }
});

/**
 * Get sentiment analysis report
 */
router.get('/report', requireAuth, async (req, res) => {
  try {
    const { parish, hours = 24 } = req.query;
    
    // Fetch recent sentiment analyses from database
    const hoursAgo = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);
    
    let query = db
      .select()
      .from(sentimentAnalysis)
      .where(gte(sentimentAnalysis.createdAt, hoursAgo))
      .orderBy(desc(sentimentAnalysis.createdAt));
    
    if (parish && typeof parish === 'string') {
      query = query.where(
        and(
          gte(sentimentAnalysis.createdAt, hoursAgo),
          eq(sentimentAnalysis.parish, parish)
        )
      );
    }
    
    const analyses = await query;
    
    // Generate comprehensive report using Grok
    const report = await generateSentimentReport(
      analyses.map(a => ({
        sentiment: a.sentiment as 'positive' | 'negative' | 'neutral',
        confidence: a.confidence,
        relevanceScore: a.relevanceScore,
        topics: a.topics,
        parish: a.parish,
        analysis: {
          summary: a.summary,
          keyPoints: a.keyPoints,
          riskLevel: a.riskLevel as 'low' | 'medium' | 'high',
          actionable: a.isActionable
        }
      }))
    );
    
    res.json({
      success: true,
      report,
      sampleSize: analyses.length,
      timeframe: `${hours} hours`,
      parish: parish || 'All parishes'
    });
  } catch (error) {
    console.error('Error generating sentiment report:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate sentiment report' 
    });
  }
});

/**
 * Get sentiment trends over time
 */
router.get('/trends', requireAuth, async (req, res) => {
  try {
    const { parish, days = 7 } = req.query;
    
    const daysAgo = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    
    let query = db
      .select({
        date: sql<string>`DATE(${sentimentAnalysis.createdAt})`,
        sentiment: sentimentAnalysis.sentiment,
        count: sql<number>`COUNT(*)`,
        avgConfidence: sql<number>`AVG(${sentimentAnalysis.confidence})`,
        avgRelevance: sql<number>`AVG(${sentimentAnalysis.relevanceScore})`
      })
      .from(sentimentAnalysis)
      .where(gte(sentimentAnalysis.createdAt, daysAgo))
      .groupBy(sql`DATE(${sentimentAnalysis.createdAt})`, sentimentAnalysis.sentiment)
      .orderBy(sql`DATE(${sentimentAnalysis.createdAt})`);
    
    if (parish && typeof parish === 'string') {
      query = query.where(
        and(
          gte(sentimentAnalysis.createdAt, daysAgo),
          eq(sentimentAnalysis.parish, parish)
        )
      );
    }
    
    const trends = await query;
    
    res.json({
      success: true,
      trends,
      timeframe: `${days} days`,
      parish: parish || 'All parishes'
    });
  } catch (error) {
    console.error('Error fetching sentiment trends:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch sentiment trends' 
    });
  }
});

/**
 * Get high-risk posts requiring attention
 */
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const { parish, hours = 24 } = req.query;
    
    const hoursAgo = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);
    
    let query = db
      .select({
        post: socialMediaPosts,
        analysis: sentimentAnalysis
      })
      .from(sentimentAnalysis)
      .innerJoin(socialMediaPosts, eq(socialMediaPosts.postId, sentimentAnalysis.postId))
      .where(
        and(
          gte(sentimentAnalysis.createdAt, hoursAgo),
          eq(sentimentAnalysis.riskLevel, 'high')
        )
      )
      .orderBy(desc(sentimentAnalysis.createdAt));
    
    if (parish && typeof parish === 'string') {
      query = query.where(
        and(
          gte(sentimentAnalysis.createdAt, hoursAgo),
          eq(sentimentAnalysis.riskLevel, 'high'),
          eq(sentimentAnalysis.parish, parish)
        )
      );
    }
    
    const alerts = await query;
    
    res.json({
      success: true,
      alerts: alerts.map(({ post, analysis }) => ({
        id: post.id,
        postId: post.postId,
        platform: post.platform,
        author: post.author,
        content: post.content,
        location: post.location,
        createdAt: post.createdAt,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        riskLevel: analysis.riskLevel,
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        parish: analysis.parish,
        topics: analysis.topics
      })),
      total: alerts.length,
      timeframe: `${hours} hours`,
      parish: parish || 'All parishes'
    });
  } catch (error) {
    console.error('Error fetching sentiment alerts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch sentiment alerts' 
    });
  }
});

/**
 * Analyze single tweet/post
 */
router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { text, author, location } = req.body;
    
    if (!text || !author) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text and author are required' 
      });
    }
    
    const analysis = await analyzeTweetSentiment(text, author, location);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing single tweet:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze tweet' 
    });
  }
});

/**
 * Get parish-specific sentiment overview
 */
router.get('/parish-overview', requireAuth, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const hoursAgo = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);
    
    const parishData = await db
      .select({
        parish: sentimentAnalysis.parish,
        totalPosts: sql<number>`COUNT(*)`,
        avgSentiment: sql<number>`
          AVG(CASE 
            WHEN ${sentimentAnalysis.sentiment} = 'positive' THEN 1
            WHEN ${sentimentAnalysis.sentiment} = 'negative' THEN -1
            ELSE 0
          END)
        `,
        avgConfidence: sql<number>`AVG(${sentimentAnalysis.confidence})`,
        avgRelevance: sql<number>`AVG(${sentimentAnalysis.relevanceScore})`,
        highRiskCount: sql<number>`COUNT(CASE WHEN ${sentimentAnalysis.riskLevel} = 'high' THEN 1 END)`,
        mediumRiskCount: sql<number>`COUNT(CASE WHEN ${sentimentAnalysis.riskLevel} = 'medium' THEN 1 END)`,
        lowRiskCount: sql<number>`COUNT(CASE WHEN ${sentimentAnalysis.riskLevel} = 'low' THEN 1 END)`
      })
      .from(sentimentAnalysis)
      .where(gte(sentimentAnalysis.createdAt, hoursAgo))
      .groupBy(sentimentAnalysis.parish)
      .orderBy(sentimentAnalysis.parish);
    
    res.json({
      success: true,
      data: parishData,
      timeframe: `${hours} hours`
    });
  } catch (error) {
    console.error('Error fetching parish overview:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch parish overview' 
    });
  }
});

export default router;