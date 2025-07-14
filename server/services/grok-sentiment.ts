import OpenAI from "openai";

// Initialize xAI client with Grok API
const xai = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY,
});

export interface TweetSentiment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  relevanceScore: number;
  topics: string[];
  location?: string;
  parish?: string;
  analysis: {
    summary: string;
    keyPoints: string[];
    riskLevel: 'low' | 'medium' | 'high';
    actionable: boolean;
  };
}

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  relevanceScore: number;
  topics: string[];
  location?: string;
  parish?: string;
  analysis: {
    summary: string;
    keyPoints: string[];
    riskLevel: 'low' | 'medium' | 'high';
    actionable: boolean;
  };
}

// Jamaica parishes for location detection
const JAMAICA_PARISHES = [
  'Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon', 'Manchester',
  'St. Elizabeth', 'Westmoreland', 'Hanover', 'St. James', 'Trelawny',
  'St. Ann', 'St. Mary', 'Portland', 'St. Thomas'
];

// Election-related keywords for relevance scoring
const ELECTION_KEYWORDS = [
  'election', 'vote', 'voting', 'ballot', 'poll', 'candidate', 'democracy',
  'constituency', 'parliament', 'political', 'campaign', 'party', 'JLP', 'PNP',
  'minister', 'government', 'opposition', 'electoral', 'jamaica', 'jamaican'
];

// Risk keywords for threat assessment
const RISK_KEYWORDS = [
  'violence', 'threat', 'attack', 'protest', 'riot', 'unrest', 'clash',
  'fraud', 'corruption', 'intimidation', 'harassment', 'disruption',
  'emergency', 'crisis', 'conflict', 'tension', 'danger'
];

/**
 * Analyze tweet sentiment using Grok API 4
 */
export async function analyzeTweetSentiment(
  tweetText: string,
  author: string,
  location?: string
): Promise<SentimentAnalysisResult> {
  try {
    const response = await xai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are an expert social media analyst specializing in Jamaican electoral observation and sentiment analysis. 

Analyze the following tweet for:
1. Sentiment (positive, negative, neutral)
2. Confidence score (0-1)
3. Relevance to Jamaica elections (0-10)
4. Key topics mentioned
5. Geographic location/parish if mentioned
6. Risk assessment for electoral activities
7. Actionable insights

Focus on:
- Electoral processes and democracy
- Political climate and public opinion
- Potential threats or issues
- Community sentiment
- Geographic context within Jamaica

Respond with JSON in this exact format:
{
  "sentiment": "positive|negative|neutral",
  "confidence": number,
  "relevanceScore": number,
  "topics": ["topic1", "topic2"],
  "location": "location if mentioned",
  "parish": "parish if identified",
  "analysis": {
    "summary": "brief analysis summary",
    "keyPoints": ["point1", "point2"],
    "riskLevel": "low|medium|high",
    "actionable": boolean
  }
}`
        },
        {
          role: "user",
          content: `Tweet: "${tweetText}"
Author: ${author}
${location ? `Location: ${location}` : ''}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate and enhance the result
    return {
      sentiment: result.sentiment || 'neutral',
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      relevanceScore: Math.max(0, Math.min(10, result.relevanceScore || 0)),
      topics: Array.isArray(result.topics) ? result.topics : [],
      location: result.location || location,
      parish: result.parish || detectParish(tweetText),
      analysis: {
        summary: result.analysis?.summary || 'No analysis available',
        keyPoints: Array.isArray(result.analysis?.keyPoints) ? result.analysis.keyPoints : [],
        riskLevel: result.analysis?.riskLevel || 'low',
        actionable: result.analysis?.actionable || false
      }
    };
  } catch (error) {
    console.error('Error analyzing tweet sentiment:', error);
    
    // Fallback analysis
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      relevanceScore: calculateRelevanceScore(tweetText),
      topics: extractTopics(tweetText),
      location: location,
      parish: detectParish(tweetText),
      analysis: {
        summary: 'Automated analysis unavailable',
        keyPoints: [],
        riskLevel: detectRiskLevel(tweetText),
        actionable: false
      }
    };
  }
}

/**
 * Batch analyze multiple tweets
 */
