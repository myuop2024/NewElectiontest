import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from '../storage';
import { APICreditManager } from './api-credit-manager';

interface AIAnalysisResult {
  type: 'incident' | 'document' | 'sentiment' | 'election_monitoring' | 'training' | 'security';
  confidence: number;
  analysis: any;
  timestamp: Date;
  source: string;
  location?: string;
  relevance: number;
}

interface SentimentAnalysis {
  overall_sentiment: string;
  confidence: number;
  key_issues: string[];
  election_relevance: number;
  geographic_focus: string[];
  concerns: string[];
  positive_indicators: string[];
  risk_level: string;
}

interface ElectionMonitoringData {
  location: string;
  parish: string;
  sentiment_score: number;
  key_issues: string[];
  news_sources: string[];
  social_media_mentions: number;
  risk_indicators: string[];
  timestamp: Date;
}

export class CentralAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private static instance: CentralAIService;
  private creditManager: APICreditManager;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    this.creditManager = APICreditManager.getInstance();
  }

  static getInstance(apiKey?: string): CentralAIService {
    if (!CentralAIService.instance) {
      CentralAIService.instance = new CentralAIService(apiKey);
    }
    return CentralAIService.instance;
  }

  // Central AI data processing hub with credit optimization
  async processDataFlow(data: any, type: string, source: string): Promise<AIAnalysisResult> {
    const cacheKey = `dataflow_${type}_${source}_${JSON.stringify(data).slice(0, 100)}`;
    
    return this.creditManager.getCachedOrFetch(cacheKey, async () => {
      // Check credit limits before making API call
      if (!(await this.creditManager.canMakeAPICall('gemini', 'processDataFlow'))) {
        throw new Error('API credit limit reached for data processing');
      }

      const prompt = this.buildUniversalPrompt(data, type, source);
      const optimizedPrompt = this.creditManager.optimizePrompt(prompt, 800);
      
      try {
        const result = await this.model.generateContent(optimizedPrompt);
        const response = result.response;
        const analysisText = response.text();
        
        // Estimate tokens used (rough calculation)
        const tokensUsed = Math.ceil((optimizedPrompt.length + analysisText.length) / 4);
        
        // Clean and parse the JSON response
        let cleanText = analysisText.trim();
        
        // Remove markdown code blocks if present
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        
        let analysis;
        try {
          analysis = JSON.parse(cleanText);
        } catch (parseError) {
          console.error("JSON parsing failed, AI returned non-JSON text:", cleanText.substring(0, 100));
          // Return fallback analysis structure
          analysis = {
            sentiment: 'neutral',
            confidence: 0.1,
            riskLevel: 'low',
            analysis: 'AI parsing error - rate limits or service issues',
            location: location || 'Jamaica',
            relevance: 0.1,
            error: 'JSON parsing failed'
          };
        }
        
        // Track successful usage
        this.creditManager.trackUsage('gemini', 'processDataFlow', tokensUsed, true);
        
        return {
          type: type as any,
          confidence: analysis.confidence || 0.8,
          analysis: analysis,
          timestamp: new Date(),
          source: source,
          location: analysis.location || data.location,
          relevance: analysis.relevance || 0.7
        };
      } catch (error) {
        // Track failed usage
        this.creditManager.trackUsage('gemini', 'processDataFlow', 100, false);
        console.error("Central AI processing error:", error);
        throw new Error(`Failed to process ${type} data with central AI`);
      }
    }, 15); // Cache for 15 minutes
  }

  // Social media and news sentiment analysis for Jamaica elections with credit optimization
  async analyzeSocialSentiment(content: string, location?: string): Promise<SentimentAnalysis> {
    const cacheKey = `sentiment_${content.slice(0, 50)}_${location}`;
    
    return this.creditManager.getCachedOrFetch(cacheKey, async () => {
      // Check credit limits before making API call
      if (!(await this.creditManager.canMakeAPICall('gemini', 'analyzeSocialSentiment'))) {
        throw new Error('API credit limit reached for sentiment analysis');
      }

      const systemPrompt = `You are an expert AI analyst specializing in Jamaican electoral monitoring and social sentiment analysis. 
      Analyze social media content and news for election-related sentiment, issues, and concerns across Jamaica's parishes and constituencies.
      Focus on: Kingston, Spanish Town, Montego Bay, May Pen, Portmore, Mandeville, Old Harbour, Savanna-la-Mar, Linstead, Half Way Tree, and all 14 parishes.`;

      const prompt = `Analyze this social media/news content for Jamaica election sentiment:

CONTENT: ${content}
LOCATION: ${location || 'Jamaica (general)'}

Please provide a comprehensive analysis in JSON format focusing on:
1. Overall sentiment toward electoral process
2. Key issues and concerns being discussed
3. Geographic areas of focus within Jamaica
4. Election integrity concerns
5. Positive democratic indicators
6. Risk level assessment for election violence or irregularities

Return in this JSON structure:
{
  "overall_sentiment": "positive|neutral|negative|mixed",
  "confidence": 0.85,
  "key_issues": ["issue1", "issue2", "issue3"],
  "election_relevance": 0.9,
  "geographic_focus": ["parish1", "constituency1"],
  "concerns": ["concern1", "concern2"],
  "positive_indicators": ["indicator1", "indicator2"],
  "risk_level": "low|medium|high|critical"
}`;

      const optimizedPrompt = this.creditManager.optimizePrompt(prompt, 600);
      
      try {
        const result = await this.model.generateContent([
          { text: systemPrompt },
          { text: optimizedPrompt }
        ]);
        
        const response = result.response;
        let analysisText = response.text();
        
        // Estimate tokens used
        const tokensUsed = Math.ceil((systemPrompt.length + optimizedPrompt.length + analysisText.length) / 4);
        
        // Clean and parse the JSON response
        if (analysisText.includes('```json')) {
          analysisText = analysisText.replace(/^.*```json\n?/, '').replace(/\n?```.*$/, '');
        } else if (analysisText.includes('```')) {
          analysisText = analysisText.replace(/^.*```\n?/, '').replace(/\n?```.*$/, '');
        }
        
        // Extract JSON from the response if it's mixed with text
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisText = jsonMatch[0];
        }
        
        // Remove any trailing commas before closing brackets/braces
        analysisText = analysisText.replace(/,(\s*[}\]])/g, '$1');
        
        // If response doesn't look like JSON, throw error immediately
        if (!analysisText.trim().startsWith('{')) {
          throw new Error('AI response is not in valid JSON format');
        }
        
        try {
          const result = JSON.parse(analysisText);
          
          // Track successful usage
          this.creditManager.trackUsage('gemini', 'analyzeSocialSentiment', tokensUsed, true);
          
          return result;
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          console.error("Problematic text (first 200 chars):", analysisText.substring(0, 200));
          throw new Error('Failed to parse AI sentiment analysis response');
        }
      } catch (error) {
        // Track failed usage
        this.creditManager.trackUsage('gemini', 'analyzeSocialSentiment', 100, false);
        console.error("Social sentiment analysis error:", error);
        throw new Error("Failed to analyze social sentiment - AI service unavailable");
      }
    }, 30); // Cache for 30 minutes
  }

  // Jamaica-specific election monitoring analysis with credit optimization
  async analyzeElectionTrends(data: any[]): Promise<ElectionMonitoringData[]> {
    const cacheKey = `trends_${data.length}_${JSON.stringify(data.slice(0, 3))}`;
    
    return this.creditManager.getCachedOrFetch(cacheKey, async () => {
      // Check credit limits before making API call
      if (!(await this.creditManager.canMakeAPICall('gemini', 'analyzeElectionTrends'))) {
        throw new Error('API credit limit reached for election trends analysis');
      }

      const jamaicaParishes = [
        'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
        'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
        'Manchester', 'Clarendon', 'St. Catherine'
      ];

      const systemPrompt = `You are an electoral monitoring AI specialist for Jamaica. 
      Analyze election-related data trends across Jamaica's 14 parishes and 63 constituencies.
      Focus on identifying patterns, risks, and sentiment changes that could affect electoral integrity.`;

      const prompt = `Analyze these Jamaica election monitoring data points:

DATA: ${JSON.stringify(data, null, 2)}

For each parish/location, provide:
1. Sentiment score analysis
2. Key issues and concerns
3. Risk indicators for election irregularities
4. News source credibility assessment
5. Social media engagement patterns

Return as JSON array with this structure:
[{
  "location": "specific area",
  "parish": "parish name",
  "sentiment_score": 0.75,
  "key_issues": ["issue1", "issue2"],
  "news_sources": ["source1", "source2"],
  "social_media_mentions": 150,
  "risk_indicators": ["risk1", "risk2"],
  "timestamp": "2025-07-05T12:00:00Z"
}]`;

      const optimizedPrompt = this.creditManager.optimizePrompt(prompt, 1000);
      
      try {
        const result = await this.model.generateContent([
          { text: systemPrompt },
          { text: optimizedPrompt }
        ]);
        
        const response = result.response;
        let analysisText = response.text();
        
        // Estimate tokens used
        const tokensUsed = Math.ceil((systemPrompt.length + optimizedPrompt.length + analysisText.length) / 4);
        
        // Clean and parse the JSON response
        if (analysisText.startsWith('```json')) {
          analysisText = analysisText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (analysisText.startsWith('```')) {
          analysisText = analysisText.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        
        let parsedResult;
        try {
          parsedResult = JSON.parse(analysisText);
        } catch (parseError) {
          console.error("JSON parsing failed, AI returned non-JSON text:", analysisText.substring(0, 100));
          // Return fallback data when AI returns non-JSON
          parsedResult = [{
            location: "Jamaica",
            parish: "All Parishes",
            sentiment_score: 0.5,
            key_issues: ["AI parsing issue - rate limits"],
            news_sources: ["System notification"],
            social_media_mentions: 0,
            risk_indicators: ["Service temporarily unavailable"],
            timestamp: new Date().toISOString()
          }];
        }
        
        // Track successful usage
        this.creditManager.trackUsage('gemini', 'analyzeElectionTrends', tokensUsed, true);
        
        return parsedResult;
      } catch (error) {
        // Track failed usage
        this.creditManager.trackUsage('gemini', 'analyzeElectionTrends', 100, false);
        console.error("Election trends analysis error:", error);
        
        // Return fallback data instead of throwing error
        return [{
          location: "Jamaica",
          parish: "All Parishes",
          sentiment_score: 0.5,
          key_issues: ["API rate limit exceeded"],
          news_sources: ["System notification"],
          social_media_mentions: 0,
          risk_indicators: ["Service temporarily unavailable"],
          timestamp: new Date().toISOString()
        }];
      }
    }, 60); // Cache for 1 hour
  }

  // Cross-reference all data sources for comprehensive intelligence with credit optimization
  async generateComprehensiveIntelligence(): Promise<any> {
    const cacheKey = 'comprehensive_intelligence';
    
    return this.creditManager.getCachedOrFetch(cacheKey, async () => {
      // Check credit limits before making API call
      if (!(await this.creditManager.canMakeAPICall('gemini', 'generateComprehensiveIntelligence'))) {
        throw new Error('API credit limit reached for comprehensive intelligence');
      }

      try {
        // Gather data from all sources
        const reports = await storage.getReports();
        const documents = await storage.getDocuments();
        
        // Combine all data for AI analysis
        const combinedData = {
          incident_reports: reports.slice(-10), // Last 10 reports
          documents: documents.slice(-20), // Last 20 documents
          timestamp: new Date(),
          analysis_scope: 'comprehensive_election_intelligence'
        };

        const systemPrompt = `You are Jamaica's central electoral intelligence AI system.
        Analyze all available data sources to provide comprehensive election monitoring intelligence.
        Consider: incident patterns, document evidence, geographic trends, and temporal patterns.`;

        const prompt = `Generate comprehensive electoral intelligence report for Jamaica:

COMBINED DATA: ${JSON.stringify(combinedData, null, 2)}

Provide comprehensive analysis including:
1. Overall election integrity assessment
2. Critical risk areas by parish/constituency
3. Pattern recognition across incidents and evidence
4. Predictive indicators for potential issues
5. Resource allocation recommendations
6. Stakeholder alerts and notifications

Return detailed JSON intelligence report.`;

        const optimizedPrompt = this.creditManager.optimizePrompt(prompt, 1200);
        
        const result = await this.model.generateContent([
          { text: systemPrompt },
          { text: optimizedPrompt }
        ]);
        
        const response = result.response;
        let analysisText = response.text();
        
        // Estimate tokens used
        const tokensUsed = Math.ceil((systemPrompt.length + optimizedPrompt.length + analysisText.length) / 4);
        
        // Clean and parse the JSON response
        if (analysisText.startsWith('```json')) {
          analysisText = analysisText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (analysisText.startsWith('```')) {
          analysisText = analysisText.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        
        const intelligenceResult = JSON.parse(analysisText);
        
        // Track successful usage
        this.creditManager.trackUsage('gemini', 'generateComprehensiveIntelligence', tokensUsed, true);
        
        return intelligenceResult;
      } catch (error) {
        // Track failed usage
        this.creditManager.trackUsage('gemini', 'generateComprehensiveIntelligence', 100, false);
        console.error("Comprehensive intelligence generation error:", error);
        throw new Error("Failed to generate comprehensive intelligence");
      }
    }, 120); // Cache for 2 hours
  }

  private buildUniversalPrompt(data: any, type: string, source: string): string {
    const basePrompt = `As Jamaica's central electoral monitoring AI system, analyze this ${type} data from ${source}:

DATA: ${JSON.stringify(data, null, 2)}

Provide analysis considering:
- Election integrity implications
- Geographic relevance within Jamaica
- Risk assessment
- Pattern correlation with other data sources
- Confidence levels
- Actionable recommendations

Return comprehensive JSON analysis.`;

    return basePrompt;
  }

  // Validate API connection and model performance with minimal credit usage
  async validateConnection(): Promise<{ valid: boolean; message: string; model: string }> {
    const cacheKey = 'connection_validation';
    
    return this.creditManager.getCachedOrFetch(cacheKey, async () => {
      try {
        // Use minimal prompt for connection test
        const testPrompt = "Test Jamaica electoral monitoring AI system connectivity. Respond with JSON: {\"status\": \"connected\", \"model\": \"gemini-2.0-flash-exp\", \"ready\": true}";
        const result = await this.model.generateContent(testPrompt);
        const response = result.response;
        const text = response.text();
        
        // Estimate tokens used (minimal for connection test)
        const tokensUsed = Math.ceil((testPrompt.length + text.length) / 4);
        
        if (text && text.includes('connected')) {
          // Track successful usage
          this.creditManager.trackUsage('gemini', 'validateConnection', tokensUsed, true);
          
          return { 
            valid: true, 
            message: 'Central AI system connected successfully', 
            model: 'gemini-2.0-flash-exp' 
          };
        }
        
        // Track failed usage
        this.creditManager.trackUsage('gemini', 'validateConnection', tokensUsed, false);
        
        return { 
          valid: false, 
          message: 'Unexpected response from AI system',
          model: 'gemini-2.0-flash-exp'
        };
      } catch (error) {
        // Track failed usage
        this.creditManager.trackUsage('gemini', 'validateConnection', 50, false);
        
        return { 
          valid: false, 
          message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          model: 'gemini-2.0-flash-exp'
        };
      }
    }, 300); // Cache for 5 hours (connection validation doesn't change often)
  }

  // Get credit usage statistics
  getCreditUsageStats(): any {
    return this.creditManager.getUsageStats();
  }

  // Check for credit emergency
  async checkCreditEmergency(): Promise<boolean> {
    return this.creditManager.checkCreditEmergency();
  }
}