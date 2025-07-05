import { GoogleGenerativeAI } from "@google/generative-ai";

interface IncidentAnalysis {
  classification: {
    primaryCategory: string;
    subcategory: string;
    confidence: number;
  };
  severity: {
    level: string;
    reasoning: string;
    confidence: number;
  };
  recommendations: {
    immediateActions: string[];
    followUpActions: string[];
    stakeholders: string[];
  };
  patterns: {
    similarIncidents: string[];
    riskFactors: string[];
  };
  timeline: {
    urgency: string;
    estimatedResolutionTime: string;
  };
}

interface IncidentData {
  type: string;
  title: string;
  description: string;
  location?: string;
  witnessCount?: string;
  evidenceNotes?: string;
  pollingStationId?: string;
  attachedDocuments?: any[];
}

interface DocumentAnalysis {
  documentType: string;
  extractedText: string;
  confidence: number;
  keyData: string[];
  relevantToIncident: boolean;
  evidenceValue: string;
}

export class AIIncidentService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error("Google Cloud API key is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async analyzeIncident(incidentData: IncidentData): Promise<IncidentAnalysis> {
    const prompt = this.buildAnalysisPrompt(incidentData);
    
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
      return this.validateAndNormalizeAnalysis(analysis);
    } catch (error) {
      console.error("AI analysis error:", error);
      throw new Error("Failed to analyze incident with AI");
    }
  }

  private buildAnalysisPrompt(incident: IncidentData): string {
    return `
As an expert electoral observation AI system, analyze the following incident report and provide a comprehensive analysis in JSON format.

INCIDENT DETAILS:
Type: ${incident.type}
Title: ${incident.title}
Description: ${incident.description}
Location: ${incident.location || 'Not specified'}
Witnesses: ${incident.witnessCount || 'Not specified'}
Evidence: ${incident.evidenceNotes || 'None mentioned'}
Polling Station: ${incident.pollingStationId || 'Not specified'}

ANALYSIS REQUIREMENTS:
1. Classify the incident into primary and subcategories
2. Assess severity level with detailed reasoning
3. Provide actionable recommendations
4. Identify patterns and risk factors
5. Estimate timeline and urgency

CLASSIFICATION CATEGORIES:
- voter_intimidation: Threats, coercion, harassment
- technical_malfunction: Equipment failures, system errors
- ballot_irregularity: Missing ballots, improper handling, counting errors
- procedural_violation: Protocol breaches, unauthorized access
- violence: Physical threats, altercations, weapons
- bribery: Vote buying, corruption, financial incentives
- accessibility_issue: Barriers for disabled voters, language issues
- other: Miscellaneous electoral concerns

SEVERITY LEVELS:
- critical: Immediate threat to election integrity or safety
- high: Significant impact requiring urgent attention
- medium: Notable concern needing timely response
- low: Minor issue for documentation and follow-up

Respond ONLY with valid JSON in this exact format:
{
  "classification": {
    "primaryCategory": "category_name",
    "subcategory": "specific_type",
    "confidence": 0.85
  },
  "severity": {
    "level": "high",
    "reasoning": "Detailed explanation of severity assessment",
    "confidence": 0.90
  },
  "recommendations": {
    "immediateActions": ["Action 1", "Action 2"],
    "followUpActions": ["Follow-up 1", "Follow-up 2"],
    "stakeholders": ["Police", "Election Commission", "Local Officials"]
  },
  "patterns": {
    "similarIncidents": ["Pattern 1", "Pattern 2"],
    "riskFactors": ["Risk 1", "Risk 2"]
  },
  "timeline": {
    "urgency": "immediate|urgent|standard|low",
    "estimatedResolutionTime": "time estimate"
  }
}`;
  }

  private validateAndNormalizeAnalysis(analysis: any): IncidentAnalysis {
    // Ensure all required fields exist with defaults
    return {
      classification: {
        primaryCategory: analysis.classification?.primaryCategory || 'other',
        subcategory: analysis.classification?.subcategory || 'unspecified',
        confidence: Math.min(Math.max(analysis.classification?.confidence || 0.5, 0), 1)
      },
      severity: {
        level: analysis.severity?.level || 'medium',
        reasoning: analysis.severity?.reasoning || 'Standard assessment required',
        confidence: Math.min(Math.max(analysis.severity?.confidence || 0.5, 0), 1)
      },
      recommendations: {
        immediateActions: Array.isArray(analysis.recommendations?.immediateActions) 
          ? analysis.recommendations.immediateActions : ['Review incident details'],
        followUpActions: Array.isArray(analysis.recommendations?.followUpActions)
          ? analysis.recommendations.followUpActions : ['Document for records'],
        stakeholders: Array.isArray(analysis.recommendations?.stakeholders)
          ? analysis.recommendations.stakeholders : ['Local Officials']
      },
      patterns: {
        similarIncidents: Array.isArray(analysis.patterns?.similarIncidents)
          ? analysis.patterns.similarIncidents : [],
        riskFactors: Array.isArray(analysis.patterns?.riskFactors)
          ? analysis.patterns.riskFactors : []
      },
      timeline: {
        urgency: analysis.timeline?.urgency || 'standard',
        estimatedResolutionTime: analysis.timeline?.estimatedResolutionTime || '24-48 hours'
      }
    };
  }

  async classifyIncidentBatch(incidents: IncidentData[]): Promise<IncidentAnalysis[]> {
    const batchPromises = incidents.map(incident => this.analyzeIncident(incident));
    return Promise.all(batchPromises);
  }

  async generateSummaryReport(analyses: IncidentAnalysis[]): Promise<{
    totalIncidents: number;
    severityDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    commonPatterns: string[];
    recommendations: string[];
  }> {
    const summary = {
      totalIncidents: analyses.length,
      severityDistribution: {} as Record<string, number>,
      categoryDistribution: {} as Record<string, number>,
      commonPatterns: [] as string[],
      recommendations: [] as string[]
    };

    // Calculate distributions
    analyses.forEach(analysis => {
      const severity = analysis.severity.level;
      const category = analysis.classification.primaryCategory;
      
      summary.severityDistribution[severity] = (summary.severityDistribution[severity] || 0) + 1;
      summary.categoryDistribution[category] = (summary.categoryDistribution[category] || 0) + 1;
    });

    // Extract common patterns
    const allPatterns = analyses.flatMap(a => a.patterns.similarIncidents);
    const patternCounts = allPatterns.reduce((acc, pattern) => {
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    summary.commonPatterns = Object.entries(patternCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern);

    // Generate summary recommendations
    const allRecommendations = analyses.flatMap(a => a.recommendations.immediateActions);
    const recommendationCounts = allRecommendations.reduce((acc, rec) => {
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    summary.recommendations = Object.entries(recommendationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([rec]) => rec);

    return summary;
  }

  async analyzeDocument(documentContent: string, documentType: string): Promise<DocumentAnalysis> {
    const prompt = `
DOCUMENT ANALYSIS REQUEST:
Analyze the following electoral document and extract key information.

DOCUMENT TYPE: ${documentType}
DOCUMENT CONTENT: ${documentContent}

ANALYSIS REQUIREMENTS:
1. Identify the specific document type (ballot form, results sheet, incident report, voter list, etc.)
2. Extract all text content and key data points
3. Assess relevance to electoral observation
4. Determine evidence value for incident reporting

Respond ONLY with valid JSON in this format:
{
  "documentType": "specific_document_type",
  "extractedText": "full_text_content",
  "confidence": 0.95,
  "keyData": ["key_point_1", "key_point_2", "key_point_3"],
  "relevantToIncident": true/false,
  "evidenceValue": "high|medium|low"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean the response to extract JSON
      const cleanedText = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
      return JSON.parse(cleanedText);
    } catch (error) {
      console.error("Document analysis error:", error);
      return {
        documentType: documentType || 'unknown',
        extractedText: documentContent.substring(0, 500),
        confidence: 0.5,
        keyData: ['Document processed with basic extraction'],
        relevantToIncident: true,
        evidenceValue: 'medium'
      };
    }
  }

  async analyzeIncidentWithDocuments(incidentData: IncidentData): Promise<IncidentAnalysis> {
    let enhancedDescription = incidentData.description;
    
    // If documents are attached, analyze them first and enhance the incident description
    if (incidentData.attachedDocuments && incidentData.attachedDocuments.length > 0) {
      const documentAnalyses = [];
      
      for (const doc of incidentData.attachedDocuments) {
        if (doc.ocrText) {
          const analysis = await this.analyzeDocument(doc.ocrText, doc.documentType);
          documentAnalyses.push(analysis);
        }
      }
      
      // Enhance incident description with document insights
      const documentEvidence = documentAnalyses
        .filter(analysis => analysis.relevantToIncident)
        .map(analysis => `Document Evidence (${analysis.documentType}): ${analysis.keyData.join(', ')}`)
        .join('\n');
      
      if (documentEvidence) {
        enhancedDescription += `\n\nSUPPORTING EVIDENCE:\n${documentEvidence}`;
      }
    }
    
    // Analyze the enhanced incident with document context
    return this.analyzeIncident({
      ...incidentData,
      description: enhancedDescription
    });
  }
}

export const createAIIncidentService = (apiKey?: string) => {
  return new AIIncidentService(apiKey);
};