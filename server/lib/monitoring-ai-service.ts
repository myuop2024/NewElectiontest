import { CentralAIService } from './central-ai-service';

interface SiteAssessment {
  relevance: number; // 0-100
  confidence: number; // 0-100
  reasoning: string;
  recommended_keywords: string[];
  content_type: 'news' | 'social_media' | 'blog' | 'government' | 'other';
  jamaica_focus: number; // 0-100
  political_coverage: number; // 0-100
  reliability: number; // 0-100
  update_frequency: 'high' | 'medium' | 'low';
  language: 'english' | 'patois' | 'mixed';
}

interface BulkSiteAssessment {
  sites: Array<{
    url: string;
    name?: string;
    assessment?: SiteAssessment;
    error?: string;
  }>;
  summary: {
    total_sites: number;
    relevant_sites: number;
    high_relevance_sites: number;
    average_relevance: number;
    recommended_sites: string[];
  };
}

export class MonitoringAIService {
  private aiService: CentralAIService;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.aiService = new CentralAIService(apiKey);
  }

  async assessSiteRelevance(url: string, name?: string): Promise<SiteAssessment> {
    try {
      const prompt = `
You are an AI expert analyzing websites for Jamaica election monitoring relevance. 

Analyze this site: ${name ? `Name: ${name}, ` : ''}URL: ${url}

Assess the site for:
1. Relevance to Jamaica elections (0-100)
2. Confidence in assessment (0-100)
3. Content type (news, social_media, blog, government, other)
4. Jamaica focus level (0-100)
5. Political coverage level (0-100)
6. Reliability/credibility (0-100)
7. Update frequency (high, medium, low)
8. Language used (english, patois, mixed)

Provide reasoning and recommend 5-10 election-related keywords for monitoring.

Respond in JSON format:
{
  "relevance": number,
  "confidence": number,
  "reasoning": "string",
  "recommended_keywords": ["keyword1", "keyword2"],
  "content_type": "news|social_media|blog|government|other",
  "jamaica_focus": number,
  "political_coverage": number,
  "reliability": number,
  "update_frequency": "high|medium|low",
  "language": "english|patois|mixed"
}
`;

      const response = await this.aiService.analyzeContent(prompt);
      
      if (!response.success) {
        throw new Error('AI analysis failed');
      }

      // Parse the AI response
      const aiResponse = response.data?.analysis || response.data?.content || '';
      
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }

      const assessment = JSON.parse(jsonMatch[0]) as SiteAssessment;
      
      // Validate and normalize the assessment
      return {
        relevance: Math.max(0, Math.min(100, assessment.relevance || 0)),
        confidence: Math.max(0, Math.min(100, assessment.confidence || 0)),
        reasoning: assessment.reasoning || 'No reasoning provided',
        recommended_keywords: Array.isArray(assessment.recommended_keywords) 
          ? assessment.recommended_keywords.slice(0, 10) 
          : [],
        content_type: this.validateContentType(assessment.content_type),
        jamaica_focus: Math.max(0, Math.min(100, assessment.jamaica_focus || 0)),
        political_coverage: Math.max(0, Math.min(100, assessment.political_coverage || 0)),
        reliability: Math.max(0, Math.min(100, assessment.reliability || 0)),
        update_frequency: this.validateUpdateFrequency(assessment.update_frequency),
        language: this.validateLanguage(assessment.language)
      };

    } catch (error) {
      console.error('Error assessing site relevance:', error);
      
      // Return a default assessment for failed analysis
      return {
        relevance: 50,
        confidence: 30,
        reasoning: 'Unable to analyze site automatically. Manual review recommended.',
        recommended_keywords: ['election', 'Jamaica', 'politics', 'voting', 'government'],
        content_type: 'other',
        jamaica_focus: 50,
        political_coverage: 50,
        reliability: 50,
        update_frequency: 'medium',
        language: 'english'
      };
    }
  }

  async assessBulkSites(sites: Array<{ url: string; name?: string }>): Promise<BulkSiteAssessment> {
    const assessments: Array<{ url: string; name?: string; assessment?: SiteAssessment; error?: string }> = [];
    let totalRelevance = 0;
    let relevantSites = 0;
    let highRelevanceSites = 0;

    for (const site of sites) {
      try {
        const assessment = await this.assessSiteRelevance(site.url, site.name);
        assessments.push({ ...site, assessment });
        
        totalRelevance += assessment.relevance;
        if (assessment.relevance >= 50) relevantSites++;
        if (assessment.relevance >= 80) highRelevanceSites++;
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        assessments.push({ 
          ...site, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const averageRelevance = assessments.length > 0 ? totalRelevance / assessments.length : 0;
    const recommendedSites = assessments
      .filter(a => a.assessment && a.assessment.relevance >= 70)
      .map(a => a.url);

    return {
      sites: assessments,
      summary: {
        total_sites: sites.length,
        relevant_sites: relevantSites,
        high_relevance_sites: highRelevanceSites,
        average_relevance: Math.round(averageRelevance),
        recommended_sites: recommendedSites
      }
    };
  }

  private validateContentType(type: any): 'news' | 'social_media' | 'blog' | 'government' | 'other' {
    const validTypes = ['news', 'social_media', 'blog', 'government', 'other'];
    return validTypes.includes(type) ? type : 'other';
  }

  private validateUpdateFrequency(frequency: any): 'high' | 'medium' | 'low' {
    const validFrequencies = ['high', 'medium', 'low'];
    return validFrequencies.includes(frequency) ? frequency : 'medium';
  }

  private validateLanguage(language: any): 'english' | 'patois' | 'mixed' {
    const validLanguages = ['english', 'patois', 'mixed'];
    return validLanguages.includes(language) ? language : 'english';
  }

  async generateKeywordsForSite(url: string, content: string): Promise<string[]> {
    try {
      const prompt = `
Analyze this content from ${url} and generate 10-15 election-related keywords for monitoring Jamaica elections.

Content: ${content.substring(0, 1000)}...

Focus on:
- Political parties (JLP, PNP)
- Political figures (Andrew Holness, Mark Golding)
- Election terms (voting, polling, constituency)
- Policy areas (infrastructure, healthcare, education)
- Local issues (parish-specific concerns)

Return only the keywords as a JSON array: ["keyword1", "keyword2", ...]
`;

      const response = await this.aiService.analyzeContent(prompt);
      
      if (!response.success) {
        return ['election', 'Jamaica', 'politics', 'voting'];
      }

      const aiResponse = response.data?.analysis || response.data?.content || '';
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        try {
          const keywords = JSON.parse(jsonMatch[0]) as string[];
          return Array.isArray(keywords) ? keywords.slice(0, 15) : [];
        } catch {
          // Fallback to extracting keywords from text
          return this.extractKeywordsFromText(aiResponse);
        }
      }

      return this.extractKeywordsFromText(aiResponse);

    } catch (error) {
      console.error('Error generating keywords:', error);
      return ['election', 'Jamaica', 'politics', 'voting', 'government'];
    }
  }

  private extractKeywordsFromText(text: string): string[] {
    const electionKeywords = [
      'election', 'voting', 'democracy', 'political', 'campaign', 'candidate',
      'JLP', 'PNP', 'Andrew Holness', 'Mark Golding', 'manifesto', 'policy',
      'constituency', 'parliamentary', 'voter', 'ballot', 'polling station',
      'electoral commission', 'governance', 'corruption', 'transparency',
      'infrastructure', 'roads', 'healthcare', 'education', 'crime', 'economy',
      'unemployment', 'development', 'parish council', 'Jamaica'
    ];

    const foundKeywords = electionKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );

    return foundKeywords.length > 0 ? foundKeywords : ['election', 'Jamaica', 'politics'];
  }
} 