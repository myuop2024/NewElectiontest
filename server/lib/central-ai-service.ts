import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from '../storage';

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

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  static getInstance(apiKey?: string): CentralAIService {
    if (!CentralAIService.instance) {
      CentralAIService.instance = new CentralAIService(apiKey);
    }
    return CentralAIService.instance;
  }

  // Central AI data processing hub
  async processDataFlow(data: any, type: string, source: string): Promise<AIAnalysisResult> {
    const prompt = this.buildUniversalPrompt(data, type, source);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const analysisText = response.text();
      
      // Clean and parse the JSON response
      let cleanText = analysisText.trim();
      
      // Remove markdown code blocks if present
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      const analysis = JSON.parse(cleanText);
      
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
      console.error("Central AI processing error:", error);
      throw new Error(`Failed to process ${type} data with central AI`);
    }
  }

  // Social media and news sentiment analysis for Jamaica elections
  async analyzeSocialSentiment(content: string, location?: string): Promise<SentimentAnalysis> {
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

    try {
      const result = await this.model.generateContent([
        { text: systemPrompt },
        { text: prompt }
      ]);
      
      const response = result.response;
      let analysisText = response.text();
      
      // Clean and parse the JSON response
      if (analysisText.startsWith('```json')) {
        analysisText = analysisText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (analysisText.startsWith('```')) {
        analysisText = analysisText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      return JSON.parse(analysisText);
    } catch (error) {
      console.error("Social sentiment analysis error:", error);
      throw new Error("Failed to analyze social sentiment");
    }
  }

  // Jamaica-specific election monitoring analysis
  async analyzeElectionTrends(data: any[]): Promise<ElectionMonitoringData[]> {
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

    try {
      const result = await this.model.generateContent([
        { text: systemPrompt },
        { text: prompt }
      ]);
      
      const response = result.response;
      let analysisText = response.text();
      
      // Clean and parse the JSON response
      if (analysisText.startsWith('```json')) {
        analysisText = analysisText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (analysisText.startsWith('```')) {
        analysisText = analysisText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      return JSON.parse(analysisText);
    } catch (error) {
      console.error("Election trends analysis error:", error);
      throw new Error("Failed to analyze election trends");
    }
  }

  // Cross-reference all data sources for comprehensive intelligence
  async generateComprehensiveIntelligence(): Promise<any> {
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

      const result = await this.model.generateContent([
        { text: systemPrompt },
        { text: prompt }
      ]);
      
      const response = result.response;
      let analysisText = response.text();
      
      // Clean and parse the JSON response
      if (analysisText.startsWith('```json')) {
        analysisText = analysisText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (analysisText.startsWith('```')) {
        analysisText = analysisText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      return JSON.parse(analysisText);
    } catch (error) {
      console.error("Comprehensive intelligence generation error:", error);
      throw new Error("Failed to generate comprehensive intelligence");
    }
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

  // Validate API connection and model performance
  async validateConnection(): Promise<{ valid: boolean; message: string; model: string }> {
    try {
      const testPrompt = "Test Jamaica electoral monitoring AI system connectivity. Respond with JSON: {\"status\": \"connected\", \"model\": \"gemini-2.5-flash\", \"ready\": true}";
      const result = await this.model.generateContent(testPrompt);
      const response = result.response;
      const text = response.text();
      
      if (text && text.includes('connected')) {
        return { 
          valid: true, 
          message: 'Central AI system connected successfully', 
          model: 'gemini-2.5-flash' 
        };
      }
      
      return { 
        valid: false, 
        message: 'Unexpected response from AI system',
        model: 'gemini-2.5-flash'
      };
    } catch (error) {
      return { 
        valid: false, 
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        model: 'gemini-2.5-flash'
      };
    }
  }
}