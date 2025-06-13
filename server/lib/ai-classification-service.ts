import { GoogleGenerativeAI } from '@google/generative-ai';

interface ClassificationResult {
  category: string;
  subcategory: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  riskScore: number;
  keywords: string[];
  suggestedActions: string[];
  escalationRecommended: boolean;
  reasoning: string;
}

interface IncidentPatterns {
  similarIncidents: number;
  geographicCluster: boolean;
  timePattern: string;
  riskFactors: string[];
}

export class AIClassificationService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
  }

  async classifyIncident(text: string, model: string = 'gemini-1.5-flash'): Promise<ClassificationResult> {
    try {
      const aiModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
You are an advanced AI system specialized in analyzing electoral incidents and security threats. 
Analyze the following incident report and provide a comprehensive classification.

INCIDENT TEXT:
${text}

Provide your analysis in the following JSON format:
{
  "category": "one of: voter_intimidation, ballot_irregularity, technical_malfunction, violence, procedural_violation, security_breach, crowd_control, media_interference, other",
  "subcategory": "specific type within the category",
  "severity": "one of: low, medium, high, critical",
  "confidence": "percentage (0-100) of how confident you are in this classification",
  "riskScore": "risk assessment score (0-100) where 100 is maximum risk",
  "keywords": ["array", "of", "key", "terms", "that", "influenced", "classification"],
  "suggestedActions": ["immediate", "actions", "recommended"],
  "escalationRecommended": "boolean - true if this requires immediate escalation",
  "reasoning": "brief explanation of your classification decision"
}

CLASSIFICATION GUIDELINES:
- voter_intimidation: Threats, coercion, or attempts to prevent voting
- ballot_irregularity: Issues with ballot handling, counting, or integrity
- technical_malfunction: Equipment failures, system errors
- violence: Physical altercations, assault, property damage
- procedural_violation: Failure to follow electoral procedures
- security_breach: Unauthorized access, data breaches
- crowd_control: Large gatherings, disruptions
- media_interference: Restrictions on media access, misinformation

SEVERITY LEVELS:
- low: Minor issues with limited impact
- medium: Significant issues requiring attention
- high: Serious issues that could affect election integrity
- critical: Severe threats requiring immediate intervention

Respond only with valid JSON.
`;

      const result = await aiModel.generateContent(prompt);
      const response = await result.response;
      const text_response = response.text();

      // Parse JSON response
      const jsonMatch = text_response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI model');
      }

      const classification = JSON.parse(jsonMatch[0]);

      // Validate and sanitize the response
      return {
        category: classification.category || 'other',
        subcategory: classification.subcategory || 'unspecified',
        severity: ['low', 'medium', 'high', 'critical'].includes(classification.severity) 
          ? classification.severity : 'medium',
        confidence: Math.min(100, Math.max(0, parseInt(classification.confidence) || 50)),
        riskScore: Math.min(100, Math.max(0, parseInt(classification.riskScore) || 25)),
        keywords: Array.isArray(classification.keywords) ? classification.keywords.slice(0, 10) : [],
        suggestedActions: Array.isArray(classification.suggestedActions) 
          ? classification.suggestedActions.slice(0, 5) : [],
        escalationRecommended: Boolean(classification.escalationRecommended),
        reasoning: classification.reasoning || 'Classification based on content analysis'
      };

    } catch (error) {
      console.error('AI Classification Error:', error);
      
      // Fallback classification for service continuity
      return {
        category: 'other',
        subcategory: 'analysis_failed',
        severity: 'medium',
        confidence: 0,
        riskScore: 50,
        keywords: ['analysis_error'],
        suggestedActions: ['Manual review required'],
        escalationRecommended: false,
        reasoning: 'AI analysis failed, manual classification needed'
      };
    }
  }

  async analyzeIncidentPatterns(
    currentIncident: ClassificationResult, 
    historicalData: any[]
  ): Promise<IncidentPatterns> {
    try {
      // Analyze similar incidents
      const similarIncidents = historicalData.filter(incident => 
        incident.category === currentIncident.category &&
        incident.severity === currentIncident.severity
      ).length;

      // Check for geographic clustering (simplified)
      const geographicCluster = historicalData.some(incident => 
        incident.location && currentIncident.keywords.some(keyword =>
          incident.description?.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      // Analyze time patterns
      const recentIncidents = historicalData.filter(incident => {
        const incidentTime = new Date(incident.createdAt);
        const daysDiff = (Date.now() - incidentTime.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      });

      let timePattern = 'isolated';
      if (recentIncidents.length > 5) {
        timePattern = 'increasing_frequency';
      } else if (recentIncidents.length > 2) {
        timePattern = 'moderate_activity';
      }

      // Identify risk factors
      const riskFactors = [];
      if (currentIncident.severity === 'critical' || currentIncident.severity === 'high') {
        riskFactors.push('high_severity_incident');
      }
      if (similarIncidents > 3) {
        riskFactors.push('recurring_issue_type');
      }
      if (geographicCluster) {
        riskFactors.push('geographic_concentration');
      }
      if (timePattern === 'increasing_frequency') {
        riskFactors.push('escalating_situation');
      }

      return {
        similarIncidents,
        geographicCluster,
        timePattern,
        riskFactors
      };

    } catch (error) {
      console.error('Pattern Analysis Error:', error);
      return {
        similarIncidents: 0,
        geographicCluster: false,
        timePattern: 'unknown',
        riskFactors: []
      };
    }
  }

  async generateRecommendations(
    classification: ClassificationResult,
    patterns: IncidentPatterns
  ): Promise<string[]> {
    const recommendations = [...classification.suggestedActions];

    // Add pattern-based recommendations
    if (patterns.similarIncidents > 3) {
      recommendations.push('Review systematic causes for recurring incident type');
    }

    if (patterns.geographicCluster) {
      recommendations.push('Deploy additional observers to affected area');
    }

    if (patterns.timePattern === 'increasing_frequency') {
      recommendations.push('Escalate to election commission for immediate intervention');
    }

    if (classification.severity === 'critical') {
      recommendations.push('Immediate security response required');
      recommendations.push('Notify law enforcement if applicable');
    }

    if (patterns.riskFactors.includes('escalating_situation')) {
      recommendations.push('Monitor situation closely for further developments');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  async batchClassifyIncidents(incidents: any[], model: string = 'gemini-1.5-flash'): Promise<any[]> {
    const results = [];

    for (const incident of incidents) {
      try {
        const classification = await this.classifyIncident(incident.description, model);
        
        results.push({
          incidentId: incident.id,
          classification,
          processed: true,
          error: null
        });

        // Add small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Failed to classify incident ${incident.id}:`, error);
        results.push({
          incidentId: incident.id,
          classification: null,
          processed: false,
          error: error.message
        });
      }
    }

    return results;
  }

  validateClassification(classification: ClassificationResult): boolean {
    const validCategories = [
      'voter_intimidation', 'ballot_irregularity', 'technical_malfunction',
      'violence', 'procedural_violation', 'security_breach', 
      'crowd_control', 'media_interference', 'other'
    ];

    const validSeverities = ['low', 'medium', 'high', 'critical'];

    return (
      validCategories.includes(classification.category) &&
      validSeverities.includes(classification.severity) &&
      classification.confidence >= 0 && classification.confidence <= 100 &&
      classification.riskScore >= 0 && classification.riskScore <= 100 &&
      Array.isArray(classification.keywords) &&
      Array.isArray(classification.suggestedActions)
    );
  }

  async getClassificationStatistics(timeframe: string = '30d'): Promise<any> {
    // This would typically query the database for classification statistics
    // For now, returning a structure that the frontend expects
    return {
      totalAnalyzed: 0,
      highRisk: 0,
      avgConfidence: 0,
      accuracy: 0,
      categoryCounts: {},
      severityCounts: {}
    };
  }
}

export const aiClassificationService = new AIClassificationService();