export async function batchAnalyzeTweets(
  tweets: Array<{ text: string; author: string; location?: string }>
): Promise<SentimentAnalysisResult[]> {
  const results = [];
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < tweets.length; i += 5) {
    const batch = tweets.slice(i, i + 5);
    const batchPromises = batch.map(tweet => 
      analyzeTweetSentiment(tweet.text, tweet.author, tweet.location)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + 5 < tweets.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Generate sentiment summary report
 */
export async function generateSentimentReport(
  sentiments: SentimentAnalysisResult[]
): Promise<{
  overall: 'positive' | 'negative' | 'neutral';
  distribution: { positive: number; negative: number; neutral: number };
  averageConfidence: number;
  topTopics: string[];
  riskAssessment: string;
  recommendations: string[];
}> {
  try {
    const response = await xai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are analyzing social media sentiment data for Jamaica electoral observation. Generate a comprehensive report based on the sentiment analysis results.

Focus on:
- Overall sentiment trends
- Geographic patterns
- Risk assessment
- Actionable recommendations for electoral observers

Provide JSON response with:
{
  "overall": "positive|negative|neutral",
  "distribution": { "positive": number, "negative": number, "neutral": number },
  "averageConfidence": number,
  "topTopics": ["topic1", "topic2"],
  "riskAssessment": "detailed risk analysis",
  "recommendations": ["recommendation1", "recommendation2"]
}`
        },
        {
          role: "user",
          content: `Analyze these sentiment results: ${JSON.stringify(sentiments.slice(0, 50))}` // Limit to avoid token limits
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1500
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      overall: result.overall || calculateOverallSentiment(sentiments),
      distribution: result.distribution || calculateDistribution(sentiments),
      averageConfidence: result.averageConfidence || calculateAverageConfidence(sentiments),
      topTopics: result.topTopics || extractTopTopics(sentiments),
      riskAssessment: result.riskAssessment || 'Analysis unavailable',
      recommendations: result.recommendations || []
    };
  } catch (error) {
    console.error('Error generating sentiment report:', error);
    
    return {
      overall: calculateOverallSentiment(sentiments),
      distribution: calculateDistribution(sentiments),
      averageConfidence: calculateAverageConfidence(sentiments),
      topTopics: extractTopTopics(sentiments),
      riskAssessment: 'Automated report generation unavailable',
      recommendations: []
    };
  }
}

// Helper functions
function detectParish(text: string): string | undefined {
  const textLower = text.toLowerCase();
  return JAMAICA_PARISHES.find(parish => 
    textLower.includes(parish.toLowerCase()) ||
    textLower.includes(parish.toLowerCase().replace(' ', ''))
  );
}

function calculateRelevanceScore(text: string): number {
  const textLower = text.toLowerCase();
  let score = 0;
  
  ELECTION_KEYWORDS.forEach(keyword => {
    if (textLower.includes(keyword)) {
      score += 1;
    }
  });
  
  return Math.min(10, score);
}

function extractTopics(text: string): string[] {
  const topics = [];
  const textLower = text.toLowerCase();
  
  if (textLower.includes('election') || textLower.includes('vote')) topics.push('Election');
  if (textLower.includes('candidate') || textLower.includes('political')) topics.push('Politics');
  if (textLower.includes('security') || textLower.includes('safety')) topics.push('Security');
  if (textLower.includes('turnout') || textLower.includes('participation')) topics.push('Participation');
  
  return topics;
}

function detectRiskLevel(text: string): 'low' | 'medium' | 'high' {
  const textLower = text.toLowerCase();
  
  for (const keyword of RISK_KEYWORDS) {
    if (textLower.includes(keyword)) {
      return 'high';
    }
  }
  
  if (textLower.includes('concern') || textLower.includes('issue')) {
    return 'medium';
  }
  
  return 'low';
}

function calculateOverallSentiment(sentiments: SentimentAnalysisResult[]): 'positive' | 'negative' | 'neutral' {
  if (sentiments.length === 0) return 'neutral';
  
  const counts = sentiments.reduce((acc, s) => {
    acc[s.sentiment] = (acc[s.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const max = Math.max(counts.positive || 0, counts.negative || 0, counts.neutral || 0);
  
  if (max === counts.positive) return 'positive';
  if (max === counts.negative) return 'negative';
  return 'neutral';
}

function calculateDistribution(sentiments: SentimentAnalysisResult[]) {
  const total = sentiments.length;
  if (total === 0) return { positive: 0, negative: 0, neutral: 0 };
  
  const counts = sentiments.reduce((acc, s) => {
    acc[s.sentiment] = (acc[s.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    positive: Math.round(((counts.positive || 0) / total) * 100),
    negative: Math.round(((counts.negative || 0) / total) * 100),
    neutral: Math.round(((counts.neutral || 0) / total) * 100)
  };
}

function calculateAverageConfidence(sentiments: SentimentAnalysisResult[]): number {
  if (sentiments.length === 0) return 0;
  
  const sum = sentiments.reduce((acc, s) => acc + s.confidence, 0);
  return Math.round((sum / sentiments.length) * 100) / 100;
}

function extractTopTopics(sentiments: SentimentAnalysisResult[]): string[] {
  const topicCounts = sentiments.reduce((acc, s) => {
    s.topics.forEach(topic => {
      acc[topic] = (acc[topic] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([topic]) => topic);
}