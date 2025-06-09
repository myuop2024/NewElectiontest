import { storage } from '../storage';

export interface HuggingFaceConfig {
  apiKey: string;
  model: string;
  endpoint: string;
}

export interface HuggingFaceResponse {
  generated_text?: string;
  error?: string;
  estimated_time?: number;
}

export class HuggingFaceService {
  private static async getConfig(): Promise<HuggingFaceConfig | null> {
    try {
      const enabled = await storage.getSettingByKey('huggingface_enabled');
      if (!enabled || enabled.value !== 'true') {
        return null;
      }

      const apiKey = await storage.getSettingByKey('huggingface_api_key');
      const model = await storage.getSettingByKey('huggingface_model');
      const endpoint = await storage.getSettingByKey('huggingface_endpoint');

      if (!apiKey?.value || !model?.value || !endpoint?.value) {
        throw new Error('Missing Hugging Face configuration');
      }

      return {
        apiKey: apiKey.value,
        model: model.value,
        endpoint: endpoint.value
      };
    } catch (error) {
      console.error('Hugging Face configuration error:', error);
      return null;
    }
  }

  static async generateText(prompt: string): Promise<HuggingFaceResponse> {
    const config = await this.getConfig();
    if (!config) {
      return { error: 'Hugging Face service not configured or disabled' };
    }

    try {
      const response = await fetch(`${config.endpoint}${config.model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 150,
            temperature: 0.7,
            return_full_text: false
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `Hugging Face API error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        return { generated_text: data[0].generated_text };
      }
      
      if (data.error) {
        return { error: data.error, estimated_time: data.estimated_time };
      }

      return data;
    } catch (error) {
      console.error('Hugging Face API error:', error);
      return { error: `Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  static async analyzeReport(reportContent: string): Promise<string> {
    const analysisPrompt = `Analyze this electoral observation report and provide insights:

Report: ${reportContent}

Please provide:
1. Key findings
2. Potential concerns
3. Recommendations
4. Risk assessment`;

    const response = await this.generateText(analysisPrompt);
    
    if (response.error) {
      throw new Error(response.error);
    }

    return response.generated_text || 'No analysis generated';
  }

  static async summarizeIncidents(incidents: string[]): Promise<string> {
    const summaryPrompt = `Summarize these electoral incidents and identify patterns:

Incidents:
${incidents.map((incident, i) => `${i + 1}. ${incident}`).join('\n')}

Provide a concise summary highlighting:
- Common patterns
- Severity levels
- Recommended actions`;

    const response = await this.generateText(summaryPrompt);
    
    if (response.error) {
      throw new Error(response.error);
    }

    return response.generated_text || 'No summary generated';
  }

  static async validateConfiguration(): Promise<{ valid: boolean; message: string }> {
    const config = await this.getConfig();
    if (!config) {
      return { valid: false, message: 'Hugging Face service not configured' };
    }

    try {
      const testResponse = await this.generateText('Test connection');
      if (testResponse.error) {
        return { valid: false, message: testResponse.error };
      }
      return { valid: true, message: 'Hugging Face API connection successful' };
    } catch (error) {
      return { 
        valid: false, 
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}